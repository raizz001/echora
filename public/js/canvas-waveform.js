// ECHORA Canvas Waveforms (Hero Ambient Wave & Live Mic Visualizer)

class AmbientWaveform {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.phase = 0;
    this.isRunning = false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.width = rect.width;
    this.height = rect.height;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.animate();
  }

  stop() {
    this.isRunning = false;
  }

  animate() {
    if (!this.isRunning) return;
    this.phase += 0.008; // Very slow, calm movement
    this.draw();
    requestAnimationFrame(() => this.animate());
  }

  draw() {
    const { ctx, width, height, phase } = this;
    ctx.clearRect(0, 0, width, height);

    const centerY = height * 0.52;

    // Define subtle organic wave layers (Deep Forest, Mint & Warm Peach palette)
    const layers = [
      { color: 'rgba(36, 87, 77, 0.28)', speed: 1.0, freq: 0.005, amp: height * 0.12, offset: 0 },
      { color: 'rgba(111, 155, 140, 0.20)', speed: 1.3, freq: 0.008, amp: height * 0.09, offset: Math.PI / 3 },
      { color: 'rgba(191, 216, 203, 0.14)', speed: 0.7, freq: 0.0035, amp: height * 0.15, offset: Math.PI / 1.5 },
      { color: 'rgba(242, 166, 122, 0.10)', speed: 0.85, freq: 0.006, amp: height * 0.07, offset: Math.PI / 2.2 }
    ];

    layers.forEach(layer => {
      ctx.beginPath();
      ctx.strokeStyle = layer.color;
      ctx.lineWidth = 2.5;

      for (let x = 0; x <= width; x += 4) {
        // Natural tapered amplitude at ends so waveform stays centered
        const envelope = Math.sin((x / width) * Math.PI);
        const y = centerY + Math.sin(x * layer.freq + phase * layer.speed + layer.offset) * layer.amp * envelope +
                           Math.cos(x * layer.freq * 0.5 + phase * 0.5) * (layer.amp * 0.3) * envelope;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    });
  }
}

class LiveAudioVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.analyser = null;
    this.dataArray = null;
    this.isVisualizing = false;
    this.animId = null;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = (rect.width || 400) * window.devicePixelRatio;
    this.canvas.height = (rect.height || 100) * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.width = rect.width || 400;
    this.height = rect.height || 100;
  }

  connect(audioContext, streamSource) {
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 128;
    this.analyser.smoothingTimeConstant = 0.8;
    streamSource.connect(this.analyser);
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
  }

  start() {
    if (this.isVisualizing) return;
    this.isVisualizing = true;
    this.resize();
    this.loop();
  }

  stop() {
    this.isVisualizing = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    this.drawIdle();
  }

  drawIdle() {
    if (!this.ctx) return;
    const { ctx, width, height } = this;
    ctx.clearRect(0, 0, width, height);

    const centerY = height / 2;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(111, 155, 140, 0.3)';
    ctx.lineWidth = 2;
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
  }

  loop() {
    if (!this.isVisualizing) return;
    this.animId = requestAnimationFrame(() => this.loop());
    this.draw();
  }

  draw() {
    const { ctx, width, height, analyser, dataArray } = this;
    ctx.clearRect(0, 0, width, height);

    if (!analyser || !dataArray) {
      this.drawIdle();
      return;
    }

    analyser.getByteFrequencyData(dataArray);

    const centerY = height / 2;
    const barCount = 36;
    const barWidth = 4;
    const gap = (width - barCount * barWidth) / (barCount + 1);

    for (let i = 0; i < barCount; i++) {
      // Map index into frequency data
      const dataIndex = Math.floor((i / barCount) * (dataArray.length * 0.7));
      const value = dataArray[dataIndex] || 0;
      const normalized = value / 255;
      const barHeight = Math.max(4, normalized * (height * 0.85));

      const x = gap + i * (barWidth + gap);
      const y = centerY - barHeight / 2;

      // Subtle gradient from Soft Green to Soft Mint with Warm Peach hint at high volumes
      const isPeak = normalized > 0.75;
      const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
      
      if (isPeak) {
        gradient.addColorStop(0, '#F2A67A');
        gradient.addColorStop(1, '#6F9B8C');
      } else {
        gradient.addColorStop(0, '#BFD8CB');
        gradient.addColorStop(0.5, '#6F9B8C');
        gradient.addColorStop(1, '#24574D');
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 2);
      ctx.fill();
    }
  }
}

window.AmbientWaveform = AmbientWaveform;
window.LiveAudioVisualizer = LiveAudioVisualizer;
