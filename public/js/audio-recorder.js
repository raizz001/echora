// ECHORA Voice Recording Controller (MediaRecorder + Web Audio API)

class EchoraRecorder {
  constructor(visualizer) {
    this.visualizer = visualizer;
    this.mediaRecorder = null;
    this.audioContext = null;
    this.stream = null;
    this.chunks = [];
    this.recordedBlob = null;
    this.recordedUrl = null;
    this.startTime = 0;
    this.pausedTime = 0;
    this.totalPausedDuration = 0;
    this.timerInterval = null;
    this.elapsedSeconds = 0;
    this.targetSeconds = 60;
    this.state = 'idle'; // 'idle', 'recording', 'paused', 'stopped'
    this.onTick = null;
    this.onComplete = null;
    this.onError = null;
    this.speechRecognition = null;
    this.transcript = '';
    this.speechFramesCount = 0;
    this.maxRms = 0;
    this.language = 'en';
    this.analyser = null;
  }

  async initMic() {
    if (this.stream) return true;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Hook up Web Audio Analyser to live visualizer
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      if (this.visualizer) {
        this.visualizer.connect(this.audioContext, source);
      }
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.3;
      source.connect(this.analyser);
      return true;
    } catch (err) {
      console.error('Microphone initialization failed:', err);
      if (this.onError) this.onError(err);
      return false;
    }
  }

  async start(targetSeconds = 60, onTick, onComplete, onError, language = 'en') {
    this.targetSeconds = targetSeconds;
    this.onTick = onTick;
    this.onComplete = onComplete;
    this.onError = onError;
    this.language = language;
    this.chunks = [];
    this.recordedBlob = null;
    this.elapsedSeconds = 0;
    this.totalPausedDuration = 0;
    this.transcript = '';
    this.speechFramesCount = 0;
    this.maxRms = 0;

    const micOk = await this.initMic();
    if (!micOk) return false;

    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav'
    ];
    let selectedMime = '';
    for (const mime of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mime)) {
        selectedMime = mime;
        break;
      }
    }

    try {
      const options = selectedMime ? { mimeType: selectedMime } : {};
      this.mediaRecorder = new MediaRecorder(this.stream, options);
    } catch (e) {
      this.mediaRecorder = new MediaRecorder(this.stream);
    }

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.finalizeRecording();
    };

    this.mediaRecorder.start(250); // Slice every 250ms
    this.startTime = Date.now();
    this.state = 'recording';

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        this.speechRecognition = new SpeechRecognition();
        this.speechRecognition.continuous = true;
        this.speechRecognition.interimResults = true;
        this.speechRecognition.lang = this.language === 'id' ? 'id-ID' : 'en-US';
        this.speechRecognition.onresult = (event) => {
          let str = '';
          for (let i = 0; i < event.results.length; i++) {
            str += event.results[i][0].transcript + ' ';
          }
          this.transcript = str.trim();
        };
        this.speechRecognition.onerror = () => {};
        this.speechRecognition.start();
      } catch (e) {
        this.speechRecognition = null;
      }
    }

    if (this.visualizer) {
      this.visualizer.start();
    }

    this.startTimer();
    return true;
  }

  startTimer() {
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.state !== 'recording') return;
      
      const now = Date.now();
      const currentElapsed = Math.floor((now - this.startTime - this.totalPausedDuration) / 1000);
      this.elapsedSeconds = currentElapsed;

      // Sample microphone RMS volume for speech activity detection
      if (this.analyser) {
        let rms = 0;
        if (this.analyser.getFloatTimeDomainData) {
          const pcmData = new Float32Array(this.analyser.fftSize);
          this.analyser.getFloatTimeDomainData(pcmData);
          let sum = 0;
          for (let i = 0; i < pcmData.length; i++) {
            sum += pcmData[i] * pcmData[i];
          }
          rms = Math.sqrt(sum / pcmData.length);
        } else {
          const byteData = new Uint8Array(this.analyser.fftSize);
          this.analyser.getByteTimeDomainData(byteData);
          let sum = 0;
          for (let i = 0; i < byteData.length; i++) {
            const val = (byteData[i] - 128) / 128;
            sum += val * val;
          }
          rms = Math.sqrt(sum / byteData.length);
        }

        if (rms > this.maxRms) {
          this.maxRms = rms;
        }

        // Voice activity threshold aligned with TalkWith Coach (0.025)
        if (rms >= 0.025) {
          this.speechFramesCount++;
        }
      }

      if (this.onTick) {
        this.onTick(this.elapsedSeconds, this.targetSeconds);
      }

      // Auto stop when limit reached
      if (this.elapsedSeconds >= this.targetSeconds) {
        this.stop();
      }
    }, 200);
  }

  pause() {
    if (this.mediaRecorder && this.state === 'recording') {
      this.mediaRecorder.pause();
      this.pausedTime = Date.now();
      this.state = 'paused';
      if (this.visualizer) {
        this.visualizer.stop();
      }
    }
  }

  resume() {
    if (this.mediaRecorder && this.state === 'paused') {
      this.mediaRecorder.resume();
      this.totalPausedDuration += (Date.now() - this.pausedTime);
      this.state = 'recording';
      if (this.visualizer) {
        this.visualizer.start();
      }
    }
  }

  stop() {
    if (this.mediaRecorder && (this.state === 'recording' || this.state === 'paused')) {
      clearInterval(this.timerInterval);
      this.state = 'stopped';
      if (this.speechRecognition) {
        try { this.speechRecognition.stop(); } catch (e) {}
      }
      if (this.visualizer) {
        this.visualizer.stop();
      }
      this.mediaRecorder.stop();
    }
  }

  finalizeRecording() {
    const mime = (this.mediaRecorder && this.mediaRecorder.mimeType) || 'audio/webm';
    this.recordedBlob = new Blob(this.chunks, { type: mime });
    if (this.recordedUrl) {
      URL.revokeObjectURL(this.recordedUrl);
    }
    this.recordedUrl = URL.createObjectURL(this.recordedBlob);

    // Determine whether meaningful speech was captured:
    // 1. Valid transcript from SpeechRecognition (at least 2 non-whitespace characters)
    // 2. Or audio volume/RMS sustained above voice threshold (at least 2 frames and maxRms >= 0.025)
    const hasTranscript = Boolean(this.transcript && this.transcript.trim().length >= 2);
    const hasAudioEnergy = Boolean(this.speechFramesCount >= 2 && this.maxRms >= 0.025);
    const hasMeaningfulSpeech = hasTranscript || hasAudioEnergy;

    if (this.onComplete) {
      this.onComplete({
        blob: this.recordedBlob,
        url: this.recordedUrl,
        duration: Math.max(1, this.elapsedSeconds),
        mimeType: mime,
        transcript: this.transcript || '',
        hasSpeech: hasMeaningfulSpeech
      });
    }
  }

  reset() {
    clearInterval(this.timerInterval);
    if (this.speechRecognition) {
      try { this.speechRecognition.stop(); } catch (e) {}
      this.speechRecognition = null;
    }
    this.transcript = '';
    this.speechFramesCount = 0;
    this.maxRms = 0;
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.stop(); } catch (e) { }
    }
    if (this.visualizer) {
      this.visualizer.stop();
    }
    this.state = 'idle';
    this.elapsedSeconds = 0;
    this.chunks = [];
  }

  cleanup() {
    this.reset();
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      try { this.audioContext.close(); } catch (e) { }
      this.audioContext = null;
    }
  }
}

window.EchoraRecorder = EchoraRecorder;
