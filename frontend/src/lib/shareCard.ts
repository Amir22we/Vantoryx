export type ShareCardData = {
  verdict: string;
  verdictLabel: string;
  score: number;
  explanation: string;
  reasons: string[];
};

// ── palette ──────────────────────────────────────────────────

type Palette = {
  accent: string;
  glowColor: string;
  barStart: string;
  reasonColor: string;
  badgeBg: string;
  badgeBorder: string;
};

const PALETTES: Record<string, Palette> = {
  scam: {
    accent: "#ef4444", glowColor: "rgba(239,68,68,0.18)",
    barStart: "rgba(239,68,68,0.55)", reasonColor: "#f87171",
    badgeBg: "rgba(239,68,68,0.12)", badgeBorder: "rgba(239,68,68,0.4)",
  },
  danger: {
    accent: "#ef4444", glowColor: "rgba(239,68,68,0.18)",
    barStart: "rgba(239,68,68,0.55)", reasonColor: "#f87171",
    badgeBg: "rgba(239,68,68,0.12)", badgeBorder: "rgba(239,68,68,0.4)",
  },
  safe: {
    accent: "#10b981", glowColor: "rgba(16,185,129,0.16)",
    barStart: "rgba(16,185,129,0.5)", reasonColor: "#34d399",
    badgeBg: "rgba(16,185,129,0.1)", badgeBorder: "rgba(16,185,129,0.38)",
  },
  neutral: {
    accent: "#10b981", glowColor: "rgba(16,185,129,0.16)",
    barStart: "rgba(16,185,129,0.5)", reasonColor: "#34d399",
    badgeBg: "rgba(16,185,129,0.1)", badgeBorder: "rgba(16,185,129,0.38)",
  },
};
const DEFAULT_PALETTE: Palette = {
  accent: "#f59e0b", glowColor: "rgba(245,158,11,0.16)",
  barStart: "rgba(245,158,11,0.5)", reasonColor: "#fbbf24",
  badgeBg: "rgba(245,158,11,0.1)", badgeBorder: "rgba(245,158,11,0.4)",
};

const VERDICT_EMOJI: Record<string, string> = {
  scam: "🚨", danger: "🚨", safe: "✅", neutral: "✅", leaky: "⚠️",
};

