import { useMemo, useState } from "react";
import { api, type WhatToReplyResponse } from "../../lib/api";
import { usePageMeta } from "../../lib/meta";
import type { ShareData } from "../../lib/shareExport";
import {
  Button, Card, Grid, MessageBox, Pill, ResultList,
  ResultSection, Row, ShareMenu, TextArea,
} from "../../ui/components";
import { IconMessage } from "../../ui/icons";

type Busy<T> = { status: "idle" } | { status: "loading" } | { status: "ok"; data: T } | { status: "error"; error: string };
const toErr = (e: unknown) => (e instanceof Error ? e.message : String(e));


function ReplyResult({ data }: { data: WhatToReplyResponse }) {
  const shareData: ShareData = useMemo(() => ({
    mode: "Что ответить",
    paletteKey: "safe",
    sections: [
      ...(data.reply_message
        ? [{ kind: "quote" as const, title: "Рекомендуемый ответ", body: data.reply_message }]
        : []),
      ...(data.dont_do.length > 0
        ? [{ kind: "list" as const, title: "Что НЕ делать", items: data.dont_do, variant: "negative" as const }]
        : []),
    ],
  }), [data]);

  return (
    <div className="result-view">
      <div className="result-verdict-row">
        <Pill tone="safe">Готовый ответ</Pill>
        <ShareMenu data={shareData} baseName="vantoryx-reply" />
      </div>

      {data.reply_message && (
        <MessageBox label="Рекомендуемый ответ">
          {data.reply_message}
        </MessageBox>
      )}

      {data.dont_do.length > 0 && (
        <ResultSection title="Что НЕ делать">
          <ResultList items={data.dont_do} variant="negative" />
        </ResultSection>
      )}
    </div>
  );
}

export function WhatToReplyPage() {
  usePageMeta({
    title: "Что ответить на подозрительное сообщение | Vantoryx",
    description: "Получите готовый безопасный ответ на подозрительное сообщение — без раскрытия личных данных.",
  });
  const [input, setInput] = useState("");
  const [res, setRes] = useState<Busy<WhatToReplyResponse>>({ status: "idle" });

  async function run() {
    setRes({ status: "loading" });
    try {
      const data = await api.whatToReply(input);
      setRes({ status: "ok", data });
    } catch (e) {
      setRes({ status: "error", error: toErr(e) });
    }
  }

  const info = (
    <>
      <p>Режим генерирует безопасный ответ на подозрительное сообщение. Ответ составлен так, чтобы не раскрывать личные данные, отказать вежливо и проверить намерения отправителя.</p>
      <p>Также формируется список «что не делать» — конкретные действия, которых следует избегать в данной ситуации.</p>
    </>
  );

  return (
    <Grid>
      <h1 className="sr-only">Что ответить на подозрительное сообщение</h1>
      <Card
        title="Что ответить"
        hint="Вставьте входящее подозрительное сообщение — ИИ составит безопасный ответ и подскажет, чего не делать."
        info={info}
      >
        <TextArea value={input} onChange={setInput} placeholder="Вставьте входящее сообщение…" />

        <Row wrap>
          <Button onClick={run} disabled={!input.trim() || res.status === "loading"}>
            <IconMessage />
            Сгенерировать ответ
          </Button>
          {res.status === "loading" ? <Pill tone="warn">Генерирую…</Pill> : null}
          {res.status === "ok" ? <Pill tone="safe">Готово</Pill> : null}
          {res.status === "error" ? <Pill tone="danger">{res.error}</Pill> : null}
        </Row>

        {res.status === "ok" ? <ReplyResult data={res.data} /> : null}
      </Card>
    </Grid>
  );
}
