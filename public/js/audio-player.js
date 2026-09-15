// ECHORA Custom Audio Player Component
// Allows play, pause, seek, duration display, and volume control

class EchoraAudioPlayer {
  constructor(container, audioSrc) {
    this.container = typeof container === 'string' ? document.getElementById(container) : container;
    this.audioSrc = audioSrc;
    this.audio = new Audio();
    this.isPlaying = false;
    this.render();
    this.bindEvents();
    if (audioSrc) {
      this.load(audioSrc);
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="echora-player">
        <button class="player-btn play-btn" aria-label="Play/Pause">
          <svg class="play-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <polygon points="6 4 20 12 6 20 6 4"></polygon>
          </svg>
          <svg class="pause-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="display:none;">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
        </button>

        <div class="player-timeline">
          <input type="range" class="player-seek" min="0" max="100" value="0" step="0.1" aria-label="Audio Timeline">
          <div class="player-seek-fill"></div>
        </div>

        <div class="player-time">
          <span class="curr-time">00:00</span>
          <span class="time-sep">/</span>
          <span class="dur-time">00:00</span>
        </div>

        <div class="player-volume-control">
          <button class="player-btn vol-btn" aria-label="Volume">
            <svg class="vol-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          </button>
          <input type="range" class="player-vol-slider" min="0" max="1" step="0.05" value="1" aria-label="Volume">
        </div>
      </div>
    `;

    this.playBtn = this.container.querySelector('.play-btn');
    this.playIcon = this.container.querySelector('.play-icon');
    this.pauseIcon = this.container.querySelector('.pause-icon');
    this.seekInput = this.container.querySelector('.player-seek');
    this.seekFill = this.container.querySelector('.player-seek-fill');
    this.currTimeEl = this.container.querySelector('.curr-time');
    this.durTimeEl = this.container.querySelector('.dur-time');
    this.volBtn = this.container.querySelector('.vol-btn');
    this.volSlider = this.container.querySelector('.player-vol-slider');
  }

  load(src) {
    this.audioSrc = src;
    this.audio.src = src;
    this.audio.preload = 'metadata';
    this.seekInput.value = 0;
    this.seekFill.style.width = '0%';
    this.currTimeEl.textContent = '00:00';
    this.durTimeEl.textContent = '00:00';
    this.setPlayingState(false);
  }

  bindEvents() {
    this.playBtn.addEventListener('click', () => this.togglePlay());

    this.seekInput.addEventListener('input', () => {
      const pct = this.seekInput.value;
      this.seekFill.style.width = `${pct}%`;
      if (this.audio.duration) {
        this.audio.currentTime = (pct / 100) * this.audio.duration;
      }
    });

    this.volSlider.addEventListener('input', () => {
      this.audio.volume = parseFloat(this.volSlider.value);
    });

    this.volBtn.addEventListener('click', () => {
      if (this.audio.volume > 0) {
        this.lastVolume = this.audio.volume;
        this.audio.volume = 0;
        this.volSlider.value = 0;
      } else {
        const restore = this.lastVolume || 1;
        this.audio.volume = restore;
        this.volSlider.value = restore;
      }
    });

    this.audio.addEventListener('loadedmetadata', () => {
      this.durTimeEl.textContent = this.formatTime(this.audio.duration);
    });

    this.audio.addEventListener('timeupdate', () => {
      if (!this.audio.duration) return;
      const pct = (this.audio.currentTime / this.audio.duration) * 100;
      this.seekInput.value = pct;
      this.seekFill.style.width = `${pct}%`;
      this.currTimeEl.textContent = this.formatTime(this.audio.currentTime);
    });

    this.audio.addEventListener('ended', () => {
      this.setPlayingState(false);
      this.seekInput.value = 0;
      this.seekFill.style.width = '0%';
      this.currTimeEl.textContent = '00:00';
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('Audio playback error:', e);
    });
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    // Pause any other playing audio on the page
    document.querySelectorAll('audio').forEach(a => {
      if (a !== this.audio) a.pause();
    });
    this.audio.play().then(() => {
      this.setPlayingState(true);
    }).catch(err => {
      console.warn('Play prevented:', err);
    });
  }

  pause() {
    this.audio.pause();
    this.setPlayingState(false);
  }

  setPlayingState(playing) {
    this.isPlaying = playing;
    if (playing) {
      this.playIcon.style.display = 'none';
      this.pauseIcon.style.display = 'block';
      this.playBtn.classList.add('is-playing');
    } else {
      this.playIcon.style.display = 'block';
      this.pauseIcon.style.display = 'none';
      this.playBtn.classList.remove('is-playing');
    }
  }

  formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  destroy() {
    this.pause();
    this.audio.src = '';
  }
}

window.EchoraAudioPlayer = EchoraAudioPlayer;
