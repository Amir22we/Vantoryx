// Unified share-export: builds an on-canvas card matching site style,
// outputs PNG, PDF, or copies PNG to clipboard. Supports card / story
// layouts. Includes verify ID + QR code linking to the site.

import qrcode from "qrcode-generator";

export type SharePaletteKey =
  | "scam" | "danger" | "leaky"
  | "safe" | "neutral"
  | "warn" | "uncertain"
  | "default";

export type ShareSection =
  | { kind: "verdict"; verdict: string; label: string; score?: number }
  | { kind: "text"; title?: string; body: string }
  | { kind: "list"; title: string; items: string[]; variant?: "negative" | "neutral" }
  | { kind: "quote"; title: string; body: string }
  | { kind: "tags"; title: string; tags: string[] };

export type ShareLayout = "card" | "story";

export type ShareData = {
  mode: string;
  paletteKey?: string;
  sections: ShareSection[];
  layout?: ShareLayout;
  verifyId?: string;
  shareUrl?: string;
};

const DEFAULT_SHARE_URL = "https://vantoryx.tech/?ref=share";

// ── verify ID ────────────────────────────────────────────────

export function makeVerifyId(): string {
  const buf = new Uint8Array(3);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `VTX-${hex}`;
}

// ── palette ──────────────────────────────────────────────────

type Palette = {
  accent: string;
  glowColor: string;
  barStart: string;
  reasonColor: string;
  badgeBg: string;
  badgeBorder: string;
  tagBg: string;
  tagBorder: string;
  tagColor: string;
};

const PAL_RED: Palette = {
  accent: "#ef4444", glowColor: "rgba(239,68,68,0.18)",
  barStart: "rgba(239,68,68,0.55)", reasonColor: "#f87171",
  badgeBg: "rgba(239,68,68,0.12)", badgeBorder: "rgba(239,68,68,0.4)",
  tagBg: "rgba(239,68,68,0.10)", tagBorder: "rgba(239,68,68,0.35)", tagColor: "#fca5a5",
};
const PAL_GREEN: Palette = {
  accent: "#10b981", glowColor: "rgba(16,185,129,0.16)",
  barStart: "rgba(16,185,129,0.5)", reasonColor: "#34d399",
  badgeBg: "rgba(16,185,129,0.1)", badgeBorder: "rgba(16,185,129,0.38)",
  tagBg: "rgba(16,185,129,0.10)", tagBorder: "rgba(16,185,129,0.35)", tagColor: "#6ee7b7",
};
const PAL_AMBER: Palette = {
  accent: "#f59e0b", glowColor: "rgba(245,158,11,0.16)",
  barStart: "rgba(245,158,11,0.5)", reasonColor: "#fbbf24",
  badgeBg: "rgba(245,158,11,0.1)", badgeBorder: "rgba(245,158,11,0.4)",
  tagBg: "rgba(245,158,11,0.10)", tagBorder: "rgba(245,158,11,0.35)", tagColor: "#fcd34d",
};
const PAL_INDIGO: Palette = {
  accent: "#818cf8", glowColor: "rgba(129,140,248,0.16)",
  barStart: "rgba(129,140,248,0.5)", reasonColor: "#a5b4fc",
  badgeBg: "rgba(129,140,248,0.1)", badgeBorder: "rgba(129,140,248,0.4)",
  tagBg: "rgba(129,140,248,0.10)", tagBorder: "rgba(129,140,248,0.35)", tagColor: "#c7d2fe",
};

const PALETTES: Record<string, Palette> = {
  scam: PAL_RED, danger: PAL_RED, leaky: PAL_RED,
  safe: PAL_GREEN, neutral: PAL_GREEN,
  warn: PAL_AMBER, uncertain: PAL_AMBER, suspicious: PAL_AMBER, unknown: PAL_AMBER,
  default: PAL_INDIGO,
};

