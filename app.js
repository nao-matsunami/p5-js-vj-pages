const stage = document.querySelector("#p5-stage");
const todayIso = localIsoDate(new Date());
let sources = [];
let drops = [];
let purchaseConfig = { enabled: false, label: "Full Pack", url: "", note: "映像データの購入先は準備中です。" };
let activePiece;
let sketch;
let p5Canvas;
let canvas;
let startTime = performance.now();
let pausedAt = 0;
let isPaused = false;
let calmMotion = false;
let videoRecorder = null;
let recordingStartedAt = 0;
let recordingProgressId = 0;

initialize();

async function initialize() {
  await loadData();
  activePiece = pickPiece(todayIso);
  renderContent();
  startSketch();
}

async function loadData() {
  try {
    const [dropsResponse, purchaseResponse] = await Promise.all([
      fetch("./data/drops.json", { cache: "no-store" }),
      fetch("./data/purchase.json", { cache: "no-store" }),
    ]);
    if (dropsResponse.ok) {
      const data = await dropsResponse.json();
      if (Array.isArray(data.sources)) sources = data.sources;
      if (Array.isArray(data.drops)) drops = data.drops.sort((a, b) => b.date.localeCompare(a.date));
    }
    if (purchaseResponse.ok) purchaseConfig = { ...purchaseConfig, ...(await purchaseResponse.json()) };
  } catch {
    drops = [];
  }
}

function startSketch() {
  sketch = new window.p5((p) => {
    p.setup = () => {
      p5Canvas = p.createCanvas(stage.clientWidth, stage.clientHeight);
      p5Canvas.parent(stage);
      canvas = p5Canvas.elt;
      p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
      p.noiseDetail(3, 0.48);
    };
    p.windowResized = () => p.resizeCanvas(stage.clientWidth, stage.clientHeight);
    p.draw = () => drawSketch(p);
  });
}

function drawSketch(p) {
  const elapsed = isPaused ? pausedAt : (performance.now() - startTime) / 1000;
  const speed = calmMotion ? 0.42 : 1;
  const phase = ((elapsed * speed) % activePiece.loopSeconds) / activePiece.loopSeconds;
  renderP5(p, activePiece, phase, false);
}

function renderP5(p, piece, phase, alpha) {
  const w = p.width;
  const h = p.height;
  const cx = w / 2;
  const cy = h / 2;
  const size = Math.min(w, h);
  const cycle = phase * Math.PI * 2;
  const a = rgb(piece.palette.slice(0, 3));
  const b = rgb(piece.palette.slice(3, 6));
  p.clear();
  if (!alpha) {
    p.background(3, 5, 5);
    p.noStroke();
    for (let i = 0; i < 7; i += 1) {
      const t = i / 6;
      p.fill(lerp(a[0], b[0], t) * 0.12, lerp(a[1], b[1], t) * 0.12, lerp(a[2], b[2], t) * 0.12, 90);
      p.circle(cx + Math.cos(cycle + i) * size * 0.08, cy + Math.sin(cycle * 0.75 + i) * size * 0.08, size * (0.55 - i * 0.045));
    }
  }
  p.blendMode(p.ADD);
  p.noFill();
  for (let ring = 0; ring < 9; ring += 1) {
    const t = ring / 8;
    const radius = size * (0.12 + t * 0.38 + Math.sin(cycle * (ring % 3 + 1)) * 0.012);
    p.stroke(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t), 125);
    p.strokeWeight(Math.max(1.5, size * (0.004 + (1 - t) * 0.003)));
    p.arc(cx, cy, radius, radius, cycle * (ring % 2 ? -1 : 1) + t, cycle * (ring % 2 ? -1 : 1) + t + Math.PI * (0.78 + t * 0.45));
  }
  const cols = 13;
  const rows = 9;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const nx = (x / (cols - 1) - 0.5) * size * 0.92;
      const ny = (y / (rows - 1) - 0.5) * size * 0.62;
      const wave = Math.sin(cycle * 2 + x * 0.9 + y * 0.7);
      const dot = size * (0.006 + Math.max(0, wave) * 0.012);
      p.noStroke();
      p.fill(b[0], b[1], b[2], 42 + Math.max(0, wave) * 150);
      p.circle(cx + nx + Math.sin(cycle + y) * 10, cy + ny + Math.cos(cycle + x) * 10, dot);
    }
  }
  p.stroke(a[0], a[1], a[2], 135);
  p.strokeWeight(Math.max(1, size * 0.002));
  for (let i = 0; i < 28; i += 1) {
    const angle = cycle + i / 28 * Math.PI * 2;
    const inner = size * (0.2 + 0.03 * Math.sin(cycle * 3 + i));
    const outer = size * (0.47 + 0.025 * Math.cos(cycle * 2 + i));
    p.line(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner, cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
  }
  p.blendMode(p.BLEND);
}

