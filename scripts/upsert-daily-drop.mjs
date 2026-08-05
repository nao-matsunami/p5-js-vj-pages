import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const dropsPath = path.join(rootDir, "data", "drops.json");
const dateArg = process.argv.find((arg) => arg.startsWith("--date="));
const targetDate = dateArg ? dateArg.slice("--date=".length) : localIsoDate(new Date());
const titles = ["Sketch Bloom Grid", "Arc Notebook Pulse", "Learning Loop Field", "Creative Code Halo", "Dot Matrix Study"];
const copyLines = [
  "p5.jsで書く、円弧、粒子、グリッドを組み合わせた読みやすいVJスケッチ。",
  "日次スケッチとして公開しやすい、短い生成ルールから作る抽象ループ。",
  "ブラウザのライブプレビューと販売用MP4/MOV生成へつなぐp5.js素材。",
];
const whyLines = [
  "p5.jsはクリエイティブコーディングとスケッチ共有に向く。小さなdrawループで日次素材を作れるため、制作メモとコード公開の相性が良い。",
  "Canvas 2Dよりも教材・スケッチ文化が強く、見た人がコードの意図を追いやすい。サンプル公開と販売用素材の導線を分けやすい。",
  "p5.jsのdrawループを整数周期の位相で設計すると、録画時間をloopSecondsに合わせるだけで継ぎ目のない映像にしやすい。",
];

const data = JSON.parse(await fs.readFile(dropsPath, "utf8"));
if (data.drops.find((drop) => drop.date === targetDate)) {
  console.log(`Daily drop already exists: ${targetDate}`);
  process.exit(0);
}

const seed = hash(targetDate);
const hueA = fract(seed * 0.0183);
const hueB = fract(hueA + 0.38);
data.drops.unshift({
  date: targetDate,
  title: titles[seed % titles.length],
  loopSeconds: [8, 12, 16, 20][seed % 4],
  palette: [...hsv(hueA, 0.72, 0.94), ...hsv(hueB, 0.66, 0.9)],
  copy: copyLines[seed % copyLines.length],
  why: whyLines[seed % whyLines.length],
});
data.drops.sort((a, b) => b.date.localeCompare(a.date));
await fs.writeFile(dropsPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Added daily drop: ${targetDate}`);

function localIsoDate(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function hash(value) { let out = 2166136261; for (let i = 0; i < value.length; i += 1) { out ^= value.charCodeAt(i); out = Math.imul(out, 16777619); } return Math.abs(out); }
function fract(value) { return value - Math.floor(value); }
function hsv(h, s, v) { const i = Math.floor(h * 6); const f = h * 6 - i; const p = v * (1 - s); const q = v * (1 - f * s); const t = v * (1 - (1 - f) * s); const table = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]]; return table[i % 6].map((n) => Number(n.toFixed(3))); }
