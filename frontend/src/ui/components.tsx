import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cx } from "./ui";
import {
  copyImageToClipboard, exportShare, generateImage,
  makeVerifyId, nativeShareSupported,
  type ShareData, type ShareFormat, type ShareLayout,
} from "../lib/shareExport";
import {
  IconCard, IconClose, IconCopy, IconDownload, IconImage,
  IconInfo, IconPdf, IconPhone, IconShare, IconShieldLarge,
} from "./icons";

export function AppShell(props: { children: ReactNode }) {
  return <div className="app">{props.children}</div>;
}

export function TopBar(props: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <header className="topbar">
      <div className="topbar__left">
        <div className="brand">
          <span className="brand__dot" />
          <span className="brand__name">{props.title}</span>
        </div>
        {props.subtitle ? <div className="topbar__sub">{props.subtitle}</div> : null}
      </div>
      <div className="topbar__right">{props.right}</div>
    </header>
  );
}

export function Grid(props: { children: ReactNode }) {
  return <div className="grid">{props.children}</div>;
}

export function Card(props: {
  title: ReactNode;
  hint?: string;
  children: ReactNode;
  tone?: "neutral" | "danger" | "safe";
  info?: ReactNode;
  fullWidth?: boolean;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  return (
    <section className={cx("card", props.tone && `card--${props.tone}`, props.fullWidth && "card--full")}>
      <div className="card__head">
        <div className="card__head-row">
          {props.title ? <h2 className="card__title">{props.title}</h2> : null}
          {props.info ? (
            <button
              className={cx("card__info-btn", infoOpen && "card__info-btn--active")}
              onClick={() => setInfoOpen((v) => !v)}
              aria-label="О режиме"
              type="button"
            >
              <IconInfo />
            </button>
          ) : null}
        </div>
        {props.hint ? <p className="card__hint">{props.hint}</p> : null}
        {props.info && infoOpen ? <div className="card__info-panel">{props.info}</div> : null}
      </div>
      <div className="card__body">{props.children}</div>
    </section>
  );
}

export function Button(props: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "danger";
  type?: "button" | "submit";
}) {
  const variant = props.variant || "primary";
  return (
    <button
      className={cx("btn", `btn--${variant}`)}
      onClick={props.onClick}
      disabled={props.disabled}
      type={props.type || "button"}
    >
      {props.children}
    </button>
  );
}

export function TextArea(props: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      className="textarea"
      value={props.value}
      placeholder={props.placeholder}
      onChange={(e) => props.onChange(e.target.value)}
    />
  );
}

export function Select<T extends string>(props: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <select className="select" value={props.value} onChange={(e) => props.onChange(e.target.value as T)}>
      {props.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Pill(props: { tone?: "neutral" | "safe" | "warn" | "danger"; children: ReactNode; style?: React.CSSProperties }) {
  return <span className={cx("pill", props.tone ? `pill--${props.tone}` : "pill--neutral")} style={props.style}>{props.children}</span>;
}

export function CodeBox(props: { children: ReactNode }) {
  return <pre className="code">{props.children}</pre>;
}

export function Row(props: { children: ReactNode; wrap?: boolean }) {
  return <div className={cx("row", props.wrap && "row--wrap")}>{props.children}</div>;
}

export function Small(props: { children: ReactNode }) {
  return <div className="small">{props.children}</div>;
}

export function Kbd(props: { children: ReactNode }) {
  return <kbd className="kbd">{props.children}</kbd>;
}

/* ── Splash Screen ────────────────────────────────────── */
export function SplashScreen(props: { onDone: () => void }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 1400);
    const doneTimer = setTimeout(() => props.onDone(), 1900);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [props.onDone]);

  return (
    <div className={`splash${fading ? " splash--fade" : ""}`} aria-hidden="true">
      <div className="splash__content">
        <div className="splash__icon">
          <IconShieldLarge />
        </div>
        <div className="splash__name">Vantoryx</div>
        <div className="splash__tagline">Защита от мошенников за секунды</div>
      </div>
    </div>
  );
}

/* ── Result View Components ───────────────────────────── */

export function ResultSection(props: { title: string; children: ReactNode }) {
  return (
    <div className="result-section">
      <div className="result-section__title">{props.title}</div>
      <div className="result-section__body">{props.children}</div>
    </div>
  );
}

export function ResultText(props: { children: ReactNode }) {
  return <div className="result-text">{props.children}</div>;
}

export function ResultList(props: { items: string[]; variant?: "positive" | "negative" | "neutral" }) {
  const variant = props.variant ?? "neutral";
  return (
    <ul className={`result-list result-list--${variant}`}>
      {props.items.map((item, i) => (
        <li key={i} className="result-list__item">{item}</li>
      ))}
    </ul>
  );
}

export function RiskBar(props: { score: number }) {
  const tone = props.score >= 70 ? "danger" : props.score >= 40 ? "warn" : "safe";
  return (
    <div className="risk-bar">
      <div className="risk-bar__header">
        <span className="risk-bar__label">Уровень риска</span>
        <span className={`risk-bar__value risk-bar__value--${tone}`}>{props.score}/100</span>
      </div>
      <div className="risk-bar__track">
        <div
          className={`risk-bar__fill risk-bar__fill--${tone}`}
          style={{ width: `${props.score}%` }}
        />
      </div>
    </div>
  );
}

export function MessageBox(props: { label: string; children: ReactNode }) {
  return (
    <div className="message-box">
      <div className="message-box__label">{props.label}</div>
      <div className="message-box__text">{props.children}</div>
    </div>
  );
}

