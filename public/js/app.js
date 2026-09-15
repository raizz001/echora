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
    recorder: null
  };

  // DOM Element References
  const dom = {
    // Navigation
    navBrand: document.getElementById('nav-brand-logo'),
    navDashboard: document.getElementById('nav-btn-dashboard'),
    navHistory: document.getElementById('nav-btn-history'),
    navProfile: document.getElementById('nav-btn-profile'),
    navStart: document.getElementById('nav-btn-start'),
    langBtnEn: document.getElementById('lang-btn-en'),
    langBtnId: document.getElementById('lang-btn-id'),

    // Views
    views: {
      landing: document.getElementById('view-landing'),
      dashboard: document.getElementById('view-dashboard'),
      prep: document.getElementById('view-prep'),
      recording: document.getElementById('view-recording'),
      postRecord: document.getElementById('view-post-record'),
      analyzing: document.getElementById('view-analyzing'),
      result: document.getElementById('view-result'),
      history: document.getElementById('view-history')
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

    // Profile Modal
    modalProfile: document.getElementById('modal-profile'),
    btnCloseProfileModal: document.getElementById('btn-close-profile-modal'),
    profileStatSessions: document.getElementById('profile-stat-sessions'),
    profileStatTime: document.getElementById('profile-stat-time'),
    profileForm: document.getElementById('profile-form'),
    profileNameInput: document.getElementById('profile-name-input'),

    // Toast
    toast: document.getElementById('toast-msg')
  };

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
        el.textContent = translations[lang][key];
      }
    });

    // Update topic text if loaded
    if (state.currentTopic) {
      renderTopic(state.currentTopic);
    }

    // Re-render recent sessions & history to refresh date formats
    renderRecentSessions();
    renderHistorySessions();
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

    Object.keys(dom.views).forEach(key => {
      dom.views[key].classList.remove('active');
    });

    dom.views[viewName].classList.add('active');
    state.currentView = viewName;

    // Update nav active states
    [dom.navDashboard, dom.navHistory].forEach(btn => btn.classList.remove('active'));
    if (viewName === 'dashboard') dom.navDashboard.classList.add('active');
    if (viewName === 'history') dom.navHistory.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // View specific lifecycle
    if (viewName === 'landing') {
      if (state.ambientWave) state.ambientWave.start();
    } else {
      if (state.ambientWave) state.ambientWave.stop();
    }

    if (viewName === 'dashboard') {
      fetchSessions();
      fetchProfile();
      if (!state.currentTopic) rollRandomTopic();
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
    const displayTopic = (isId && session.topicId_id) ? session.topicId_id : session.topic;

    card.innerHTML = `
      <div class="session-card-main">
        <div class="session-card-info">
          <h4 class="session-topic-title">${escapeHtml(displayTopic)}</h4>
          <div class="session-card-meta">
            <span class="category-badge" style="font-size:0.75rem; padding:2px 8px;">${session.category}</span>
            <span>${formatDate(session.date)}</span>
            <span>•</span>
            <span>${formatTimeShort(session.duration)}</span>
          </div>
        </div>
        <div class="session-score-pill">
          <div class="session-score-val">${session.overallScore}</div>
          <div class="session-score-denom">${t('scoreOutOf')}</div>
        </div>
      </div>

      <div class="session-player-wrap">
        <div class="card-audio-container" style="flex:1;"></div>
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

    // Instantiate custom audio player inside card
    const audioContainer = card.querySelector('.card-audio-container');
    const player = new EchoraAudioPlayer(audioContainer, session.audioUrl);

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
      }
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
  }

  // --------------------------------------------------------------------------
  // AI Coaching Analysis
  // --------------------------------------------------------------------------
  async function sendRecordingForAnalysis() {
    if (!state.currentRecording || !state.currentTopic) return;

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

      const res = await fetch('/api/sessions/analyze', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        throw new Error('Analysis request failed');
      }

      const analyzedSession = await res.json();
      state.lastAnalysisResult = analyzedSession;
      state.sessions.unshift(analyzedSession);
      fetchProfile();

      renderAnalysisResult(analyzedSession);
      switchView('result');
      showToast(t('savedToHistory'));
    } catch (err) {
      clearInterval(progressInterval);
      console.error('AI analysis error:', err);
      alert('Unable to analyze recording. Please try again.');
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
    const displayTopic = (isId && session.topicId_id) ? session.topicId_id : session.topic;

    dom.modalCategoryBadge.textContent = session.category;
    dom.modalTopicTitle.textContent = `“${displayTopic}”`;

    dom.modalOverallScore.textContent = session.overallScore;
    const circumference = 2 * Math.PI * 70;
    const offset = circumference - (session.overallScore / 100) * circumference;
    dom.modalRingProgress.style.strokeDashoffset = offset;

    const s = session.scores || {};
    dom.modalBreakdownContentVal.textContent = s.content || 80;
    dom.modalBreakdownContentBar.style.width = `${s.content || 80}%`;

    dom.modalBreakdownFluencyVal.textContent = s.fluency || 80;
    dom.modalBreakdownFluencyBar.style.width = `${s.fluency || 80}%`;

    dom.modalBreakdownArticulationVal.textContent = s.articulation || 80;
    dom.modalBreakdownArticulationBar.style.width = `${s.articulation || 80}%`;

    dom.modalBreakdownPaceVal.textContent = s.pace || 80;
    dom.modalBreakdownPaceBar.style.width = `${s.pace || 80}%`;

    dom.modalBreakdownExpressionVal.textContent = s.expression || 80;
    dom.modalBreakdownExpressionBar.style.width = `${s.expression || 80}%`;

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

    // Modal Audio Player
    if (!state.modalAudioPlayer) {
      state.modalAudioPlayer = new EchoraAudioPlayer(dom.modalAudioContainer, session.audioUrl);
    } else {
      state.modalAudioPlayer.load(session.audioUrl);
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
  // Event Bindings
  // --------------------------------------------------------------------------
  function setupEventListeners() {
    // Navigation
    dom.navBrand.addEventListener('click', () => switchView('landing'));
    dom.navDashboard.addEventListener('click', () => switchView('dashboard'));
    dom.navHistory.addEventListener('click', () => switchView('history'));
    dom.btnViewAllHistory.addEventListener('click', () => switchView('history'));
    dom.heroStart.addEventListener('click', () => switchView('dashboard'));
    dom.navStart.addEventListener('click', () => switchView('dashboard'));

    // Language buttons
    dom.langBtnEn.addEventListener('click', () => setLanguage('en'));
    dom.langBtnId.addEventListener('click', () => setLanguage('id'));

    // Profile modal
    dom.navProfile.addEventListener('click', () => {
      fetchProfile();
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
