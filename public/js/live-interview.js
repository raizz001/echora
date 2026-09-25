// ECHORA — AI Live Interview Frontend Controller
// True Real-Time Bidirectional Voice Interview with Gemini Multimodal Live API

class EchoraLiveInterview {
  constructor(options = {}) {
    this.options = options;
    this.ws = null;
    this.sessionId = null;
    this.config = null;
    this.state = 'idle'; // 'idle', 'connecting', 'listening', 'thinking', 'speaking', 'error', 'ended'
    
    // Audio Contexts
    this.inputAudioContext = null;
    this.outputAudioContext = null;
    this.micStream = null;
    this.micSource = null;
    this.scriptProcessor = null;
    this.analyser = null;
    
    // Audio Playback Queue & Continuous Cursor Scheduling
    this.playbackCursor = 0;
    this.nextPlayTime = 0;
    this.activeAudioSources = [];
    this.isMuted = false;
    this.interrupted = false;
    this.firstChunkPlayedInTurn = false;
    
    // Latency & Speech Timestamps
    this.speechStartTime = 0;
    this.speechEndTime = 0;

    // Audio Chunk Accumulator (~100ms chunks at 16kHz = 1600 samples)
    this.pcmAccumulator = [];
    this.pcmAccumulatorSamples = 0;
    this.TARGET_CHUNK_SAMPLES = 1600;
    
    // VAD & Confirmation State
    this.lastUserVoiceTime = 0;
    this.userSpeakingThreshold = 0.025; // RMS threshold for voice activity
    this.userSpeaking = false;
    this.silenceTimer = null;
    this.pendingUserTranscript = '';
    
    // Transcript, MediaRecorder & Speech Recognition
    this.speechRecognition = null;
    this.speechRecognitionActive = false;
    this.turnMediaRecorder = null;
    this.turnMediaRecorderMime = 'audio/webm';
    this.turnAudioChunks = [];
    this.lastConfirmedCandidateText = '';
    this.transcript = [];
    this.currentAiUtterance = '';
    this.currentUserUtterance = '';
    
    // Callbacks
    this.onStateChange = options.onStateChange || (() => {});
    this.onTranscriptUpdate = options.onTranscriptUpdate || (() => {});
    this.onTranscriptConfirmation = options.onTranscriptConfirmation || (() => {});
    this.onVolumeChange = options.onVolumeChange || (() => {});
    this.onError = options.onError || (() => {});
    this.onTurnComplete = options.onTurnComplete || (() => {});
  }

  // Set current state and trigger callback
  setState(newState) {
    if (this.state === newState) return;
    this.state = newState;
    this.onStateChange(newState);
  }

  // Initialize Speech Recognition if supported by browser
  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      this.speechRecognition = new SpeechRecognition();
      this.speechRecognition.continuous = true;
      this.speechRecognition.interimResults = true;
      this.speechRecognition.lang = this.config?.language === 'id' ? 'id-ID' : 'en-US';

