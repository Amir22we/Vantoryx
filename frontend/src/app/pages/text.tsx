import { useMemo, useState } from "react";
import { api, type TextScamResponse } from "../../lib/api";
import { usePageMeta } from "../../lib/meta";
import { generateShareCard, shareOrDownload } from "../../lib/shareCard";
import {
  Button, Card, Grid, Pill, ResultList,
  ResultSection, ResultText, RiskBar, Row, TextArea,
} from "../../ui/components";
import { IconShare, IconShield } from "../../ui/icons";

type Busy<T> = { status: "idle" } | { status: "loading" } | { status: "ok"; data: T } | { status: "error"; error: string };
const toErr = (e: unknown) => (e instanceof Error ? e.message : String(e));

const VERDICT_LABEL: Record<string, string> = {
  scam: "Мошенничество",
  safe: "Безопасно",
  uncertain: "Подозрительно",
};
const VERDICT_TONE: Record<string, "danger" | "safe" | "warn"> = {
  scam: "danger",
  safe: "safe",
  uncertain: "warn",
};

// ── highlight logic ───────────────────────────────────────────

type HRange = { start: number; end: number; reason: string };
type Seg = { text: string; hl: true; reason: string } | { text: string; hl: false };

function findHighlights(text: string, reasons: string[]): HRange[] {
  const lower = text.toLowerCase();
  const raw: HRange[] = [];

  for (const reason of reasons) {
    const phrases: string[] = [];

    // 1. Extract quoted phrases: «…» "…" '…' "…"
    for (const m of reason.matchAll(/[«"'""]([^«»""'']{3,80}?)[»"'"]/g)) {
      phrases.push(m[1]);
    }

    // 2. No quotes — strip "Category: " prefix and use whole reason
    if (phrases.length === 0) {
      const stripped = reason.replace(/^[^:：]+[:：]\s*/, "").trim();
      const candidate = stripped.length >= 4 ? stripped : reason.trim();
      if (candidate.length >= 4 && candidate.length <= 80) {
        phrases.push(candidate);
      }
    }

    for (const phrase of phrases) {
      const pl = phrase.toLowerCase().trim();
      if (pl.length < 3) continue;
      let idx = lower.indexOf(pl);
      while (idx !== -1) {
        raw.push({ start: idx, end: idx + pl.length, reason });
        idx = lower.indexOf(pl, idx + pl.length);
      }
    }
  }

  raw.sort((a, b) => a.start - b.start);

  // merge overlapping ranges
  const merged: HRange[] = [];
  for (const r of raw) {
    const prev = merged[merged.length - 1];
    if (prev && r.start < prev.end) {
      prev.end = Math.max(prev.end, r.end);
      if (!prev.reason.includes(r.reason)) prev.reason += "\n" + r.reason;
    } else {
      merged.push({ ...r });
    }
  }
  return merged;
}

function segmentize(text: string, ranges: HRange[]): Seg[] {
  const segs: Seg[] = [];
  let pos = 0;
  for (const r of ranges) {
    if (r.start > pos) segs.push({ text: text.slice(pos, r.start), hl: false });
    segs.push({ text: text.slice(r.start, r.end), hl: true, reason: r.reason });
    pos = r.end;
  }
  if (pos < text.length) segs.push({ text: text.slice(pos), hl: false });
  return segs;
}

// ── HighlightedText ───────────────────────────────────────────

function HighlightedText({ text, reasons }: { text: string; reasons: string[] }) {
  const ranges = useMemo(() => findHighlights(text, reasons), [text, reasons]);
  const segs   = useMemo(() => segmentize(text, ranges),      [text, ranges]);
  const count  = ranges.length;

  const countLabel = count === 0 ? null
    : count === 1 ? "1 флаг"
    : count < 5   ? `${count} флага`
    : `${count} флагов`;

  return (
    <div className="hl-text-wrap">
      <div className="hl-text-header">
        <span className="hl-text-label">Ваш текст</span>
        {count > 0 && <span className="hl-text-badge">{countLabel} выделено</span>}
      </div>

      <div className="hl-text-body">
        {segs.map((seg, i) =>
          seg.hl ? (
            <mark key={i} className="hl-mark" data-tip={seg.reason}>
              {seg.text}
            </mark>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        )}
      </div>

      <div className="hl-text-footer">
        {count > 0
          ? "Наведите на выделенный текст — увидите причину"
          : "Конкретные фразы не определены — см. «Что насторожило»"}
      </div>
    </div>
  );
}

// ── TextResult ────────────────────────────────────────────────

function TextResult({ input, data }: { input: string; data: TextScamResponse }) {
  const [sharing, setSharing] = useState(false);
  const [shareErr, setShareErr] = useState("");

  async function share() {
    setSharing(true);
    setShareErr("");
    try {
      const blob = await generateShareCard({
        verdict: data.verdict,
        verdictLabel: VERDICT_LABEL[data.verdict] ?? data.verdict,
        score: data.risk_score,
        explanation: data.short_explanation,
        reasons: data.reasons,
      });
      await shareOrDownload(blob);
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") setShareErr("Не удалось создать карточку");
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="result-view">
      <div className="result-verdict-row">
        <Pill tone={VERDICT_TONE[data.verdict] ?? "warn"}>
          {VERDICT_LABEL[data.verdict] ?? data.verdict}
        </Pill>
        <button
          type="button"
          className="share-btn"
          onClick={share}
          disabled={sharing}
          aria-label="Поделиться результатом"
        >
          <IconShare />
          {sharing ? "Генерация…" : "Поделиться"}
        </button>
        {shareErr && <Pill tone="danger">{shareErr}</Pill>}
      </div>

      <HighlightedText text={input} reasons={data.reasons} />

      <RiskBar score={data.risk_score} />

      {data.short_explanation && (
        <ResultSection title="Вывод">
          <ResultText>{data.short_explanation}</ResultText>
        </ResultSection>
      )}

      {data.reasons.length > 0 && (
        <ResultSection title="Что насторожило">
          <ResultList items={data.reasons} variant="negative" />
        </ResultSection>
      )}
    </div>
  );
}

export function TextPage() {
  usePageMeta({
    title: "Проверка текста на мошенничество | Vantoryx",
    description: "Вставьте SMS, письмо или сообщение — ИИ оценит риск мошенничества, выделит опасные фразы и даст вердикт.",
  });
  const [input, setInput] = useState("");
  const [res, setRes] = useState<Busy<TextScamResponse>>({ status: "idle" });
  const [pasteErr, setPasteErr] = useState("");

  async function pasteText() {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text);
      setPasteErr("");
    } catch {
      setPasteErr("Нет доступа к буферу обмена");
    }
  }

  const verdictPill = useMemo(() => {
    if (res.status !== "ok") return null;
    const v = res.data.verdict;
    return <Pill tone={VERDICT_TONE[v] ?? "warn"}>{VERDICT_LABEL[v] ?? v}</Pill>;
  }, [res]);

  async function run() {
    setRes({ status: "loading" });
    try {
      const data = await api.textScam(input);
      setRes({ status: "ok", data });
    } catch (e) {
      setRes({ status: "error", error: toErr(e) });
    }
  }

  const info = (
    <>
      <p>Оценим риск сообщения и поставим один из трёх вердиктов: <strong>Безопасно</strong>, <strong>Подозрительно</strong>, <strong>Мошенничество</strong>.</p>
      <p>Покажем опасные фразы прямо в тексте, причины и короткое резюме. Подходит для SMS, переписок и писем.</p>
      <p>Совет: вставляйте сообщение целиком — точнее анализ.</p>
    </>
  );

  return (
    <Grid>
      <h1 className="sr-only">Проверка текста на мошенничество</h1>
      <Card
        title="Проверка текста"
        hint="Вставьте сообщение — оценим риск, выделим опасные фразы и объясним почему."
        info={info}
      >
        <TextArea value={input} onChange={setInput} placeholder="Вставьте сюда текст…" />

        <Row wrap>
          <Button variant="ghost" onClick={pasteText}>
            Вставить текст
          </Button>
          {input && (
            <Button variant="ghost" onClick={() => { setInput(""); setPasteErr(""); }}>
              Очистить
            </Button>
          )}
          {pasteErr && <Pill tone="danger">{pasteErr}</Pill>}
        </Row>

        <Row wrap>
          <Button variant="primary" onClick={run} disabled={!input.trim() || res.status === "loading"}>
            <IconShield />
            Проверить
          </Button>
          {res.status === "loading" ? <Pill tone="warn">Анализируем…</Pill> : null}
          {res.status === "ok" ? verdictPill : null}
          {res.status === "error" ? <Pill tone="danger">{res.error}</Pill> : null}
        </Row>

        {res.status === "ok" ? <TextResult input={input} data={res.data} /> : null}
      </Card>
    </Grid>
  );
}
