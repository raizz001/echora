require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { setupLiveInterview } = require('./live-interview-service');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_VERCEL = Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.NOW_REGION);

// Base directory configuration:
// On Vercel / AWS Lambda, /var/task is strictly read-only.
// Runtime-writable directories (uploads, mutated json data) MUST reside in os.tmpdir() (/tmp).
// On local development, we keep using ./data and ./uploads directly in the project root.
const publicDir = path.join(__dirname, 'public');
const bundledDataDir = path.join(__dirname, 'data');

const dataDir = IS_VERCEL
  ? path.join(os.tmpdir(), 'echora-data')
  : bundledDataDir;

const uploadsDir = IS_VERCEL
  ? path.join(os.tmpdir(), 'echora-uploads')
  : path.join(__dirname, 'uploads');

// Safe directory creation that never crashes the process
function ensureDirExists(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (err) {
    console.warn(`[Storage] Warning: Failed to ensure directory ${dirPath}: ${err.message}`);
  }
}

ensureDirExists(dataDir);
ensureDirExists(uploadsDir);

// File paths
const topicsFile = path.join(bundledDataDir, 'topics.json');
const sessionsFile = path.join(dataDir, 'sessions.json');
const profileFile = path.join(dataDir, 'profile.json');

const bundledSessionsFile = path.join(bundledDataDir, 'sessions.json');
const defaultSessionsFile = path.join(bundledDataDir, 'default-sessions.json');

const bundledProfileFile = path.join(bundledDataDir, 'profile.json');
const defaultProfileFile = path.join(bundledDataDir, 'default-profile.json');

// In-memory cache to guarantee fast response and resilient fallback in serverless environments
let inMemorySessions = null;
let inMemoryProfile = null;

function loadInitialProfile() {
  // 1. Try writable dataDir (profile.json)
  try {
    if (fs.existsSync(profileFile)) {
      const data = JSON.parse(fs.readFileSync(profileFile, 'utf-8'));
      if (data && typeof data === 'object') return data;
    }
  } catch (e) {}

  // 2. Try bundled profile.json if exists
  try {
    if (fs.existsSync(bundledProfileFile)) {
      const data = JSON.parse(fs.readFileSync(bundledProfileFile, 'utf-8'));
      if (data && typeof data === 'object') return data;
    }
  } catch (e) {}

  // 3. Try default-profile.json if exists
  try {
    if (fs.existsSync(defaultProfileFile)) {
      const data = JSON.parse(fs.readFileSync(defaultProfileFile, 'utf-8'));
      if (data && typeof data === 'object') return data;
    }
  } catch (e) {}

  // 4. Default profile fallback
  return { name: 'Rais', title: 'Public Speaking Learner' };
}

function loadInitialSessions() {
  // 1. Try writable dataDir (sessions.json)
  try {
    if (fs.existsSync(sessionsFile)) {
      const data = JSON.parse(fs.readFileSync(sessionsFile, 'utf-8'));
      if (Array.isArray(data)) return data;
    }
  } catch (e) {}

  // 2. Try bundled sessions.json if exists
  try {
    if (fs.existsSync(bundledSessionsFile)) {
      const data = JSON.parse(fs.readFileSync(bundledSessionsFile, 'utf-8'));
      if (Array.isArray(data)) return data;
    }
  } catch (e) {}

  // 3. Try default-sessions.json if exists
  try {
    if (fs.existsSync(defaultSessionsFile)) {
      const data = JSON.parse(fs.readFileSync(defaultSessionsFile, 'utf-8'));
      if (Array.isArray(data)) return data;
    }
  } catch (e) {}

  // 4. Default fallback
  return [];
}

function getProfile() {
  if (!inMemoryProfile) {
    inMemoryProfile = loadInitialProfile();
    // Persist to writable dataDir if possible
    saveProfile(inMemoryProfile);
  }
  return inMemoryProfile;
}

