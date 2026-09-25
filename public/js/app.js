// ECHORA — Main Application Controller

document.addEventListener('DOMContentLoaded', () => {
  // Global State
  const state = {
    currentLang: 'en',
    currentView: 'landing',
    userProfile: {
      name: 'Alex Pratama',
      title: 'Public Speaking Learner',
      totalSessions: 0,
      totalSpeakingTime: 0
    },
    currentTopic: null,
    selectedCategoryFilter: 'All',
    selectedDifficultyFilter: 'All',
    lastTopicId: null,
    selectedPrepTime: 30, // seconds
    selectedSpeakingDuration: 60, // seconds
    currentRecording: null, // { blob, url, duration, mimeType }
    lastAnalysisResult: null,
    sessions: [],
    historyFilter: 'all',
    prepInterval: null,
    postRecordPlayer: null,
    resultAudioPlayer: null,
    modalAudioPlayer: null,
    ambientWave: null,
    liveVisualizer: null,
    recorder: null,
    
    // Live Interview State
    liveConfig: {
      language: 'id',
      voice: 'Puck',
      interviewType: 'School',
      durationMinutes: 5
    },
    liveSession: null,
    liveTimerInterval: null,
    liveRemainingSeconds: 300,
    liveElapsedSeconds: 0,
    liveWaveVisualizer: null,
    activePreviewAudio: null
  };

  // DOM Element References
  const dom = {
    // Navigation
    navBrand: document.getElementById('nav-brand-logo'),
    navLiveInterview: document.getElementById('nav-btn-live-interview'),
    navDashboard: document.getElementById('nav-btn-dashboard'),
    navHistory: document.getElementById('nav-btn-history'),
    navProfile: document.getElementById('nav-btn-profile'),
    navStart: document.getElementById('nav-btn-start'),
    langBtnEn: document.getElementById('lang-btn-en'),
    langBtnId: document.getElementById('lang-btn-id'),

    // Views
    views: {
      landing: document.getElementById('view-landing'),
      dashboard: document.getElementById('view-landing'),
      prep: document.getElementById('view-prep'),
      recording: document.getElementById('view-recording'),
      postRecord: document.getElementById('view-post-record'),
      analyzing: document.getElementById('view-analyzing'),
      result: document.getElementById('view-result'),
      history: document.getElementById('view-history'),
      liveSetup: document.getElementById('view-live-setup'),
      liveRoom: document.getElementById('view-live-room'),
      liveResult: document.getElementById('view-live-result')
    },

    // Landing
    heroStart: document.getElementById('cta-hero-start'),

    // Dashboard
    userNameHeader: document.getElementById('user-display-name-header'),
    categoryBadge: document.getElementById('challenge-category-badge'),
    difficultyBadge: document.getElementById('challenge-difficulty-badge'),
    categorySelect: document.getElementById('challenge-category-select'),
    difficultySelect: document.getElementById('challenge-difficulty-select'),
    btnRollTopic: document.getElementById('btn-roll-topic'),
    topicText: document.getElementById('challenge-topic-text'),
    topicDesc: document.getElementById('challenge-topic-desc'),
    prepSelector: document.getElementById('prep-time-selector'),
    customPrepWrap: document.getElementById('custom-prep-wrap'),
    customPrepInput: document.getElementById('custom-prep-input'),
    durationSelector: document.getElementById('speaking-duration-selector'),
    customDurationWrap: document.getElementById('custom-duration-wrap'),
    customDurationInput: document.getElementById('custom-duration-input'),
    btnStartChallenge: document.getElementById('btn-start-challenge'),
    dashboardRecentList: document.getElementById('dashboard-recent-list'),
    btnViewAllHistory: document.getElementById('btn-view-all-history'),

    // Prep
    prepCountdownNum: document.getElementById('prep-countdown-num'),
    prepTopicText: document.getElementById('prep-topic-text'),
    btnPrepCancel: document.getElementById('btn-prep-cancel'),
    btnPrepSkip: document.getElementById('btn-prep-skip'),

    // Recording
    recordingTopicTitle: document.getElementById('recording-topic-title'),
    recStatusText: document.getElementById('rec-status-text'),
    recCurrTimer: document.getElementById('rec-curr-timer'),
    recTotalTimer: document.getElementById('rec-total-timer'),
    btnRecPause: document.getElementById('btn-rec-pause'),
    btnRecPauseLabel: document.getElementById('btn-rec-pause-label'),
    btnRecStop: document.getElementById('btn-rec-stop'),

    // Post-Recording
    postRecordTopicText: document.getElementById('post-record-topic-text'),
    postRecordAudioPlayer: document.getElementById('post-record-audio-player'),
    btnRecordAgain: document.getElementById('btn-record-again'),
    btnAnalyzeAi: document.getElementById('btn-analyze-ai'),

    // Analyzing
    aiLoadingStatusText: document.getElementById('ai-loading-status-text'),

    // Result
    resultCategoryBadge: document.getElementById('result-category-badge'),
    resultTopicTitle: document.getElementById('result-topic-title'),
    resultOverallScore: document.getElementById('result-overall-score'),
    resultRingProgress: document.getElementById('result-ring-progress'),
    breakdownContentVal: document.getElementById('breakdown-content-val'),
    breakdownContentBar: document.getElementById('breakdown-content-bar'),
    breakdownFluencyVal: document.getElementById('breakdown-fluency-val'),
    breakdownFluencyBar: document.getElementById('breakdown-fluency-bar'),
    breakdownArticulationVal: document.getElementById('breakdown-articulation-val'),
    breakdownArticulationBar: document.getElementById('breakdown-articulation-bar'),
    breakdownPaceVal: document.getElementById('breakdown-pace-val'),
    breakdownPaceBar: document.getElementById('breakdown-pace-bar'),
    breakdownExpressionVal: document.getElementById('breakdown-expression-val'),
    breakdownExpressionBar: document.getElementById('breakdown-expression-bar'),
    resultAudioPlayerContainer: document.getElementById('result-audio-player-container'),
    resultDidWellList: document.getElementById('result-did-well-list'),
    resultToImproveList: document.getElementById('result-to-improve-list'),
    resultNextStepText: document.getElementById('result-next-step-text'),
    btnResultViewHistory: document.getElementById('btn-result-view-history'),
    btnResultPracticeAnother: document.getElementById('btn-result-practice-another'),

    // History
    historyFilterChips: document.getElementById('history-filter-chips'),
    historySessionsList: document.getElementById('history-sessions-list'),

    // Modals
    modalAnalysis: document.getElementById('modal-analysis-detail'),
    btnCloseAnalysisModal: document.getElementById('btn-close-analysis-modal'),
    modalCategoryBadge: document.getElementById('modal-category-badge'),
    modalTopicTitle: document.getElementById('modal-topic-title'),
    modalAudioContainer: document.getElementById('modal-audio-player-container'),
    modalOverallScore: document.getElementById('modal-overall-score'),
    modalRingProgress: document.getElementById('modal-ring-progress'),
    modalBreakdownContentVal: document.getElementById('modal-breakdown-content-val'),
    modalBreakdownContentBar: document.getElementById('modal-breakdown-content-bar'),
    modalBreakdownFluencyVal: document.getElementById('modal-breakdown-fluency-val'),
    modalBreakdownFluencyBar: document.getElementById('modal-breakdown-fluency-bar'),
    modalBreakdownArticulationVal: document.getElementById('modal-breakdown-articulation-val'),
    modalBreakdownArticulationBar: document.getElementById('modal-breakdown-articulation-bar'),
    modalBreakdownPaceVal: document.getElementById('modal-breakdown-pace-val'),
    modalBreakdownPaceBar: document.getElementById('modal-breakdown-pace-bar'),
    modalBreakdownExpressionVal: document.getElementById('modal-breakdown-expression-val'),
    modalBreakdownExpressionBar: document.getElementById('modal-breakdown-expression-bar'),
    modalDidWellList: document.getElementById('modal-did-well-list'),
    modalToImproveList: document.getElementById('modal-to-improve-list'),
    modalNextStepText: document.getElementById('modal-next-step-text'),

    // Profile / Settings Modal & BYOK
    modalProfile: document.getElementById('modal-profile'),
    btnCloseProfileModal: document.getElementById('btn-close-profile-modal'),
    profileStatSessions: document.getElementById('profile-stat-sessions'),
    profileStatTime: document.getElementById('profile-stat-time'),
    profileForm: document.getElementById('profile-form'),
    profileNameInput: document.getElementById('profile-name-input'),

    // BYOK Elements
    byokSettingsSection: document.getElementById('byok-settings-section'),
    byokSavedView: document.getElementById('byok-saved-view'),
    byokEditView: document.getElementById('byok-edit-view'),
    byokKeyMasked: document.getElementById('byok-key-masked'),
    byokKeyPlaintextBox: document.getElementById('byok-key-plaintext-box'),
    byokInputKey: document.getElementById('byok-input-key'),
    btnByokToggleShow: document.getElementById('btn-byok-toggle-show'),
    btnByokReplace: document.getElementById('btn-byok-replace'),
    btnByokRemove: document.getElementById('btn-byok-remove'),
    btnByokTestSaved: document.getElementById('btn-byok-test-saved'),
    btnByokSaveKey: document.getElementById('btn-byok-save-key'),
    btnByokTestInput: document.getElementById('btn-byok-test-input'),
    btnByokCancelEdit: document.getElementById('btn-byok-cancel-edit'),
    btnByokInputToggleVis: document.getElementById('btn-byok-input-toggle-vis'),
    byokSavedStatus: document.getElementById('byok-saved-status'),
    byokSavedStatusText: document.getElementById('byok-saved-status-text'),
    byokEditStatus: document.getElementById('byok-edit-status'),
    byokEditStatusText: document.getElementById('byok-edit-status-text'),

    // Toast
    toast: document.getElementById('toast-msg'),

    // Live Interview Setup
    liveCustomTopicWrap: document.getElementById('live-custom-topic-wrap'),
    liveCustomTopicInput: document.getElementById('live-custom-topic-input'),
    liveCustomDurationWrap: document.getElementById('live-custom-duration-wrap'),
    liveCustomDurationInput: document.getElementById('live-custom-duration-input'),
    btnStartLiveSession: document.getElementById('btn-start-live-session'),

    // Live Room & Confirmation Modal
    liveRoomTimer: document.getElementById('live-room-timer'),
    btnLiveRoomExit: document.getElementById('btn-live-room-exit'),
    liveAiOrbContainer: document.getElementById('live-ai-orb')?.parentElement,
    liveStatusText: document.getElementById('live-status-text'),
    liveWaveformCanvas: document.getElementById('live-waveform-canvas'),
    liveSpeechBubble: document.getElementById('live-speech-bubble'),
    bubbleSpeakerTag: document.getElementById('bubble-speaker-tag'),
    bubbleText: document.getElementById('bubble-text'),
    transcriptConfirmCard: document.getElementById('transcript-confirm-card'),
    confirmCardTitle: document.getElementById('confirm-card-title'),
    confirmTranscriptText: document.getElementById('confirm-transcript-text'),
    btnConfirmRight: document.getElementById('btn-confirm-right'),
    btnConfirmRetry: document.getElementById('btn-confirm-retry'),
    btnDoneSpeaking: document.getElementById('btn-done-speaking'),
    liveRoomAlert: document.getElementById('live-room-alert'),
    liveAlertText: document.getElementById('live-alert-text'),
    btnLiveReconnect: document.getElementById('btn-live-reconnect'),
    btnToggleLiveTranscript: document.getElementById('btn-toggle-live-transcript'),
    btnTranscriptLabel: document.getElementById('btn-transcript-label'),
    btnToggleLiveMic: document.getElementById('btn-toggle-live-mic'),
    btnMicLabel: document.getElementById('btn-mic-label'),
    btnEndLiveInterview: document.getElementById('btn-end-live-interview'),
    liveTranscriptPanel: document.getElementById('live-transcript-panel'),
    btnCloseTranscriptPanel: document.getElementById('btn-close-transcript-panel'),
    liveTranscriptFeed: document.getElementById('live-transcript-feed'),

    // TalkWith Coach Result
    liveResultTopicTitle: document.getElementById('live-result-topic-title'),
    liveResultTypeBadge: document.getElementById('live-result-type-badge'),
    liveResultDiffBadge: document.getElementById('live-result-diff-badge'),
    liveResultLangBadge: document.getElementById('live-result-lang-badge'),
    liveResultDurationBadge: document.getElementById('live-result-duration-badge'),
    liveResultTalkedTime: document.getElementById('live-result-talked-time'),
    liveResultCoachNoticed: document.getElementById('live-result-coach-noticed'),
    liveResultOneChange: document.getElementById('live-result-one-change'),
    liveResultTurnCount: document.getElementById('live-result-turn-count'),
    liveResultDialogueList: document.getElementById('live-result-dialogue-list'),
    btnLivePracticeAgain: document.getElementById('btn-live-practice-again'),
    btnLiveViewHistory: document.getElementById('btn-live-view-history'),
    btnLiveBackDashboard: document.getElementById('btn-live-back-dashboard')
  };

  // ==========================================================================
  // ECHORA BYOK (Bring Your Own Key) Controller
  // ==========================================================================
  const EchoraBYOK = {
    STORAGE_KEY: 'echora_gemini_api_key',

    getKey() {
      try {
        return (localStorage.getItem(this.STORAGE_KEY) || '').trim();
      } catch (e) {
        return '';
      }
    },

    setKey(key) {
      try {
        if (!key || !key.trim()) {
          this.removeKey();
          return;
        }
        localStorage.setItem(this.STORAGE_KEY, key.trim());
      } catch (e) {
        console.warn('[BYOK] Could not write to localStorage:', e);
      }
    },

    removeKey() {
      try {
        localStorage.removeItem(this.STORAGE_KEY);
      } catch (e) {}
    },

    hasKey() {
      const k = this.getKey();
      return Boolean(k && k.length >= 10);
    },

    async testKey(keyToTest) {
      const key = (keyToTest || this.getKey()).trim();
      if (!key || key.length < 10) {
        return { success: false, message: t('keyInvalid') };
      }
      try {
        const apiBase = window.ECHORA_CONFIG?.API_BASE_URL || '';
        const res = await fetch(`${apiBase}/api/ai/test-key`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-gemini-api-key': key
          },
          body: JSON.stringify({})
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          return { success: true, message: t('keyConnected') };
        } else if (res.status === 429 || data.error === 'QUOTA_EXCEEDED') {
          return { success: false, message: t('keyErrorQuota') };
        } else {
          return { success: false, message: t('keyInvalid') };
        }
      } catch (err) {
        return { success: false, message: t('keyErrorNetwork') };
      }
    }
  };

  window.EchoraBYOK = EchoraBYOK;

  function renderByokUi() {
    if (!dom.byokSettingsSection) return;

    const hasKey = EchoraBYOK.hasKey();

    if (hasKey) {
      dom.byokSavedView.style.display = 'block';
      dom.byokEditView.style.display = 'none';
      dom.byokKeyMasked.textContent = '••••••••••••••••••••';
      dom.byokKeyPlaintextBox.style.display = 'none';
      dom.byokKeyPlaintextBox.textContent = '';
      dom.btnByokToggleShow.textContent = t('showKeyBtn');
      dom.byokSavedStatus.className = 'byok-status-indicator connected';
      dom.byokSavedStatusText.textContent = t('keyConnected');
    } else {
      dom.byokSavedView.style.display = 'none';
      dom.byokEditView.style.display = 'block';
      dom.byokInputKey.value = '';
      dom.byokInputKey.type = 'password';
      dom.btnByokCancelEdit.style.display = 'none';
      dom.byokEditStatus.style.display = 'none';
    }
  }

  // --------------------------------------------------------------------------
  // Language & Localization System
  // --------------------------------------------------------------------------
  function setLanguage(lang) {
    if (!translations[lang]) return;
    state.currentLang = lang;

    // Update switcher UI
    if (lang === 'en') {
      dom.langBtnEn.classList.add('active');
      dom.langBtnId.classList.remove('active');
    } else {
      dom.langBtnId.classList.add('active');
      dom.langBtnEn.classList.remove('active');
    }

    // Apply translations to all matching elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (translations[lang][key]) {
        if (key === 'heroTitle') {
          el.innerHTML = translations[lang][key];
        } else {
          el.textContent = translations[lang][key];
        }
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (translations[lang][key]) {
        el.placeholder = translations[lang][key];
      }
    });

    // Update topic text if loaded
    if (state.currentTopic) {
      renderTopic(state.currentTopic);
    }

    // Re-render recent sessions & history to refresh date formats
    renderRecentSessions();
    renderHistorySessions();
    renderByokUi();
  }

  function t(key) {
    return translations[state.currentLang][key] || key;
  }

  // --------------------------------------------------------------------------
  // Router / View Navigation
  // --------------------------------------------------------------------------
  function switchView(viewName) {
    if (!dom.views[viewName]) return;
    
    // Stop any playing audio before switching views
    document.querySelectorAll('audio').forEach(a => a.pause());

    const targetViewEl = dom.views[viewName];
    Object.keys(dom.views).forEach(key => {
      const el = dom.views[key];
      if (el && el !== targetViewEl) {
        el.classList.remove('active');
      }
    });

    targetViewEl.classList.add('active');
    state.currentView = viewName;

    // Update nav active states
    [dom.navDashboard, dom.navHistory, dom.navLiveInterview].forEach(btn => btn?.classList.remove('active'));
    if (viewName === 'dashboard' || viewName === 'landing') dom.navDashboard?.classList.add('active');
    if (viewName === 'history') dom.navHistory?.classList.add('active');
    if (viewName === 'liveSetup' || viewName === 'liveRoom' || viewName === 'liveResult') {
      dom.navLiveInterview?.classList.add('active');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // View specific lifecycle
    if (viewName === 'landing' || viewName === 'dashboard') {
      if (state.ambientWave) state.ambientWave.start();
      fetchSessions();
      fetchProfile();
      if (!state.currentTopic) rollRandomTopic();
    } else {
      if (state.ambientWave) state.ambientWave.stop();
    }

    if (viewName === 'liveRoom') {
      if (!state.liveWaveVisualizer) {
        state.liveWaveVisualizer = new LiveWaveformVisualizer('live-waveform-canvas');
      }
      state.liveWaveVisualizer.start();
    } else {
      if (state.liveWaveVisualizer) {
        state.liveWaveVisualizer.stop();
      }
      if (state.liveTimerInterval) {
        clearInterval(state.liveTimerInterval);
        state.liveTimerInterval = null;
      }
    }

    if (viewName === 'history') {
      fetchSessions();
    }
  }

  // --------------------------------------------------------------------------
  // Toast Notifications
  // --------------------------------------------------------------------------
  function showToast(message, duration = 3000) {
    dom.toast.textContent = message;
    dom.toast.classList.add('show');
    setTimeout(() => {
      dom.toast.classList.remove('show');
    }, duration);
  }

  // --------------------------------------------------------------------------
  // Random Speaking Topic Generator (100 Topics)
  // --------------------------------------------------------------------------
  function getTopicText(topic) {
    if (!topic) return '';
    const isId = state.currentLang === 'id';
    if (isId && topic.topic_id) return topic.topic_id;
    if (topic.topic) return topic.topic;
    if (topic.title) {
      if (typeof topic.title === 'object') {
        return (isId && topic.title.id) ? topic.title.id : (topic.title.en || topic.title.id);
      }
      return topic.title;
    }
    return '';
  }

  function rollRandomTopic() {
    const all = (window.ECHORA_TOPICS && window.ECHORA_TOPICS.length) ? window.ECHORA_TOPICS : [];
    if (all.length === 0) {
      fetchRandomTopicFallback();
      return;
    }

    const cat = state.selectedCategoryFilter || 'All';
    const diff = state.selectedDifficultyFilter || 'All';

    let pool = all;
    if (cat && cat.toLowerCase() !== 'all') {
      pool = pool.filter(t => t.category && t.category.toLowerCase() === cat.toLowerCase());
    }

    if (diff && diff.toLowerCase() !== 'all') {
      pool = pool.filter(t => t.difficulty && t.difficulty.toLowerCase() === diff.toLowerCase());
    }

    // Fallback if no matching topic found for filter combination
    if (pool.length === 0) {
      pool = all;
    }

    // Prevent selecting the exact same topic twice in a row if alternatives exist
    let candidates = pool;
    if (pool.length > 1 && state.lastTopicId !== null) {
      const filtered = pool.filter(t => t.id !== state.lastTopicId);
      if (filtered.length > 0) candidates = filtered;
    }

    const randomIndex = Math.floor(Math.random() * candidates.length);
    const chosen = candidates[randomIndex];
    if (chosen) {
      state.lastTopicId = chosen.id;
      state.currentTopic = chosen;
      renderTopic(chosen);
    }
  }

  async function fetchRandomTopicFallback() {
    try {
      const res = await fetch('/api/topics');
      if (res.ok) {
        window.ECHORA_TOPICS = await res.json();
        rollRandomTopic();
      }
    } catch (e) {
      console.warn('Fallback topics fetch error:', e);
    }
  }

  function renderTopic(topic) {
    if (!topic) return;
    const title = getTopicText(topic);

    if (dom.categoryBadge) dom.categoryBadge.textContent = topic.category || 'General';
    if (dom.difficultyBadge) dom.difficultyBadge.textContent = topic.difficulty || 'Medium';
    if (dom.topicText) dom.topicText.textContent = `“${title}”`;
    if (dom.topicDesc) dom.topicDesc.textContent = '';

    // Keep prep and recording previews synced
    if (dom.prepTopicText) dom.prepTopicText.textContent = `“${title}”`;
    if (dom.recordingTopicTitle) dom.recordingTopicTitle.textContent = `“${title}”`;
  }

  // --------------------------------------------------------------------------
  // Session API & Rendering
  // --------------------------------------------------------------------------
  async function fetchSessions() {
    try {
      const res = await fetch('/api/sessions');
      if (res.ok) {
        state.sessions = await res.json();
        renderRecentSessions();
        renderHistorySessions();
      }
    } catch (err) {
      console.warn('Failed to fetch sessions:', err);
    }
  }

  function formatTimeShort(seconds) {
    const s = Math.round(Number(seconds) || 0);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  }

  function formatDate(isoString) {
    try {
      const date = new Date(isoString);
      const locale = state.currentLang === 'id' ? 'id-ID' : 'en-US';
      return date.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return isoString;
    }
  }

  function createSessionCardElement(session, onReplay, onViewAnalysis, onDelete) {
    const card = document.createElement('div');
    card.className = 'session-card';

    const isId = state.currentLang === 'id';
    const isLive = session.type === 'live-interview';
    const displayTopic = (isId && session.topicId_id) ? session.topicId_id : session.topic;

    const typeBadge = isLive
      ? `<span class="category-badge" style="background:rgba(36, 87, 77, 0.45); color:var(--accent-mint); font-size:0.75rem; padding:2px 8px;">🎙️ TalkWith Coach</span>`
      : `<span class="category-badge" style="font-size:0.75rem; padding:2px 8px;">${session.category}</span>`;

    card.innerHTML = `
      <div class="session-card-main">
        <div class="session-card-info">
          <h4 class="session-topic-title">${escapeHtml(displayTopic)}</h4>
          <div class="session-card-meta">
            ${typeBadge}
            <span>${formatDate(session.date)}</span>
            <span>•</span>
            <span>${formatTimeShort(session.duration)}</span>
            ${session.voice ? `<span>• Voice: ${session.voice}</span>` : ''}
          </div>
        </div>
        <div class="session-score-pill">
          <div class="session-score-val">${session.overallScore}</div>
          <div class="session-score-denom">${t('scoreOutOf')}</div>
        </div>
      </div>

      <div class="session-player-wrap">
        <div class="card-audio-container" style="flex:1;">
          ${isLive && !session.audioUrl ? `<span style="font-size:0.8rem; color:var(--text-muted); display:inline-flex; align-items:center; gap:6px;">💬 TalkWith Coach (${session.transcript?.length || 0} turns)</span>` : ''}
        </div>
        <div class="session-action-btns">
          <button class="btn-card-action btn-view-analysis">${t('viewAnalysisBtn')}</button>
          <button class="btn-card-action btn-card-delete" title="${t('deleteSessionBtn')}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `;

    // Instantiate custom audio player inside card if audioUrl exists
    if (session.audioUrl) {
      const audioContainer = card.querySelector('.card-audio-container');
      const player = new EchoraAudioPlayer(audioContainer, session.audioUrl);
    }

    // Event listeners
    card.querySelector('.btn-view-analysis').addEventListener('click', () => {
      onViewAnalysis(session);
    });

    card.querySelector('.btn-card-delete').addEventListener('click', () => {
      if (confirm(t('confirmDelete'))) {
        onDelete(session.id);
      }
    });

    return card;
  }

  function renderRecentSessions() {
    dom.dashboardRecentList.innerHTML = '';
    const recent = state.sessions.slice(0, 3);
    if (recent.length === 0) {
      dom.dashboardRecentList.innerHTML = `
        <div class="empty-history-msg">${t('noRecentSessions')}</div>
      `;
      return;
    }

    recent.forEach(session => {
      const card = createSessionCardElement(
        session,
        null,
        openAnalysisModal,
        deleteSession
      );
      dom.dashboardRecentList.appendChild(card);
    });
  }

  function renderHistorySessions() {
    dom.historySessionsList.innerHTML = '';
    let filtered = state.sessions;
    if (state.historyFilter && state.historyFilter !== 'all') {
      filtered = filtered.filter(s => s.category.toLowerCase() === state.historyFilter.toLowerCase());
    }

    if (filtered.length === 0) {
      dom.historySessionsList.innerHTML = `
        <div class="empty-history-msg">${t('noHistoryFound')}</div>
      `;
      return;
    }

    filtered.forEach(session => {
      const card = createSessionCardElement(
        session,
        null,
        openAnalysisModal,
        deleteSession
      );
      dom.historySessionsList.appendChild(card);
    });
  }

  async function deleteSession(id) {
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        state.sessions = state.sessions.filter(s => s.id !== id);
        renderRecentSessions();
        renderHistorySessions();
        fetchProfile();
        showToast('Session deleted.');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  }

  // --------------------------------------------------------------------------
  // User Profile
  // --------------------------------------------------------------------------
  async function fetchProfile() {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        state.userProfile = await res.json();
        renderProfile();
      }
    } catch (err) {
      console.warn('Profile fetch error:', err);
    }
  }

  function renderProfile() {
    const { name, totalSessions, totalSpeakingTime } = state.userProfile;
    dom.userNameHeader.textContent = name || 'Alex Pratama';
    dom.profileNameInput.value = name || 'Alex Pratama';
    dom.profileStatSessions.textContent = totalSessions || 0;

    const mins = Math.floor((totalSpeakingTime || 0) / 60);
    const secs = (totalSpeakingTime || 0) % 60;
    dom.profileStatTime.textContent = `${mins}m ${secs}s`;
  }

  async function saveProfileName(newName) {
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      if (res.ok) {
        const updated = await res.json();
        state.userProfile.name = updated.name;
        renderProfile();
        closeModal(dom.modalProfile);
        showToast(t('savedNotice'));
      }
    } catch (err) {
      console.error('Profile save error:', err);
    }
  }

  // --------------------------------------------------------------------------
  // Preparation & Countdown Flow
  // --------------------------------------------------------------------------
  function startPreparation() {
    switchView('prep');
    let count = Math.max(1, state.selectedPrepTime || 30);
    dom.prepCountdownNum.textContent = count;

    clearInterval(state.prepInterval);
    state.prepInterval = setInterval(() => {
      count--;
      if (count > 0) {
        dom.prepCountdownNum.textContent = count;
      } else {
        clearInterval(state.prepInterval);
        beginRecordingSession();
      }
    }, 1000);
  }

  // --------------------------------------------------------------------------
  // Voice Recording Flow
  // --------------------------------------------------------------------------
  async function beginRecordingSession() {
    clearInterval(state.prepInterval);
    switchView('recording');

    dom.recCurrTimer.textContent = '00:00';
    dom.recTotalTimer.textContent = formatTimeShort(state.selectedSpeakingDuration);
    dom.recStatusText.textContent = t('recordingStatus');
    dom.btnRecPauseLabel.textContent = t('pauseBtn');

    if (!state.recorder) {
      state.recorder = new EchoraRecorder(state.liveVisualizer);
    }

    const started = await state.recorder.start(
      state.selectedSpeakingDuration,
      (elapsed, target) => {
        dom.recCurrTimer.textContent = formatTimeShort(elapsed);
      },
      (recordingData) => {
        // Recording finished
        onRecordingComplete(recordingData);
      },
      (err) => {
        alert(t('micErrorMsg'));
        switchView('dashboard');
      },
      state.currentLang
    );

    if (!started) {
      switchView('dashboard');
    }
  }

  function onRecordingComplete(recordingData) {
    state.currentRecording = recordingData;
    switchView('postRecord');

    const topicTitle = getTopicText(state.currentTopic);
    dom.postRecordTopicText.textContent = `“${topicTitle}”`;

    // Instantiate or load player
    if (!state.postRecordPlayer) {
      state.postRecordPlayer = new EchoraAudioPlayer(dom.postRecordAudioPlayer, recordingData.url);
    } else {
      state.postRecordPlayer.load(recordingData.url);
    }

    if (recordingData.hasSpeech === false) {
      showToast(t('noSpeechDetected'), 5000);
    }
  }

  // --------------------------------------------------------------------------
  // AI Coaching Analysis
  // --------------------------------------------------------------------------
  async function sendRecordingForAnalysis() {
    if (!state.currentRecording || !state.currentTopic) return;

    if (state.currentRecording.hasSpeech === false) {
      showToast(t('noSpeechDetected'), 5000);
      switchView('postRecord');
      return;
    }

    // BYOK Guard: User must have configured a Gemini API key
    if (!window.EchoraBYOK?.hasKey()) {
      showToast(t('apiKeyRequiredNotice'), 5000);
      renderByokUi();
      openModal(dom.modalProfile);
      return;
    }

    switchView('analyzing');

    // Rotating progress text
    const steps = [
      t('aiAnalyzingStep1'),
      t('aiAnalyzingStep2'),
      t('aiAnalyzingStep3')
    ];
    let stepIdx = 0;
    const progressInterval = setInterval(() => {
      stepIdx = (stepIdx + 1) % steps.length;
      dom.aiLoadingStatusText.style.opacity = 0;
      setTimeout(() => {
        dom.aiLoadingStatusText.textContent = steps[stepIdx];
        dom.aiLoadingStatusText.style.opacity = 1;
      }, 200);
    }, 2200);

    try {
      const userApiKey = window.EchoraBYOK.getKey();
      const formData = new FormData();
      const filename = `speech-${Date.now()}.${state.currentRecording.mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
      formData.append('audio', state.currentRecording.blob, filename);

      const topicTitle = getTopicText(state.currentTopic);
      
      formData.append('topic', topicTitle);
      formData.append('topicId', state.currentTopic.id || 'custom');
      formData.append('category', state.currentTopic.category || 'Opinion');
      formData.append('difficulty', state.currentTopic.difficulty || 'Medium');
      formData.append('prepTime', state.selectedPrepTime);
      formData.append('speakingDuration', state.selectedSpeakingDuration);
      formData.append('duration', state.currentRecording.duration);
      formData.append('language', state.currentLang);
      formData.append('transcript', state.currentRecording.transcript || '');
      formData.append('hasSpeech', state.currentRecording.hasSpeech ? 'true' : 'false');

      const res = await fetch('/api/sessions/analyze', {
        method: 'POST',
        headers: {
          'x-gemini-api-key': userApiKey
        },
        body: formData
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.error === 'API_KEY_REQUIRED' || res.status === 400 && errorData.error === 'API_KEY_REQUIRED') {
          showToast(t('keyErrorNoKey'), 5000);
          renderByokUi();
          openModal(dom.modalProfile);
          switchView('postRecord');
          return;
        }
        if (errorData.error === 'INVALID_API_KEY' || res.status === 401) {
          showToast(t('keyErrorInvalid'), 5000);
          renderByokUi();
          openModal(dom.modalProfile);
          switchView('postRecord');
          return;
        }
        if (errorData.error === 'QUOTA_EXCEEDED' || res.status === 429) {
          showToast(t('keyErrorQuota'), 5000);
          switchView('postRecord');
          return;
        }
        if (errorData.error === 'NO_SPEECH_DETECTED') {
          showToast(t('noSpeechDetected'), 5000);
          switchView('postRecord');
          return;
        }
        showToast(errorData.message || t('keyErrorNetwork'), 5000);
        switchView('postRecord');
        return;
      }

      const analyzedSession = await res.json();
      if (analyzedSession.error === 'NO_SPEECH_DETECTED' || analyzedSession.success === false) {
        showToast(t('noSpeechDetected'), 5000);
        switchView('postRecord');
        return;
      }

      state.lastAnalysisResult = analyzedSession;
      state.sessions.unshift(analyzedSession);
      fetchProfile();

      renderAnalysisResult(analyzedSession);
      switchView('result');
      showToast(t('savedToHistory'));
    } catch (err) {
      clearInterval(progressInterval);
      console.error('AI analysis error:', err);
      showToast(t('keyErrorNetwork'), 5000);
      switchView('postRecord');
    }
  }

  function renderAnalysisResult(session) {
    dom.resultCategoryBadge.textContent = session.category;
    dom.resultTopicTitle.textContent = `“${session.topic}”`;

    // Overall Score & Circular Ring Animation
    dom.resultOverallScore.textContent = session.overallScore;
    const circumference = 2 * Math.PI * 70; // r=70 -> ~439.82
    const offset = circumference - (session.overallScore / 100) * circumference;
    dom.resultRingProgress.style.strokeDashoffset = offset;

    // Breakdown Bars
    const scores = session.scores || {};
    dom.breakdownContentVal.textContent = scores.content || 80;
    dom.breakdownContentBar.style.width = `${scores.content || 80}%`;

    dom.breakdownFluencyVal.textContent = scores.fluency || 78;
    dom.breakdownFluencyBar.style.width = `${scores.fluency || 78}%`;

    dom.breakdownArticulationVal.textContent = scores.articulation || 82;
    dom.breakdownArticulationBar.style.width = `${scores.articulation || 82}%`;

    dom.breakdownPaceVal.textContent = scores.pace || 80;
    dom.breakdownPaceBar.style.width = `${scores.pace || 80}%`;

    dom.breakdownExpressionVal.textContent = scores.expression || 80;
    dom.breakdownExpressionBar.style.width = `${scores.expression || 80}%`;

    // Feedback Bullets
    dom.resultDidWellList.innerHTML = '';
    const didWell = session.feedback?.whatYouDidWell || session.feedback?.well || [];
    didWell.forEach(point => {
      const li = document.createElement('li');
      li.className = 'feedback-bullet-item';
      li.textContent = point;
      dom.resultDidWellList.appendChild(li);
    });

    dom.resultToImproveList.innerHTML = '';
    const toImprove = session.feedback?.whatToImprove || session.feedback?.improve || [];
    toImprove.forEach(point => {
      const li = document.createElement('li');
      li.className = 'feedback-bullet-item';
      li.textContent = point;
      dom.resultToImproveList.appendChild(li);
    });

    dom.resultNextStepText.textContent = `“${session.feedback?.nextStep || ''}”`;

    // Result Audio Player
    const audioUrl = session.audioUrl || (state.currentRecording && state.currentRecording.url);
    if (!state.resultAudioPlayer) {
      state.resultAudioPlayer = new EchoraAudioPlayer(dom.resultAudioPlayerContainer, audioUrl);
    } else {
      state.resultAudioPlayer.load(audioUrl);
    }
  }

  // --------------------------------------------------------------------------
  // Modals & History Inspection
  // --------------------------------------------------------------------------
  function openAnalysisModal(session) {
    const isId = state.currentLang === 'id';
    const isLive = session.type === 'live-interview';
    const displayTopic = (isId && session.topicId_id) ? session.topicId_id : session.topic;

    dom.modalCategoryBadge.textContent = isLive ? 'TalkWith Coach' : session.category;
    dom.modalTopicTitle.textContent = `“${displayTopic}”`;

    dom.modalOverallScore.textContent = session.overallScore;
    const circumference = 2 * Math.PI * 70;
    const offset = circumference - (session.overallScore / 100) * circumference;
    dom.modalRingProgress.style.strokeDashoffset = offset;

    const s = session.scores || {};
    dom.modalBreakdownContentVal.textContent = s.content || s.communication || 80;
    dom.modalBreakdownContentBar.style.width = `${s.content || s.communication || 80}%`;

    dom.modalBreakdownFluencyVal.textContent = s.fluency || s.speakingFlow || 80;
    dom.modalBreakdownFluencyBar.style.width = `${s.fluency || s.speakingFlow || 80}%`;

    dom.modalBreakdownArticulationVal.textContent = s.articulation || s.clarity || 80;
    dom.modalBreakdownArticulationBar.style.width = `${s.articulation || s.clarity || 80}%`;

    dom.modalBreakdownPaceVal.textContent = s.pace || s.relevance || 80;
    dom.modalBreakdownPaceBar.style.width = `${s.pace || s.relevance || 80}%`;

    dom.modalBreakdownExpressionVal.textContent = s.expression || s.confidence || 80;
    dom.modalBreakdownExpressionBar.style.width = `${s.expression || s.confidence || 80}%`;

    dom.modalDidWellList.innerHTML = '';
    const modalDidWell = session.feedback?.whatYouDidWell || session.feedback?.well || [];
    modalDidWell.forEach(p => {
      const li = document.createElement('li');
      li.className = 'feedback-bullet-item';
      li.textContent = p;
      dom.modalDidWellList.appendChild(li);
    });

    dom.modalToImproveList.innerHTML = '';
    const modalToImprove = session.feedback?.whatToImprove || session.feedback?.improve || [];
    modalToImprove.forEach(p => {
      const li = document.createElement('li');
      li.className = 'feedback-bullet-item';
      li.textContent = p;
      dom.modalToImproveList.appendChild(li);
    });

    dom.modalNextStepText.textContent = `“${session.feedback?.nextStep || ''}”`;

    // Modal Audio Player or Dialogue Transcript for Live Sessions
    if (isLive && session.transcript && session.transcript.length > 0) {
      const transcriptHtml = session.transcript.map(item => `
        <div style="margin-bottom:8px; display:flex; gap:8px;">
          <strong style="color:${item.sender === 'user' ? 'var(--accent-peach)' : 'var(--accent-mint)'}; font-size:0.75rem; text-transform:uppercase;">
            ${item.sender === 'user' ? 'You' : 'Coach'}:
          </strong>
          <span style="font-size:0.85rem; color:var(--text-secondary);">${escapeHtml(item.text)}</span>
        </div>
      `).join('');
      dom.modalAudioContainer.innerHTML = `
        <div style="max-height:180px; overflow-y:auto; padding:12px; background:rgba(11,33,30,0.6); border-radius:10px; border:1px solid var(--border-subtle);">
          <div style="font-size:0.72rem; font-weight:700; color:var(--primary-sage); margin-bottom:8px; text-transform:uppercase;">Dialogue Transcript (${session.transcript.length} turns)</div>
          ${transcriptHtml}
        </div>
      `;
    } else if (session.audioUrl) {
      if (!state.modalAudioPlayer) {
        state.modalAudioPlayer = new EchoraAudioPlayer(dom.modalAudioContainer, session.audioUrl);
      } else {
        state.modalAudioPlayer.load(session.audioUrl);
      }
    } else {
      dom.modalAudioContainer.innerHTML = '';
    }

    openModal(dom.modalAnalysis);
  }

  function openModal(modalEl) {
    modalEl.classList.add('open');
  }

  function closeModal(modalEl) {
    modalEl.classList.remove('open');
    if (state.modalAudioPlayer) state.modalAudioPlayer.pause();
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --------------------------------------------------------------------------
  // AI Live Interview — Real-Time Visualizer & Audio Logic
  // --------------------------------------------------------------------------
  class LiveWaveformVisualizer {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.phase = 0;
      this.energy = 0.05;
      this.targetEnergy = 0.05;
      this.isRunning = false;
      this.animId = null;
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }

    resize() {
      if (!this.canvas) return;
      const rect = this.canvas.getBoundingClientRect();
      this.width = rect.width || 400;
      this.height = rect.height || 60;
      this.canvas.width = this.width * window.devicePixelRatio;
      this.canvas.height = this.height * window.devicePixelRatio;
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    setVolume(volume) {
      this.targetEnergy = Math.min(1.0, Math.max(0.05, volume * 4.5));
    }

    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.animate();
    }

    stop() {
      this.isRunning = false;
      if (this.animId) cancelAnimationFrame(this.animId);
    }

    animate() {
      if (!this.isRunning) return;
      this.energy += (this.targetEnergy - this.energy) * 0.15;
      this.targetEnergy *= 0.95;
      this.phase += 0.025 + this.energy * 0.04;
      this.draw();
      this.animId = requestAnimationFrame(() => this.animate());
    }

    draw() {
      const { ctx, width, height, phase, energy } = this;
      ctx.clearRect(0, 0, width, height);

      const centerY = height * 0.5;
      const baseAmp = height * 0.16 + height * 0.35 * energy;

      const layers = [
        { color: 'rgba(163, 231, 216, 0.45)', freq: 0.015, speed: 1.2, offset: 0, amp: baseAmp },
        { color: 'rgba(111, 155, 140, 0.35)', freq: 0.02, speed: 0.8, offset: Math.PI / 2, amp: baseAmp * 0.7 },
        { color: 'rgba(242, 166, 122, 0.25)', freq: 0.01, speed: 1.5, offset: Math.PI, amp: baseAmp * 0.5 }
      ];

      layers.forEach(layer => {
        ctx.beginPath();
        ctx.strokeStyle = layer.color;
        ctx.lineWidth = 2.5;

        for (let x = 0; x <= width; x += 3) {
          const envelope = Math.sin((x / width) * Math.PI);
          const y = centerY + Math.sin(x * layer.freq + phase * layer.speed + layer.offset) * layer.amp * envelope;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
    }
  }

  // Voice Preview Player
  async function playVoicePreview(voice, lang, btn) {
    if (!window.EchoraBYOK?.hasKey()) {
      showToast(t('apiKeyRequiredPreview'), 5000);
      renderByokUi();
      openModal(dom.modalProfile);
      return;
    }

    if (state.activePreviewAudio) {
      try {
        state.activePreviewAudio.pause();
        state.activePreviewAudio = null;
      } catch (e) {}
    }
    document.querySelectorAll('.btn-voice-preview').forEach(b => {
      b.classList.remove('playing');
      const lbl = b.querySelector('.preview-label');
      if (lbl) lbl.textContent = t('livePreviewVoice');
    });

    btn.classList.add('playing');
    const label = btn.querySelector('.preview-label');
    if (label) label.textContent = t('livePlayingPreview');

    try {
      const userApiKey = window.EchoraBYOK.getKey();
      const apiBase = window.ECHORA_CONFIG?.API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/live-interview/preview-voice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': userApiKey
        },
        body: JSON.stringify({ voice, language: lang })
      });
      if (!res.ok) throw new Error('Preview request failed');
      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      state.activePreviewAudio = audio;

      audio.onended = () => {
        btn.classList.remove('playing');
        if (label) label.textContent = t('livePreviewVoice');
        state.activePreviewAudio = null;
      };
      audio.onerror = () => {
        btn.classList.remove('playing');
        if (label) label.textContent = t('livePreviewVoice');
        state.activePreviewAudio = null;
      };
      await audio.play();
    } catch (err) {
      console.warn('Voice preview error:', err);
      btn.classList.remove('playing');
      if (label) label.textContent = t('livePreviewVoice');
      showToast('Could not load voice preview. Please check connection.');
    }
  }

  function updateLiveTimerDisplay(seconds) {
    const s = Math.max(0, Math.round(Number(seconds) || 0));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    if (dom.liveRoomTimer) {
      dom.liveRoomTimer.textContent = `${m.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
    }
  }

  function showTranscriptConfirmation(text) {
    if (!dom.transcriptConfirmCard) return;
    const isId = state.liveConfig.language === 'id';
    const trimmed = (text || '').trim();

    if (trimmed === '...') {
      // Audio transcribe fallback in progress
      if (dom.confirmCardTitle) dom.confirmCardTitle.textContent = isId ? 'Memeriksa ucapanmu...' : 'Checking what you said...';
      if (dom.confirmTranscriptText) dom.confirmTranscriptText.textContent = isId ? 'Coach sedang memeriksa rekaman suara...' : 'Checking your voice recording...';
      if (dom.btnConfirmRight) dom.btnConfirmRight.style.display = 'none';
      if (dom.btnConfirmRetry) dom.btnConfirmRetry.style.display = 'none';
    } else if (!trimmed) {
      // Section 7: If audio empty, very short, or transcript cannot be trusted
      if (dom.confirmCardTitle) dom.confirmCardTitle.textContent = isId ? 'Aku kurang menangkap bagian itu. Coba ulangi?' : "I didn't quite catch that. Try again?";
      if (dom.confirmTranscriptText) dom.confirmTranscriptText.textContent = isId ? '(Suara belum terdeteksi dengan jelas. Tekan tombol Speak again untuk berbicara kembali)' : '(No clear speech detected. Click Speak again to try again)';
      if (dom.btnConfirmRight) dom.btnConfirmRight.style.display = 'none';
      if (dom.btnConfirmRetry) {
        dom.btnConfirmRetry.style.display = 'inline-flex';
        dom.btnConfirmRetry.textContent = '↻ Speak again';
      }
    } else {
      // Section 4: Valid user transcript
      if (dom.confirmCardTitle) dom.confirmCardTitle.textContent = 'Did I hear you right?';
      if (dom.confirmTranscriptText) dom.confirmTranscriptText.textContent = `“${trimmed}”`;
      if (dom.btnConfirmRight) {
        dom.btnConfirmRight.style.display = 'inline-flex';
        dom.btnConfirmRight.textContent = "✓ That's right";
      }
      if (dom.btnConfirmRetry) {
        dom.btnConfirmRetry.style.display = 'inline-flex';
        dom.btnConfirmRetry.textContent = '↻ Speak again';
      }
    }

    dom.transcriptConfirmCard.style.display = 'flex';
    if (dom.btnDoneSpeaking) dom.btnDoneSpeaking.style.display = 'none';
  }

  // Start Live Interview / TalkWith Coach Real-Time Session Flow
  async function startLiveInterviewFlow() {
    // BYOK Guard: User must have configured a Gemini API key
    if (!window.EchoraBYOK?.hasKey()) {
      showToast(t('apiKeyRequiredTalkWith'), 5000);
      renderByokUi();
      openModal(dom.modalProfile);
      return;
    }

    const lang = state.liveConfig.language;
    const voice = state.liveConfig.voice || 'Puck';

    const type = state.liveConfig.interviewType || 'School';

    let durationMins = state.liveConfig.durationMinutes;
    if (durationMins === 'custom' && dom.liveCustomDurationInput) {
      durationMins = Math.min(30, Math.max(1, parseInt(dom.liveCustomDurationInput.value, 10) || 5));
    } else {
      durationMins = parseInt(durationMins, 10) || 5;
    }

    const config = {
      language: lang,
      voice: voice,
      interviewType: type,
      durationMinutes: durationMins
    };

    switchView('liveRoom');

    // Reset Live Room UI
    dom.liveStatusText.textContent = t('connectingAi');
    if (dom.liveAiOrbContainer) {
      dom.liveAiOrbContainer.className = 'live-ai-orb-container state-connecting';
    }
    if (dom.liveRoomAlert) dom.liveRoomAlert.style.display = 'none';
    if (dom.liveTranscriptFeed) dom.liveTranscriptFeed.innerHTML = '';
    if (dom.transcriptConfirmCard) dom.transcriptConfirmCard.style.display = 'none';
    if (dom.btnDoneSpeaking) dom.btnDoneSpeaking.style.display = 'none';
    if (dom.liveSpeechBubble) {
      dom.liveSpeechBubble.style.opacity = 0;
      dom.bubbleText.textContent = '';
    }
    dom.btnMicLabel.textContent = t('muteMicBtn');
    dom.btnToggleLiveMic.classList.remove('muted');

    state.liveRemainingSeconds = durationMins * 60;
    state.liveElapsedSeconds = 0;
    updateLiveTimerDisplay(state.liveRemainingSeconds);

    // Instantiate EchoraLiveInterview
    state.liveSession = new EchoraLiveInterview({
      onStateChange: (newState) => {
        handleLiveStateChange(newState);
      },
      onTranscriptUpdate: (transcript, entry) => {
        handleLiveTranscriptUpdate(transcript, entry);
      },
      onTranscriptConfirmation: (confirmedText) => {
        showTranscriptConfirmation(confirmedText);
      },
      onVolumeChange: (rms, source) => {
        if (state.liveWaveVisualizer) {
          state.liveWaveVisualizer.setVolume(rms);
        }
      },
      onError: (errMsg) => {
        handleLiveError(errMsg);
      },
      onTurnComplete: () => {
        setTimeout(() => {
          if (state.liveSession && state.liveSession.state === 'listening' && dom.liveSpeechBubble) {
            dom.liveSpeechBubble.style.opacity = 0.6;
          }
        }, 2500);
      }
    });

    const success = await state.liveSession.startSession(config);
    if (!success) {
      return;
    }

    // Start Timer Interval
    if (state.liveTimerInterval) clearInterval(state.liveTimerInterval);
    state.liveTimerInterval = setInterval(() => {
      state.liveRemainingSeconds--;
      state.liveElapsedSeconds++;
      updateLiveTimerDisplay(state.liveRemainingSeconds);

      if (state.liveRemainingSeconds <= 0) {
        clearInterval(state.liveTimerInterval);
        state.liveTimerInterval = null;
        finishLiveInterview();
      }
    }, 1000);
  }

  function handleLiveStateChange(newState) {
    if (!dom.liveAiOrbContainer) return;
    const isId = state.liveConfig.language === 'id';

    dom.liveAiOrbContainer.className = `live-ai-orb-container state-${newState}`;

    switch (newState) {
      case 'connecting':
        dom.liveStatusText.textContent = t('connectingAi');
        if (dom.transcriptConfirmCard) dom.transcriptConfirmCard.style.display = 'none';
        if (dom.btnDoneSpeaking) dom.btnDoneSpeaking.style.display = 'none';
        break;
      case 'listening':
        dom.liveStatusText.textContent = t('stateListening');
        if (dom.transcriptConfirmCard) dom.transcriptConfirmCard.style.display = 'none';
        if (dom.btnDoneSpeaking) dom.btnDoneSpeaking.style.display = 'inline-flex';
        break;
      case 'confirming':
        dom.liveStatusText.textContent = t('stateConfirming');
        if (dom.btnDoneSpeaking) dom.btnDoneSpeaking.style.display = 'none';
        break;
      case 'thinking':
        dom.liveStatusText.textContent = t('stateThinking');
        if (dom.transcriptConfirmCard) dom.transcriptConfirmCard.style.display = 'none';
        if (dom.btnDoneSpeaking) dom.btnDoneSpeaking.style.display = 'none';
        break;
      case 'speaking':
        dom.liveStatusText.textContent = t('stateSpeaking');
        if (dom.transcriptConfirmCard) dom.transcriptConfirmCard.style.display = 'none';
        if (dom.btnDoneSpeaking) dom.btnDoneSpeaking.style.display = 'none';
        break;
      case 'idle':
        dom.liveStatusText.textContent = t('stateIdle');
        if (dom.transcriptConfirmCard) dom.transcriptConfirmCard.style.display = 'none';
        if (dom.btnDoneSpeaking) dom.btnDoneSpeaking.style.display = 'none';
        break;
      case 'error':
        dom.liveStatusText.textContent = isId ? 'Koneksi Terputus' : 'Connection Lost';
        if (dom.btnDoneSpeaking) dom.btnDoneSpeaking.style.display = 'none';
        break;
    }
  }

  function handleLiveTranscriptUpdate(transcript, entry) {
    if (!entry || !entry.text) return;

    // 1. Update Live Subtitle Bubble
    if (dom.liveSpeechBubble && dom.bubbleText && dom.bubbleSpeakerTag) {
      const isUser = entry.sender === 'user';
      dom.bubbleSpeakerTag.textContent = isUser ? 'YOU' : 'COACH';
      dom.bubbleSpeakerTag.className = `bubble-speaker-tag ${isUser ? 'user' : 'ai'}`;
      dom.bubbleText.textContent = entry.text;
      dom.liveSpeechBubble.style.opacity = 1;
    }

    // 2. Append in Transcript Panel (only on final sentences)
    if (dom.liveTranscriptFeed && !entry.isInterim) {
      const item = document.createElement('div');
      item.className = `transcript-entry ${entry.sender}`;
      item.innerHTML = `
        <span class="transcript-sender">${entry.sender === 'user' ? 'You' : 'Coach'}</span>
        <span class="transcript-text">${escapeHtml(entry.text)}</span>
      `;
      dom.liveTranscriptFeed.appendChild(item);
      dom.liveTranscriptFeed.scrollTop = dom.liveTranscriptFeed.scrollHeight;
    }
  }

  function handleLiveError(errMsg) {
    if (dom.liveRoomAlert && dom.liveAlertText) {
      dom.liveAlertText.textContent = errMsg || 'Connection lost.';
      dom.liveRoomAlert.style.display = 'flex';
    }
  }

  async function finishLiveInterview() {
    if (state.liveTimerInterval) {
      clearInterval(state.liveTimerInterval);
      state.liveTimerInterval = null;
    }

    showToast(state.liveConfig.language === 'id' ? 'Menyusun umpan balik dari Coach...' : 'Formulating coaching feedback...');

    try {
      if (state.liveSession) {
        const resultSession = await state.liveSession.endInterview(state.liveElapsedSeconds);
        state.sessions.unshift(resultSession);
        renderLiveResult(resultSession);
        switchView('liveResult');
        fetchSessions();
        fetchProfile();
      }
    } catch (err) {
      console.error('Error ending interview:', err);
      showToast('Session completed. Redirecting to history...');
      switchView('history');
    }
  }

  function renderLiveResult(session) {
    const isId = session.language === 'id';
    dom.liveResultTopicTitle.textContent = session.topic || 'TalkWith Coach';
    dom.liveResultTypeBadge.textContent = session.category || 'Opinion';
    dom.liveResultDiffBadge.textContent = session.difficulty || 'Casual';
    dom.liveResultLangBadge.textContent = isId ? 'Bahasa Indonesia' : 'English';
    const dur = session.duration || 180;
    const durMins = Math.floor(dur / 60);
    const durSecs = dur % 60;
    const durFormatted = `${durMins.toString().padStart(2, '0')}:${durSecs.toString().padStart(2, '0')}`;
    dom.liveResultDurationBadge.textContent = `${durMins}m ${durSecs}s`;

    // Talked Duration Highlight
    if (dom.liveResultTalkedTime) {
      dom.liveResultTalkedTime.textContent = isId
        ? `Kamu berbicara selama ${durFormatted}`
        : `You talked for ${durFormatted}`;
    }

    // Coach Noticed (2 positive points)
    if (dom.liveResultCoachNoticed) {
      dom.liveResultCoachNoticed.innerHTML = '';
      const noticed = session.feedback?.coachNoticed || session.feedback?.whatYouDidWell || [
        isId ? 'Gagasanmu tersampaikan dengan jelas dan percaya diri.' : 'Your ideas were clearly expressed with natural confidence.',
        isId ? 'Alur penjelasanmu mudah diikuti dan relevan dengan topik.' : 'Your pacing was easy to follow and directly on-point.'
      ];
      noticed.slice(0, 2).forEach(pt => {
        const li = document.createElement('li');
        li.className = 'feedback-bullet-item';
        li.textContent = pt;
        dom.liveResultCoachNoticed.appendChild(li);
      });
    }

    // 🎯 One Change (1 single actionable tip)
    if (dom.liveResultOneChange) {
      const oneChange = session.feedback?.oneChange || (session.feedback?.whatToImprove && session.feedback.whatToImprove[0]) || (
        isId
          ? 'Coba sebutkan poin utamamu di kalimat pertama sebelum menjelaskan detail contohnya.'
          : 'Try stating your main point in the first sentence before diving into examples.'
      );
      dom.liveResultOneChange.textContent = `“${oneChange}”`;
    }

    // Dialogue Transcript List
    if (dom.liveResultDialogueList) {
      dom.liveResultDialogueList.innerHTML = '';
      const transcript = session.transcript || [];
      if (dom.liveResultTurnCount) {
        dom.liveResultTurnCount.textContent = `${transcript.length} ${isId ? 'giliran' : 'turns'}`;
      }

      if (transcript.length === 0) {
        dom.liveResultDialogueList.innerHTML = `<div style="font-size:0.85rem; color:var(--text-muted); padding:12px;">${isId ? 'Tidak ada percakapan tercatat.' : 'No dialogue recorded.'}</div>`;
      } else {
        transcript.forEach(t => {
          const isUser = t.sender === 'user';
          const item = document.createElement('div');
          item.className = `dialogue-item ${isUser ? 'user' : 'ai'}`;
          item.innerHTML = `
            <div class="dialogue-avatar">${isUser ? '👤' : '🎙️'}</div>
            <div class="dialogue-content">
              <div class="dialogue-speaker-name">${isUser ? (isId ? 'Siswa' : 'Student') : 'Coach'}</div>
              <div class="dialogue-text">${escapeHtml(t.text)}</div>
            </div>
          `;
          dom.liveResultDialogueList.appendChild(item);
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // Event Bindings
  // --------------------------------------------------------------------------
  function setupEventListeners() {
    // Navigation
    dom.navBrand.addEventListener('click', () => {
      switchView('landing');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    if (dom.navLiveInterview) {
      dom.navLiveInterview.addEventListener('click', () => switchView('liveSetup'));
    }
    dom.navDashboard.addEventListener('click', () => {
      switchView('landing');
      const practiceSection = document.getElementById('section-practice');
      if (practiceSection) practiceSection.scrollIntoView({ behavior: 'smooth' });
    });
    dom.navHistory.addEventListener('click', () => switchView('history'));
    if (dom.btnViewAllHistory) {
      dom.btnViewAllHistory.addEventListener('click', () => switchView('history'));
    }
    if (dom.heroStart) {
      dom.heroStart.addEventListener('click', (e) => {
        e.preventDefault();
        const practiceSection = document.getElementById('section-practice');
        if (practiceSection) practiceSection.scrollIntoView({ behavior: 'smooth' });
      });
    }
    if (dom.navStart) {
      dom.navStart.addEventListener('click', () => {
        switchView('landing');
        const practiceSection = document.getElementById('section-practice');
        if (practiceSection) practiceSection.scrollIntoView({ behavior: 'smooth' });
      });
    }

    // Hero secondary button: TalkWith Coach
    const ctaHeroCoach = document.getElementById('cta-hero-coach');
    if (ctaHeroCoach) {
      ctaHeroCoach.addEventListener('click', () => switchView('liveSetup'));
    }

    // Showcase Launch button
    const btnShowcaseLaunchCoach = document.getElementById('btn-showcase-launch-coach');
    if (btnShowcaseLaunchCoach) {
      btnShowcaseLaunchCoach.addEventListener('click', () => switchView('liveSetup'));
    }

    // Showcase interactive demo buttons (Simulate confirm & speak again flow)
    const btnShowcaseDemoConfirm = document.getElementById('btn-showcase-demo-confirm');
    const btnShowcaseDemoRetry = document.getElementById('btn-showcase-demo-retry');
    const showcaseReply = document.getElementById('showcase-sample-reply');

    if (btnShowcaseDemoConfirm) {
      btnShowcaseDemoConfirm.addEventListener('click', () => {
        const isId = state.currentLang === 'id';
        btnShowcaseDemoConfirm.style.transform = 'scale(0.95)';
        setTimeout(() => { btnShowcaseDemoConfirm.style.transform = 'scale(1)'; }, 150);
        showToast(isId ? '✓ Jawaban dikonfirmasi! AI coach merespons.' : '✓ Transcript confirmed! AI coach is responding.', 2500);
        if (showcaseReply) {
          showcaseReply.style.opacity = '0.5';
          setTimeout(() => {
            showcaseReply.style.opacity = '1';
          }, 350);
        }
      });
    }

    if (btnShowcaseDemoRetry) {
      btnShowcaseDemoRetry.addEventListener('click', () => {
        const isId = state.currentLang === 'id';
        btnShowcaseDemoRetry.style.transform = 'scale(0.95)';
        setTimeout(() => { btnShowcaseDemoRetry.style.transform = 'scale(1)'; }, 150);
        showToast(isId ? '↻ Mikrofon siap kembali. Silakan bicara lagi!' : '↻ Microphone reactivated. Speak again!', 2500);
      });
    }

    const btnDashLaunchLive = document.getElementById('btn-dash-launch-live');
    if (btnDashLaunchLive) {
      btnDashLaunchLive.addEventListener('click', () => switchView('liveSetup'));
    }

    // Live Interview Setup Interactions
    // 1. Language selector
    document.querySelectorAll('.live-lang-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.live-lang-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const lang = card.getAttribute('data-lang');
        state.liveConfig.language = lang;
        // Update voice tone labels
        document.querySelectorAll('.voice-tone').forEach(el => {
          el.textContent = lang === 'id' ? el.getAttribute('data-tone-id') : el.getAttribute('data-tone-en');
        });
      });
    });

    // 2. Voice cards selection & preview
    document.querySelectorAll('.voice-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-voice-preview')) return;
        document.querySelectorAll('.voice-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        state.liveConfig.voice = card.getAttribute('data-voice');
      });
    });

    document.querySelectorAll('.btn-voice-preview').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const voice = btn.getAttribute('data-voice');
        const lang = state.liveConfig.language;
        await playVoicePreview(voice, lang, btn);
      });
    });

    // 3. Interview type selector pills
    document.querySelectorAll('#live-type-selector .pill-option').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#live-type-selector .pill-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const val = btn.getAttribute('data-val');
        state.liveConfig.interviewType = val;
        if (dom.liveCustomTopicWrap) {
          dom.liveCustomTopicWrap.style.display = val === 'Custom' ? 'block' : 'none';
        }
      });
    });

    // 6. Duration selector pills
    document.querySelectorAll('#live-duration-selector .pill-option').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#live-duration-selector .pill-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const val = btn.getAttribute('data-val');
        state.liveConfig.durationMinutes = val;
        if (dom.liveCustomDurationWrap) {
          dom.liveCustomDurationWrap.style.display = val === 'custom' ? 'block' : 'none';
        }
      });
    });

    // Start Live Interview button
    if (dom.btnStartLiveSession) {
      dom.btnStartLiveSession.addEventListener('click', startLiveInterviewFlow);
    }

    // Live Room Controls
    if (dom.btnConfirmRight) {
      dom.btnConfirmRight.addEventListener('click', () => {
        if (dom.transcriptConfirmCard) dom.transcriptConfirmCard.style.display = 'none';
        if (state.liveSession) state.liveSession.confirmTurn();
      });
    }

    if (dom.btnConfirmRetry) {
      dom.btnConfirmRetry.addEventListener('click', () => {
        if (dom.transcriptConfirmCard) dom.transcriptConfirmCard.style.display = 'none';
        if (state.liveSession) state.liveSession.retrySpeaking();
      });
    }

    if (dom.btnDoneSpeaking) {
      dom.btnDoneSpeaking.addEventListener('click', () => {
        if (state.liveSession) state.liveSession.doneSpeaking();
      });
    }

    if (dom.btnToggleLiveMic) {
      dom.btnToggleLiveMic.addEventListener('click', () => {
        if (!state.liveSession) return;
        const isMuted = state.liveSession.toggleMute();
        dom.btnMicLabel.textContent = isMuted ? t('unmuteMicBtn') : t('muteMicBtn');
        dom.btnToggleLiveMic.classList.toggle('muted', isMuted);
      });
    }

    if (dom.btnToggleLiveTranscript) {
      dom.btnToggleLiveTranscript.addEventListener('click', () => {
        if (!dom.liveTranscriptPanel) return;
        const isOpen = dom.liveTranscriptPanel.style.display === 'flex';
        dom.liveTranscriptPanel.style.display = isOpen ? 'none' : 'flex';
        dom.btnTranscriptLabel.textContent = isOpen ? t('showTranscriptBtn') : t('hideTranscriptBtn');
      });
    }

    if (dom.btnCloseTranscriptPanel) {
      dom.btnCloseTranscriptPanel.addEventListener('click', () => {
        if (dom.liveTranscriptPanel) dom.liveTranscriptPanel.style.display = 'none';
        if (dom.btnTranscriptLabel) dom.btnTranscriptLabel.textContent = t('showTranscriptBtn');
      });
    }

    if (dom.btnEndLiveInterview) {
      dom.btnEndLiveInterview.addEventListener('click', () => {
        const isId = state.liveConfig.language === 'id';
        const msg = isId ? 'Akhiri sesi wawancara sekarang dan lihat evaluasi AI?' : 'End interview now and see your AI evaluation?';
        if (confirm(msg)) {
          finishLiveInterview();
        }
      });
    }

    if (dom.btnLiveRoomExit) {
      dom.btnLiveRoomExit.addEventListener('click', () => {
        const isId = state.liveConfig.language === 'id';
        const msg = isId ? 'Yakin ingin keluar dari wawancara?' : 'Are you sure you want to exit the interview?';
        if (confirm(msg)) {
          if (state.liveSession) {
            state.liveSession.cleanupAudio();
          }
          switchView('dashboard');
        }
      });
    }

    if (dom.btnLiveReconnect) {
      dom.btnLiveReconnect.addEventListener('click', () => {
        startLiveInterviewFlow();
      });
    }

    // Live Result actions
    if (dom.btnLivePracticeAgain) {
      dom.btnLivePracticeAgain.addEventListener('click', () => switchView('liveSetup'));
    }
    if (dom.btnLiveViewHistory) {
      dom.btnLiveViewHistory.addEventListener('click', () => switchView('history'));
    }
    if (dom.btnLiveBackDashboard) {
      dom.btnLiveBackDashboard.addEventListener('click', () => switchView('dashboard'));
    }

    // Language buttons
    dom.langBtnEn.addEventListener('click', () => setLanguage('en'));
    dom.langBtnId.addEventListener('click', () => setLanguage('id'));

    // Profile / Settings modal
    dom.navProfile.addEventListener('click', () => {
      fetchProfile();
      renderByokUi();
      openModal(dom.modalProfile);
    });
    dom.btnCloseProfileModal.addEventListener('click', () => closeModal(dom.modalProfile));
    dom.modalProfile.addEventListener('click', (e) => {
      if (e.target === dom.modalProfile) closeModal(dom.modalProfile);
    });
    dom.profileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveProfileName(dom.profileNameInput.value);
    });

    // BYOK Settings Actions
    if (dom.btnByokToggleShow) {
      dom.btnByokToggleShow.addEventListener('click', () => {
        const isVisible = dom.byokKeyPlaintextBox.style.display === 'block';
        if (isVisible) {
          dom.byokKeyPlaintextBox.style.display = 'none';
          dom.byokKeyPlaintextBox.textContent = '';
          dom.btnByokToggleShow.textContent = t('showKeyBtn');
        } else {
          dom.byokKeyPlaintextBox.textContent = EchoraBYOK.getKey();
          dom.byokKeyPlaintextBox.style.display = 'block';
          dom.btnByokToggleShow.textContent = t('hideKeyBtn');
        }
      });
    }

    if (dom.btnByokReplace) {
      dom.btnByokReplace.addEventListener('click', () => {
        dom.byokSavedView.style.display = 'none';
        dom.byokEditView.style.display = 'block';
        dom.byokInputKey.value = '';
        dom.byokInputKey.type = 'password';
        dom.btnByokCancelEdit.style.display = 'inline-flex';
        dom.byokEditStatus.style.display = 'none';
        dom.byokInputKey.focus();
      });
    }

    if (dom.btnByokCancelEdit) {
      dom.btnByokCancelEdit.addEventListener('click', () => {
        renderByokUi();
      });
    }

    if (dom.btnByokRemove) {
      dom.btnByokRemove.addEventListener('click', () => {
        EchoraBYOK.removeKey();
        showToast(t('keyRemoved'));
        renderByokUi();
      });
    }

    if (dom.btnByokInputToggleVis) {
      dom.btnByokInputToggleVis.addEventListener('click', () => {
        dom.byokInputKey.type = dom.byokInputKey.type === 'password' ? 'text' : 'password';
      });
    }

    if (dom.btnByokSaveKey) {
      dom.btnByokSaveKey.addEventListener('click', () => {
        const key = dom.byokInputKey.value.trim();
        if (!key || key.length < 10) {
          dom.byokEditStatus.style.display = 'flex';
          dom.byokEditStatus.className = 'byok-status-indicator disconnected';
          dom.byokEditStatusText.textContent = t('keyInvalid');
          return;
        }
        EchoraBYOK.setKey(key);
        showToast(t('keySaved'));
        renderByokUi();
      });
    }

    if (dom.btnByokTestInput) {
      dom.btnByokTestInput.addEventListener('click', async () => {
        const key = dom.byokInputKey.value.trim();
        if (!key || key.length < 10) {
          dom.byokEditStatus.style.display = 'flex';
          dom.byokEditStatus.className = 'byok-status-indicator disconnected';
          dom.byokEditStatusText.textContent = t('keyInvalid');
          return;
        }

        dom.btnByokTestInput.disabled = true;
        dom.byokEditStatus.style.display = 'flex';
        dom.byokEditStatus.className = 'byok-status-indicator testing';
        dom.byokEditStatusText.textContent = t('testingConnection');

        const result = await EchoraBYOK.testKey(key);
        dom.btnByokTestInput.disabled = false;

        if (result.success) {
          dom.byokEditStatus.className = 'byok-status-indicator connected';
          dom.byokEditStatusText.textContent = result.message;
        } else {
          dom.byokEditStatus.className = 'byok-status-indicator disconnected';
          dom.byokEditStatusText.textContent = result.message;
        }
      });
    }

    if (dom.btnByokTestSaved) {
      dom.btnByokTestSaved.addEventListener('click', async () => {
        dom.btnByokTestSaved.disabled = true;
        dom.byokSavedStatus.className = 'byok-status-indicator testing';
        dom.byokSavedStatusText.textContent = t('testingConnection');

        const result = await EchoraBYOK.testKey(EchoraBYOK.getKey());
        dom.btnByokTestSaved.disabled = false;

        if (result.success) {
          dom.byokSavedStatus.className = 'byok-status-indicator connected';
          dom.byokSavedStatusText.textContent = result.message;
        } else {
          dom.byokSavedStatus.className = 'byok-status-indicator disconnected';
          dom.byokSavedStatusText.textContent = result.message;
        }
      });
    }

    // Analysis detail modal
    dom.btnCloseAnalysisModal.addEventListener('click', () => closeModal(dom.modalAnalysis));
    dom.modalAnalysis.addEventListener('click', (e) => {
      if (e.target === dom.modalAnalysis) closeModal(dom.modalAnalysis);
    });

    // Dashboard topic roll & options
    if (dom.categorySelect) {
      dom.categorySelect.addEventListener('change', (e) => {
        state.selectedCategoryFilter = e.target.value;
        rollRandomTopic();
      });
    }

    if (dom.difficultySelect) {
      dom.difficultySelect.addEventListener('change', (e) => {
        state.selectedDifficultyFilter = e.target.value;
        rollRandomTopic();
      });
    }

    if (dom.btnRollTopic) {
      dom.btnRollTopic.addEventListener('click', () => rollRandomTopic());
    }

    dom.prepSelector.addEventListener('click', (e) => {
      const btn = e.target.closest('.pill-option');
      if (!btn) return;
      dom.prepSelector.querySelectorAll('.pill-option').forEach(p => p.classList.remove('selected'));
      btn.classList.add('selected');
      const val = btn.getAttribute('data-val');
      if (val === 'custom') {
        if (dom.customPrepWrap) dom.customPrepWrap.style.display = 'flex';
        let v = parseInt(dom.customPrepInput.value, 10);
        if (isNaN(v) || v < 1) v = 45;
        state.selectedPrepTime = Math.min(300, Math.max(1, v));
        dom.customPrepInput.focus();
      } else {
        if (dom.customPrepWrap) dom.customPrepWrap.style.display = 'none';
        state.selectedPrepTime = parseInt(val, 10);
      }
    });

    if (dom.customPrepInput) {
      dom.customPrepInput.addEventListener('input', () => {
        let v = parseInt(dom.customPrepInput.value, 10);
        if (!isNaN(v) && v > 0) {
          state.selectedPrepTime = Math.min(300, Math.max(1, v));
        }
      });
    }

    dom.durationSelector.addEventListener('click', (e) => {
      const btn = e.target.closest('.pill-option');
      if (!btn) return;
      dom.durationSelector.querySelectorAll('.pill-option').forEach(p => p.classList.remove('selected'));
      btn.classList.add('selected');
      const val = btn.getAttribute('data-val');
      if (val === 'custom') {
        if (dom.customDurationWrap) dom.customDurationWrap.style.display = 'flex';
        let v = parseInt(dom.customDurationInput.value, 10);
        if (isNaN(v) || v < 5) v = 90;
        state.selectedSpeakingDuration = Math.min(600, Math.max(5, v));
        dom.customDurationInput.focus();
      } else {
        if (dom.customDurationWrap) dom.customDurationWrap.style.display = 'none';
        state.selectedSpeakingDuration = parseInt(val, 10);
      }
    });

    if (dom.customDurationInput) {
      dom.customDurationInput.addEventListener('input', () => {
        let v = parseInt(dom.customDurationInput.value, 10);
        if (!isNaN(v) && v > 0) {
          state.selectedSpeakingDuration = Math.min(600, Math.max(5, v));
        }
      });
    }

    dom.btnStartChallenge.addEventListener('click', () => {
      // Validate custom prep time if custom button is active
      const prepSelected = dom.prepSelector.querySelector('.pill-option.selected');
      if (prepSelected && prepSelected.getAttribute('data-val') === 'custom') {
        let v = parseInt(dom.customPrepInput.value, 10);
        if (isNaN(v) || v < 1) v = 15;
        v = Math.min(300, Math.max(1, v));
        dom.customPrepInput.value = v;
        state.selectedPrepTime = v;
      }

      // Validate custom speaking duration if custom button is active
      const durSelected = dom.durationSelector.querySelector('.pill-option.selected');
      if (durSelected && durSelected.getAttribute('data-val') === 'custom') {
        let v = parseInt(dom.customDurationInput.value, 10);
        if (isNaN(v) || v < 5) v = 30;
        v = Math.min(600, Math.max(5, v));
        dom.customDurationInput.value = v;
        state.selectedSpeakingDuration = v;
      }

      startPreparation();
    });

    // Prep actions
    dom.btnPrepCancel.addEventListener('click', () => {
      clearInterval(state.prepInterval);
      switchView('dashboard');
    });

    dom.btnPrepSkip.addEventListener('click', () => {
      clearInterval(state.prepInterval);
      beginRecordingSession();
    });

    // Recording Controls
    dom.btnRecPause.addEventListener('click', () => {
      if (!state.recorder) return;
      if (state.recorder.state === 'recording') {
        state.recorder.pause();
        dom.recStatusText.textContent = t('recordingPaused');
        dom.btnRecPauseLabel.textContent = t('resumeBtn');
      } else if (state.recorder.state === 'paused') {
        state.recorder.resume();
        dom.recStatusText.textContent = t('recordingStatus');
        dom.btnRecPauseLabel.textContent = t('pauseBtn');
      }
    });

    dom.btnRecStop.addEventListener('click', () => {
      if (state.recorder) {
        state.recorder.stop();
      }
    });

    // Post-Recording Actions
    dom.btnRecordAgain.addEventListener('click', () => {
      if (state.postRecordPlayer) state.postRecordPlayer.pause();
      startPreparation();
    });

    dom.btnAnalyzeAi.addEventListener('click', () => {
      if (state.postRecordPlayer) state.postRecordPlayer.pause();
      if (state.currentRecording && state.currentRecording.hasSpeech === false) {
        showToast(t('noSpeechDetected'), 5000);
        return;
      }
      sendRecordingForAnalysis();
    });

    // Result Actions
    dom.btnResultViewHistory.addEventListener('click', () => switchView('history'));
    dom.btnResultPracticeAnother.addEventListener('click', () => {
      rollRandomTopic();
      switchView('dashboard');
    });

    // History Filter Chips
    dom.historyFilterChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      dom.historyFilterChips.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.historyFilter = chip.getAttribute('data-category');
      renderHistorySessions();
    });
  }

  // --------------------------------------------------------------------------
  // Application Bootstrap
  // --------------------------------------------------------------------------
  function init() {
    // Waveform & Visualizer Initializations
    state.ambientWave = new AmbientWaveform('hero-wave-canvas');
    state.liveVisualizer = new LiveAudioVisualizer('live-visualizer-canvas');
    state.ambientWave.start();

    // Bind event handlers
    setupEventListeners();

    // Fetch initial datasets & pick initial random topic
    rollRandomTopic();
    fetchSessions();
    fetchProfile();

    // Default language is English
    setLanguage('en');
  }

  init();
});
