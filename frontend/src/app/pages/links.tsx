import { useMemo, useState } from "react";
import { api, type LinkAnalysisResponse } from "../../lib/api";
import { usePageMeta } from "../../lib/meta";
import type { ShareData } from "../../lib/shareExport";
import {
  Button, Card, Grid, Pill, ResultList, ResultSection,
  ResultText, RiskBar, Row, ShareMenu, TextArea,
} from "../../ui/components";
import { IconLink } from "../../ui/icons";

type Busy<T> = { status: "idle" } | { status: "loading" } | { status: "ok"; data: T } | { status: "error"; error: string };
const toErr = (e: unknown) => (e instanceof Error ? e.message : String(e));


const VERDICT_LABEL: Record<string, string> = {
  danger: "Опасно",
  neutral: "Безопасно",
  unknown: "Не определено",
  suspicious: "Подозрительно",
};
const VERDICT_TONE: Record<string, "danger" | "safe" | "warn"> = {
  danger: "danger",
  neutral: "safe",
  unknown: "warn",
  suspicious: "warn",
};

function LinksResult({ data }: { data: LinkAnalysisResponse }) {
  const shareData: ShareData = useMemo(() => {
    const allReasons = data.items.flatMap((item) => item.reasons);
    const urlLines = data.items
      .map((it) => `${it.domain} — ${VERDICT_LABEL[it.verdict] ?? it.verdict}`)
      .slice(0, 12);
    return {
      mode: "Проверка ссылок",
      paletteKey: data.verdict,
      sections: [
        {
          kind: "verdict",
          verdict: data.verdict,
          label: VERDICT_LABEL[data.verdict] ?? data.verdict,
          score: data.risk_score,
        },
        ...(data.ai_conclusion
          ? [{ kind: "text" as const, title: "Вывод", body: data.ai_conclusion }]
          : []),
        ...(urlLines.length > 0
          ? [{ kind: "list" as const, title: "По каждой ссылке", items: urlLines, variant: "neutral" as const }]
          : []),
        ...(allReasons.length > 0
          ? [{ kind: "list" as const, title: "Что насторожило", items: allReasons, variant: "negative" as const }]
          : []),
      ],
    };
  }, [data]);

  return (
    <div className="result-view">
      <div className="result-verdict-row">
        <Pill tone={VERDICT_TONE[data.verdict] ?? "warn"}>
          {VERDICT_LABEL[data.verdict] ?? data.verdict}
        </Pill>
        {data.extracted_urls.length > 0 && (
          <Pill tone="neutral">Найдено URL: {data.extracted_urls.length}</Pill>
        )}
        <ShareMenu data={shareData} baseName="vantoryx-links" />
      </div>

      <RiskBar score={data.risk_score} />

      {data.ai_conclusion && (
        <ResultSection title="Вывод">
          <ResultText>{data.ai_conclusion}</ResultText>
        </ResultSection>
      )}

      {data.items.length > 0 && (
        <ResultSection title="По каждой ссылке">
          <div className="url-list">
            {data.items.map((item, i) => (
              <div key={i} className="url-item">
                <div className="url-item__header">
                  <span className="url-item__domain">{item.domain}</span>
                  <Pill tone={VERDICT_TONE[item.verdict] ?? "warn"}>
                    {VERDICT_LABEL[item.verdict] ?? item.verdict}
                  </Pill>
                </div>
                <div className="url-item__url">{item.url}</div>
                {item.reasons.length > 0 && (
                  <ResultList items={item.reasons} variant="negative" />
                )}
              </div>
            ))}
          </div>
        </ResultSection>
      )}
    </div>
  );
}

export function LinksPage() {
  usePageMeta({
    title: "Проверка ссылок на фишинг | Vantoryx",
    description: "Вставьте текст со ссылками — найдём все URL и проверим каждый на фишинг и мошенничество.",
  });
  const [input, setInput] = useState("");
  const [res, setRes] = useState<Busy<LinkAnalysisResponse>>({ status: "idle" });
  const [pasteErr, setPasteErr] = useState("");

  async function pasteLink() {
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
      const data = await api.linkAnalysis(input);
      setRes({ status: "ok", data });
    } catch (e) {
      setRes({ status: "error", error: toErr(e) });
    }
  }

  const info = (
    <>
      <p>Найдём все URL в тексте и оценим каждый: короткие домены, странные параметры, подделки под известные сайты.</p>
      <p>Вердикт — <strong>Безопасно</strong>, <strong>Подозрительно</strong> или <strong>Опасно</strong>. Просто вставьте текст со ссылками.</p>
    </>
  );

  return (
    <Grid>
      <h1 className="sr-only">Проверка ссылок на фишинг</h1>
      <Card
        title="Проверка ссылок"
        hint="Найдём адреса в тексте и проверим каждый на фишинг."
        info={info}
      >
        <TextArea value={input} onChange={setInput} placeholder="Вставьте сюда текст со ссылками…" />

        <Row wrap>
          <Button variant="ghost" onClick={pasteLink}>
            Вставить ссылку
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
            <IconLink />
            Проверить
          </Button>
          {res.status === "loading" ? <Pill tone="warn">Проверяем…</Pill> : null}
          {res.status === "ok" ? verdictPill : null}
          {res.status === "error" ? <Pill tone="danger">{res.error}</Pill> : null}
        </Row>

        {res.status === "ok" ? <LinksResult data={res.data} /> : null}
      </Card>
    </Grid>
  );
}