function saveProfile(data) {
  inMemoryProfile = data;
  try {
    ensureDirExists(dataDir);
    fs.writeFileSync(profileFile, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn(`[Storage] Warning: Could not write profile to ${profileFile}: ${err.message}`);
  }
}

function getSessions() {
  if (!inMemorySessions) {
    inMemorySessions = loadInitialSessions();
    // Persist to writable dataDir if possible
    saveSessions(inMemorySessions);
  }
  return inMemorySessions;
}

function saveSessions(data) {
  inMemorySessions = data;
  try {
    ensureDirExists(dataDir);
    fs.writeFileSync(sessionsFile, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn(`[Storage] Warning: Could not write sessions to ${sessionsFile}: ${err.message}`);
  }
}

function readTopics() {
  try {
    if (fs.existsSync(topicsFile)) {
      const raw = fs.readFileSync(topicsFile, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error(`Error reading ${topicsFile}:`, err.message);
  }
  return [];
}

// Helper for generic file persistence (safe read/write without read side-effect errors)
function readJson(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`Error reading ${filePath}:`, err.message);
    return defaultValue;
  }
}

function writeJson(filePath, data) {
  try {
    const parentDir = path.dirname(filePath);
    ensureDirExists(parentDir);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn(`Error writing ${filePath}:`, err.message);
  }
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static frontend and uploads
app.use(express.static(publicDir));
app.use('/uploads', express.static(uploadsDir));

// Fallback route for /uploads when an audio file does not exist on disk
// (e.g. in ephemeral Vercel Serverless Function instances or seed demo sessions)
app.get('/uploads/:filename', (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const localTarget = path.join(uploadsDir, safeFilename);
  if (fs.existsSync(localTarget)) {
    return res.sendFile(localTarget);
  }
  // Graceful fallback to sample audio so player doesn't fail
  const sampleAudio = path.join(publicDir, 'audio', 'sample-1.wav');
  if (fs.existsSync(sampleAudio)) {
    res.setHeader('Content-Type', 'audio/wav');
    return res.sendFile(sampleAudio);
  }
  res.status(404).json({ error: 'Audio file not found' });
});

// Multer setup for voice recordings
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    ensureDirExists(uploadsDir);
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.webm';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `rec-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB max
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: IS_VERCEL ? 'vercel-serverless' : 'localhost',
    byok: true,
    timestamp: new Date().toISOString()
  });
});

// GET /api/topics
app.get('/api/topics', (req, res) => {
  const topics = readTopics();
  res.json(topics);
});

// GET /api/topics/random
app.get('/api/topics/random', (req, res) => {
  const topics = readTopics();
  const { category, difficulty } = req.query;
  let pool = topics;
  if (category && category.toLowerCase() !== 'all') {
    pool = pool.filter(t => t.category.toLowerCase() === category.toLowerCase());
  }
  if (difficulty && difficulty.toLowerCase() !== 'all') {
    pool = pool.filter(t => t.difficulty.toLowerCase() === difficulty.toLowerCase());
  }
  if (pool.length === 0) pool = topics;
  const randomIndex = Math.floor(Math.random() * pool.length);
  res.json(pool[randomIndex] || null);
});

// GET /api/profile
app.get('/api/profile', (req, res) => {
  const profile = getProfile();
  const sessions = getSessions();
  const totalDuration = sessions.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
  
  res.json({
    ...profile,
    totalSessions: sessions.length,
    totalSpeakingTime: totalDuration
  });
});

// PUT /api/profile
app.put('/api/profile', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const current = getProfile();
  current.name = name.trim();
  saveProfile(current);
  res.json(current);
});

// GET /api/sessions
app.get('/api/sessions', (req, res) => {
  const sessions = getSessions();
  // Return sorted newest first
  const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(sorted);
});

// GET /api/sessions/:id
app.get('/api/sessions/:id', (req, res) => {
  const sessions = getSessions();
  const session = sessions.find(s => s.id === req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session);
});

// DELETE /api/sessions/:id
app.delete('/api/sessions/:id', (req, res) => {
  const sessions = getSessions();
  const index = sessions.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  const [removed] = sessions.splice(index, 1);
  saveSessions(sessions);

  // Clean up audio file if within uploads directory
  if (removed.audioUrl && removed.audioUrl.startsWith('/uploads/')) {
    const filename = path.basename(removed.audioUrl);
    const filePath = path.join(uploadsDir, filename);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) { /* ignore */ }
  }

  res.json({ success: true, removedId: removed.id });
});