      this.speechRecognition.onresult = (event) => {
        // Strictly ignore any results if not actively in listening state
        if (this.state !== 'listening') return;

        if (!this.userSpeaking) {
          this.userSpeaking = true;
          this.speechStartTime = Date.now();
        }
        this.lastUserVoiceTime = Date.now();

        let finalChunk = '';
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += ' ' + trans;
          } else {
            interim += trans;
          }
        }

        if (finalChunk.trim()) {
          this.pendingUserTranscript = (this.pendingUserTranscript + ' ' + finalChunk).trim();
        }

        this.currentUserUtterance = (this.pendingUserTranscript + (interim ? ' ' + interim : '')).trim();

        if (this.currentUserUtterance) {
          this.onTranscriptUpdate(this.transcript, {
            sender: 'user',
            text: this.currentUserUtterance,
            isInterim: true
          });

          // Auto-trigger confirmation modal after 2.8s of silence after speech
          if (this.silenceTimer) clearTimeout(this.silenceTimer);
          this.silenceTimer = setTimeout(() => {
            if (this.state === 'listening' && (this.currentUserUtterance || this.pendingUserTranscript)) {
              this.enterConfirmationState();
            }
          }, 2800);
        }
      };

      this.speechRecognition.onerror = (e) => {
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          console.warn('[TalkWithCoach] Speech recognition warning:', e.error);
        }
      };

      this.speechRecognition.onend = () => {
        // Only restart if still actively listening in the user's turn
        if (this.state === 'listening' && this.speechRecognitionActive) {
          try {
            this.speechRecognition.start();
          } catch (e) {}
        }
      };
    } catch (err) {
      console.warn('[TalkWithCoach] Speech recognition initialization:', err);
    }
  }

  // Start fresh listening cycle for user's turn
  startTurnListening() {
    this.userSpeaking = false;
    this.speechStartTime = 0;
    this.speechEndTime = 0;
    this.pendingUserTranscript = '';
    this.currentUserUtterance = '';
    this.lastConfirmedCandidateText = '';
    this.turnAudioChunks = [];
    this.firstChunkPlayedInTurn = false;
    if (this.outputAudioContext) {
      this.playbackCursor = this.outputAudioContext.currentTime;
      this.nextPlayTime = this.outputAudioContext.currentTime;
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    // Start browser Speech Recognition
    if (this.speechRecognition) {
      this.speechRecognitionActive = true;
      try { this.speechRecognition.abort(); } catch (e) {}
      setTimeout(() => {
        if (this.state === 'listening' && this.speechRecognitionActive) {
          try { this.speechRecognition.start(); } catch (e) {}
        }
      }, 150);
    }

    // Start turn audio recorder for high-accuracy fallback
    this.startTurnRecording();
  }

  // Record user audio during their turn
  startTurnRecording() {
    if (!this.micStream) return;
    try {
      this.turnAudioChunks = [];
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/wav'];
      let selectedMime = '';
      for (const m of mimeTypes) {
        if (window.MediaRecorder && MediaRecorder.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }
      this.turnMediaRecorderMime = selectedMime || 'audio/webm';
      const options = selectedMime ? { mimeType: selectedMime } : {};
      this.turnMediaRecorder = new MediaRecorder(this.micStream, options);

      this.turnMediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.turnAudioChunks.push(e.data);
        }
      };
      this.turnMediaRecorder.start(250);
    } catch (e) {
      console.warn('[TalkWithCoach] MediaRecorder start warning:', e);
    }
  }

  // Stop recording user turn and wait for final audio data
  stopTurnRecording() {
    return new Promise((resolve) => {
      if (!this.turnMediaRecorder || this.turnMediaRecorder.state === 'inactive') {
        return resolve();
      }
      const recorder = this.turnMediaRecorder;
      const onStopHandler = () => {
        resolve();
      };
      recorder.addEventListener('stop', onStopHandler, { once: true });
      try {
        recorder.stop();
      } catch (e) {
        resolve();
      }
      setTimeout(resolve, 300);
    });
  }

  // Enter confirmation state when user stops speaking (or presses Done Speaking)
  async enterConfirmationState() {
    if (this.state !== 'listening') return;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (!this.speechEndTime) {
      this.speechEndTime = Date.now();
    }
    this.userSpeaking = false;
    this.speechRecognitionActive = false;

    // Stop speech recognition while waiting for user confirmation
    if (this.speechRecognition) {
      try { this.speechRecognition.stop(); } catch (e) {}
    }

    // Wait for final turn audio chunks to be captured
    await this.stopTurnRecording();

    let textToConfirm = '';
    const webSpeechCandidate = (this.currentUserUtterance || this.pendingUserTranscript).trim();

    // Priority 1: High-accuracy server audio transcription
    // Uses full recorded turn audio sent to Gemini with strict verbatim non-translating rules
    if (this.turnAudioChunks.length > 0) {
      const audioBlob = new Blob(this.turnAudioChunks, { type: this.turnMediaRecorderMime || 'audio/webm' });
      if (audioBlob.size > 2000) { // Meaningful audio captured (> ~0.15s)
        this.setState('confirming');
        // Let UI display checking indicator
        this.onTranscriptConfirmation('...');

        try {
          const base64Data = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const res = reader.result;
              const base64 = typeof res === 'string' ? res.split(',')[1] : '';
              resolve(base64);
            };
            reader.readAsDataURL(audioBlob);
          });

            const apiKey = window.EchoraBYOK?.getKey() || '';
            const apiBase = window.ECHORA_CONFIG?.API_BASE_URL || '';
            const headers = { 'Content-Type': 'application/json' };
            if (apiKey) {
              headers['x-gemini-api-key'] = apiKey;
            }
            const res = await fetch(`${apiBase}/api/live-interview/transcribe`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                audioData: base64Data,
                mimeType: this.turnMediaRecorderMime || 'audio/webm',
                language: this.config?.language || 'id',
                sessionId: this.sessionId
              })
            });

            if (res.ok) {
              const data = await res.json();
              if (data.transcript && data.transcript.trim()) {
                textToConfirm = data.transcript.trim();
              }
            }
        } catch (err) {
          console.warn('[TalkWithCoach] High-accuracy audio transcribe warning:', err);
        }
      }
    }

    // Fallback: If server transcription was unreachable or empty, use Web Speech text candidate if valid
    if (!textToConfirm && webSpeechCandidate && webSpeechCandidate.length >= 3) {
      textToConfirm = webSpeechCandidate;
    }

    // If both server transcribe and Web Speech are empty or noise:
    // textToConfirm remains empty (''), prompting Section 7 UI:
    // "Aku kurang menangkap bagian itu. Coba ulangi?" / "I didn't quite catch that. Try again?" + [ ↻ Speak again ]
    this.lastConfirmedCandidateText = textToConfirm;
    this.setState('confirming');
    this.onTranscriptConfirmation(textToConfirm);
  }

  // User confirms transcript ("✓ That's right")
  confirmTurn(confirmedText) {
    const text = (confirmedText !== undefined && confirmedText !== null ? confirmedText : (this.lastConfirmedCandidateText || this.currentUserUtterance || this.pendingUserTranscript)).trim();
    if (!text) {
      this.retrySpeaking();
      return;
    }

    this.pendingUserTranscript = '';
    this.currentUserUtterance = '';
    this.userSpeaking = false;
    this.lastConfirmedCandidateText = '';
    this.turnAudioChunks = [];
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    // Add user turn to dialogue transcript
    this.addTranscriptEntry('user', text);
    this.setState('thinking');

    // Send user_turn to backend relay -> triggers Gemini Live answer
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'user_turn',
        text: text,
        speechStartTime: this.speechStartTime || 0,
        speechEndTime: this.speechEndTime || Date.now()
      }));
    }
  }

  // User clicks "↻ Speak again" (Section 6)
  retrySpeaking() {
    this.pendingUserTranscript = '';
    this.currentUserUtterance = '';
    this.userSpeaking = false;
    this.lastConfirmedCandidateText = '';
    this.turnAudioChunks = [];
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    this.stopTurnRecording();
    this.setState('listening');
    this.onTranscriptUpdate(this.transcript, { sender: 'user', text: '', isInterim: true });

    // Restart fresh listening for the retry
    this.startTurnListening();
  }

  // Manually signal done speaking (e.g. "Done Speaking" button)
  doneSpeaking() {
    if (this.state === 'listening') {
      if (!this.speechEndTime) {
        this.speechEndTime = Date.now();
      }
      this.enterConfirmationState();
    }
  }

  // Add dialogue entry to transcript and inform backend
  addTranscriptEntry(sender, text) {
    if (!text || !text.trim()) return;
    const entry = {
      sender,
      text: text.trim(),
      timestamp: Date.now()
    };
    this.transcript.push(entry);
    this.onTranscriptUpdate(this.transcript, entry);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'transcript_update',
        sender,
        text: text.trim()
      }));
    }
  }

  // Start Live Interview Session
  async startSession(config) {
    this.config = config;
    this.setState('connecting');
    this.transcript = [];
    this.interrupted = false;

    // 1. Request microphone access first
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
    } catch (err) {
      this.setState('error');
      const msg = err.name === 'NotAllowedError'
        ? 'Microphone permission was denied. Please allow microphone access in your browser.'
        : `Could not access microphone: ${err.message}`;
      this.onError(msg);
      return false;
    }

    // 2. Initialize Web Audio Contexts
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.inputAudioContext = new AudioContextClass();
    
    // Initialize output audio context (try 24kHz native, fallback cleanly if unsupported)
    try {
      this.outputAudioContext = new AudioContextClass({ sampleRate: 24000 });
    } catch (e) {
      this.outputAudioContext = new AudioContextClass();
    }

    if (this.inputAudioContext.state === 'suspended') {
      await this.inputAudioContext.resume();
    }
    if (this.outputAudioContext.state === 'suspended') {
      await this.outputAudioContext.resume();
    }

    this.playbackCursor = this.outputAudioContext.currentTime;
    this.nextPlayTime = this.outputAudioContext.currentTime;
    this.firstChunkPlayedInTurn = false;

    // 3. Create Session via Backend REST API
    try {
      const apiKey = window.EchoraBYOK?.getKey() || '';
      const apiBase = window.ECHORA_CONFIG?.API_BASE_URL || '';
      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) {
        headers['x-gemini-api-key'] = apiKey;
      }
      const res = await fetch(`${apiBase}/api/live-interview/session`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...config })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || `Server responded with status ${res.status}`);
      }

      const sessionData = await res.json();
      this.sessionId = sessionData.sessionId;

      // 4. Connect WebSocket with flexible configuration (supports external WebSocket server in production)
      const defaultWsBase = (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host;
      const wsBase = window.ECHORA_CONFIG?.WS_URL || defaultWsBase;
      const endpoint = sessionData.wsEndpoint || '/api/live-interview/ws';
      const sep = wsBase.endsWith('/') ? '' : '/';
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
      const baseWsUrl = wsBase.includes('/api/live-interview/ws') ? wsBase : `${wsBase}${sep}${cleanEndpoint}`;
      const wsUrl = `${baseWsUrl}${baseWsUrl.includes('?') ? '&' : '?'}sessionId=${this.sessionId}`;

      this.connectWebSocket(wsUrl);

      // 5. Start audio processing and speech recognition
      this.setupMicrophoneProcessor();
      this.initSpeechRecognition();
      return true;
    } catch (err) {
      console.error('[LiveInterview] Session initialization failed:', err);
      this.setState('error');
      this.onError(err.message);
      this.cleanupAudio();
      return false;
    }
  }

  // Connect WebSocket to backend relay
  connectWebSocket(wsUrl) {
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('[TalkWithCoach] Connected to backend WebSocket');
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'ready') {
          console.log('[TalkWithCoach] AI Coach session is ready, preparing topic question...');
          this.setState('thinking');
        } else if (msg.type === 'interrupted') {
          console.log('[TalkWithCoach] Interruption confirmed by server');
          this.handleBargeIn(false);
        } else if (msg.type === 'audio') {
          // Streaming PCM chunk from Gemini Live
          if (this.state !== 'speaking') {
            this.setState('speaking');
          }
          this.playPcmChunk(msg.pcm, msg.mimeType, msg.serverTimestamp);
        } else if (msg.type === 'ai_text') {
          if (msg.text) {
            this.currentAiUtterance += ' ' + msg.text;
            this.onTranscriptUpdate(this.transcript, {
              sender: 'ai',
              text: this.currentAiUtterance.trim(),
              isInterim: true
            });
          }
        } else if (msg.type === 'turn_complete') {
          this.firstChunkPlayedInTurn = false;
          if (this.currentAiUtterance.trim()) {
            this.addTranscriptEntry('ai', this.currentAiUtterance.trim());
            this.currentAiUtterance = '';
          }
          // Turn finished upstream. Wait until queued audio buffer finishes before transitioning to listening
          const remainingPlayMs = (this.outputAudioContext && this.playbackCursor > this.outputAudioContext.currentTime)
            ? Math.round((this.playbackCursor - this.outputAudioContext.currentTime) * 1000)
            : 0;

          setTimeout(() => {
            if (this.state === 'speaking') {
              // AI finished speaking. Immediately transition to listening for user's speech.
              // NEVER show confirmation or "That's right" after AI voice!
              this.pendingUserTranscript = '';
              this.currentUserUtterance = '';
              this.userSpeaking = false;
              if (this.silenceTimer) {
                clearTimeout(this.silenceTimer);
                this.silenceTimer = null;
              }
              this.setState('listening');
              this.startTurnListening();
            }
            this.onTurnComplete();
        } else if (msg.type === 'gemini_closed') {
          console.warn('[TalkWithCoach] Gemini connection closed by upstream:', msg.code, msg.message);
          if (this.state !== 'ended') {
            this.setState('error');
            const errorMsg = msg.message || 'Your Gemini API key appears to be invalid. Please check it in Settings.';
            this.onError(errorMsg);
          }
        } else if (msg.type === 'error') {
          console.error('[TalkWithCoach] Server error:', msg.message);
          this.setState('error');
          this.onError(msg.message);
        }
      } catch (err) {
        console.warn('[TalkWithCoach] Error processing WS message:', err);
      }
    };

    this.ws.onerror = (err) => {
      console.error('[TalkWithCoach] WebSocket error:', err);
      if (this.state !== 'ended') {
        this.setState('error');
        this.onError('Connection to voice server was disrupted.');
      }
    };

    this.ws.onclose = (e) => {
      console.log('[TalkWithCoach] WebSocket closed:', e.code);
      if (this.state !== 'ended' && this.state !== 'error') {
        this.setState('error');
        this.onError('Session connection closed.');
      }
    };
  }

  // Set up microphone capture, downsample to 16kHz Int16 PCM, and buffer into ~100ms chunks
  setupMicrophoneProcessor() {
    if (!this.inputAudioContext || !this.micStream) return;

    this.micSource = this.inputAudioContext.createMediaStreamSource(this.micStream);
    this.analyser = this.inputAudioContext.createAnalyser();
    this.analyser.fftSize = 256;

    // Buffer size 2048 gives smooth ~43ms frames from audio thread
    this.scriptProcessor = this.inputAudioContext.createScriptProcessor(2048, 1, 1);

    this.micSource.connect(this.analyser);
    this.analyser.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.inputAudioContext.destination);

    const inputSampleRate = this.inputAudioContext.sampleRate;
    const targetSampleRate = 16000;

    this.pcmAccumulator = [];
    this.pcmAccumulatorSamples = 0;

    this.scriptProcessor.onaudioprocess = (e) => {
      if (this.isMuted || this.state === 'ended') return;

      const inputChannelData = e.inputBuffer.getChannelData(0);

      // 1. Calculate RMS volume for visualizer
      let sum = 0;
      for (let i = 0; i < inputChannelData.length; i++) {
        sum += inputChannelData[i] * inputChannelData[i];
      }
      const rms = Math.sqrt(sum / inputChannelData.length);

      // Only notify visualizer of mic volume when user is in listening or confirming state
      if (this.state === 'listening' || this.state === 'confirming') {
        this.onVolumeChange(rms, 'user');
      }

      // 2. User Voice Activity & Silence / Interruption Detection
      if (this.state === 'speaking') {
        // Voice activity detected while AI is speaking -> Instant Barge-in (interruption)
        if (rms > this.userSpeakingThreshold * 1.6) {
          console.log('[TalkWithCoach] User voice detected while AI speaking -> Barge-in triggered');
          this.handleBargeIn(true);
        }
      } else if (this.state === 'listening') {
        if (rms > this.userSpeakingThreshold) {
          if (!this.userSpeaking) {
            this.userSpeaking = true;
            this.speechStartTime = Date.now();
          }
          this.lastUserVoiceTime = Date.now();
          if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
          }
        } else if (this.userSpeaking && !this.silenceTimer) {
          // User finished speaking phrase; trigger confirmation modal after 2.8s of silence
          this.silenceTimer = setTimeout(() => {
            if (this.state === 'listening' && this.userSpeaking) {
              this.speechEndTime = Date.now();
              this.enterConfirmationState();
            }
          }, 2800);
        }
      }
    };
  }

  // Downsample Float32Array to 16kHz Int16 Little-Endian Buffer
  downsampleTo16kPcm(buffer, inputRate, outputRate) {
    if (outputRate === inputRate) {
      const output = new Int16Array(buffer.length);
      for (let i = 0; i < buffer.length; i++) {
        const s = Math.max(-1, Math.min(1, buffer[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      return output.buffer;
    }

    const sampleRateRatio = inputRate / outputRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Int16Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      const s = count > 0 ? accum / count : buffer[offsetBuffer];
      const clamped = Math.max(-1, Math.min(1, s));
      result[offsetResult] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }

    return result.buffer;
  }

  // Helper: Convert ArrayBuffer to Base64
  bufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // Play incoming 24kHz 16-bit PCM chunk smoothly with zero-jitter continuous Web Audio scheduling
  playPcmChunk(base64Pcm, mimeType, serverTimestamp) {
    if (this.interrupted || !this.outputAudioContext) return;

    try {
      const binaryString = window.atob(base64Pcm);
      const len = binaryString.length;
      if (len === 0) return;

      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert 16-bit PCM (little-endian) to Float32Array safely using DataView
      const numSamples = Math.floor(len / 2);
      const dataView = new DataView(bytes.buffer, bytes.byteOffset, numSamples * 2);
      const float32Array = new Float32Array(numSamples);
      for (let i = 0; i < numSamples; i++) {
        float32Array[i] = dataView.getInt16(i * 2, true) / 32768.0;
      }

      // Create AudioBuffer at 24000Hz mono (Gemini native rate)
      const audioBuffer = this.outputAudioContext.createBuffer(1, float32Array.length, 24000);
      audioBuffer.copyToChannel(float32Array, 0);

      // Create source node
      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputAudioContext.destination);

      const currentTime = this.outputAudioContext.currentTime;

      // Continuous playback cursor scheduling:
      // When starting a new turn, buffer 35ms ahead to absorb initial network jitter.
      // If cursor is in the past (underrun during streaming), reschedule smoothly with 8ms cushion.
      let scheduledTime;
      if (!this.firstChunkPlayedInTurn || this.playbackCursor <= currentTime) {
        const cushion = this.firstChunkPlayedInTurn ? 0.008 : 0.035;
        scheduledTime = currentTime + cushion;
        if (!this.firstChunkPlayedInTurn) {
          this.firstChunkPlayedInTurn = true;
          const playbackLatency = serverTimestamp ? (Date.now() - serverTimestamp) : 0;
          console.log(`[LIVE] Browser playback started (initial buffer latency: ${playbackLatency}ms)`);
        }
      } else {
        scheduledTime = this.playbackCursor;
      }

      source.start(scheduledTime);
      this.playbackCursor = scheduledTime + audioBuffer.duration;
      this.nextPlayTime = this.playbackCursor;

      // Track active source for instant barge-in cancellation
      this.activeAudioSources.push(source);
      source.onended = () => {
        const idx = this.activeAudioSources.indexOf(source);
        if (idx !== -1) {
          this.activeAudioSources.splice(idx, 1);
        }
      };

      // Measure RMS of output for AI visualizer wave
      let sum = 0;
      const step = Math.max(1, Math.floor(float32Array.length / 64));
      let count = 0;
      for (let i = 0; i < float32Array.length; i += step) {
        sum += float32Array[i] * float32Array[i];
        count++;
      }
      const aiRms = Math.sqrt(sum / count);
      this.onVolumeChange(aiRms, 'ai');
    } catch (err) {
      console.warn('[LiveInterview] Audio playback error:', err);
    }
  }

  // Handle Barge-In / Interruption (Immediately cut off AI speech)
  handleBargeIn(notifyServer = true) {
    this.interrupted = true;
    this.firstChunkPlayedInTurn = false;

    // 1. Immediately stop all currently scheduled/playing audio buffer sources
    for (const src of this.activeAudioSources) {
      try {
        src.stop(0);
        src.disconnect();
      } catch (e) {}
    }
    this.activeAudioSources = [];

    // 2. Reset scheduling clock
    if (this.outputAudioContext) {
      this.playbackCursor = this.outputAudioContext.currentTime;
      this.nextPlayTime = this.outputAudioContext.currentTime;
    }

    // 3. Clear mic chunk accumulator
    this.pcmAccumulator = [];
    this.pcmAccumulatorSamples = 0;

    // 4. Immediately switch UI state back to 'listening'
    this.setState('listening');

    // 5. Commit any partial AI utterance so far
    if (this.currentAiUtterance.trim()) {
      this.addTranscriptEntry('ai', this.currentAiUtterance.trim() + ' [interrupted]');
      this.currentAiUtterance = '';
    }

    // 6. Notify backend of barge-in if initiated locally
    if (notifyServer && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'interrupt' }));
    }

    // Start fresh listening for user speech
    this.startTurnListening();

    // Reset interruption flag after a short grace period
    setTimeout(() => {
      this.interrupted = false;
    }, 300);
  }

  // Toggle Microphone Mute
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.micStream) {
      this.micStream.getAudioTracks().forEach(track => {
        track.enabled = !this.isMuted;
      });
    }
    return this.isMuted;
  }

  // End Interview and fetch AI feedback
  async endInterview(durationSeconds) {
    this.setState('ended');

    // Stop all audio playback
    this.handleBargeIn();

    // Commit any pending AI text
    if (this.currentAiUtterance.trim()) {
      this.addTranscriptEntry('ai', this.currentAiUtterance.trim());
      this.currentAiUtterance = '';
    }

    // Stop speech recognition
    if (this.speechRecognition) {
      try { this.speechRecognition.stop(); } catch (e) {}
    }

    // Close WebSocket
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
    }

    // Clean up audio hardware
    this.cleanupAudio();

    // Call End Session API for feedback analysis
    try {
      const apiKey = window.EchoraBYOK?.getKey() || '';
      const apiBase = window.ECHORA_CONFIG?.API_BASE_URL || '';
      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) {
        headers['x-gemini-api-key'] = apiKey;
      }
      const res = await fetch(`${apiBase}/api/live-interview/end`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId: this.sessionId,
          duration: durationSeconds,
          transcript: this.transcript,
          language: this.config?.language || 'id',
          voice: this.config?.voice || 'Puck',
          interviewType: this.config?.interviewType || 'School'
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned error status ${res.status}`);
      }

      const result = await res.json();
      return result;
    } catch (err) {
      console.error('[TalkWithCoach] Error generating evaluation:', err);
      throw err;
    }
  }

  // Free audio hardware and contexts
  cleanupAudio() {
    this.speechRecognitionActive = false;
    if (this.speechRecognition) {
      try { this.speechRecognition.stop(); } catch (e) {}
    }
    this.stopTurnRecording();

    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.scriptProcessor) {
      try { this.scriptProcessor.disconnect(); } catch (e) {}
      this.scriptProcessor = null;
    }
    if (this.micSource) {
      try { this.micSource.disconnect(); } catch (e) {}
      this.micSource = null;
    }
    if (this.inputAudioContext) {
      try { this.inputAudioContext.close(); } catch (e) {}
      this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
      try { this.outputAudioContext.close(); } catch (e) {}
      this.outputAudioContext = null;
    }
  }
}

window.EchoraLiveInterview = EchoraLiveInterview;