// ── helpers ───────────────────────────────────────────────────

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";

  for (const word of words) {
    const candidate = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      cur = candidate;
    } else {
      if (cur) {
        if (lines.length === maxLines - 1) {
          let t = cur;
          while (t.length > 0 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
          lines.push(`${t}…`);
          return lines;
        }
        lines.push(cur);
        cur = word;
      } else {
        let t = word;
        while (t.length > 0 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
        lines.push(`${t}…`);
        cur = "";
        if (lines.length >= maxLines) return lines;
      }
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines;
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

// ── draw ─────────────────────────────────────────────────────

const W = 600, H = 340, DPR = 2;
const PAD = 22;

export async function generateShareCard(data: ShareCardData): Promise<Blob> {
  await document.fonts.ready;

  const canvas = document.createElement("canvas");
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(DPR, DPR);

  const pal = PALETTES[data.verdict] ?? DEFAULT_PALETTE;
  const emoji = VERDICT_EMOJI[data.verdict] ?? "⚠️";

  // ── background ───────────────────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, "#0d0e14");
  bgGrad.addColorStop(1, "#080a0f");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ambient glow — top-left
  const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 300);
  glowGrad.addColorStop(0, pal.glowColor);
  glowGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, W, H);

  // subtle noise texture (cross-hatch)
  ctx.strokeStyle = "rgba(255,255,255,0.015)";
  ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x += 28) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 28) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // top accent stripe
  ctx.fillStyle = pal.accent;
  ctx.fillRect(0, 0, W, 4);

  // ── header ──────────────────────────────────────────────
  // brand dot
  const dotGrad = ctx.createLinearGradient(PAD, 20, PAD + 18, 38);
  dotGrad.addColorStop(0, pal.accent);
  dotGrad.addColorStop(1, "#a855f7");
  ctx.fillStyle = dotGrad;
  roundRect(ctx, PAD, 20, 18, 18, 5);
  ctx.fill();

  // brand name
  ctx.font = "700 14px Inter, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "#e8eaf0";
  ctx.fillText("Vantoryx", PAD + 24, 33);

  // date
  const dateStr = new Date().toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  ctx.font = "500 11.5px Inter, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "#4a4f5e";
  const dateW = ctx.measureText(dateStr).width;
  ctx.fillText(dateStr, W - PAD - dateW, 33);

  // separator
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, 52); ctx.lineTo(W - PAD, 52);
  ctx.stroke();

  // ── verdict badge ────────────────────────────────────────
  ctx.font = "800 24px Inter, -apple-system, BlinkMacSystemFont, sans-serif";
  const labelUp = data.verdictLabel.toUpperCase();
  const labelW = ctx.measureText(labelUp).width;
  const emojiW = 28;
  const gap = 10;
  const bPad = 16;
  const badgeW = emojiW + gap + labelW + bPad * 2;
  const badgeH = 50;
  const badgeX = (W - badgeW) / 2;
  const badgeY = 64;

  ctx.fillStyle = pal.badgeBg;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 12);
  ctx.fill();

  ctx.strokeStyle = pal.badgeBorder;
  ctx.lineWidth = 1.5;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 12);
  ctx.stroke();

  // emoji (larger font for emoji rendering)
  ctx.font = "26px serif";
  ctx.fillText(emoji, badgeX + bPad, badgeY + badgeH / 2 + 9);

  // verdict text
  ctx.font = "800 24px Inter, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = pal.accent;
  ctx.fillText(labelUp, badgeX + bPad + emojiW + gap, badgeY + badgeH / 2 + 8);

  // ── risk score ───────────────────────────────────────────
  const scoreY = badgeY + badgeH + 18;

  ctx.font = "600 11px Inter, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "#5d6475";
  ctx.fillText("УРОВЕНЬ РИСКА", PAD, scoreY);

  const scoreLabel = `${data.score}/100`;
  ctx.font = "700 11px Inter, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = pal.accent;
  ctx.fillText(scoreLabel, W - PAD - ctx.measureText(scoreLabel).width, scoreY);

  const barY = scoreY + 7;
  const barW = W - PAD * 2;
  const barH = 5;

  ctx.fillStyle = "rgba(255,255,255,0.07)";
  roundRect(ctx, PAD, barY, barW, barH, barH / 2);
  ctx.fill();

  const fillW = Math.max((data.score / 100) * barW, 4);
  const barFill = ctx.createLinearGradient(PAD, 0, PAD + fillW, 0);
  barFill.addColorStop(0, pal.barStart);
  barFill.addColorStop(1, pal.accent);
  ctx.fillStyle = barFill;
  roundRect(ctx, PAD, barY, fillW, barH, barH / 2);
  ctx.fill();

  // ── explanation ──────────────────────────────────────────
  let curY = barY + barH + 17;
  if (data.explanation) {
    ctx.font = "400 13.5px Inter, -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "#b0b4c0";
    const lines = wrapText(ctx, data.explanation, W - PAD * 2, 2);
    for (const line of lines) {
      ctx.fillText(line, PAD, curY);
      curY += 19;
    }
    curY += 4;
  }

  // ── reasons ──────────────────────────────────────────────
  if (data.reasons.length > 0 && curY < H - 58) {
    ctx.font = "500 12px Inter, -apple-system, BlinkMacSystemFont, sans-serif";
    for (const reason of data.reasons.slice(0, 2)) {
      if (curY > H - 58) break;
      ctx.fillStyle = pal.reasonColor;
      ctx.fillText("✕", PAD, curY);
      ctx.fillStyle = "#7c8494";
      ctx.fillText(truncate(ctx, reason, W - PAD * 2 - 18), PAD + 16, curY);
      curY += 17;
    }
  }

  // ── footer ───────────────────────────────────────────────
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, H - 34); ctx.lineTo(W - PAD, H - 34);
  ctx.stroke();

  ctx.font = "500 11px Inter, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "#3d4250";
  ctx.fillText("Проверено Vantoryx AI · защита от мошенников", PAD, H - 16);

  // powered dot
  ctx.fillStyle = pal.accent;
  roundRect(ctx, W - PAD - 6, H - 21, 6, 6, 2);
  ctx.fill();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png",
    );
  });
}

export async function shareOrDownload(blob: Blob, filename = "vantoryx-check.png") {
  const file = new File([blob], filename, { type: "image/png" });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: "Результат проверки Vantoryx" });
    return "shared";
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