// AI Coach Analysis Engine using Google Gemini
async function analyzeWithGemini({ audioBuffer, mimeType, topic, category, duration, language, apiKey }) {
  if (!apiKey || apiKey.trim().length < 5) {
    return { authError: true };
  }

  const base64Audio = audioBuffer.toString('base64');
  const langPrompt = language === 'id' 
    ? `PANDUAN BAHASA & GAYA KOMUNIKASI (SANGAT PENTING):
- Berikan feedback dalam BAHASA INDONESIA yang santai, natural, ramah, dan conversational layaknya seorang coach/mentor speaking sedang ngobrol langsung dengan siswa SMA.
- Selalu gunakan sapaan "kamu" (JANGAN PERNAH gunakan kata "Anda").
- Gunakan bahasa yang hidup dan santai namun tetap sopan, suportif, dan positif (boleh gunakan kata wajar seperti "kamu", "nggak", "udah", "coba", "enak didengar", "biar", dll).
- JANGAN gunakan format laporan akademik, evaluasi formal kantor, atau bahasa kaku.
- JANGAN gunakan istilah teknis rumit (hindari kata seperti fonetik, modulasi frekuensi, napas diafragma, cadence, dsb). Gunakan istilah sederhana (seperti pengucapan kata, intonasi nada, jeda napas, kecepatan bicara).
- Kalimat pendek sampai sedang, langsung ke inti, dan mudah dibaca dalam beberapa detik.`
    : `LANGUAGE & TONE GUIDELINES (CRITICAL):
- Give feedback in conversational, friendly, warm, and supportive ENGLISH, like a speaking coach talking directly to a high school student in a 1-on-1 session.
- Speak directly to the student using "you".
- Keep it direct, natural, and positive. Avoid academic, corporate, or overly formal evaluation jargon.
- Avoid unnecessary technical terms. Use clear everyday vocabulary.
- Short to medium sentences, straight to the point, readable in a few seconds.`;

  const systemPrompt = `You are ECHORA's AI Public Speaking Coach.
Analyze the user's speech audio for the speaking topic: "${topic}" (Category: ${category}).
Duration of speaking: ${duration} seconds.

${langPrompt}

EVALUATION RULES (AUDIO ONLY):
- DO NOT mention body language, eye contact, hand gestures, posture, or visual cues, as this is an audio-only evaluation.
- Base your analysis STRICTLY on the actual audio performance:
  1. Content: Relevance to topic, clarity of main idea, answer structure.
  2. Fluency: Natural flow, comfortable transitions, presence of long hesitations or fillers.
  3. Articulation: Clarity of word pronunciation, audibility.
  4. Pace: Speaking tempo (steady rhythm, not rushed, not dragging).
  5. Expression: Intonation variance, dynamic vocal energy, avoiding monotone delivery.

AUDIO VALIDATION & SILENCE DETECTION (CRITICAL):
- If the audio contains NO speech, is completely silent, contains only background static/ambient noise, or has no discernible spoken words:
  You MUST return ONLY valid JSON:
  {
    "noSpeechDetected": true
  }
- Do NOT generate scores or feedback for silent recordings.

COACHING & FEEDBACK RULES:
1. WHAT YOU DID WELL:
   - Provide only 2 to 3 most relevant points that genuinely stood out in this recording.
   - Each point must be 1 to 2 short sentences.
   - Celebrate genuine strengths (e.g. clear ideas, smooth flow, crisp pronunciation, nice energy, or steady pace).
   - DO NOT always praise the same aspects. Base it on what was actually good in this speech.

2. WHAT TO IMPROVE:
   - Provide at most 2 to 3 key improvement points. Prioritize the most important issues.
   - DO NOT make a long list.
   - Must be specific to this speech. DO NOT invent problems if they did not happen. If articulation was already great, do NOT criticize it; praise it and focus on what actually needs work.
   - Must be actionable, encouraging, and easy for a student to practice.
   - DO NOT use generic repetitive templates like "Pertahankan rasa percaya dirimu" or "Tingkatkan artikulasi".

3. WORDING VARIATION:
   - Vary your wording naturally like a real coach (e.g. in Indonesian: "Menurutku...", "Coba...", "Yang udah bagus...", "Di bagian ini...", "Akan lebih enak kalau...", "Biar alurnya makin mulus...", "Lain kali, coba...", etc.).
   - DO NOT repeat the exact same opening pattern across bullet points.

4. NEXT STEP:
   - Provide exactly 1 short, concrete, practical exercise (1-2 sentences) the student can try in their next practice.

SCORING (Keep standard scoring system intact for valid speech):
- overallScore: integer between 60 and 96
- scores: content, fluency, articulation, pace, expression (each integer between 60 and 98)

Return ONLY valid JSON with this exact schema:
{
  "overallScore": <integer 60-96>,
  "scores": {
    "content": <integer 60-98>,
    "fluency": <integer 60-98>,
    "articulation": <integer 60-98>,
    "pace": <integer 60-98>,
    "expression": <integer 60-98>
  },
  "feedback": {
    "whatYouDidWell": [
      "<short strength 1>",
      "<short strength 2>"
    ],
    "whatToImprove": [
      "<short actionable improvement 1>",
      "<short actionable improvement 2>"
    ],
    "nextStep": "<1 short practical exercise>"
  }
}`;

  // Try calling Gemini models via REST API (modern active models)
  const models = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.5-flash'];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const payload = {
        contents: [
          {
            parts: [
              { text: systemPrompt },
              {
                inlineData: {
                  mimeType: mimeType || 'audio/webm',
                  data: base64Audio
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: 'application/json'
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.warn(`[BYOK] Gemini API error with model ${model}:`, response.status);
        if (response.status === 400 || response.status === 401 || response.status === 403) {
          return { authError: true };
        }
        if (response.status === 429) {
          return { quotaError: true };
        }
        continue;
      }

      const result = await response.json();
      const textPart = result.candidates?.[0]?.content?.parts?.find(p => p.text && !p.thought)
        || result.candidates?.[0]?.content?.parts?.find(p => p.text)
        || result.candidates?.[0]?.content?.parts?.[0];
      const rawText = textPart?.text;
      if (rawText) {
        const cleaned = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        try {
          const parsed = JSON.parse(cleaned);
          if (parsed.noSpeechDetected) {
            return { noSpeechDetected: true };
          }
          if (parsed.overallScore !== undefined && parsed.scores && parsed.feedback) {
            if (typeof parsed.feedback.whatYouDidWell === 'string') {
              parsed.feedback.whatYouDidWell = [parsed.feedback.whatYouDidWell];
            }
            if (typeof parsed.feedback.whatToImprove === 'string') {
              parsed.feedback.whatToImprove = [parsed.feedback.whatToImprove];
            }
            return {
              ...parsed,
              engine: `Gemini AI (${model})`
            };
          }
        } catch (jsonErr) {
          if (/no speech|silent|silence|empty/i.test(cleaned)) {
            return { noSpeechDetected: true };
          }
        }
      }
    } catch (err) {
      const safeMsg = err.message ? err.message.replace(/key=[^&]+/g, 'key=[REDACTED]') : 'Attempt failed';
      console.warn(`[BYOK] Attempt with ${model} failed:`, safeMsg);
    }
  }

  return null;
}

// Intelligent Heuristic Coach (Fallback when API key is not configured or offline)
function generateIntelligentAnalysis({ topic, category, duration, language }) {
  const isId = language === 'id';
  const durationNum = Number(duration) || 30;

  // Base scoring calibrated to duration and realistic speaking patterns
  let contentBase = 80 + Math.floor(Math.random() * 8);
  let fluencyBase = 76 + Math.floor(Math.random() * 9);
  let articulationBase = 81 + Math.floor(Math.random() * 8);
  let paceBase = 79 + Math.floor(Math.random() * 8);
  let expressionBase = 77 + Math.floor(Math.random() * 9);

  if (durationNum < 20) {
    contentBase -= 6;
    paceBase -= 4;
  } else if (durationNum > 45) {
    contentBase += 4;
    expressionBase += 3;
  }

  const overall = Math.round(
    contentBase * 0.3 +
    fluencyBase * 0.2 +
    articulationBase * 0.2 +
    paceBase * 0.15 +
    expressionBase * 0.15
  );

  // Dynamic feedback tailored to actual score performance
  const aspects = [
    { key: 'content', score: contentBase },
    { key: 'fluency', score: fluencyBase },
    { key: 'articulation', score: articulationBase },
    { key: 'pace', score: paceBase },
    { key: 'expression', score: expressionBase }
  ].sort((a, b) => b.score - a.score);

  const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

  let whatYouDidWell = [];
  let whatToImprove = [];
  let nextStep = "";

  if (isId) {
    const strengthsMap = {
      content: [
        `Gagasanmu tentang "${topic}" sudah jelas dan langsung ngena ke inti topik.`,
        `Ide yang kamu bangun seputar "${topic}" masuk akal dan runtut dipahami.`,
        `Poin yang kamu sampaikan fokus dan nggak bertele-tele.`
      ],
      fluency: [
        `Alur bicaramu mengalir enak dan jedanya terasa alami.`,
        `Kamu bisa menyambung antarkalimat dengan santai tanpa banyak jeda kaku.`,
        `Penyampaianmu terasa luwes dari awal sampai akhir.`
      ],
      articulation: [
        `Pengucapan kata-katamu terdengar jernih dan gampang ditangkap.`,
        `Pelafalan tiap kata cukup tegas, jadi pendengar nggak kesulitan menyimak.`,
        `Kata-kata kuncimu kamu ucapkan dengan lafal yang bersih.`
      ],
      pace: [
        `Tempo bicaramu pas banget, nggak terburu-buru dan juga nggak lambat.`,
        `Ritme bicaramu stabil, jadi pendengar merasa nyaman menyimak sampai selesai.`,
        `Kecepatan bicaramu terjaga dengan konsisten sepanjang sesi.`
      ],
      expression: [
        `Intonasi suaramu hidup dan ekspresif, nggak terdengar datar sama sekali.`,
        `Energi bicaramu terasa meyakinkan dan positif.`,
        `Variasi nada suaramu bikin pembicaraan jadi lebih seru didengarkan.`
      ]
    };

    const improvementsMap = {
      content: [
        `Coba tambahkan satu contoh singkat atau alasan pendukung supaya argumenmu makin kuat.`,
        `Di akhir, coba tutup dengan satu kalimat kesimpulan yang mantap biar pesanmu nempel di pendengar.`
      ],
      fluency: [
        `Di beberapa bagian kamu sempat berhenti agak lama sebelum lanjut kalimat. Coba gunakan jeda yang lebih singkat agar alurnya makin mulus.`,
        `Kurangi jeda ragu saat memikirkan kalimat berikutnya; lebih baik hening sejenak setengah detik lalu lanjutkan dengan rileks.`
      ],
      articulation: [
        `Penyampaianmu sudah cukup jelas. Coba perhatikan beberapa kata di akhir kalimat yang masih terdengar agak kurang tegas.`,
        `Ada kata yang pengucapannya agak terselip karena tergesa. Coba lafalkan kata-kata penting dengan sedikit lebih rileks.`
      ],
      pace: [
        `Tempo bicaramu sempat sedikit terlalu cepat di awal. Tarik napas santai sebelum mulai supaya ritmemu lebih tenang.`,
        `Coba perlambat sedikit bicaramu saat masuk ke poin utama supaya pendengar punya waktu mencerna intinya.`
      ],
      expression: [
        `Coba naik-turunkan intonasi di bagian penting supaya cara bicaramu nggak terdengar datar.`,
        `Akan lebih enak kalau kamu beri sedikit penekanan nada saat menyebut kata kunci ide utamamu.`
      ]
    };

    const nextStepsList = [
      `Latihan rekam ulang 1 menit, fokus naik-turunkan nada di kalimat pertama dan kalimat penutup.`,
      `Coba rekam lagi topik ini sambil memberi jeda santai 1 detik di setiap pergantian poin.`,
      `Latih 2 kalimat intimu di depan cermin dengan senyum santai supaya suaramu terdengar lebih lepas dan bersahabat.`
    ];

    // Pick top 2-3 strengths from highest scoring aspects
    whatYouDidWell.push(pickRandom(strengthsMap[aspects[0].key]));
    whatYouDidWell.push(pickRandom(strengthsMap[aspects[1].key]));
    if (aspects[2].score >= 82) {
      whatYouDidWell.push(pickRandom(strengthsMap[aspects[2].key]));
    }

    // Pick 2 actionable improvements from the lowest scoring aspects
    const lowest = aspects[aspects.length - 1];
    const secondLowest = aspects[aspects.length - 2];
    whatToImprove.push(pickRandom(improvementsMap[lowest.key]));
    whatToImprove.push(pickRandom(improvementsMap[secondLowest.key]));

    nextStep = pickRandom(nextStepsList);
  } else {
    const strengthsMapEn = {
      content: [
        `Your main message about "${topic}" was focused and got right to the point.`,
        `Your ideas on "${topic}" were logical and easy to follow.`,
        `You stayed on-topic and delivered your argument clearly.`
      ],
      fluency: [
        `Your speech flowed naturally with very few hesitant pauses.`,
        `You transitioned smoothly between sentences without getting stuck.`,
        `Your delivery felt relaxed and conversational throughout.`
      ],
      articulation: [
        `Your pronunciation was crisp and easy to understand.`,
        `Key words were pronounced clearly and distinctly.`,
        `Your diction was sharp, making every point easy to catch.`
      ],
      pace: [
        `Your speaking tempo was well-balanced—neither rushed nor sluggish.`,
        `You maintained a steady cadence that was comfortable to listen to.`,
        `Your rhythm stayed consistent and confident.`
      ],
      expression: [
        `Your vocal tone had nice dynamic energy and avoided sounding monotone.`,
        `You sounded genuinely engaged and enthusiastic about the topic.`,
        `Your pitch variations made the speech lively and interesting.`
      ]
    };

    const improvementsMapEn = {
      content: [
        `Try adding a quick real-life example to make your main argument even more persuasive.`,
        `Wrap up with a punchier closing sentence so your core takeaway sticks in the listener's mind.`
      ],
      fluency: [
        `You paused a bit long before continuing some sentences. Try using shorter, natural breaths to keep momentum.`,
        `Try to reduce filler sounds when thinking; a brief silent half-second pause will sound much cleaner.`
      ],
      articulation: [
        `Your speaking is generally clear. Watch out for a few word endings that softened up too much.`,
        `Slow down slightly on multi-syllable keywords so each syllable comes through clearly.`
      ],
      pace: [
        `Your pace sped up a little in the middle. Take a calm breath to reset your tempo between ideas.`,
        `Try slowing down slightly when introducing your key point so it lands with more impact.`
      ],
      expression: [
        `Try varying your pitch more on important words so your delivery sounds conversational rather than flat.`,
        `Give a bit more vocal emphasis to your punchlines to highlight why they matter.`
      ]
    };

    const nextStepsListEn = [
      `Do a 1-minute re-recording focused deliberately on raising your vocal energy on your opening and closing lines.`,
      `Practice this same topic once more with a deliberate 1-second relaxed pause after your main idea.`,
      `Try reading your key sentence out loud with a confident smile to keep your voice warm and engaging.`
    ];

    whatYouDidWell.push(pickRandom(strengthsMapEn[aspects[0].key]));
    whatYouDidWell.push(pickRandom(strengthsMapEn[aspects[1].key]));
    if (aspects[2].score >= 82) {
      whatYouDidWell.push(pickRandom(strengthsMapEn[aspects[2].key]));
    }

    const lowest = aspects[aspects.length - 1];
    const secondLowest = aspects[aspects.length - 2];
    whatToImprove.push(pickRandom(improvementsMapEn[lowest.key]));
    whatToImprove.push(pickRandom(improvementsMapEn[secondLowest.key]));

    nextStep = pickRandom(nextStepsListEn);
  }

  return {
    overallScore: Math.min(95, Math.max(65, overall)),
    scores: {
      content: Math.min(98, contentBase),
      fluency: Math.min(98, fluencyBase),
      articulation: Math.min(98, articulationBase),
      pace: Math.min(98, paceBase),
      expression: Math.min(98, expressionBase)
    },
    feedback: {
      whatYouDidWell,
      whatToImprove,
      nextStep
    },
    engine: 'AI Public Speaking Coach'
  };
}

// Helper to detect silent WAV buffer
function isWavSilent(buffer) {
  if (!buffer || buffer.length < 44) return true;
  const dataIdx = buffer.indexOf('data');
  if (dataIdx === -1) return false;
  const start = dataIdx + 8;
  let sum = 0;
  let count = 0;
  for (let i = start; i < buffer.length - 1; i += 2) {
    const sample = buffer.readInt16LE(i) / 32768;
    sum += sample * sample;
    count++;
  }
  if (count === 0) return true;
  const rms = Math.sqrt(sum / count);
  return rms < 0.01;
}

// POST /api/ai/test-key (Validate user Gemini API key safely)
app.post('/api/ai/test-key', async (req, res) => {
  try {
    const apiKey = (req.headers['x-gemini-api-key'] || '').trim();

    if (!apiKey || apiKey.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_FORMAT',
        message: 'Invalid API key format. Please check your Gemini API key.'
      });
    }

    // Safely verify with Gemini API (list 1 model to verify key authorization)
    const testUrl = `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1`;
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      }
    });

    if (response.ok) {
      console.log('[BYOK] Gemini API key connection test: SUCCESS');
      return res.json({
        success: true,
        message: 'Gemini connection successful'
      });
    } else if (response.status === 429) {
      return res.status(429).json({
        success: false,
        error: 'QUOTA_EXCEEDED',
        message: 'Gemini API quota or rate limit was reached. Please check your Gemini account.'
      });
    } else {
      console.warn('[BYOK] Gemini API key connection test returned status:', response.status);
      return res.status(401).json({
        success: false,
        error: 'AUTH_FAILED',
        message: 'Invalid Gemini API key'
      });
    }
  } catch (err) {
    const safeMsg = err.message ? err.message.replace(/key=[^&]+/g, 'key=[REDACTED]') : 'Network error';
    console.error('[BYOK] Test connection error:', safeMsg);
    return res.status(500).json({
      success: false,
      error: 'NETWORK_ERROR',
      message: 'Unable to connect to Gemini right now. Please try again.'
    });
  }
});

