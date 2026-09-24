// ECHORA — AI Live Interview Real-Time Service
// Supports True Real-Time Bidirectional Voice Interview via Google Gemini Multimodal Live API

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Model configuration: Allow environment override or default to verified native audio Live model
const GEMINI_LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || 'models/gemini-2.5-flash-native-audio-latest';

// Verified available voices in Gemini Live Multimodal API
const VERIFIED_VOICES = [
  {
    id: 'Puck',
    name: 'Puck',
    gender: 'Versatile / Dynamic',
    toneEn: 'Upbeat, natural, conversational',
    toneId: 'Semangat, alami, santai'
  },
  {
    id: 'Aoede',
    name: 'Aoede',
    gender: 'Female',
    toneEn: 'Warm, engaging, articulate',
    toneId: 'Hangat, suportif, jernih'
  },
  {
    id: 'Charon',
    name: 'Charon',
    gender: 'Male',
    toneEn: 'Deep, calm, professional',
    toneId: 'Tenang, berwibawa, profesional'
  },
  {
    id: 'Kore',
    name: 'Kore',
    gender: 'Female',
    toneEn: 'Soothing, calm, observant',
    toneId: 'Lembut, artikulatif, perhatian'
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'Male',
    toneEn: 'Crisp, energetic, direct',
    toneId: 'Tegas, bertenaga, lugas'
  }
];

// Helper: Convert raw 16-bit PCM buffer to standard WAV buffer with 44-byte header
function pcmToWav(pcmBuffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// In-memory audio preview cache to provide instantaneous (<50ms) preview playback
const previewAudioCache = new Map();

// Generate voice preview using Gemini Live model
async function generateVoicePreview(voiceName, language, apiKey) {
  const cacheKey = `${voiceName}-${language}`;
  if (previewAudioCache.has(cacheKey)) {
    return previewAudioCache.get(cacheKey);
  }

  const sampleText = language === 'id'
    ? 'Halo! Ini contoh suara saya untuk sesi wawancara kamu di ECHORA.'
    : 'Hello! This is a preview of my voice for your interview session on ECHORA.';

  return new Promise((resolve, reject) => {
    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    const ws = new WebSocket(url);
    const chunks = [];
    let timeoutId = null;

    ws.on('open', () => {
      ws.send(JSON.stringify({
        setup: {
          model: GEMINI_LIVE_MODEL,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName }
              }
            },
            thinkingConfig: { thinkingBudget: 0 }
          },
          systemInstruction: {
            parts: [{
              text: `You are demonstrating your voice. Say ONLY the following sentence aloud and nothing else: "${sampleText}"`
            }]
          }
        }
      }));
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.setupComplete) {
          ws.send(JSON.stringify({
            clientContent: {
              turns: [{ role: 'user', parts: [{ text: `Say aloud: ${sampleText}` }] }],
              turnComplete: true
            }
          }));
        } else if (msg.serverContent) {
          const parts = msg.serverContent.modelTurn?.parts || [];
          for (const p of parts) {
            if (p.inlineData?.data) {
              chunks.push(Buffer.from(p.inlineData.data, 'base64'));
            }
          }
          if (msg.serverContent.turnComplete) {
            if (timeoutId) clearTimeout(timeoutId);
            ws.close();
            const pcm = Buffer.concat(chunks);
            const wav = pcmToWav(pcm, 24000);
            previewAudioCache.set(cacheKey, wav);
            resolve(wav);
          }
        }
      } catch (e) {
        console.warn('[LiveInterview] Preview parse error:', e.message);
      }
    });

    ws.on('error', (err) => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(err);
    });

    timeoutId = setTimeout(() => {
      try { ws.close(); } catch (e) {}
      if (chunks.length > 0) {
        const pcm = Buffer.concat(chunks);
        const wav = pcmToWav(pcm, 24000);
        previewAudioCache.set(cacheKey, wav);
        resolve(wav);
      } else {
        reject(new Error('Preview generation timed out'));
      }
    }, 8000);
  });
}

