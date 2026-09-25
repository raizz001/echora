const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
process.env.PORT = PORT;

// Start server
const appServer = require('./server.js');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(`http://localhost:${PORT}${path}`, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING BYOK & REGRESSION TESTS ---');
  await delay(1500);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const health = await request('/api/health');
    assert(health.status === 200 && health.body.byok === true, 'Health check indicates byok: true');

    // 2. Test Connection endpoint without key
    const testNoKey = await request('/api/ai/test-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {}
    });
    assert(testNoKey.status === 400 && testNoKey.body.error === 'INVALID_FORMAT', 'Test key without key returns 400 INVALID_FORMAT');

    // 3. Test Connection endpoint with invalid fake key
    const testFakeKey = await request('/api/ai/test-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gemini-api-key': 'AIzaSyFakeKeyForTesting1234567890'
      },
      body: {}
    });
    assert(testFakeKey.status === 401 && testFakeKey.body.error === 'AUTH_FAILED', 'Test key with invalid key returns 401 AUTH_FAILED');
    assert(!JSON.stringify(testFakeKey.body).includes('AIzaSyFakeKey'), 'API key is not leaked in response');

    // 4. Solo Practice /api/sessions/analyze without key
    const analyzeNoKey = await request('/api/sessions/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: 'Test Topic',
        transcript: 'Hello everyone this is a test speech',
        hasSpeech: 'true'
      })
    });
    assert(analyzeNoKey.status === 400 && analyzeNoKey.body.error === 'API_KEY_REQUIRED', 'Solo Practice analyze without API key returns 400 API_KEY_REQUIRED');

    // 5. Solo Practice silent recording (NO_SPEECH_DETECTED regression check)
    const analyzeSilent = await request('/api/sessions/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gemini-api-key': 'AIzaSyFakeKeyForTesting1234567890'
      },
      body: JSON.stringify({
        topic: 'Test Topic',
        transcript: '',
        hasSpeech: 'false'
      })
    });
    assert(analyzeSilent.body.error === 'NO_SPEECH_DETECTED' && analyzeSilent.body.success === false, 'Silent recording returns NO_SPEECH_DETECTED even with API key provided');
    assert(!analyzeSilent.body.overallScore, 'Silent recording never receives an AI score or fallback score');

    // 6. Solo Practice analyze with invalid key and speech
    const analyzeInvalidKey = await request('/api/sessions/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gemini-api-key': 'AIzaSyFakeKeyForTesting1234567890'
      },
      body: JSON.stringify({
        topic: 'Test Topic',
        transcript: 'Hello testing valid speech content with fake key',
        hasSpeech: 'true'
      })
    });
    assert(analyzeInvalidKey.status === 401 && analyzeInvalidKey.body.error === 'INVALID_API_KEY', 'Analyze with invalid key returns 401 INVALID_API_KEY');
    assert(!analyzeInvalidKey.body.overallScore, 'Invalid API key does NOT trigger fallback heuristic score');

    // 7. TalkWith Coach preview voice without key
    const previewNoKey = await request('/api/live-interview/preview-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { voice: 'Puck', language: 'en' }
    });
    assert(previewNoKey.status === 400 && previewNoKey.body.error === 'API_KEY_REQUIRED', 'TalkWith Coach preview voice without key returns 400 API_KEY_REQUIRED');

    // 8. TalkWith Coach create session without key
    const sessionNoKey = await request('/api/live-interview/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { voice: 'Puck', language: 'en' }
    });
    assert(sessionNoKey.status === 400 && sessionNoKey.body.error === 'API_KEY_REQUIRED', 'TalkWith Coach session without key returns 400 API_KEY_REQUIRED');

    // 9. TalkWith Coach create session with key
    const sessionWithKey = await request('/api/live-interview/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gemini-api-key': 'AIzaSyFakeKeyForTesting1234567890'
      },
      body: { voice: 'Puck', language: 'id', interviewType: 'School' }
    });
    assert(sessionWithKey.status === 201 && sessionWithKey.body.sessionId, 'TalkWith Coach session created successfully with BYOK key');
    assert(!sessionWithKey.body.config?.apiKey && !sessionWithKey.body.apiKey, 'Session response does NOT echo back the API key');

    // 10. WebSocket connection test with invalid key upstream
    const wsUrl = `ws://localhost:${PORT}/api/live-interview/ws?sessionId=${sessionWithKey.body.sessionId}`;
    await new Promise((resolve) => {
      const ws = new WebSocket(wsUrl);
      ws.on('open', () => {
        console.log('[PASS] WebSocket connected for session');
        passed++;
      });
      ws.on('message', (msg) => {
        const parsed = JSON.parse(msg.toString());
        // Since fake key is invalid, upstream Gemini should send error
        if (parsed.type === 'error') {
          assert(!parsed.message.includes('AIzaSyFakeKey'), 'WebSocket error message sanitizes/redacts API key');
          ws.close();
          resolve();
        }
      });
      ws.on('close', () => {
        resolve();
      });
      ws.on('error', () => {
        resolve();
      });
      setTimeout(() => {
        try { ws.close(); } catch (e) {}
        resolve();
      }, 3000);
    });

    // 11. TalkWith Coach end session without key leaks
    const endSession = await request('/api/live-interview/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        sessionId: sessionWithKey.body.sessionId,
        duration: 120,
        transcript: [
          { sender: 'user', text: 'Saya ingin melatih cara berbicara di depan umum.' },
          { sender: 'ai', text: 'Tentu, apa topik yang ingin kamu sampaikan?' }
        ],
        language: 'id',
        voice: 'Puck',
        interviewType: 'School'
      }
    });
    assert(endSession.status === 201, 'TalkWith Coach end session completed');
    assert(!endSession.body.apiKey, 'End session payload does not include apiKey');

    // 12. History check for key leaks
    const history = await request('/api/live-interview/history');
    assert(history.status === 200, 'History retrieved');
    const historyStr = JSON.stringify(history.body);
    assert(!historyStr.includes('AIzaSyFakeKey'), 'Session history has NO API key leaks');

    console.log(`\n========================================`);
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
