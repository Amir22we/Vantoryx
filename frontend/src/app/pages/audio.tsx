import { useEffect, useMemo, useRef, useState } from "react";
import { usePageMeta } from "../../lib/meta";
import { startStreamingRecorder, type AudioSource } from "../../lib/audio";
import { getDeviceId } from "../../lib/deviceId";
import type { ShareData } from "../../lib/shareExport";
import { msToClock } from "../../ui/ui";
import {
  Button, Card, Grid, Pill, ResultSection, ResultText,
  Row, Select, ShareMenu, Small,
} from "../../ui/components";
import { IconMic } from "../../ui/icons";

type RecState = "idle" | "recording" | "stopping" | "classifying";

type Result =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "ok"; verdict: string; transcript: string };

const toErr = (e: unknown) => (e instanceof Error ? e.message : String(e));

function buildWsUrl(deviceId: string): string {
  const base = (import.meta.env.VITE_SERVICE_BASE_URL || "").replace(/\/$/, "");
  const path = `/ws/transcribe/?device_id=${encodeURIComponent(deviceId)}`;
  if (!base) {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}${path}`;
  }
  return base.replace(/^https?/, (m: string) => (m === "https" ? "wss" : "ws")) + path;
}

export function AudioPage() {
  usePageMeta({
    title: "Анализ аудио-звонков на мошенничество | Vantoryx",
    description: "Запишите подозрительный звонок — ИИ расшифрует запись и проверит разговор на признаки мошенничества.",
  });

  const [source, setSource] = useState<AudioSource>("mic");
  const [recState, setRecState] = useState<RecState>("idle");
  const [recTimeMs, setRecTimeMs] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [result, setResult] = useState<Result>({ status: "idle" });

  const stopRecorderRef = useRef<null | (() => Promise<void>)>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      wsRef.current?.close();
    };
  }, []);

  async function start() {
    setLiveTranscript("");
    setResult({ status: "idle" });
    setRecTimeMs(0);
    setRecState("recording");

    const ws = new WebSocket(buildWsUrl(getDeviceId()));
    wsRef.current = ws;

    // Wait for connection before starting recorder
    try {
      await new Promise<void>((resolve, reject) => {
        ws.addEventListener("open", () => resolve(), { once: true });
        ws.addEventListener("error", () => reject(new Error("Не удалось подключиться к серверу")), { once: true });
        setTimeout(() => reject(new Error("WebSocket: таймаут подключения")), 6000);
      });
    } catch (e) {
      setResult({ status: "error", error: toErr(e) });
      setRecState("idle");
      ws.close();
      wsRef.current = null;
      return;
    }

    ws.addEventListener("message", (e) => {
      const msg = JSON.parse(e.data as string) as Record<string, string>;
      if (msg.type === "partial") {
        setLiveTranscript(msg.full ?? "");
      } else if (msg.type === "classifying") {
        setRecState("classifying");
      } else if (msg.type === "result") {
        setResult({ status: "ok", verdict: msg.verdict ?? "", transcript: msg.transcript ?? "" });
        setRecState("idle");
        ws.close();
        wsRef.current = null;
      }
    });

    ws.addEventListener("error", () => {
      setResult({ status: "error", error: "WebSocket: ошибка соединения" });
      setRecState("idle");
    });

    try {
      const startedAt = performance.now();
      const { stop } = await startStreamingRecorder(source, (chunk) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(chunk);
      });

      stopRecorderRef.current = stop;
      tickRef.current = window.setInterval(
        () => setRecTimeMs(Math.round(performance.now() - startedAt)),
        250,
      );
    } catch (e) {
      setResult({ status: "error", error: toErr(e) });
      setRecState("idle");
      ws.close();
      wsRef.current = null;
    }
  }

  async function stop() {
    if (!stopRecorderRef.current) return;
    setRecState("stopping");
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }

    const stopRec = stopRecorderRef.current;
    stopRecorderRef.current = null;

    try {
      await stopRec(); // waits for onstop — all chunks flushed
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "stop" }));
        setRecState("classifying");
      } else {
        setRecState("idle");
      }
    } catch (e) {
      setResult({ status: "error", error: toErr(e) });
      setRecState("idle");
    }
  }

  const showTranscriptBox =
    recState === "recording" || recState === "stopping" || recState === "classifying" || liveTranscript !== "";

  const verdictTone =
    result.status === "ok"
      ? result.verdict.includes("мошенники")
        ? "danger"
        : "safe"
      : "warn";

  const shareData: ShareData | null = useMemo(() => {
    if (result.status !== "ok") return null;
    const paletteKey = result.verdict.includes("мошенники") ? "danger" : "safe";
    return {
      mode: "Анализ аудио-звонка",
      paletteKey,
      sections: [
        { kind: "verdict", verdict: paletteKey, label: result.verdict || "Результат" },
        ...(result.transcript
          ? [{ kind: "quote" as const, title: "Полная транскрипция", body: result.transcript }]
          : []),
      ],
    };
  }, [result]);

  const info = (
    <>
      <p>Режим записывает разговор через микрофон или системный звук, транскрибирует в реальном времени через Whisper и анализирует ИИ на признаки мошенничества.</p>
      <p>Источник <strong>Микрофон</strong> — запись вашего голоса. Источник <strong>Устройство</strong> — захват звука с экрана/вкладки (нужно разрешение «Поделиться звуком» в диалоге браузера).</p>
    </>
  );

  return (
    <Grid>
      <h1 className="sr-only">Анализ аудио-звонков на мошенничество</h1>
      <Card
        title="Аудио"
        hint="Запишите подозрительный разговор — ИИ расшифрует речь и оценит на признаки мошенничества."
        info={info}
      >
        <Row wrap>
          <Select
            value={source}
            onChange={setSource}
            options={[
              { value: "mic", label: "Микрофон" },
              { value: "device", label: "Устройство / системный звук" },
            ]}
          />

          {recState === "idle" && (
            <Button onClick={start}>
              <IconMic />
              Начать запись
            </Button>
          )}

          {recState === "recording" && (
            <Button variant="danger" onClick={stop}>
              <IconMic />
              Остановить {msToClock(recTimeMs)}
            </Button>
          )}

          {recState === "stopping" && <Pill tone="warn">Останавливаю…</Pill>}
          {recState === "classifying" && <Pill tone="warn">Анализирую…</Pill>}
          {result.status === "error" && <Pill tone="danger">{result.error}</Pill>}
        </Row>

        <Small>
          Для источника «Устройство» в диалоге браузера включите передачу звука. Работает не во всех браузерах.
        </Small>

        {showTranscriptBox && (
          <ResultSection title="Транскрипция (в реальном времени)">
            <ResultText>
              {liveTranscript || "Ожидание речи…"}
            </ResultText>
          </ResultSection>
        )}

        {result.status === "ok" && (
          <div className="result-view">
            <div className="result-verdict-row">
              <Pill tone={verdictTone}>{result.verdict}</Pill>
              {shareData && <ShareMenu data={shareData} baseName="vantoryx-audio" />}
            </div>
            {result.transcript && (
              <ResultSection title="Полная транскрипция">
                <ResultText>{result.transcript}</ResultText>
              </ResultSection>
            )}
          </div>
        )}
      </Card>
    </Grid>
  );
}
