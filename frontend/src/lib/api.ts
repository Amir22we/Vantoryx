export type TextScamResponse = {
  verdict: "scam" | "safe" | "uncertain";
  risk_score: number;
  reasons: string[];
  short_explanation: string;
};

export type LinkAnalysisResponse = {
  verdict: "danger" | "neutral" | "unknown";
  risk_score: number;
  extracted_urls: string[];
  ai_conclusion: string;
  items: Array<{
    url: string;
    final_url: string;
    domain: string;
    verdict: "danger" | "neutral" | "unknown";
    risk_score: number;
    reasons: string[];
    redirects: string[];
  }>;
};

export type WhatToReplyResponse = { reply_message: string; dont_do: string[] };
export type HumanRewriteResponse = { honest_version: string; red_flags: string[] };
export type ReversePhishingResponse = {
  reply_message: string;
  self_check_verdict: "safe" | "leaky" | "uncertain";
  self_check_issues: string[];
};

export type AudioTask = {
  id: number;
  status: "pending" | "done" | "error" | string;
  transcription: string;
  summary: string;
};

export type HistoryEntryType = "text" | "link" | "audio" | "reply" | "rewrite" | "reverse";

export type HistoryEntry = {
  id: number;
  entry_type: HistoryEntryType;
  input_text: string | null;
  audio_file: string | null;
  result: Record<string, unknown>;
  created_at: string;
  device_id: string;
  device_type: string;
};

import { getDeviceId, getDeviceType } from "./deviceId";

const baseUrl = (import.meta.env.VITE_SERVICE_BASE_URL || "").replace(/\/$/, "");

function url(path: string) {
  if (!baseUrl) return path; // same-origin (useful behind reverse proxy)
  return `${baseUrl}${path}`;
}

async function readJsonSafe(resp: Response) {
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text, _status: resp.status };
  }
}

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const resp = await fetch(url(path), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Device-ID": getDeviceId(), "X-Device-Type": getDeviceType() },
    body: JSON.stringify(payload),
  });
  const data = await readJsonSafe(resp);
  if (!resp.ok) throw new Error((data && data.detail) || `HTTP ${resp.status}`);
  return data as T;
}

async function getJson<T>(path: string): Promise<T> {
  const resp = await fetch(url(path), { headers: { "X-Device-ID": getDeviceId(), "X-Device-Type": getDeviceType() } });
  const data = await readJsonSafe(resp);
  if (!resp.ok) throw new Error((data && data.detail) || `HTTP ${resp.status}`);
  return data as T;
}

export const api = {
  ping: () => getJson<{ message: string }>("/api/ping/"),
  textScam: (text: string) => postJson<TextScamResponse>("/api/text/", { text }),
  linkAnalysis: (text: string) => postJson<LinkAnalysisResponse>("/api/link/", { text }),
  whatToReply: (text: string) => postJson<WhatToReplyResponse>("/api/reply/", { text }),
  humanRewrite: (text: string) => postJson<HumanRewriteResponse>("/api/rewrite/", { text }),
  reversePhishing: (text: string) => postJson<ReversePhishingResponse>("/api/reverse/", { text }),
  createAudioTask: async (blob: Blob, filename: string): Promise<{ id: number }> => {
    const form = new FormData();
    form.append("file", blob, filename);
    const resp = await fetch(url("/api/audio-tasks/"), { method: "POST", headers: { "X-Device-ID": getDeviceId(), "X-Device-Type": getDeviceType() }, body: form });
    const data = await readJsonSafe(resp);
    if (!resp.ok) throw new Error((data && data.detail) || `HTTP ${resp.status}`);
    return data as { id: number };
  },
  getAudioTask: (id: number) => getJson<AudioTask>(`/api/audio-tasks/${id}/`),
  historyList: () => getJson<HistoryEntry[]>("/api/history/"),
  analyticsList: () => getJson<HistoryEntry[]>("/api/history/all/"),
};