const VERDICT_EMOJI: Record<string, string> = {
  scam: "🚨", danger: "🚨", leaky: "⚠️",
  safe: "✅", neutral: "✅",
  uncertain: "⚠️", suspicious: "⚠️", unknown: "❓",
};

// ── layout config ────────────────────────────────────────────

type Cfg = {
  W: number;
  PAD: number;
  headerY: number;
  minH: number;
  scale: number;        // font scale
  qrSize: number;
  footerGap: number;
};

function getCfg(layout: ShareLayout): Cfg {
  if (layout === "story") {
    return { W: 540, PAD: 32, headerY: 100, minH: 960, scale: 1.0, qrSize: 110, footerGap: 22 };
  }
  return { W: 720, PAD: 28, headerY: 86, minH: 0, scale: 1.0, qrSize: 84, footerGap: 16 };
}

const DPR = 2;
const FONT_STACK = `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

// ── canvas helpers ───────────────────────────────────────────

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = Infinity,
): string[] {
  const paragraphs = text.split(/\n+/);
  const out: string[] = [];

  for (const para of paragraphs) {
    if (out.length >= maxLines) break;
    const words = para.split(/\s+/).filter(Boolean);
    let cur = "";
    for (const word of words) {
      const candidate = cur ? `${cur} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        cur = candidate;
      } else {
        if (cur) {
          out.push(cur);
          if (out.length >= maxLines) { cur = ""; break; }
          cur = word;
        } else {
          let t = "";
          for (const ch of word) {
            if (ctx.measureText(t + ch).width <= maxWidth) t += ch;
            else { out.push(t); if (out.length >= maxLines) { t = ""; break; } t = ch; }
          }
          cur = t;
        }
      }
    }
    if (cur && out.length < maxLines) out.push(cur);
  }

  if (maxLines !== Infinity && out.length === maxLines) {
    const last = out[out.length - 1];
    if (ctx.measureText(last + "…").width > maxWidth) {
      let t = last;
      while (t.length > 0 && ctx.measureText(t + "…").width > maxWidth) t = t.slice(0, -1);
      out[out.length - 1] = t + "…";
    }
  }
  return out;
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

// ── drawing primitives ───────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D, pal: Palette, w: number, h: number) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#0d0e14");
  bg.addColorStop(1, "#080a0f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(w, h) * 0.55);
  glow.addColorStop(0, pal.glowColor);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // second glow bottom-right for depth
  const glow2 = ctx.createRadialGradient(w, h, 0, w, h, Math.max(w, h) * 0.5);
  glow2.addColorStop(0, "rgba(168,85,247,0.06)");
  glow2.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(255,255,255,0.015)";
  ctx.lineWidth = 0.5;
  for (let x = 0; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

  ctx.fillStyle = pal.accent;
  ctx.fillRect(0, 0, w, 4);
}

function drawHeader(ctx: CanvasRenderingContext2D, pal: Palette, cfg: Cfg, mode: string): number {
  const { PAD, W } = cfg;

  const dot = ctx.createLinearGradient(PAD, 22, PAD + 20, 42);
  dot.addColorStop(0, pal.accent);
  dot.addColorStop(1, "#a855f7");
  ctx.fillStyle = dot;
  roundRect(ctx, PAD, 22, 20, 20, 6);
  ctx.fill();

  ctx.font = `700 15px ${FONT_STACK}`;
  ctx.fillStyle = "#e8eaf0";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("Vantoryx", PAD + 28, 37);

  ctx.font = `500 12px ${FONT_STACK}`;
  ctx.fillStyle = "#6c7384";
  ctx.fillText(mode, PAD + 28, 53);

  const dateStr = new Date().toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  ctx.font = `500 12px ${FONT_STACK}`;
  ctx.fillStyle = "#4a4f5e";
  const dw = ctx.measureText(dateStr).width;
  ctx.fillText(dateStr, W - PAD - dw, 37);

  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, 70); ctx.lineTo(W - PAD, 70);
  ctx.stroke();

  return cfg.headerY;
}