// POST /api/sessions/analyze
app.post('/api/sessions/analyze', upload.single('audio'), async (req, res) => {
  try {
    const {
      topic,
      topicId,
      category = 'Opinion',
      difficulty = 'Medium',
      prepTime = 30,
      speakingDuration = 60,
      duration = 45,
      language = 'en',
      transcript,
      hasSpeech
    } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    // Defensive validation for silent / no-speech submissions from Solo Practice
    if (hasSpeech === 'false' || hasSpeech === false) {
      return res.status(400).json({
        success: false,
        error: 'NO_SPEECH_DETECTED'
      });
    }

    if (typeof transcript === 'string' && transcript.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'NO_SPEECH_DETECTED'
      });
    }

    // Extract user's Gemini API key strictly from header (Full BYOK)
    const userApiKey = (req.headers['x-gemini-api-key'] || '').trim();

    if (!userApiKey) {
      return res.status(400).json({
        success: false,
        error: 'API_KEY_REQUIRED',
        message: 'Gemini API key is not configured. Please add your API key in Settings.'
      });
    }

    let audioUrl = '/audio/sample-1.wav';
    let audioBuffer = null;
    let mimeType = 'audio/webm';

    if (req.file) {
      audioUrl = `/uploads/${req.file.filename}`;
      mimeType = req.file.mimetype;
      try {
        audioBuffer = fs.readFileSync(req.file.path);
      } catch (e) {
        console.error('Error reading uploaded audio:', e);
      }
    } else {
      const samplePath = path.join(__dirname, 'public', 'audio', 'sample-1.wav');
      if (fs.existsSync(samplePath)) {
        try {
          audioBuffer = fs.readFileSync(samplePath);
          mimeType = 'audio/wav';
        } catch (e) {}
      }
    }

    // Check if uploaded WAV audio is completely silent
    if (audioBuffer && (mimeType.includes('wav') || (audioBuffer.length >= 4 && audioBuffer.slice(0, 4).toString() === 'RIFF'))) {
      if (isWavSilent(audioBuffer)) {
        return res.status(400).json({
          success: false,
          error: 'NO_SPEECH_DETECTED'
        });
      }
    }

    // Perform AI analysis using user's Gemini API key
    let analysis = null;
    let isSilentRecording = false;
    let isAuthFailure = false;
    let isQuotaFailure = false;

    if (audioBuffer) {
      try {
        analysis = await analyzeWithGemini({
          audioBuffer,
          mimeType,
          topic,
          category,
          duration,
          language,
          apiKey: userApiKey
        });
        if (analysis && analysis.noSpeechDetected) {
          isSilentRecording = true;
          analysis = null;
        } else if (analysis && analysis.authError) {
          isAuthFailure = true;
          analysis = null;
        } else if (analysis && analysis.quotaError) {
          isQuotaFailure = true;
          analysis = null;
        }
      } catch (err) {
        const safeMsg = err.message ? err.message.replace(/key=[^&]+/g, 'key=[REDACTED]') : 'Error';
        console.error('[BYOK] Gemini analysis error:', safeMsg);
      }
    }

    if (isSilentRecording) {
      return res.status(400).json({
        success: false,
        error: 'NO_SPEECH_DETECTED'
      });
    }

    if (isQuotaFailure) {
      return res.status(429).json({
        success: false,
        error: 'QUOTA_EXCEEDED',
        message: 'Gemini API quota or rate limit was reached. Please check your Gemini account.'
      });
    }

    if (isAuthFailure) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_API_KEY',
        message: 'Your Gemini API key appears to be invalid. Please check it in Settings.'
      });
    }

    // Never generate fallback score for missing key, invalid key, or failed AI request!
    if (!analysis) {
      return res.status(400).json({
        success: false,
        error: 'ANALYSIS_FAILED',
        message: 'Unable to analyze recording with your Gemini API key. Please check your key in Settings and try again.'
      });
    }

    // Build session record
    const newSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: 'user-1',
      topicId: topicId || 'custom',
      topic: topic,
      category: category,
      difficulty: difficulty,
      prepTime: Number(prepTime),
      speakingDuration: Number(speakingDuration),
      duration: Math.round(Number(duration)),
      date: new Date().toISOString(),
      audioUrl: audioUrl,
      overallScore: analysis.overallScore,
      scores: analysis.scores,
      feedback: analysis.feedback,
      engine: analysis.engine,
      language: language
    };

    // Save session
    const sessions = getSessions();
    sessions.unshift(newSession);
    saveSessions(sessions);

    res.status(201).json(newSession);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze recording', details: error.message });
  }
});

// Create HTTP Server & attach Live Interview WebSocket service
const server = http.createServer(app);
setupLiveInterview(server, app, { getSessions, saveSessions, ensureDirExists, dataDir });

// Explicit route for root GET /
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Fallback to index.html for SPA client-side routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/audio')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Start Server (strictly only when running locally, never on Vercel Serverless Functions)
if (!IS_VERCEL) {
  server.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`  ECHORA AI Speaking Coach Server`);
    console.log(`  Running on http://localhost:${PORT}`);
    console.log(`  Environment: Localhost`);
    console.log(`  Architecture: Full BYOK (Bring Your Own Key)`);
    console.log(`  AI Live Interview: Ready on ws://localhost:${PORT}/api/live-interview/ws`);
    console.log(`=========================================`);
  });
}

// Export Express app for Vercel Serverless Function
module.exports = app;