/* ── Share menu + preview modal ────────────────────────── */

export function ShareMenu(props: { data: ShareData; baseName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={cx("share-btn", open && "share-btn--open")}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Поделиться результатом"
      >
        <IconShare />
        Поделиться
      </button>
      {open && (
        <SharePreviewModal
          data={props.data}
          baseName={props.baseName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

type BusyAction = null | "preview" | "copy" | "png" | "pdf" | "share";

export function SharePreviewModal(props: {
  data: ShareData;
  baseName: string;
  onClose: () => void;
}) {
  const [layout, setLayout] = useState<ShareLayout>(props.data.layout ?? "card");
  const [verifyId] = useState(() => props.data.verifyId ?? makeVerifyId());
  const [busy, setBusy] = useState<BusyAction>("preview");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const fullData: ShareData = useMemo(
    () => ({ ...props.data, layout, verifyId }),
    [props.data, layout, verifyId],
  );

  // ESC close + body scroll lock
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") props.onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [props]);

  // regenerate preview when layout/data change
  useEffect(() => {
    let cancelled = false;
    setBusy("preview");
    setToast(null);
    (async () => {
      try {
        const blob = await generateImage(fullData);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setPreviewUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return url;
        });
        setBusy(null);
      } catch {
        if (!cancelled) {
          setBusy(null);
          setToast({ kind: "err", text: "Не удалось построить превью" });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [fullData]);

  // cleanup the last URL on unmount
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flashToast = (t: { kind: "ok" | "err"; text: string }) => {
    setToast(t);
    window.setTimeout(() => setToast((cur) => (cur === t ? null : cur)), 2200);
  };

  async function download(format: ShareFormat) {
    setBusy(format);
    try {
      const result = await exportShare(fullData, format, props.baseName);
      flashToast({
        kind: "ok",
        text: result === "shared"
          ? "Отправлено"
          : format === "pdf" ? "PDF загружен" : "Картинка загружена",
      });
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError")) {
        flashToast({ kind: "err", text: "Не удалось сохранить" });
      }
    } finally {
      setBusy(null);
    }
  }

  async function copyToClipboard() {
    setBusy("copy");
    try {
      await copyImageToClipboard(fullData);
      flashToast({ kind: "ok", text: "Скопировано в буфер" });
    } catch {
      flashToast({ kind: "err", text: "Буфер обмена недоступен" });
    } finally {
      setBusy(null);
    }
  }

  async function nativeShare() {
    setBusy("share");
    try {
      await download("png");
    } finally {
      setBusy(null);
    }
  }

  const supportsNative = nativeShareSupported();
  const supportsCopy = typeof ClipboardItem !== "undefined" && !!navigator.clipboard?.write;

  return (
    <div
      className="share-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Поделиться результатом"
    >
      <div className="share-modal">
        <header className="share-modal__head">
          <div>
            <div className="share-modal__title">Поделиться результатом</div>
            <div className="share-modal__sub">ID проверки: {verifyId}</div>
          </div>
          <button
            type="button"
            className="share-modal__close"
            onClick={props.onClose}
            aria-label="Закрыть"
          >
            <IconClose />
          </button>
        </header>

        <div className="share-modal__toolbar">
          <div className="share-layout-toggle" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={layout === "card"}
              className={cx("share-layout-toggle__btn", layout === "card" && "share-layout-toggle__btn--active")}
              onClick={() => setLayout("card")}
            >
              <IconCard />
              Карточка
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={layout === "story"}
              className={cx("share-layout-toggle__btn", layout === "story" && "share-layout-toggle__btn--active")}
              onClick={() => setLayout("story")}
            >
              <IconPhone />
              История 9:16
            </button>
          </div>
        </div>

        <div className={cx("share-modal__preview", `share-modal__preview--${layout}`)}>
          {previewUrl ? (
            <img src={previewUrl} alt="Превью" className="share-modal__preview-img" />
          ) : null}
          {busy === "preview" && (
            <div className="share-modal__preview-overlay">
              <div className="share-modal__spinner" aria-hidden="true" />
              <span>Готовим превью…</span>
            </div>
          )}
        </div>

        <div className="share-modal__actions">
          {supportsCopy && (
            <button
              type="button"
              className="share-action share-action--ghost"
              onClick={copyToClipboard}
              disabled={busy !== null}
            >
              <IconCopy />
              {busy === "copy" ? "Копирую…" : "Копировать"}
            </button>
          )}
          <button
            type="button"
            className="share-action share-action--ghost"
            onClick={() => download("png")}
            disabled={busy !== null}
          >
            <IconImage />
            {busy === "png" ? "Сохраняю…" : "PNG"}
          </button>
          <button
            type="button"
            className="share-action share-action--ghost"
            onClick={() => download("pdf")}
            disabled={busy !== null}
          >
            <IconPdf />
            {busy === "pdf" ? "Сохраняю…" : "PDF"}
          </button>
          {supportsNative ? (
            <button
              type="button"
              className="share-action share-action--primary"
              onClick={nativeShare}
              disabled={busy !== null}
            >
              <IconShare />
              {busy === "share" ? "…" : "Поделиться"}
            </button>
          ) : (
            <button
              type="button"
              className="share-action share-action--primary"
              onClick={() => download("png")}
              disabled={busy !== null}
            >
              <IconDownload />
              Скачать
            </button>
          )}
        </div>

        {toast && (
          <div className={cx("share-toast", `share-toast--${toast.kind}`)} role="status">
            {toast.text}
          </div>
        )}
      </div>
    </div>
  );
}
