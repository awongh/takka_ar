import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import pngToIco from "png-to-ico";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const publicDir = join(root, "public");
const svgPath = join(publicDir, "favicon.svg");
const svg = readFileSync(svgPath);

const TITLE =
  "Callum's Cozy Relaxing Augmented Reality ASMR Fox Shooting Simulator";

function renderPng(svgSource, size) {
  const resvg = new Resvg(svgSource, {
    fitTo: { mode: "width", value: size },
    background: "transparent",
  });
  return resvg.render().asPng();
}

function writeSized(name, size) {
  const png = renderPng(svg, size);
  const out = join(publicDir, name);
  writeFileSync(out, png);
  console.log(`wrote ${name} (${size}x${size})`);
  return out;
}

function escapeXml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrapTitle(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function buildOgSvg() {
  const lines = wrapTitle(TITLE, 36);
  const lineHeight = 52;
  const textStartY = 470;
  const textBlocks = lines
    .map((line, i) => {
      const y = textStartY + i * lineHeight;
      return `<text x="600" y="${y}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="40" font-weight="700" fill="#fff8ee">${escapeXml(line)}</text>`;
    })
    .join("\n  ");

  // Embed the mark as a nested SVG, scaled and centered above the title.
  const mark = readFileSync(svgPath, "utf8")
    .replace(/<\?xml[^?]+\?>/, "")
    .replace(/width="512"/, 'width="320"')
    .replace(/height="512"/, 'height="320"');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#1a2418"/>
  <g transform="translate(440, 72)">
    ${mark}
  </g>
  ${textBlocks}
</svg>`;
}

const faviconSizes = [
  ["favicon-16x16.png", 16],
  ["favicon-32x32.png", 32],
];

const appleSizes = [
  ["apple-touch-icon.png", 180],
  ["apple-touch-icon-167x167.png", 167],
  ["apple-touch-icon-152x152.png", 152],
  ["apple-touch-icon-120x120.png", 120],
];

for (const [name, size] of [...faviconSizes, ...appleSizes]) {
  writeSized(name, size);
}

// favicon.ico with 16, 32, 48
const icoSources = [16, 32, 48].map((size) => {
  const path = join(publicDir, `_ico-${size}.png`);
  writeFileSync(path, renderPng(svg, size));
  return path;
});
const ico = await pngToIco(icoSources);
writeFileSync(join(publicDir, "favicon.ico"), ico);
console.log("wrote favicon.ico (16, 32, 48)");

for (const path of icoSources) {
  unlinkSync(path);
}

const ogSvg = buildOgSvg();
const ogPng = new Resvg(ogSvg, {
  fitTo: { mode: "width", value: 1200 },
  font: {
    loadSystemFonts: true,
  },
}).render().asPng();
writeFileSync(join(publicDir, "og-image.png"), ogPng);
console.log("wrote og-image.png (1200x630)");
