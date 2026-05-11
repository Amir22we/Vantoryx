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

function TextResult({ data }: { data: TextScamResponse }) {
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
      if (e instanceof Error && e.name !== "AbortError") {
        setShareErr("Не удалось создать карточку");
      }
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
      <p>Покажем опасные фразы, причины и короткое резюме. Подходит для SMS, переписок и писем.</p>
      <p>Совет: вставляйте сообщение целиком — точнее анализ.</p>
    </>
  );

  return (
    <Grid>
      <h1 className="sr-only">Проверка текста на мошенничество</h1>
      <Card
        title="Проверка текста"
        hint="Вставьте сообщение — оценим риск, покажем опасные фразы и объясним почему."
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

        {res.status === "ok" ? <TextResult data={res.data} /> : null}
      </Card>
    </Grid>
  );
}