function renderContent() {
  document.querySelector("#piece-title").textContent = activePiece.title;
  document.querySelector("#piece-date").textContent = activePiece.date;
  document.querySelector("#detail-title").textContent = activePiece.title;
  document.querySelector("#detail-copy").textContent = activePiece.copy;
  document.querySelector("#loop-length").textContent = `${activePiece.loopSeconds}s`;
  document.querySelector("#why-copy").textContent = activePiece.why;
  document.querySelector("#code-output").textContent = makeRecipe(activePiece);
  renderPurchaseLink(activePiece);
  renderSources();
  renderArchive();
}

function renderSources() {
  const sourceList = document.querySelector("#source-list");
  sourceList.innerHTML = "";
  sources.forEach((source) => {
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = source.label;
    const note = document.createElement("p");
    note.textContent = source.note;
    li.append(link, note);
    sourceList.append(li);
  });
}

function renderArchive() {
  const archive = document.querySelector("#archive-list");
  archive.innerHTML = "";
  drops.forEach((piece) => {
    const item = document.createElement("article");
    item.className = "archive-item";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = piece.title;
    button.addEventListener("click", () => {
      activePiece = piece;
      startTime = performance.now();
      pausedAt = 0;
      renderContent();
    });
    const small = document.createElement("small");
    small.textContent = `${piece.date} / ${piece.loopSeconds}s p5.js loop`;
    item.append(button, small);
    archive.append(item);
  });
}

function renderPurchaseLink(piece) {
  const link = document.querySelector("#purchase-link");
  const note = document.querySelector("#purchase-note");
  const itemUrl = piece.purchaseUrl || purchaseConfig.url;
  const enabled = Boolean(itemUrl && purchaseConfig.enabled);
  link.textContent = piece.purchaseLabel || purchaseConfig.label;
  link.href = enabled ? itemUrl : "#";
  link.target = enabled ? "_blank" : "";
  link.rel = enabled ? "noreferrer" : "";
  link.setAttribute("aria-disabled", String(!enabled));
  note.textContent = piece.purchaseNote || purchaseConfig.note;
}

document.querySelector("#toggle-play").addEventListener("click", () => {
  isPaused = !isPaused;
  const icon = document.querySelector("#play-icon");
  if (isPaused) {
    pausedAt = (performance.now() - startTime) / 1000;
    icon.textContent = ">";
  } else {
    startTime = performance.now() - pausedAt * 1000;
    icon.textContent = "II";
  }
});
document.querySelector("#toggle-motion").addEventListener("click", () => {
  calmMotion = !calmMotion;
  document.querySelector("#toggle-motion").style.color = calmMotion ? "var(--accent-2)" : "";
});
document.querySelector("#save-frame").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = `${activePiece.date}-${slugify(activePiece.title)}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
});
document.querySelector("#save-video").addEventListener("click", () => recordLoopVideo(false).catch(markVideoError));
document.querySelector("#save-alpha").addEventListener("click", () => recordLoopVideo(true).catch(markAlphaError));
document.querySelector("#copy-code").addEventListener("click", async () => {
  await navigator.clipboard.writeText(makeRecipe(activePiece));
  const button = document.querySelector("#copy-code");
  button.textContent = "COPIED";
  window.setTimeout(() => { button.textContent = "CODE"; }, 1200);
});
document.querySelector("#save-project").addEventListener("click", () => downloadText(`${activePiece.date}-${slugify(activePiece.title)}.p5-vj.json`, JSON.stringify({ project: "daily-p5-vj-loop", version: 1, date: activePiece.date, title: activePiece.title, loopSeconds: activePiece.loopSeconds, palette: activePiece.palette, sources, recipe: makeRecipe(activePiece) }, null, 2), "application/json"));
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("is-active"));
    document.querySelectorAll(".tab-panel").forEach((item) => item.classList.remove("is-active"));
    tab.classList.add("is-active");
    document.querySelector(`#tab-${tab.dataset.tab}`).classList.add("is-active");
  });
});

async function recordLoopVideo(alpha) {
  if (videoRecorder?.state === "recording") return;
  if (!canvas?.captureStream || !window.MediaRecorder) throw new Error("Recording unsupported.");
  const format = alpha ? pickAlphaVideoFormat() : pickVideoFormat();
  if (!format) throw new Error("No format.");
  const button = document.querySelector(alpha ? "#save-alpha" : "#save-video");
  const captureCanvas = alpha ? document.createElement("canvas") : canvas;
  let exportContext = null;
  if (alpha) {
    captureCanvas.width = canvas.width;
    captureCanvas.height = canvas.height;
    exportContext = captureCanvas.getContext("2d", { alpha: true, willReadFrequently: true });
  }
  const chunks = [];
  const stream = captureCanvas.captureStream(60);
  const recorder = new MediaRecorder(stream, { mimeType: format.mimeType, videoBitsPerSecond: alpha ? 10000000 : 8000000 });
  videoRecorder = recorder;
  recorder.addEventListener("dataavailable", (event) => { if (event.data.size > 0) chunks.push(event.data); });
  const finished = new Promise((resolve) => recorder.addEventListener("stop", resolve, { once: true }));
  button.disabled = true;
  button.classList.add("is-recording");
  startTime = performance.now();
  pausedAt = 0;
  isPaused = false;
  document.querySelector("#play-icon").textContent = "II";
  recordingStartedAt = performance.now();
  updateRecordingProgress(button);
  recorder.start(250);
  const frameLoop = () => {
    if (alpha && exportContext) drawAlphaFrame(captureCanvas, exportContext);
    if (recorder.state === "recording") requestAnimationFrame(frameLoop);
  };
  frameLoop();
  window.setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, activePiece.loopSeconds * 1000);
  await finished;
  cancelAnimationFrame(recordingProgressId);
  stream.getTracks().forEach((track) => track.stop());
  downloadBlob(`${activePiece.date}-${slugify(activePiece.title)}${alpha ? "-alpha" : ""}.${format.extension}`, new Blob(chunks, { type: format.mimeType }));
  button.classList.remove("is-recording");
  button.textContent = alpha ? "WEBM" : format.extension.toUpperCase();
  window.setTimeout(() => { button.textContent = alpha ? "ALPHA" : "MP4"; button.disabled = false; videoRecorder = null; }, 1400);
}

