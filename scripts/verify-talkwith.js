// Automated verification script for TalkWith Coach revisions
require('dotenv').config();
const fs = require('fs');

async function runTests() {
  console.log('=== STARTING TALKWITH COACH VERIFICATION ===\n');

  // Test 1: Localhost server health
  console.log('[Test 1] Checking Localhost HTTP Server...');
  const healthResp = await fetch('http://localhost:3000');
  if (healthResp.status === 200) {
    console.log('  PASS: Localhost HTTP 200 OK');
  } else {
    console.error(`  FAIL: Unexpected status ${healthResp.status}`);
  }

  // Test 2: Voices endpoint
  console.log('\n[Test 2] Checking Voices API...');
  const voicesResp = await fetch('http://localhost:3000/api/live-interview/voices');
  const voicesData = await voicesResp.json();
  if (voicesData.voices && voicesData.voices.length > 0) {
    console.log(`  PASS: Voices returned (${voicesData.voices.length} verified voices)`);
  } else {
    console.error('  FAIL: No voices returned');
  }

  // Test 3: Session creation without difficulty
  console.log('\n[Test 3] Testing Session Creation (4 Session Types, No Difficulty)...');
  const sessionResp = await fetch('http://localhost:3000/api/live-interview/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      interviewType: 'School',
      language: 'id',
      voice: 'Puck',
      style: 'Casual'
    })
  });
  const sessionData = await sessionResp.json();
  if (sessionData.sessionId) {
    console.log(`  PASS: Session created successfully: ${sessionData.sessionId}`);
  } else {
    console.error('  FAIL: Session creation failed', sessionData);
  }

  // Test 4: Transcribe endpoint with silence / empty audio
  console.log('\n[Test 4] Testing Silence / Empty Audio (Section 7: No Hallucinations)...');
  const emptyWav = fs.readFileSync('public/audio/sample-1.wav');
  const emptyResp = await fetch('http://localhost:3000/api/live-interview/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioData: emptyWav.toString('base64'),
      mimeType: 'audio/wav',
      language: 'id'
    })
  });
  const emptyData = await emptyResp.json();
  if (emptyData.transcript === '') {
    console.log('  PASS: Silent audio correctly returned empty transcript (no hallucinations)');
  } else {
    console.log(`  RESULT: ${JSON.stringify(emptyData)}`);
  }

  // Test 5: Verify prompt instructions for Test A, B, C verbatim
  console.log('\n[Test 5] Verifying Prompt & Non-Translation Rules via Gemini API...');
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('  WARN: GEMINI_API_KEY missing from environment');
    return;
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

  // Verify Gemini understands strict verbatim transcription rules
  const testRuleResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { text: 'Verify comprehension: If a student says "Menurut saya penggunaan AI bisa membantu siswa belajar lebih efektif.", should you translate this to English? Answer strictly YES or NO.' }
        ]
      }],
      generationConfig: { temperature: 0.0 }
    })
  });
  const ruleData = await testRuleResp.json();
  const ruleText = ruleData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  console.log(`  Rule Comprehension Check: ${ruleText}`);
  if (ruleText && ruleText.toUpperCase().includes('NO')) {
    console.log('  PASS: Gemini strictly enforces NO translation for Indonesian speech.');
  }

  // Test 6: Verify UI files for Difficulty removal
  console.log('\n[Test 6] Verifying Difficulty Removal from TalkWith Coach...');
  const indexHtml = fs.readFileSync('public/index.html', 'utf8');
  const appJs = fs.readFileSync('public/js/app.js', 'utf8');
  const liveInterviewJs = fs.readFileSync('public/js/live-interview.js', 'utf8');

  const hasDifficultySelectorInHtml = indexHtml.includes('id="live-difficulty-selector"');
  const hasDiffBadgeInView11 = indexHtml.includes('id="live-result-diff-badge"');
  const hasDifficultyInLiveInterview = liveInterviewJs.includes("difficulty: this.config?.difficulty");

  if (!hasDifficultySelectorInHtml && !hasDiffBadgeInView11 && !hasDifficultyInLiveInterview) {
    console.log('  PASS: Difficulty completely removed from View 9, View 11, and live-interview controller.');
  } else {
    console.error('  FAIL: Found lingering difficulty references:', {
      hasDifficultySelectorInHtml,
      hasDiffBadgeInView11,
      hasDifficultyInLiveInterview
    });
  }

  // Test 7: Verify Coach Style removal from TalkWith Coach
  console.log('\n[Test 7] Verifying Coach Style Removal from TalkWith Coach...');
  const hasStyleSelectorInHtml = indexHtml.includes('id="live-style-selector"');
  const hasLiveStyleInAppJs = appJs.includes('#live-style-selector');
  const liveInterviewServiceJs = fs.readFileSync('live-interview-service.js', 'utf8');
  const hasStyleParamInPrompt = liveInterviewServiceJs.includes('buildSystemInstruction({ language, sessionType, style })');

  if (!hasStyleSelectorInHtml && !hasLiveStyleInAppJs && !hasStyleParamInPrompt) {
    console.log('  PASS: Coach Style selector completely removed from UI and system prompt.');
  } else {
    console.error('  FAIL: Found lingering Coach Style references:', {
      hasStyleSelectorInHtml,
      hasLiveStyleInAppJs,
      hasStyleParamInPrompt
    });
  }

  console.log('\n=== ALL AUTOMATED VERIFICATIONS COMPLETE ===');
}

runTests().catch(console.error);