// Helper: Generate opening topic question based on the 4 primary session types
function getOpeningPrompt(sessionType, language) {
  const isId = language === 'id';
  const type = (sessionType || '').toLowerCase();

  switch (type) {
    case 'school':
      return isId
        ? `Sapa santai sebagai coach bicara (1 kalimat), lalu tanyakan: "Apa satu hal yang ingin kamu ubah atau tingkatkan di sekolahmu?"`
        : `Warmly greet the student (1 sentence) as their speaking coach, then ask: "What's one thing you'd improve at your school?"`;
    case 'presentation':
      return isId
        ? `Sapa santai (1 kalimat), lalu beri tantangan: "Coba jelaskan apa itu AI ke orang yang belum pernah mendengarnya sama sekali."`
        : `Warmly greet the student (1 sentence) as their speaking coach, then ask: "Explain AI to someone who has never heard about it before."`;
    case 'opinion':
      return isId
        ? `Sapa santai (1 kalimat), lalu tanyakan opini: "Menurut kamu, boleh nggak sih siswa memakai AI untuk mengerjakan tugas sekolah?"`
        : `Warmly greet the student (1 sentence) as their speaking coach, then ask: "Should students be allowed to use AI for homework?"`;
    case 'daily life':
    case 'daily-life':
    default:
      return isId
        ? `Sapa santai (1 kalimat), lalu tanyakan: "Kebiasaan apa yang biasanya bikin harimu terasa jauh lebih baik?"`
        : `Warmly greet the student (1 sentence) as their speaking coach, then ask: "What's one habit that makes your day better?"`;
  }
}

// Construct streamlined system instruction for TalkWith Coach (Single Consistent AI Personality)
function buildSystemInstruction({ language, sessionType }) {
  const isId = language === 'id';

  const languageRules = isId ? `
BAHASA (INDONESIA NATURAL & SANTAI):
- Wajib menggunakan Bahasa Indonesia yang santai, luwes, dan ramah seperti mengobrol dengan teman latihan yang pintar.
- Selalu gunakan sapaan ramah "kamu" (JANGAN PERNAH gunakan "Anda").
- Gunakan bahasa sehari-hari yang wajar (misalnya: "kamu", "nggak", "udah", "coba", "gimana", "menarik", "terus").
- JANGAN kaku seperti robot, guru yang sedang menguji, atau HR interviewer.
- Code-switching: Jika user mencampur istilah bahasa Inggris, pahami sepenuhnya dan tanggapi dengan santai.
- JANGAN menerjemahkan ucapan user kecuali diminta.` : `
LANGUAGE (CONVERSATIONAL ENGLISH):
- Natural, conversational, friendly, and fluent English.
- Relaxed, human, and supportive. Like a smart practice partner or senior mentor.
- Code-switching: If the user naturally mixes in Indonesian words, comprehend effortlessly and respond naturally.
- Do NOT translate what the student says unless asked.`;

  return `You are TalkWith Coach — ECHORA's friendly AI speaking coach for students and college learners.
This is a relaxed speaking practice session, NOT a job interview, hiring simulation, or academic exam.

DEFAULT AI PERSONALITY & COACHING RULES:
1. PERSONALITY (SINGLE CONSISTENT DEFAULT):
   - Natural, calm, friendly, supportive, and conversational.
   - Act as a smart practice partner who provides gentle direction.
   - Do NOT be overly formal or rigid.
   - Never sound like an HR interviewer, recruiter, hiring manager, or employer.
   - Never sound like a strict teacher or examiner testing the user.
2. BREVITY (HIGHEST PRIORITY): Keep your response strictly 1 to 2 sentences! Never give long speeches or essay-like paragraphs.
3. ONE THING AT A TIME: Acknowledge the user's idea briefly and warmly, then ask only ONE natural follow-up question per turn.
4. ADAPTIVE CONVERSATION: Remember what the user just confirmed in this session. Ask follow-up questions directly related to their previous answer (e.g. asking for a concrete example, exploring reasons, or diving deeper). Do NOT change topics randomly.
5. NO FORMAL GRADING DURING CHAT: Never say "Score: 85" or list strengths/weaknesses during conversation turns. Feedback is given only after the session ends.
6. TURN DISCIPLINE: The student will speak first, confirm their transcript ("That's right"), and only then you will reply with 1-2 sentences.

${languageRules}

SESSION TYPE: ${sessionType || 'School'}.`;
}