function drawAlphaFrame(targetCanvas, context) {
  if (targetCanvas.width !== canvas.width || targetCanvas.height !== canvas.height) {
    targetCanvas.width = canvas.width;
    targetCanvas.height = canvas.height;
  }
  context.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  context.drawImage(canvas, 0, 0, targetCanvas.width, targetCanvas.height);
  const frame = context.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
  const pixels = frame.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const luminance = pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722;
    pixels[i + 3] = smoothstep(4, 52, luminance) * 255;
  }
  context.putImageData(frame, 0, 0);
}

function updateRecordingProgress(button) {
  const elapsed = (performance.now() - recordingStartedAt) / 1000;
  const progress = Math.min(99, Math.floor(elapsed / activePiece.loopSeconds * 100));
  button.textContent = `REC ${progress}%`;
  recordingProgressId = requestAnimationFrame(() => updateRecordingProgress(button));
}

function markVideoError() { const b = document.querySelector("#save-video"); b.textContent = "NO VIDEO"; b.disabled = false; window.setTimeout(() => { b.textContent = "MP4"; }, 1600); }
function markAlphaError() { const b = document.querySelector("#save-alpha"); b.textContent = "NO ALPHA"; b.disabled = false; window.setTimeout(() => { b.textContent = "ALPHA"; }, 1600); }
function pickVideoFormat() { const candidates = [{ mimeType: "video/mp4;codecs=h264", extension: "mp4" }, { mimeType: "video/mp4", extension: "mp4" }, { mimeType: "video/webm;codecs=vp9", extension: "webm" }, { mimeType: "video/webm", extension: "webm" }]; return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate.mimeType)); }
function pickAlphaVideoFormat() { const candidates = [{ mimeType: "video/webm;codecs=vp9", extension: "webm" }, { mimeType: "video/webm;codecs=vp8", extension: "webm" }, { mimeType: "video/webm", extension: "webm" }]; return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate.mimeType)); }
function pickPiece(date) { const direct = drops.find((piece) => piece.date === date); if (direct) return direct; const seed = hash(date); const hueA = fract(seed * 0.0183); const hueB = fract(hueA + 0.38); return { date, title: `Generated p5 Loop ${date.replaceAll("-", ".")}`, loopSeconds: [8, 12, 16, 20][seed % 4], palette: [...hsv(hueA, 0.72, 0.94), ...hsv(hueB, 0.66, 0.9)], copy: "日付シードから生成されるp5.js VJループ。スケッチとして読めるコードとブラウザプレビューを公開する。", why: "p5.jsはクリエイティブコーディングと日次スケッチ公開に向く。小さな生成ルールを積み上げやすく、販売用映像は同じ位相設計で録画できる。" }; }
function makeRecipe(piece) { return `// Daily p5.js VJ Loop
// Date: ${piece.date}
// Title: ${piece.title}
// Loop seconds: ${piece.loopSeconds}
// Palette A: ${piece.palette.slice(0, 3).join(", ")}
// Palette B: ${piece.palette.slice(3, 6).join(", ")}

function draw() {
  const phase = (millis() / 1000 % ${piece.loopSeconds}) / ${piece.loopSeconds};
  // Draw rings, seeded grid dots, and radial strokes from phase * TWO_PI.
}`; }
function rgb(values) { return values.map((value) => Math.round(value * 255)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function localIsoDate(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function hash(value) { let out = 2166136261; for (let i = 0; i < value.length; i += 1) { out ^= value.charCodeAt(i); out = Math.imul(out, 16777619); } return Math.abs(out); }
function fract(value) { return value - Math.floor(value); }
function smoothstep(edge0, edge1, value) { const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0))); return t * t * (3 - 2 * t); }
function hsv(h, s, v) { const i = Math.floor(h * 6); const f = h * 6 - i; const p = v * (1 - s); const q = v * (1 - f * s); const t = v * (1 - (1 - f) * s); const table = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]]; return table[i % 6].map((n) => Number(n.toFixed(3))); }
function slugify(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
function downloadText(filename, text, type) { downloadBlob(filename, new Blob([text], { type })); }
function downloadBlob(filename, blob) { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.download = filename; link.href = url; link.click(); URL.revokeObjectURL(url); }
