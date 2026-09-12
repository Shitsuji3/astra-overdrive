// Renders the two explosion bodies through the real audio.js code path, writes them out as
// WAV so they can be listened to, and checks they are broadband blasts that decay rather
// than the thin blip the kill used to fall back to.
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');

const RATE = 48000;
const played = [];

function stubContext() {
  const node = () => ({ connect: t => t, disconnect() {}, gain: { value: 1,
    setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {},
    cancelScheduledValues() {}, setTargetAtTime() {} } });
  return {
    sampleRate: RATE, currentTime: 0, state: 'running', resume() {}, destination: node(),
    createGain: node,
    createBuffer(channels, length) {
      const data = new Float32Array(length);
      return { length, sampleRate: RATE, getChannelData: () => data };
    },
    createBufferSource() {
      const s = { buffer: null, loop: false, playbackRate: { value: 1 },
        connect: t => t, disconnect() {}, start() { played.push(s.buffer); }, stop() {} };
      return s;
    },
    // a kill that fell back to the old tone map would land here instead of on a buffer
    createOscillator() { throw new Error('the explosion must not fall back to a bare tone'); },
    decodeAudioData: () => Promise.reject(new Error('no samples here'))
  };
}

const box = { console, Math, Date, Audio: function () { return { play: () => Promise.resolve() }; } };
box.window = box;
box.AudioContext = stubContext;
vm.createContext(box);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'audio.js'), 'utf8'), box);

function render(name) {
  played.length = 0;
  box.AstraAudio.sound(name);
  assert.equal(played.length, 1, `${name} plays one voice`);
  return played[0].getChannelData(0);
}

function wav(samples) {
  const bytes = Buffer.alloc(44 + samples.length * 2);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(36 + samples.length * 2, 4); bytes.write('WAVE', 8);
  bytes.write('fmt ', 12); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(RATE, 24); bytes.writeUInt32LE(RATE * 2, 28);
  bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36); bytes.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++)
    bytes.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2);
  return bytes;
}

// energy in a band, by counting zero crossings and by a coarse Goertzel at a few frequencies
function goertzel(samples, from, to, hz) {
  const w = 2 * Math.PI * hz / RATE, c = 2 * Math.cos(w);
  let s1 = 0, s2 = 0;
  for (let i = from; i < to; i++) { const s = samples[i] + c * s1 - s2; s2 = s1; s1 = s; }
  return Math.sqrt(s1 * s1 + s2 * s2 - c * s1 * s2) / (to - from);
}
function rms(samples, from, to) {
  let sum = 0; for (let i = from; i < to; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / Math.max(1, to - from));
}

const report = {};
for (const [name, file, seconds] of [['explode', 'qa/se-explode.wav', .62], ['boom', 'qa/se-boss-boom.wav', 2.1]]) {
  const s = render(name);
  fs.writeFileSync(file, wav(s));
  const peak = s.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  const slices = 6, per = Math.floor(s.length / slices), env = [];
  for (let i = 0; i < slices; i++) env.push(Number(rms(s, i * per, (i + 1) * per).toFixed(4)));
  const head = [0, Math.floor(RATE * .05)];
  const bands = [60, 180, 600, 2000, 6000].map(hz => Number(goertzel(s, head[0], head[1], hz).toFixed(4)));
  report[name] = { seconds: Number((s.length / RATE).toFixed(2)), peak: Number(peak.toFixed(3)), env, bands };

  assert.ok(Math.abs(s.length / RATE - seconds) < .02, `${name} runs ${seconds}s`);
  assert.ok(peak > .55 && peak <= 1, `${name} peaks at a usable level: ${peak.toFixed(3)}`);
  // it has to hit hard and then get out of the way
  assert.ok(env[0] > env[1] && env[1] > env[env.length - 1], `${name} decays: ${env.join(' > ')}`);
  assert.ok(env[0] > env[env.length - 1] * 6, `${name} front-loads its energy`);
  // a blast, not a beep: something is present in every band from the sub to the air
  for (let i = 0; i < bands.length; i++)
    assert.ok(bands[i] > .0008, `${name} carries band ${i}: ${bands.join(', ')}`);
  // the weight sits low, which is what makes it read as an explosion
  assert.ok(bands[0] + bands[1] > bands[3] + bands[4], `${name} is weighted low`);
  // and it opens with a crack: the air is far brighter at the hit than in the tail
  const opening = goertzel(s, 0, Math.floor(RATE * .008), 6000);
  const tail = goertzel(s, Math.floor(RATE * .2), Math.floor(RATE * .4), 6000);
  report[name].crack = Number((opening / Math.max(tail, 1e-6)).toFixed(1));
  assert.ok(opening > tail * 8, `${name} opens with a crack: ${report[name].crack}x the tail`);
}
// the boss finale must be bigger and longer than a mob going up
assert.ok(report.boom.seconds > report.explode.seconds * 3, 'the finale is far longer');
assert.ok(report.boom.bands[0] > report.explode.bands[0], 'the finale carries more sub');
console.log(JSON.stringify(report, null, 1));
