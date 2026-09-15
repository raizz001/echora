# ECHORA — Speak. Reflect. Evolve.

**ECHORA** is an AI-powered public speaking practice platform crafted with a **Clean Futuristic + Dark Deep Forest** visual identity.

> **“Speak. Reflect. Evolve.”**
> *Practice your voice. Let AI help you improve.*

---

## 🌲 Visual Design & Aesthetics

- **Family of Dark Forest & Deep Teal**:
  - Main Background: `#0B211E` (Deep Forest)
  - Surface Backgrounds: `#102D29` (Dark Green), `#143A35` (Deep Teal)
  - Primary Tones: `#163B36`, `#24574D`, `#6F9B8C`, `#8BA89D`
  - Subtle Accents: `#BFD8CB` (Soft Mint) and `#F2A67A` (Warm Peach for pulse & CTA highlights)
  - Text: `#F3F1E8` (Primary cream), `#BFD0C8` (Secondary), `#8BA89D` (Muted)
- **Design Principles**:
  - Minimal, calm, intelligent, and youth-friendly.
  - Less text, more visual.
  - Abstract audio waveforms and real-time canvas visualizers.
  - Centered hero typography as focal point.
  - Zero cyberpunk, zero white background.

---

## 🎯 Core User Flow

1. **Landing Page**: Big centered focal hero typography, slow ambient audio waveform canvas, and a 3-step "HOW IT WORKS" breakdown.
2. **Dashboard**: "Welcome back, [Name]", "TODAY'S CHALLENGE" (random topic with flexible preparation and speaking duration controls), and "RECENT SESSIONS".
3. **Speaking Challenge**: Topics across 8 categories (*Technology, Education, Environment, Society, Daily Life, Leadership, Future, Opinion*).
4. **Preparation**: Focused "Prepare yourself" countdown (3-2-1) before recording begins.
5. **Voice Recording**: Minimalist recording studio with live MediaRecorder, pulsing recording indicator (`● Recording`), timer, and real-time Web Audio API frequency visualizer.
6. **Post-Recording**: Custom audio player with seek, volume, and duration, followed by **Analyze with AI**.
7. **AI Analysis**: Powered by **Google Gemini API** (with intelligent fallback coach) delivering:
   - **Overall Score** (0-100) with circular progress ring
   - **Score Breakdown**: Content, Fluency, Articulation, Pace, Expression
   - **Feedback**:
     - *WHAT YOU DID WELL* (2–3 specific points)
     - *WHAT TO IMPROVE* (2–3 actionable points)
     - *NEXT STEP* (1 dedicated practice drill)
8. **Speaking History**: Persistent storage of recordings and previous analysis. Replay any recording anytime with full audio controls and inspect past coaching feedback without re-running the AI.
9. **Simple Profile**: Edit display name, view Total Sessions and Total Speaking Time.
10. **Bilingual Switcher**: Seamless instant toggle between **English** and **Bahasa Indonesia**.

---

## 🚀 Quick Start

### 1. Requirements
- Node.js (v18+)
- Modern web browser with microphone access

### 2. Installation
```bash
npm install
```

### 3. Configure Gemini AI API Key (Optional but Recommended)
Create or edit `.env` in the root folder:
```env
PORT=3000
GEMINI_API_KEY=your_google_gemini_api_key_here
```
> *Note:* If no API key is provided, ECHORA automatically runs in intelligent simulation mode with realistic scoring and constructive feedback in both English and Indonesian, allowing full offline testing!

### 4. Run the Server
```bash
node server.js
```
or in development mode:
```bash
npm run dev
```

Open your browser at:
```
http://localhost:3000
```

---

## 📁 Project Architecture

```
echora/
├── data/
│   ├── profile.json            # User profile data
│   ├── sessions.json           # Speaking history & AI evaluations
│   └── topics.json             # 18+ curated topics across 8 categories (EN & ID)
├── public/
│   ├── audio/                  # Demo audio samples
│   ├── css/
│   │   └── style.css           # Dark Deep Forest design system & responsive styling
│   ├── js/
│   │   ├── app.js              # Application controller & view routing
│   │   ├── audio-player.js     # Custom audio player (seek, volume, duration)
│   │   ├── audio-recorder.js   # Web Audio API + MediaRecorder recording controller
│   │   ├── canvas-waveform.js  # Ambient hero wave & live microphone visualizer
│   │   └── translations.js     # Full English & Bahasa Indonesia dictionaries
│   └── index.html              # Core single-page application structure
├── uploads/                    # Recorded user voice files (.webm / .wav)
├── .env                        # Environment configuration
├── .env.example                # Example environment template
├── package.json
└── server.js                   # Node.js + Express backend with Gemini API integration
```

---

## 🛡️ Privacy & Audio Analysis Details
AI analysis evaluates only audio nuances (content structure, fluency, pauses, pacing, articulation, and vocal expressiveness). Visual aspects such as body language or eye contact are deliberately excluded as this platform is audio-focused.
