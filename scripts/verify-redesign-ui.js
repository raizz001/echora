const fs = require('fs');
const path = require('path');

console.log('=== VERIFYING ECHORA UI REDESIGN & REFERENCE SPECIFICATION ===\n');

let allPassed = true;
function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
  } else {
    console.error(`  FAIL: ${message}`);
    allPassed = false;
  }
}

// 1. Check index.html structure
const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

console.log('[Check 1] Navbar Positioning & Centering:');
assert(html.includes('class="navbar"'), 'Navbar exists');
assert(html.includes('id="nav-brand-logo"'), 'Brand logo integrated inside navbar');
assert(html.includes('id="nav-btn-live-interview"'), 'TalkWith Coach button in navbar');
assert(html.includes('id="nav-btn-dashboard"'), 'Practice button in navbar');

console.log('\n[Check 2] Hero Hierarchy & Large ECHORA Centerpiece:');
assert(html.includes('class="hero-brand-wordmark"'), 'Large centerpiece ECHORA wordmark class exists');
assert(html.includes('>ECHORA</h1>'), 'LARGE "ECHORA" wordmark is center heading');
assert(html.includes('class="hero-tagline-sequence"'), 'Hero tagline sequence exists');
assert(html.includes('>Speak.</span>'), '"Speak." word exists in sequence');
assert(html.includes('>Reflect.</span>'), '"Reflect." word exists in sequence');
assert(html.includes('>Evolve.</span>'), '"Evolve." word exists in sequence');
assert(html.includes('class="hero-subtitle"'), 'Existing description content preserved in hero');

console.log('\n[Check 3] CSS Top-Center Navbar & Palette Contrast:');
const cssPath = path.join(__dirname, '..', 'public', 'css', 'style.css');
const css = fs.readFileSync(cssPath, 'utf8');
assert(css.includes('top: 18px'), 'Navbar positioned with top offset');
assert(css.includes('left: 50%') && css.includes('translateX(-50%)'), 'Navbar is centered using left: 50% & translateX(-50%)');
assert(css.includes('border-radius: 40px'), 'Navbar is a lightweight floating pill');
assert(css.includes('.hero-brand-wordmark'), 'Hero brand wordmark styling exists');
assert(css.includes('--accent-peach: #F2A67A'), 'Warm peach accent defined for CTA contrast');
assert(css.includes('--bg-main: #071714'), 'Deepest background tone defined');
assert(css.includes('--bg-surface: #0E2924'), 'Elevated card surface tone defined');

console.log('\n[Check 4] TalkWith Coach Showcase Flow:');
assert(html.includes('data-i18n="showcaseListening"'), 'Step 1 listening state exists');
assert(html.includes('data-i18n="confirmModalTitle"'), 'Step 2 confirmation heading exists');
assert(html.includes('id="btn-showcase-demo-confirm"'), 'Step 3 That\'s right confirmation button exists');
assert(html.includes('id="btn-showcase-demo-retry"'), 'Step 3 Speak again retry button exists');
assert(html.includes('class="coach-tag-name">ECHORA</span>'), 'AI response attributed to ECHORA');
assert(html.includes('id="showcase-sample-reply"'), 'AI coach conversational speech bubble exists');

console.log('\n[Check 5] Setting Boundaries:');
const liveSetupCard = html.substring(html.indexOf('id="view-live-setup"'), html.indexOf('id="view-live-room"'));
assert(!liveSetupCard.includes('id="live-difficulty-selector"'), 'TalkWith Coach has NO difficulty selector');
assert(!liveSetupCard.includes('id="live-style-selector"'), 'TalkWith Coach has NO coach style selector');

console.log('\n[Check 6] Solo Practice Controls & Content Preserved:');
assert(html.includes('id="challenge-category-badge"'), 'Category badge preserved');
assert(html.includes('id="challenge-difficulty-badge"'), 'Difficulty badge preserved in solo practice');
assert(html.includes('id="challenge-category-select"'), 'Category select preserved');
assert(html.includes('id="challenge-difficulty-select"'), 'Difficulty select preserved in solo practice');
assert(html.includes('id="prep-time-selector"'), 'Preparation time selector preserved');
assert(html.includes('id="custom-prep-wrap"'), 'Custom preparation time wrapper preserved');
assert(html.includes('id="speaking-duration-selector"'), 'Speaking duration selector preserved');
assert(html.includes('id="custom-duration-wrap"'), 'Custom speaking duration wrapper preserved');

console.log('\n=== RESULT: ' + (allPassed ? 'ALL REFERENCE SPECIFICATION CHECKS PASSED ✅' : 'SOME CHECKS FAILED ❌') + ' ===');
if (!allPassed) process.exit(1);
