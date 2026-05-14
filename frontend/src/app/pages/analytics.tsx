import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, LabelList,
} from "recharts";
import { api, type HistoryEntry } from "../../lib/api";
import { usePageMeta } from "../../lib/meta";
import { Button, Card, Grid, Pill, Row } from "../../ui/components";
import { IconHistory } from "../../ui/icons";
import { useTheme } from "../../lib/theme";

function toDateKey(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function extractVerdict(entry: HistoryEntry): string | null {
  const r = entry.result as Record<string, unknown>;
  if (entry.entry_type === "text" || entry.entry_type === "link") return String(r.verdict ?? "");
  if (entry.entry_type === "reverse") return String(r.self_check_verdict ?? "");
  return null;
}

function verdictBucket(v: string): "safe" | "danger" | "warn" {
  if (v === "safe" || v === "neutral") return "safe";
  if (v === "scam" || v === "danger" || v === "leaky") return "danger";
  return "warn";
}

function extractFlags(entry: HistoryEntry): string[] {
  const r = entry.result as Record<string, unknown>;
  const out: string[] = [];
  if (entry.entry_type === "text" && Array.isArray(r.reasons)) out.push(...(r.reasons as string[]));
  if (entry.entry_type === "rewrite" && Array.isArray(r.red_flags)) out.push(...(r.red_flags as string[]));
  if (entry.entry_type === "link" && Array.isArray(r.items)) {
    for (const item of r.items as Array<{ reasons?: string[] }>) {
      if (Array.isArray(item.reasons)) out.push(...item.reasons);
    }
  }
  return out;
}

type DayChecks = { date: string; count: number };
type DayVerdicts = { date: string; safe: number; danger: number; warn: number };
type FlagCount = { flag: string; count: number };
type DeviceStat = { device: string; count: number };

function buildChecksPerDay(entries: HistoryEntry[]): DayChecks[] {
  const map = new Map<string, number>();
  for (const e of entries) {
    const k = toDateKey(e.created_at);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);
}

function buildVerdictsPerDay(entries: HistoryEntry[]): DayVerdicts[] {
  const map = new Map<string, { safe: number; danger: number; warn: number }>();
  for (const e of entries) {
    const v = extractVerdict(e);
    if (!v) continue;
    const k = toDateKey(e.created_at);
    const bucket = verdictBucket(v);
    const cur = map.get(k) ?? { safe: 0, danger: 0, warn: 0 };
    cur[bucket]++;
    map.set(k, cur);
  }
  return Array.from(map.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);
}

function buildTopFlags(entries: HistoryEntry[]): FlagCount[] {
  const map = new Map<string, number>();
  for (const e of entries) {
    for (const f of extractFlags(e)) {
      const t = f.trim();
      if (t) map.set(t, (map.get(t) ?? 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([flag, count]) => ({
      flag: flag.length > 34 ? flag.slice(0, 33) + "…" : flag,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function buildDeviceStats(entries: HistoryEntry[]): DeviceStat[] {
  const map = new Map<string, number>();
  for (const e of entries) {
    const id = e.device_id?.trim() || "неизвестно";
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([device, count]) => ({
      device: device === "неизвестно" ? device : "#" + device.slice(0, 8),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

function countDevices(entries: HistoryEntry[]): number {
  const set = new Set<string>();
  for (const e of entries) set.add(e.device_id?.trim() || "неизвестно");
  return set.size;
}

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: HistoryEntry[] }
  | { status: "error"; error: string };

const toErr = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function AnalyticsPage() {
  usePageMeta({ title: "Аналитика | Vantoryx", noindex: true });
  const { theme } = useTheme();
  const [state, setState] = useState<LoadState>({ status: "idle" });

  async function load() {
    setState({ status: "loading" });
    try {
      const raw = await api.analyticsList();
      if (!Array.isArray(raw)) {
        setState({ status: "error", error: "Неожиданный ответ сервера" });
        return;
      }
      setState({ status: "ok", data: raw });
    } catch (e) {
      setState({ status: "error", error: toErr(e) });
    }
  }

  useEffect(() => { load(); }, []);

  const dark = theme === "dark";
  const C = {
    safe:   dark ? "#34d399" : "#059669",
    danger: dark ? "#f87171" : "#dc2626",
    warn:   dark ? "#fbbf24" : "#b45309",
    accent: dark ? "#818cf8" : "#6366f1",
    grid:   dark ? "rgba(255,255,255,0.06)" : "rgba(12,13,16,0.07)",
    text:   dark ? "#8a8f9c" : "#6b6f7a",
    bg:     dark ? "#1a1d25" : "#ffffff",
    fg:     dark ? "#f1f2f5" : "#0c0d10",
  };

  const entries = state.status === "ok" ? state.data : [];
  const checksPerDay   = useMemo(() => buildChecksPerDay(entries),   [entries]);
  const verdictsPerDay = useMemo(() => buildVerdictsPerDay(entries), [entries]);
  const topFlags       = useMemo(() => buildTopFlags(entries),       [entries]);
  const deviceStats    = useMemo(() => buildDeviceStats(entries),    [entries]);
  const deviceCount    = useMemo(() => countDevices(entries),        [entries]);

  const total        = entries.length;
  const withVerdict  = entries.filter((e) => extractVerdict(e));
  const dangerCount  = withVerdict.filter((e) => verdictBucket(extractVerdict(e)!) === "danger").length;
  const safeCount    = withVerdict.filter((e) => verdictBucket(extractVerdict(e)!) === "safe").length;

  const ttStyle = {
    backgroundColor: C.bg,
    border: `1px solid ${C.grid}`,
    borderRadius: 10,
    fontSize: 12,
    color: C.fg,
    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
  };

  return (
    <Grid>
      <Card title="Аналитика" hint="Статистика по истории проверок" fullWidth>
        <div className="analytics-toolbar">
          <Row wrap>
            <Pill tone="neutral">{total} проверок всего</Pill>
            <Pill tone="neutral">{deviceCount} устройств</Pill>
            {dangerCount > 0 && (
              <Pill tone="danger">
                {dangerCount} угроз ({Math.round((dangerCount / Math.max(withVerdict.length, 1)) * 100)}%)
              </Pill>
            )}
            {safeCount > 0 && (
              <Pill tone="safe">
                {safeCount} безопасных ({Math.round((safeCount / Math.max(withVerdict.length, 1)) * 100)}%)
              </Pill>
            )}
          </Row>
          <Button onClick={load} disabled={state.status === "loading"}>
            <IconHistory />
            {state.status === "loading" ? "Загрузка…" : "Обновить"}
          </Button>
        </div>

        {state.status === "error" && <Pill tone="danger">{state.error}</Pill>}
        {state.status === "ok" && total === 0 && (
          <p className="history-empty">Нет данных для аналитики</p>
        )}
      </Card>

      {checksPerDay.length > 0 && (
        <Card title="Проверок по дням" fullWidth>
          <div className="analytics-chart">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={checksPerDay} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.text }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C.text }} />
                <Tooltip contentStyle={ttStyle} cursor={{ stroke: C.accent, strokeWidth: 1, strokeDasharray: "4 2" }} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Проверок"
                  stroke={C.accent}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: C.accent, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {verdictsPerDay.length > 0 && (
        <Card title="Вердикты по дням" fullWidth>
          <div className="analytics-chart">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={verdictsPerDay} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.text }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C.text }} />
                <Tooltip contentStyle={ttStyle} />
                <Bar dataKey="safe"   name="Безопасно"    stackId="v" fill={C.safe}   />
                <Bar dataKey="warn"   name="Сомнительно"  stackId="v" fill={C.warn}   />
                <Bar dataKey="danger" name="Угроза"       stackId="v" fill={C.danger} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Row wrap>
            <Pill tone="safe">Безопасно</Pill>
            <Pill tone="warn">Сомнительно</Pill>
            <Pill tone="danger">Угроза</Pill>
          </Row>
        </Card>
      )}

      {deviceStats.length > 0 && (
        <Card title="Устройства" hint="Сколько проверок с каждого устройства" fullWidth>
          <div className="analytics-chart">
            <ResponsiveContainer width="100%" height={Math.max(180, deviceStats.length * 38)}>
              <BarChart
                data={deviceStats}
                layout="vertical"
                margin={{ top: 4, right: 44, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: C.text }} />
                <YAxis
                  type="category"
                  dataKey="device"
                  tick={{ fontSize: 11, fill: C.text }}
                  width={100}
                />
                <Tooltip contentStyle={ttStyle} />
                <Bar dataKey="count" name="Проверок" fill={C.accent} radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="count" position="right" style={{ fontSize: 11, fill: C.text }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {topFlags.length > 0 && (
        <Card title="Частые флаги" hint="Из анализа текста, ссылок и переписывания" fullWidth>
          <div className="analytics-chart">
            <ResponsiveContainer width="100%" height={Math.max(180, topFlags.length * 38)}>
              <BarChart
                data={topFlags}
                layout="vertical"
                margin={{ top: 4, right: 44, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: C.text }} />
                <YAxis
                  type="category"
                  dataKey="flag"
                  tick={{ fontSize: 11, fill: C.text }}
                  width={160}
                />
                <Tooltip contentStyle={ttStyle} />
                <Bar dataKey="count" name="Упоминаний" fill={C.danger} radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="count" position="right" style={{ fontSize: 11, fill: C.text }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </Grid>
  );
}
