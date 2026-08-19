import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const dropsPath = path.join(rootDir, "data", "drops.json");
const dateArg = process.argv.find((arg) => arg.startsWith("--date="));
const targetDate = dateArg ? dateArg.slice("--date=".length) : localIsoDate(new Date());
const engines = [
  { slug: "sketch-rings", titles: ["Sketch Bloom Grid", "Arc Notebook Pulse", "Creative Code Halo"], copy: "p5.jsで書く、円弧、粒子、グリッドを組み合わせた読みやすいVJスケッチ。", why: "既存系列として、p5.jsらしいスケッチ感とコード共有しやすさを残す。" },
  { slug: "notebook-lines", titles: ["Learning Loop Field", "Notebook Wave Study", "Handwritten Signal Lines"], copy: "手描きノートのような線の重なりを使うp5.jsループ。", why: "リング中心ではなく、学習スケッチやドローイングの文脈を別エンジンにする。" },
  { slug: "dot-matrix", titles: ["Dot Matrix Study", "Pixel Learning Grid", "Matrix Bloom Exercise"], copy: "点配列とマトリクス構造を主役にしたp5.jsループ。", why: "グリッドと点の運動を主軸にし、LED/低解像度表示へ展開しやすい素材にする。" },
  { slug: "arc-study", titles: ["Arc Study Plate", "Circular Notebook Gate", "Radial Coding Exercise"], copy: "円弧と短いコードスケッチで構成するp5.jsループ。", why: "教材的な読みやすさを保ちながら、構造を円弧中心に絞った系列として増やす。" },
];

const data = JSON.parse(await fs.readFile(dropsPath, "utf8"));
if (data.drops.find((drop) => drop.date === targetDate)) {
  console.log(`Daily drop already exists: ${targetDate}`);
  process.exit(0);
}

const seed = hash(targetDate);
const engine = engines[seed % engines.length];
const hueA = fract(seed * 0.0183);
const hueB = fract(hueA + 0.38);
data.drops.unshift({
  date: targetDate,
  title: engine.titles[seed % engine.titles.length],
  engine: engine.slug,
  loopSeconds: [8, 12, 16, 20][seed % 4],
  palette: [...hsv(hueA, 0.72, 0.94), ...hsv(hueB, 0.66, 0.9)],
  copy: engine.copy,
  why: engine.why,
});
data.drops.sort((a, b) => b.date.localeCompare(a.date));
await fs.writeFile(dropsPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Added daily drop: ${targetDate}`);

function localIsoDate(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function hash(value) { let out = 2166136261; for (let i = 0; i < value.length; i += 1) { out ^= value.charCodeAt(i); out = Math.imul(out, 16777619); } return Math.abs(out); }
function fract(value) { return value - Math.floor(value); }
function hsv(h, s, v) { const i = Math.floor(h * 6); const f = h * 6 - i; const p = v * (1 - s); const q = v * (1 - f * s); const t = v * (1 - (1 - f) * s); const table = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]]; return table[i % 6].map((n) => Number(n.toFixed(3))); }