function drawFooter(
  ctx: CanvasRenderingContext2D, pal: Palette, cfg: Cfg,
  y: number, verifyId: string, shareUrl: string,
): number {
  const { PAD, W, qrSize, footerGap } = cfg;
  const footerY = y + footerGap;
  const blockH = Math.max(qrSize + 8, 64);

  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, footerY);
  ctx.lineTo(W - PAD, footerY);
  ctx.stroke();

  const inY = footerY + 14;

  // QR right
  const qrX = W - PAD - qrSize;
  const qrY = inY;
  drawQrPanel(ctx, qrX, qrY, qrSize, shareUrl);

  // Left text block
  ctx.font = `700 13px ${FONT_STACK}`;
  ctx.fillStyle = "#cfd3dd";
  ctx.fillText("Проверено Vantoryx AI", PAD, inY + 12);

  ctx.font = `500 11.5px ${FONT_STACK}`;
  ctx.fillStyle = "#5a6072";
  ctx.fillText("защита от мошенников · vantoryx.tech", PAD, inY + 30);

  ctx.font = `600 11px ${FONT_STACK}`;
  ctx.fillStyle = pal.accent;
  ctx.fillText(`ID: ${verifyId}`, PAD, inY + 50);

  // accent dot near ID
  ctx.fillStyle = pal.accent;
  roundRect(ctx, PAD - 10, inY + 43, 4, 4, 1);
  ctx.fill();

  return footerY + blockH + 14;
}

function drawQrPanel(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number, url: string,
) {
  // white rounded panel
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, x, y, size, size, 9);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, size, size, 9);
  ctx.stroke();

  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();
  const count = qr.getModuleCount();
  const inner = size - 14;
  const cellSize = inner / count;
  const startX = x + (size - cellSize * count) / 2;
  const startY = y + (size - cellSize * count) / 2;

  ctx.fillStyle = "#0a0a0c";
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) {
        ctx.fillRect(startX + c * cellSize, startY + r * cellSize, cellSize + 0.5, cellSize + 0.5);
      }
    }
  }
}

// ── section drawers ──────────────────────────────────────────

function drawVerdictBadge(
  ctx: CanvasRenderingContext2D, pal: Palette, cfg: Cfg,
  s: Extract<ShareSection, { kind: "verdict" }>, y: number,
): number {
  const { PAD, W } = cfg;
  const isStory = cfg.W === 540;

  const labelSize = isStory ? 30 : 26;
  const badgeH = isStory ? 64 : 56;
  const emojiSize = isStory ? 34 : 32;

  ctx.font = `800 ${labelSize}px ${FONT_STACK}`;
  const labelUp = s.label.toUpperCase();
  const labelW = ctx.measureText(labelUp).width;
  const emoji = VERDICT_EMOJI[s.verdict] ?? "⚠️";
  const emojiW = emoji ? emojiSize : 0;
  const gap = emoji ? 12 : 0;
  const bPad = 20;
  const badgeW = Math.min(emojiW + gap + labelW + bPad * 2, W - PAD * 2);
  const bx = (W - badgeW) / 2;

  ctx.fillStyle = pal.badgeBg;
  roundRect(ctx, bx, y, badgeW, badgeH, 14);
  ctx.fill();
  ctx.strokeStyle = pal.badgeBorder;
  ctx.lineWidth = 1.5;
  roundRect(ctx, bx, y, badgeW, badgeH, 14);
  ctx.stroke();

  if (emoji) {
    ctx.font = `${emojiSize - 2}px serif`;
    ctx.fillText(emoji, bx + bPad, y + badgeH / 2 + labelSize / 2.4);
  }
  ctx.font = `800 ${labelSize}px ${FONT_STACK}`;
  ctx.fillStyle = pal.accent;
  ctx.fillText(labelUp, bx + bPad + emojiW + gap, y + badgeH / 2 + labelSize / 2.6);

  let cy = y + badgeH + 22;

  if (typeof s.score === "number") {
    ctx.font = `600 11.5px ${FONT_STACK}`;
    ctx.fillStyle = "#5d6475";
    ctx.fillText("УРОВЕНЬ РИСКА", PAD, cy);
    const scoreLabel = `${s.score}/100`;
    ctx.font = `700 12px ${FONT_STACK}`;
    ctx.fillStyle = pal.accent;
    ctx.fillText(scoreLabel, W - PAD - ctx.measureText(scoreLabel).width, cy);

    const barY = cy + 8;
    const barW = W - PAD * 2;
    const barH = 6;
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    roundRect(ctx, PAD, barY, barW, barH, barH / 2);
    ctx.fill();

    const fillW = Math.max((s.score / 100) * barW, 4);
    const grad = ctx.createLinearGradient(PAD, 0, PAD + fillW, 0);
    grad.addColorStop(0, pal.barStart);
    grad.addColorStop(1, pal.accent);
    ctx.fillStyle = grad;
    roundRect(ctx, PAD, barY, fillW, barH, barH / 2);
    ctx.fill();

    cy = barY + barH + 18;
  }

  return cy;
}

