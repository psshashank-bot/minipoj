// ====== Moodify Prototype (Ready Pack) ======
// Runs on a local static server. Includes demo WAV tracks and quotes.json.
// Models are downloaded by the helper script. Once models/ has the files, detection will work.

const statusEl = document.getElementById('status');
const videoEl  = document.getElementById('video');
const canvasEl = document.getElementById('overlay');
const moodChip = document.getElementById('moodChip');
const audioEl  = document.getElementById('audio');
const trackTitleEl = document.getElementById('trackTitle');
const trackMoodEl  = document.getElementById('trackMood');
const quoteEl  = document.getElementById('quote');

const startBtn = document.getElementById('startBtn');
const stopBtn  = document.getElementById('stopBtn');
const moodSelect = document.getElementById('moodSelect');
const playMoodBtn = document.getElementById('playMoodBtn');

// --- Playlists: WAV demo tracks included ---
const playlists = {
  happy:   [{ title: "Bright Day", src: "songs/happy.wav" }],
  sad:     [{ title: "New Dawn",   src: "songs/sad.wav" }],
  angry:   [{ title: "Calm Seas",  src: "songs/angry.wav" }],
  neutral: [{ title: "Lo-Fi Loop", src: "songs/neutral.wav" }],
  surprised: [{ title: "Spark",    src: "songs/neutral.wav" }],
  fearful:   [{ title: "Steady",   src: "songs/neutral.wav" }],
  disgusted: [{ title: "Reset",    src: "songs/neutral.wav" }]
};

let quotes = null;
fetch("data/quotes.json").then(r => r.json()).then(j => { quotes = j; }).catch(()=>{});

function getQuote(mood){
  const list = quotes && quotes[mood];
  if(list && list.length) return list[Math.floor(Math.random()*list.length)];
  return "Vibes coming right up.";
}

let stream = null;
let detecting = false;
let detectionLoopId = null;
let lastMood = null;

// --- Utility: pick a track for a mood ---
function pickTrack(mood){
  const list = playlists[mood] || playlists.neutral;
  return list[Math.floor(Math.random() * list.length)];
}

// --- Play a mood's track & update UI ---
function playForMood(mood){
  const track = pickTrack(mood);
  if(!track) return;
  audioEl.src = track.src;
  audioEl.play().catch(() => {});
  trackTitleEl.textContent = track.title;
  trackMoodEl.textContent = `for mood: ${mood}`;
  quoteEl.textContent = getQuote(mood);
  moodChip.textContent = `Mood: ${mood}`;
}

// --- Start camera ---
async function startCamera(){
  if(stream) return;
  try{
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
    videoEl.srcObject = stream;
    statusEl.textContent = "camera on";
  }catch(err){
    statusEl.textContent = "camera error: " + err.message;
    console.error(err);
  }
}

// --- Stop camera ---
function stopCamera(){
  if(stream){
    stream.getTracks().forEach(t => t.stop());
    stream = null;
    statusEl.textContent = "camera stopped";
  }
}

// --- Load face-api models ---
async function loadModels(){
  statusEl.textContent = "loading models...";
  const MODEL_URL = "./models";
  try{
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
    ]);
    statusEl.textContent = "models loaded";
    return true;
  }catch(e){
    statusEl.textContent = "models not found — run get_models.py (see README)";
    console.warn(e);
    return false;
  }
}

// --- Detection loop ---
async function startDetection(){
  if(detecting) return;
  detecting = true;

  const displaySize = { width: videoEl.clientWidth, height: videoEl.clientHeight };
  canvasEl.width = displaySize.width;
  canvasEl.height = displaySize.height;

  const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

  const loop = async () => {
    if(!detecting) return;

    let mood = lastMood || "neutral";
    let maxScore = 0;

    try{
      const detections = await faceapi.detectAllFaces(videoEl, opts).withFaceExpressions();
      const resized = faceapi.resizeResults(detections, displaySize);

      const ctx = canvasEl.getContext('2d');
      ctx.clearRect(0,0,canvasEl.width, canvasEl.height);
      faceapi.draw.drawDetections(canvasEl, resized);
      faceapi.draw.drawFaceExpressions(canvasEl, resized, 0.02);

      resized.forEach(res => {
        const expr = res.expressions;
        for(const [k,v] of Object.entries(expr)){
          if(v > maxScore){
            maxScore = v;
            mood = k;
          }
        }
      });
    }catch(err){
      // if models missing, keep UI usable
      const ctx = canvasEl.getContext('2d');
      ctx && ctx.clearRect(0,0,canvasEl.width, canvasEl.height);
      statusEl.textContent = "detection paused — models missing (see README)";
    }

    if(mood !== lastMood && maxScore > 0.6){
      lastMood = mood;
      playForMood(mood);
    }

    detectionLoopId = requestAnimationFrame(loop);
  };

  loop();
  statusEl.textContent = "detecting...";
}

function stopDetection(){
  detecting = false;
  if(detectionLoopId) cancelAnimationFrame(detectionLoopId);
  const ctx = canvasEl.getContext('2d');
  ctx && ctx.clearRect(0,0,canvasEl.width, canvasEl.height);
}

// Controls
startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  await startCamera();
  const ok = await loadModels();
  await audioEl.play().catch(()=>{}); // user gesture primes audio
  if(ok) startDetection();
});

stopBtn.addEventListener('click', () => {
  stopDetection();
  stopCamera();
  startBtn.disabled = false;
});

playMoodBtn.addEventListener('click', () => {
  const mood = moodSelect.value;
  lastMood = mood;
  playForMood(mood);
});

// Initial
trackTitleEl.textContent = "—";
trackMoodEl.textContent  = "—";
quoteEl.textContent      = "Let’s find the right vibe for you.";