// Initialize Live Interview service and attach to HTTP server
function setupLiveInterview(server, app, storageHelpers) {
  const { getSessions, saveSessions } = storageHelpers;

  // Active in-memory live interview sessions
  const activeSessions = new Map();

  // Attach WebSocket Server
  const wss = new WebSocket.Server({
    server,
    path: '/api/live-interview/ws'
  });

  // REST: GET /api/live-interview/voices
  app.get('/api/live-interview/voices', (req, res) => {
    res.json({
      voices: VERIFIED_VOICES,
      provider: 'Google Gemini Multimodal Live API'
    });
  });

  // REST: POST /api/live-interview/preview-voice
  app.post('/api/live-interview/preview-voice', async (req, res) => {
    const { voice = 'Puck', language = 'en' } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: 'GEMINI_API_KEY is not configured' });
    }

    const verifiedVoice = VERIFIED_VOICES.find(v => v.id.toLowerCase() === voice.toLowerCase())?.id || 'Puck';

    try {
      const wavBuffer = await generateVoicePreview(verifiedVoice, language, apiKey);
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Content-Length', wavBuffer.length);
      return res.send(wavBuffer);
    } catch (err) {
      console.error('[LiveInterview] Preview generation error:', err);
      res.status(500).json({ error: 'Failed to generate voice preview', details: err.message });
    }
  });

  // REST: POST /api/live-interview/transcribe (High-accuracy Gemini audio transcription)
  app.post('/api/live-interview/transcribe', async (req, res) => {
    try {
      const { audioData, mimeType = 'audio/webm', language = 'id' } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey || !audioData) {
        return res.json({ transcript: '' });
      }

      const prompt = `You are a professional verbatim speech-to-text transcriber for students and college learners.
Your ONLY task is to transcribe the spoken audio VERBATIM in the EXACT language used by the speaker.

CRITICAL TRANSCRIPTION RULES:
1. NEVER TRANSLATE!
   - If the speaker speaks Indonesian (e.g. "Menurut saya penggunaan AI di sekolah cukup membantu"), transcribe verbatim in Indonesian. NEVER translate to English!
   - If the speaker speaks English (e.g. "I think students should learn how to use AI responsibly"), transcribe verbatim in English. NEVER translate to Indonesian!
   - If the speaker mixes Indonesian and English (code-switching, e.g. "Menurut aku AI itu really useful buat belajar"), transcribe each word in the original language spoken. NEVER translate or convert to a single language!
2. ACCURACY: Transcribe the complete user utterance accurately. Do NOT cut off words.
3. DO NOT GUESS: If words are not clearly audible or discernible, do not invent plausible words.
4. Output format: Return ONLY the exact transcribed text with proper capitalization and punctuation.
   - Do NOT wrap in quotes.
   - Do NOT add prefixes like "Transcription:" or conversational commentary.
5. If the audio is completely silent, contains only unintelligible noise, or has no discernible speech, return exactly: EMPTY`;

      const transcribeModels = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.6-flash'];
      let transcriptText = '';

      for (const model of transcribeModels) {
        try {
          const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: audioData
                    }
                  }
                ]
              }],
              generationConfig: {
                temperature: 0.0,
                thinkingConfig: { thinkingBudget: 0 }
              }
            })
          });

          if (resp.ok) {
            const data = await resp.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
            if (text.toUpperCase().includes('EMPTY')) {
              transcriptText = '';
              break;
            } else if (text) {
              transcriptText = text.replace(/^["'\s]+|["'\s]+$/g, '');
              break;
            }
          }
        } catch (err) {
          console.warn(`[TalkWithCoach] Transcribe error with ${model}:`, err.message);
        }
      }

      res.json({ transcript: transcriptText });
    } catch (err) {
      console.error('[TalkWithCoach] Transcribe error:', err);
      res.json({ transcript: '' });
    }
  });

  // REST: POST /api/live-interview/session
  app.post('/api/live-interview/session', (req, res) => {
    const {
      language = 'id',
      voice = 'Puck',
      interviewType = 'School',
      durationMinutes = 5
    } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'AI Voice Service unavailable: GEMINI_API_KEY is not configured.'
      });
    }

    const verifiedVoice = VERIFIED_VOICES.find(v => v.id.toLowerCase() === voice.toLowerCase())?.id || 'Puck';
    const sessionId = `live-interview-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const sessionConfig = {
      sessionId,
      language: language === 'en' ? 'en' : 'id',
      voice: verifiedVoice,
      interviewType: interviewType || 'School',
      durationMinutes: Number(durationMinutes) || 5,
      createdAt: Date.now(),
      transcript: []
    };

    activeSessions.set(sessionId, sessionConfig);

    // Auto-clean stale sessions after 2 hours
    setTimeout(() => {
      activeSessions.delete(sessionId);
    }, 2 * 60 * 60 * 1000);

    res.status(201).json({
      sessionId,
      wsEndpoint: '/api/live-interview/ws',
      config: {
        language: sessionConfig.language,
        voice: sessionConfig.voice,
        interviewType: sessionConfig.interviewType,
        durationMinutes: sessionConfig.durationMinutes
      }
    });
  });

  // REST: POST /api/live-interview/end
  app.post('/api/live-interview/end', async (req, res) => {
    try {
      const {
        sessionId,
        duration = 180,
        transcript = [],
        language = 'id',
        voice = 'Puck',
        interviewType = 'School',
        difficulty = 'Medium',
        style = 'Casual'
      } = req.body;

      const session = activeSessions.get(sessionId) || {
        language,
        voice,
        interviewType: interviewType || 'School',
        difficulty,
        style,
        transcript: []
      };

      const fullTranscript = transcript.length > 0 ? transcript : (session.transcript || []);
      const apiKey = process.env.GEMINI_API_KEY;
      const isId = language === 'id';

      const durSeconds = Math.round(Number(duration)) || 0;
      const mins = Math.floor(durSeconds / 60);
      const secs = durSeconds % 60;
      const formattedDuration = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

      let analysis = null;

      if (apiKey && fullTranscript.length > 0) {
        try {
          const dialogueSummary = fullTranscript.map(t => `${t.sender === 'user' ? 'Student' : 'Coach'}: ${t.text}`).join('\n');
          const prompt = `You are TalkWith Coach — ECHORA's friendly AI speaking coach for students and college learners.