function drawSectionTitle(
  ctx: CanvasRenderingContext2D, cfg: Cfg, title: string, y: number,
): number {
  ctx.font = `600 11.5px ${FONT_STACK}`;
  ctx.fillStyle = "#7a8194";
  ctx.fillText(title.toUpperCase(), cfg.PAD, y);
  return y + 16;
}

function drawTextBlock(
  ctx: CanvasRenderingContext2D, cfg: Cfg,
  s: Extract<ShareSection, { kind: "text" }>, y: number,
): number {
  let cy = y;
  if (s.title) cy = drawSectionTitle(ctx, cfg, s.title, cy);

  ctx.font = `400 14px ${FONT_STACK}`;
  ctx.fillStyle = "#b0b4c0";
  const lines = wrapText(ctx, s.body, cfg.W - cfg.PAD * 2);
  for (const line of lines) {
    ctx.fillText(line, cfg.PAD, cy + 13);
    cy += 20;
  }
  return cy + 10;
}

function drawList(
  ctx: CanvasRenderingContext2D, pal: Palette, cfg: Cfg,
  s: Extract<ShareSection, { kind: "list" }>, y: number,
): number {
  let cy = drawSectionTitle(ctx, cfg, s.title, y);
  const variant = s.variant ?? "negative";
  const marker = variant === "negative" ? "✕" : "•";
  const markerColor = variant === "negative" ? pal.reasonColor : "#8b95a8";

  ctx.font = `500 13.5px ${FONT_STACK}`;
  for (const item of s.items) {
    const lines = wrapText(ctx, item, cfg.W - cfg.PAD * 2 - 20);
    let firstLine = true;
    for (const line of lines) {
      if (firstLine) {
        ctx.fillStyle = markerColor;
        ctx.fillText(marker, cfg.PAD, cy + 13);
        firstLine = false;
      }
      ctx.fillStyle = "#9aa0b2";
      ctx.fillText(line, cfg.PAD + 20, cy + 13);
      cy += 19;
    }
    cy += 4;
  }
  return cy + 6;
}

