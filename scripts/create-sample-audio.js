const fs = require('fs');
const path = require('path');

const audioDir = path.join(__dirname, '..', 'public', 'audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

// Generate simple valid 44.1kHz 16-bit mono WAV with a soft gentle harmonic chime
function createWavBuffer(durationSeconds, frequency = 440) {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const blockAlign = 2; // 16-bit mono
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF chunk descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(1, 22);  // NumChannels (1 mono)
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(byteRate, 28);   // ByteRate
  buffer.writeUInt16LE(blockAlign, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Write samples with a subtle warm acoustic decay
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Gentle envelope
    const envelope = Math.exp(-t * 0.8) * Math.sin(Math.min(t * 10, Math.PI / 2));
    // Soft chords (A major / D major)
    const sampleVal = Math.sin(2 * Math.PI * frequency * t) * 0.5 +
                      Math.sin(2 * Math.PI * (frequency * 1.25) * t) * 0.3 +
                      Math.sin(2 * Math.PI * (frequency * 1.5) * t) * 0.2;
    const sample16 = Math.max(-32767, Math.min(32767, Math.floor(sampleVal * envelope * 12000)));
    buffer.writeInt16LE(sample16, 44 + i * 2);
  }

  return buffer;
}

fs.writeFileSync(path.join(audioDir, 'sample-1.wav'), createWavBuffer(5, 330));
fs.writeFileSync(path.join(audioDir, 'sample-2.wav'), createWavBuffer(4, 392));
console.log('Sample audio files generated successfully!');