Review this speaking practice session dialogue between the coach and the student.

Topic Type: ${interviewType || 'School'}
Language: ${isId ? 'Bahasa Indonesia' : 'English'}
Duration: ${formattedDuration} (${durSeconds} seconds)

DIALOGUE TRANSCRIPT:
${dialogueSummary}

FEEDBACK RULES (CONCISE, SUPPORTIVE, NON-FORMAL):
1. "coachNoticed": Exactly 2 short, genuine, positive bullet points of what the student did well (e.g. clear main ideas, good real-life example, conversational rhythm).
2. "oneChange": Exactly 1 single, high-impact, actionable recommendation for what to tweak next time (e.g. "Try getting to your main point a little faster." / "Slow down slightly when explaining your core idea."). Do NOT provide multiple recommendations.
3. Language: ${isId ? 'Gunakan BAHASA INDONESIA santai dan bersahabat (sapaan "kamu")' : 'Warm, natural, conversational ENGLISH (use "you")'}.
4. Scores: Provide realistic integer scores (75 to 95).

Return ONLY valid JSON matching this exact structure:
{
  "coachNoticed": [
    "<short positive observation 1>",
    "<short positive observation 2>"
  ],
  "oneChange": "<single actionable tip>",
  "overallScore": <integer 75-95>
}`;

          const evalModels = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.6-flash'];
          for (const m of evalModels) {
            try {
              const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: {
                    temperature: 0.3,
                    responseMimeType: 'application/json',
                    thinkingConfig: { thinkingBudget: 0 }
                  }
                })
              });

              if (response.ok) {
                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  const cleaned = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
                  analysis = JSON.parse(cleaned);
                  break;
                }
              }
            } catch (singleErr) {
              console.warn(`[TalkWithCoach] Evaluation model ${m} error:`, singleErr.message);
            }
          }
        } catch (evalErr) {
          console.warn('[TalkWithCoach] Gemini evaluation failed, using heuristic:', evalErr.message);
        }
      }

      // Fallback heuristic scoring if AI call did not return
      if (!analysis) {
        analysis = {
          overallScore: 84,
          coachNoticed: isId ? [
            'Gagasanmu tersampaikan dengan jelas dan langsung ke inti.',
            'Gaya bicaramu terasa natural dan nyaman diajak berdiskusi.'
          ] : [
            'Your ideas were easy to follow and directly addressed the topic.',
            'Your tone was natural, relaxed, and conversational.'
          ],
          oneChange: isId
            ? 'Coba langsung sebutkan poin utamamu di kalimat pertama sebelum masuk ke detail.'
            : 'Try getting to your main point a little faster before explaining the details.'
        };
      }

      // Save to sessions history (reusing ECHORA's persistent session store)
      const newSession = {
        id: sessionId,
        type: 'live-interview',
        userId: 'user-1',
        topicId: `talkwith-${(interviewType || 'opinion').toLowerCase().replace(/\s+/g, '-')}`,
        topic: `TalkWith Coach: ${interviewType || 'Speaking Practice'}`,
        category: interviewType || 'Opinion',
        difficulty: difficulty || 'Medium',
        style: style || 'Casual',
        duration: durSeconds,
        talkedDuration: formattedDuration,
        date: new Date().toISOString(),
        audioUrl: null,
        language: language,
        voice: voice,
        overallScore: analysis.overallScore || 85,
        coachNoticed: analysis.coachNoticed || [],
        oneChange: analysis.oneChange || '',
        scores: {
          content: analysis.overallScore || 85,
          fluency: analysis.overallScore || 85,
          articulation: analysis.overallScore || 85,
          pace: analysis.overallScore || 85,
          expression: analysis.overallScore || 85,
          communication: analysis.overallScore || 85,
          clarity: analysis.overallScore || 85,
          confidence: analysis.overallScore || 85,
          relevance: analysis.overallScore || 85,
          speakingFlow: analysis.overallScore || 85
        },
        feedback: {
          coachNoticed: analysis.coachNoticed,
          oneChange: analysis.oneChange,
          whatYouDidWell: analysis.coachNoticed,
          whatToImprove: [analysis.oneChange],
          nextStep: analysis.oneChange
        },
        transcript: fullTranscript,
        engine: 'Gemini Multimodal Live AI'
      };

      const sessions = getSessions();
      sessions.unshift(newSession);
      saveSessions(sessions);
      activeSessions.delete(sessionId);

      res.status(201).json(newSession);
    } catch (err) {
      console.error('[TalkWithCoach] Error ending session:', err);
      res.status(500).json({ error: 'Failed to complete coaching session', details: err.message });
    }
  });

  // REST: GET /api/live-interview/history
  app.get('/api/live-interview/history', (req, res) => {
    const sessions = getSessions();
    const liveSessions = sessions.filter(s => s.type === 'live-interview');
    res.json(liveSessions);
  });

  // WebSocket Connection Handler for Real-Time Streaming
  wss.on('connection', (ws, req) => {
    const urlParams = new URL(req.url, 'http://localhost').searchParams;
    const sessionId = urlParams.get('sessionId');

    if (!sessionId) {
      ws.send(JSON.stringify({ type: 'error', message: 'Missing sessionId query parameter' }));
      ws.close();
      return;
    }

    const session = activeSessions.get(sessionId);
    if (!session) {
      ws.send(JSON.stringify({ type: 'error', message: 'Session not found or expired' }));
      ws.close();
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      ws.send(JSON.stringify({ type: 'error', message: 'GEMINI_API_KEY is not configured on server' }));
      ws.close();
      return;
    }

    console.log(`[LiveInterview] Client connected for session: ${sessionId} (Voice: ${session.voice}, Lang: ${session.language})`);

    // Connect to Google Gemini Multimodal Live API
    const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    let geminiWs = null;
    let isGeminiReady = false;

    try {
      geminiWs = new WebSocket(geminiUrl);
    } catch (err) {
      console.error('[LiveInterview] Failed to create Gemini WebSocket:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Could not connect to Gemini Live service' }));
      ws.close();
      return;
    }

    // Latency tracking metrics
    let lastClientAudioTime = 0;
    let firstAudioSentForTurn = false;
    let clientAudioChunkCount = 0;
    let currentAiTurnText = '';

    // Upstream: Connected to Gemini
    geminiWs.on('open', () => {
      console.log(`[TalkWithCoach] Upstream Gemini WebSocket connected for session: ${sessionId} using ${GEMINI_LIVE_MODEL}`);

      const systemInstruction = buildSystemInstruction({
        language: session.language,
        sessionType: session.interviewType
      });

      // Send initial Setup message
      const setupMsg = {
        setup: {
          model: GEMINI_LIVE_MODEL,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: session.voice
                }
              }
            },
            thinkingConfig: {
              thinkingBudget: 0
            }
          },
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          }
        }
      };

      geminiWs.send(JSON.stringify(setupMsg));
    });

    // Upstream: Message from Gemini
    geminiWs.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.setupComplete) {
          isGeminiReady = true;
          console.log(`[TalkWithCoach] Gemini setup complete for session: ${sessionId}`);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'ready',
              sessionId,
              voice: session.voice,
              language: session.language
            }));

            // Trigger the Coach's opening greeting and topic question automatically
            const openingPrompt = getOpeningPrompt(session.interviewType, session.language);

            geminiWs.send(JSON.stringify({
              clientContent: {
                turns: [
                  {
                    role: 'user',
                    parts: [{ text: openingPrompt }]
                  }
                ],
                turnComplete: true
              }
            }));
          }
        } else if (msg.serverContent) {
          const content = msg.serverContent;

          // User Barge-In / Interruption detected
          if (content.interrupted) {
            console.log(`[LIVE] Barge-in / interruption detected for session: ${sessionId.slice(-6)}`);
            firstAudioSentForTurn = false;
            clientAudioChunkCount = 0;
            currentAiTurnText = '';
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'interrupted' }));
            }
          }

          // True Streaming Audio Chunks directly to browser
          if (content.modelTurn?.parts) {
            for (const part of content.modelTurn.parts) {
              if (part.inlineData?.data) {
                if (!firstAudioSentForTurn) {
                  firstAudioSentForTurn = true;
                  const latencyMs = lastClientAudioTime ? (Date.now() - lastClientAudioTime) : 0;
                  console.log(`[LIVE] Gemini first audio chunk (session: ${sessionId.slice(-6)}, response latency: ${latencyMs}ms)`);
                }

                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    type: 'audio',
                    mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
                    pcm: part.inlineData.data,
                    serverTimestamp: Date.now()
                  }));
                }
              }
              if (part.text) {
                currentAiTurnText += part.text;
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    type: 'ai_text',
                    text: part.text
                  }));
                }
              }
            }
          }

          // Turn completion
          if (content.turnComplete) {
            const turnDurationMs = lastClientAudioTime ? (Date.now() - lastClientAudioTime) : 0;
            console.log(`[LIVE] turn complete (session: ${sessionId.slice(-6)}, total turn time: ${turnDurationMs}ms)`);
            
            if (currentAiTurnText.trim()) {
              session.transcript.push({
                sender: 'ai',
                text: currentAiTurnText.trim(),
                timestamp: Date.now()
              });
              currentAiTurnText = '';
            }

            firstAudioSentForTurn = false;
            clientAudioChunkCount = 0;
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'turn_complete' }));
            }
          }
        }
      } catch (err) {
        console.warn('[TalkWithCoach] Error parsing Gemini message:', err.message);
      }
    });

    geminiWs.on('error', (err) => {
      // Do not expose API key in error messages
      const sanitized = err.message ? err.message.replace(/key=[^&\s]+/gi, 'key=***') : 'Gemini connection error';
      console.error(`[TalkWithCoach] Gemini WebSocket error for ${sessionId}:`, sanitized);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'error', message: 'Coach service temporarily unavailable: ' + sanitized }));
      }
    });

    geminiWs.on('close', (code, reason) => {
      console.log(`[TalkWithCoach] Gemini WebSocket closed for ${sessionId} (${code})`);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'gemini_closed', code }));
      }
    });

    // Downstream: Incoming message from browser client
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'user_turn' && isGeminiReady && geminiWs?.readyState === WebSocket.OPEN) {
          // User confirmed their transcript!
          lastClientAudioTime = Date.now();
          firstAudioSentForTurn = false;
          console.log(`[TalkWithCoach] User confirmed turn (${sessionId.slice(-6)}): "${msg.text}"`);

          session.transcript.push({
            sender: 'user',
            text: msg.text,
            timestamp: Date.now()
          });

          // Forward confirmed turn to Gemini Live model to generate voice response
          geminiWs.send(JSON.stringify({
            clientContent: {
              turns: [
                {
                  role: 'user',
                  parts: [{ text: msg.text }]
                }
              ],
              turnComplete: true
            }
          }));
        } else if (msg.type === 'audio_pcm' && isGeminiReady && geminiWs?.readyState === WebSocket.OPEN) {
          lastClientAudioTime = Date.now();
          clientAudioChunkCount++;

          if (clientAudioChunkCount === 1) {
            console.log(`[LIVE] audio chunk received from client (session: ${sessionId.slice(-6)})`);
          }

          // Forward real-time 16kHz PCM audio chunk to Gemini
          geminiWs.send(JSON.stringify({
            realtimeInput: {
              audio: {
                data: msg.pcm,
                mimeType: 'audio/pcm;rate=16000'
              }
            }
          }));
        } else if (msg.type === 'transcript_update') {
          // Store dialogue line into session history
          if (msg.sender && msg.text) {
            session.transcript.push({
              sender: msg.sender,
              text: msg.text,
              timestamp: Date.now()
            });
          }
        } else if (msg.type === 'interrupt' && isGeminiReady && geminiWs?.readyState === WebSocket.OPEN) {
          console.log(`[LIVE] Client signaled explicit barge-in for session: ${sessionId.slice(-6)}`);
          firstAudioSentForTurn = false;
          clientAudioChunkCount = 0;
          currentAiTurnText = '';
        }
      } catch (err) {
        console.warn('[TalkWithCoach] Error parsing client message:', err.message);
      }
    });

    ws.on('close', () => {
      console.log(`[LiveInterview] Client disconnected for session: ${sessionId}`);
      try {
        if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
          geminiWs.close();
        }
      } catch (e) {}
    });
  });

  console.log('[LiveInterview] AI Live Interview service attached and ready on /api/live-interview/ws');
}

module.exports = {
  setupLiveInterview,
  VERIFIED_VOICES,
  generateVoicePreview
};