function drawQuote(
  ctx: CanvasRenderingContext2D, pal: Palette, cfg: Cfg,
  s: Extract<ShareSection, { kind: "quote" }>, y: number,
): number {
  let cy = drawSectionTitle(ctx, cfg, s.title, y);

  const boxX = cfg.PAD;
  const boxW = cfg.W - cfg.PAD * 2;
  const innerW = boxW - 28;

  ctx.font = `400 13.5px ${FONT_STACK}`;
  const lines = wrapText(ctx, s.body, innerW);
  const lineH = 20;
  const boxH = lines.length * lineH + 24;

  ctx.fillStyle = "rgba(255,255,255,0.03)";
  roundRect(ctx, boxX, cy, boxW, boxH, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  roundRect(ctx, boxX, cy, boxW, boxH, 10);
  ctx.stroke();

  ctx.fillStyle = pal.accent;
  ctx.fillRect(boxX, cy, 3, boxH);

  ctx.fillStyle = "#c8ccd6";
  let ty = cy + 12;
  for (const line of lines) {
    ctx.fillText(line, boxX + 14, ty + 13);
    ty += lineH;
  }
  return cy + boxH + 14;
}

function drawTags(
  ctx: CanvasRenderingContext2D, pal: Palette, cfg: Cfg,
  s: Extract<ShareSection, { kind: "tags" }>, y: number,
): number {
  let cy = drawSectionTitle(ctx, cfg, s.title, y);

  ctx.font = `600 12px ${FONT_STACK}`;
  const chipH = 26;
  const chipPad = 11;
  const gap = 7;
  const maxW = cfg.W - cfg.PAD * 2;
  let x = cfg.PAD;
  let rowY = cy;

  for (const raw of s.tags) {
    const tag = truncate(ctx, raw, maxW - chipPad * 2);
    const w = ctx.measureText(tag).width + chipPad * 2;
    if (x + w > cfg.W - cfg.PAD) {
      x = cfg.PAD;
      rowY += chipH + gap;
    }
    ctx.fillStyle = pal.tagBg;
    roundRect(ctx, x, rowY, w, chipH, chipH / 2);
    ctx.fill();
    ctx.strokeStyle = pal.tagBorder;
    ctx.lineWidth = 1;
    roundRect(ctx, x, rowY, w, chipH, chipH / 2);
    ctx.stroke();
    ctx.fillStyle = pal.tagColor;
    ctx.fillText(tag, x + chipPad, rowY + chipH / 2 + 4);
    x += w + gap;
  }
  return rowY + chipH + 14;
}

function drawSection(
  ctx: CanvasRenderingContext2D, pal: Palette, cfg: Cfg,
  s: ShareSection, y: number,
): number {
  switch (s.kind) {
    case "verdict": return drawVerdictBadge(ctx, pal, cfg, s, y);
    case "text":    return drawTextBlock(ctx, cfg, s, y);
    case "list":    return drawList(ctx, pal, cfg, s, y);
    case "quote":   return drawQuote(ctx, pal, cfg, s, y);
    case "tags":    return drawTags(ctx, pal, cfg, s, y);
  }
}

// ── render pipeline ─────────────────────────────────────────

async function renderCanvas(data: ShareData): Promise<HTMLCanvasElement> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }
  const cfg = getCfg(data.layout ?? "card");
  const pal = PALETTES[data.paletteKey ?? "default"] ?? PALETTES.default;
  const verifyId = data.verifyId ?? makeVerifyId();
  const shareUrl = data.shareUrl ?? DEFAULT_SHARE_URL;

  // measurement pass
  const m = document.createElement("canvas");
  m.width = cfg.W;
  m.height = 200;
  const mctx = m.getContext("2d")!;
  let y = cfg.headerY;
  for (const s of data.sections) {
    y = drawSection(mctx, pal, cfg, s, y);
    y += 6;
  }
  let finalH = Math.ceil(drawFooter(mctx, pal, cfg, y, verifyId, shareUrl));
  if (cfg.minH > 0 && finalH < cfg.minH) finalH = cfg.minH;

  // render pass
  const canvas = document.createElement("canvas");
  canvas.width = cfg.W * DPR;
  canvas.height = finalH * DPR;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(DPR, DPR);
  ctx.textBaseline = "alphabetic";

  drawBackground(ctx, pal, cfg.W, finalH);
  let cy = drawHeader(ctx, pal, cfg, data.mode);
  for (const s of data.sections) {
    cy = drawSection(ctx, pal, cfg, s, cy);
    cy += 6;
  }

  // If content is shorter than minH (story), push footer to bottom
  const contentEnd = cy;
  const footerH = cfg.qrSize + 50;
  const footerStart = Math.max(contentEnd, finalH - footerH - cfg.footerGap);
  drawFooter(ctx, pal, cfg, footerStart, verifyId, shareUrl);

  return canvas;
}

