import { useMemo, useState } from "react";
import { api, type HumanRewriteResponse } from "../../lib/api";
import { usePageMeta } from "../../lib/meta";
import type { ShareData } from "../../lib/shareExport";
import {
  Button, Card, Grid, MessageBox, Pill, ResultSection,
  Row, ShareMenu, TextArea,
} from "../../ui/components";
import { IconWand } from "../../ui/icons";

type Busy<T> = { status: "idle" } | { status: "loading" } | { status: "ok"; data: T } | { status: "error"; error: string };
const toErr = (e: unknown) => (e instanceof Error ? e.message : String(e));

// ── word-level diff ──────────────────────────────────────────

type DiffToken = { type: "equal" | "remove" | "add"; text: string };

const MAX_TOKENS = 600;

function tokenize(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

function buildLCS(a: string[], b: string[]): number[][] {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp;
}

function computeDiff(original: string, rewritten: string): { left: DiffToken[]; right: DiffToken[] } | null {
  const a = tokenize(original);
  const b = tokenize(rewritten);
  if (a.length > MAX_TOKENS || b.length > MAX_TOKENS) return null;

  const dp = buildLCS(a, b);
  const ops: Array<["equal" | "remove" | "add", string]> = [];
  let i = a.length, j = b.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.push(["equal", a[i - 1]]); i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push(["add", b[j - 1]]); j--;
    } else {
      ops.push(["remove", a[i - 1]]); i--;
    }
  }
  ops.reverse();

  const left: DiffToken[] = [];
  const right: DiffToken[] = [];
  for (const [type, text] of ops) {
    if (type === "equal") { left.push({ type: "equal", text }); right.push({ type: "equal", text }); }
    else if (type === "remove") left.push({ type: "remove", text });
    else right.push({ type: "add", text });
  }
  return { left, right };
}

// ── DiffPanel ────────────────────────────────────────────────

function DiffPanel({ label, tokens, side }: {
  label: string;
  tokens: DiffToken[];
  side: "left" | "right";
}) {
  return (
    <div className={`diff-panel diff-panel--${side}`}>
      <div className="diff-panel__label">{label}</div>
      <div className="diff-panel__text">
        {tokens.map((t, i) => {
          const space = i > 0 ? " " : "";
          if (t.type === "equal") return <span key={i}>{space}{t.text}</span>;
          return (
            <mark key={i} className={`diff-token diff-token--${t.type}`}>
              {space}{t.text}
            </mark>
          );
        })}
      </div>
    </div>
  );
}

function DiffView({ original, rewritten }: { original: string; rewritten: string }) {
  const result = useMemo(() => computeDiff(original, rewritten), [original, rewritten]);

  if (!result) {
    return (
      <Pill tone="warn">Текст слишком длинный для посимвольного сравнения</Pill>
    );
  }

  const removedCount = result.left.filter((t) => t.type === "remove").length;
  const addedCount = result.right.filter((t) => t.type === "add").length;

  return (
    <div className="diff-view">
      <div className="diff-legend">
        {removedCount > 0 && <span className="diff-legend__item diff-legend__item--remove">−{removedCount} убрано</span>}
        {addedCount > 0 && <span className="diff-legend__item diff-legend__item--add">+{addedCount} добавлено</span>}
      </div>
      <div className="diff-panels">
        <DiffPanel label="Оригинал" tokens={result.left} side="left" />
        <DiffPanel label="Честная версия" tokens={result.right} side="right" />
      </div>
    </div>
  );
}

// ── RewriteResult ────────────────────────────────────────────

function RewriteResult({ input, data }: { input: string; data: HumanRewriteResponse }) {
  const [view, setView] = useState<"result" | "diff">("diff");

  const shareData: ShareData = useMemo(() => ({
    mode: "Истинный смысл сообщения",
    paletteKey: data.red_flags.length > 0 ? "danger" : "neutral",
    sections: [
      ...(input.trim()
        ? [{ kind: "quote" as const, title: "Оригинал", body: input.trim() }]
        : []),
      ...(data.honest_version
        ? [{ kind: "quote" as const, title: "Честная версия", body: data.honest_version }]
        : []),
      ...(data.red_flags.length > 0
        ? [{ kind: "tags" as const, title: "Красные флаги", tags: data.red_flags }]
        : []),
    ],
  }), [input, data]);

  return (
    <div className="result-view">
      <div className="result-verdict-row">
        <div className="rewrite-tabs">
          <button
            type="button"
            className={`chip${view === "diff" ? " chip--active" : ""}`}
            onClick={() => setView("diff")}
          >
            Сравнение
          </button>
          <button
            type="button"
            className={`chip${view === "result" ? " chip--active" : ""}`}
            onClick={() => setView("result")}
          >
            Результат
          </button>
        </div>
        <ShareMenu data={shareData} baseName="vantoryx-rewrite" />
      </div>

      {view === "diff" && data.honest_version && (
        <DiffView original={input} rewritten={data.honest_version} />
      )}

      {view === "result" && (
        <>
          {data.honest_version && (
            <MessageBox label="Честная версия (что на самом деле написано)">
              {data.honest_version}
            </MessageBox>
          )}
        </>
      )}

      {data.red_flags.length > 0 && (
        <ResultSection title="Красные флаги">
          <div className="flag-list">
            {data.red_flags.map((flag, i) => (
              <span key={i} className="flag-item">{flag}</span>
            ))}
          </div>
        </ResultSection>
      )}
    </div>
  );
}

export function RewritePage() {
  usePageMeta({
    title: "Истинный смысл сообщения | Vantoryx",
    description: "Раскройте манипуляции и уловки в подозрительном тексте — ИИ перепишет сообщение честно и объяснит намерение.",
  });
  const [input, setInput] = useState("");
  const [res, setRes] = useState<Busy<HumanRewriteResponse>>({ status: "idle" });

  async function run() {
    setRes({ status: "loading" });
    try {
      const data = await api.humanRewrite(input);
      setRes({ status: "ok", data });
    } catch (e) {
      setRes({ status: "error", error: toErr(e) });
    }
  }

  const info = (
    <>
      <p>Режим убирает эмоциональное давление, срочность и манипуляции из текста и переписывает его «честным» языком — прямо называя истинное намерение отправителя.</p>
      <p>Полезно, чтобы увидеть реальный смысл сообщения без давления и понять, чего на самом деле хочет собеседник.</p>
    </>
  );

  return (
    <Grid>
      <h1 className="sr-only">Истинный смысл сообщения</h1>
      <Card
        title="Переписать честно"
        hint="Вставьте подозрительное сообщение — ИИ уберёт манипуляции и покажет его истинный смысл."
        info={info}
      >
        <TextArea value={input} onChange={setInput} placeholder="Вставьте подозрительный текст…" />

        <Row wrap>
          <Button onClick={run} disabled={!input.trim() || res.status === "loading"}>
            <IconWand />
            Переписать
          </Button>
          {res.status === "loading" ? <Pill tone="warn">Анализирую…</Pill> : null}
          {res.status === "ok" ? <Pill tone="safe">Готово</Pill> : null}
          {res.status === "error" ? <Pill tone="danger">{res.error}</Pill> : null}
        </Row>

        {res.status === "ok" ? <RewriteResult input={input} data={res.data} /> : null}
      </Card>
    </Grid>
  );
}