// ── outputs ──────────────────────────────────────────────────

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      type, quality,
    );
  });
}

export async function generateImage(data: ShareData): Promise<Blob> {
  const canvas = await renderCanvas(data);
  return canvasToBlob(canvas, "image/png");
}

export async function generatePdf(data: ShareData): Promise<Blob> {
  const canvas = await renderCanvas(data);
  const jpegBlob = await canvasToBlob(canvas, "image/jpeg", 0.92);
  const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());

  const imgW = canvas.width;
  const imgH = canvas.height;
  const ptW = (imgW / DPR) * 0.75;
  const ptH = (imgH / DPR) * 0.75;

  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  let pos = 0;
  const offsets: number[] = [];

  const push = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === "string" ? enc.encode(chunk) : chunk;
    parts.push(bytes);
    pos += bytes.byteLength;
  };

  push("%PDF-1.4\n");
  push(new Uint8Array([0x25, 0xC2, 0xE1, 0xC2, 0xE3, 0x0A]));

  offsets.push(pos);
  push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  offsets.push(pos);
  push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  offsets.push(pos);
  push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R ` +
    `/MediaBox [0 0 ${ptW.toFixed(2)} ${ptH.toFixed(2)}] ` +
    `/Resources << /XObject << /Im0 4 0 R >> /ProcSet [/PDF /ImageC] >> ` +
    `/Contents 5 0 R >>\nendobj\n`,
  );

  offsets.push(pos);
  push(
    `4 0 obj\n<< /Type /XObject /Subtype /Image ` +
    `/Width ${imgW} /Height ${imgH} ` +
    `/ColorSpace /DeviceRGB /BitsPerComponent 8 ` +
    `/Filter /DCTDecode /Length ${jpegBytes.byteLength} >>\nstream\n`,
  );
  push(jpegBytes);
  push("\nendstream\nendobj\n");

  const contentStream = `q\n${ptW.toFixed(2)} 0 0 ${ptH.toFixed(2)} 0 0 cm\n/Im0 Do\nQ\n`;
  const contentBytes = enc.encode(contentStream);
  offsets.push(pos);
  push(`5 0 obj\n<< /Length ${contentBytes.byteLength} >>\nstream\n`);
  push(contentBytes);
  push("endstream\nendobj\n");

  const xrefStart = pos;
  push("xref\n0 6\n0000000000 65535 f \n");
  for (const off of offsets) {
    push(off.toString().padStart(10, "0") + " 00000 n \n");
  }
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`);

  const total = parts.reduce((s, p) => s + p.byteLength, 0);
  const out = new Uint8Array(total);
  let cur = 0;
  for (const p of parts) { out.set(p, cur); cur += p.byteLength; }
  return new Blob([out], { type: "application/pdf" });
}

export async function copyImageToClipboard(data: ShareData): Promise<void> {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
    throw new Error("Clipboard images are not supported in this browser");
  }
  const blob = await generateImage(data);
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

export async function shareOrDownload(
  blob: Blob,
  filename: string,
): Promise<"shared" | "downloaded"> {
  const mime = blob.type || "application/octet-stream";
  const file = new File([blob], filename, { type: mime });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Результат проверки Vantoryx" });
      return "shared";
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") throw e;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return "downloaded";
}

export type ShareFormat = "png" | "pdf";

export async function exportShare(
  data: ShareData,
  format: ShareFormat,
  baseName = "vantoryx-result",
): Promise<"shared" | "downloaded"> {
  const suffix = data.layout === "story" ? "-story" : "";
  if (format === "pdf") {
    const blob = await generatePdf(data);
    return shareOrDownload(blob, `${baseName}${suffix}.pdf`);
  }
  const blob = await generateImage(data);
  return shareOrDownload(blob, `${baseName}${suffix}.png`);
}

export function nativeShareSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  return typeof navigator.canShare === "function" && typeof navigator.share === "function";
}
