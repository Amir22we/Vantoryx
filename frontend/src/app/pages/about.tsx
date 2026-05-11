import { Card, Grid, Pill } from "../../ui/components";
import { usePageMeta } from "../../lib/meta";
import {
  IconAndroid,
  IconApple,
  IconCode,
  IconDevice,
  IconExternal,
  IconGitHub,
  IconLink,
  IconLinux,
  IconMessage,
  IconMic,
  IconPulse,
  IconShield,
  IconStar,
  IconTelegram,
  IconTimer,
  IconWand,
  IconWindows,
} from "../../ui/icons";
import { usePWAInstall, type Platform } from "../../lib/pwa";

function InstallAction({
  platform,
  current,
  canInstall,
  isIOS,
  install,
}: {
  platform: Platform;
  current: Platform;
  canInstall: boolean;
  isIOS: boolean;
  install(): Promise<void>;
}) {
  const isApple = platform === "ios" || platform === "macos";

  if (isApple) {
    return (
      <span
        className="about-row-value"
        style={{ fontSize: 11.5, color: "var(--muted)" }}
      >
        Safari → Поделиться → На экран «Домой»
      </span>
    );
  }

  if (canInstall && current === platform) {
    return (
      <button
        className="btn btn--primary"
        style={{ padding: "6px 14px", minHeight: 32, fontSize: 13 }}
        onClick={install}
      >
        Установить
      </button>
    );
  }

  if (isIOS) {
    return <Pill tone="neutral">Откройте в браузере ПК</Pill>;
  }

  return (
    <a
      href="https://vantoryx.tech"
      target="_blank"
      rel="noopener noreferrer"
      className="about-row-link"
    >
      Открыть сайт
      <IconExternal />
    </a>
  );
}

export function AboutPage() {
  usePageMeta({
    title: "О приложении Vantoryx — ИИ против мошенников",
    description: "Vantoryx — бесплатный ИИ-сервис защиты от мошенников. Команда, технологии, ссылки на GitHub и Telegram-бот.",
  });
  const { canInstall, isIOS, platform, install } = usePWAInstall();
  return (
    <Grid>
      <Card title="" fullWidth>
        <div className="about-hero">
          <div className="about-app-icon">
            <IconShield />
          </div>
          <h1 className="about-name">Vantoryx</h1>
          <p className="about-tagline">ИИ против мошенников</p>
          <Pill tone="neutral">v0.1.0</Pill>
        </div>
        <p className="about-desc">
          Разбираем подозрительные сообщения, ссылки и разговоры. Замечаем
          уловки раньше, чем вы потеряете деньги или данные. Ничего не
          сохраняем.
        </p>
      </Card>

      <Card title="Ссылки проекта">
        <div className="about-section" style={{ gap: 2 }}>
          {[
            {
              icon: <IconGitHub />,
              label: "Исходный код",
              href: "https://github.com/Amir22we/Vantoryx",
            },
            {
              icon: <IconTelegram />,
              label: "Telegram-бот",
              href: "https://t.me/vantoryx_tg_bot",
            },
            {
              icon: <IconPulse />,
              label: "API",
              href: "https://api.vantoryx.tech/api/",
            },
            {
              icon: <IconCode />,
              label: "Схема API",
              href: "https://api.vantoryx.tech/api/schema/",
            },
          ].map((item) => (
            <div key={item.label} className="about-row">
              <div className="about-row-icon">{item.icon}</div>
              <div className="about-row-body">
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="about-row-label about-row-link"
                >
                  {item.label}
                  <IconExternal />
                </a>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Vantoryx на других платформах">
        <div className="about-section">
          <div className="about-row">
            <div className="about-row-icon">
              <IconAndroid />
            </div>
            <div className="about-row-body">
              <span className="about-row-label">
                Android
                {platform === "android" && (
                  <Pill tone="safe" style={{ marginLeft: 6 }}>
                    Ваше устройство
                  </Pill>
                )}
              </span>
              <InstallAction
                platform="android"
                current={platform}
                canInstall={canInstall}
                isIOS={isIOS}
                install={install}
              />
            </div>
          </div>
          <div className="about-row">
            <div className="about-row-icon">
              <IconWindows />
            </div>
            <div className="about-row-body">
              <span className="about-row-label">
                Windows
                {platform === "windows" && (
                  <Pill tone="safe" style={{ marginLeft: 6 }}>
                    Ваше устройство
                  </Pill>
                )}
              </span>
              <InstallAction
                platform="windows"
                current={platform}
                canInstall={canInstall}
                isIOS={isIOS}
                install={install}
              />
            </div>
          </div>
          <div className="about-row">
            <div className="about-row-icon">
              <IconLinux />
            </div>
            <div className="about-row-body">
              <span className="about-row-label">
                Linux
                {platform === "linux" && (
                  <Pill tone="safe" style={{ marginLeft: 6 }}>
                    Ваше устройство
                  </Pill>
                )}
              </span>
              <InstallAction
                platform="linux"
                current={platform}
                canInstall={canInstall}
                isIOS={isIOS}
                install={install}
              />
            </div>
          </div>
          <div className="about-row">
            <div className="about-row-icon">
              <IconApple />
            </div>
            <div className="about-row-body">
              <span className="about-row-label">
                iOS + macOS
                {(platform === "ios" || platform === "macos") && (
                  <Pill tone="safe" style={{ marginLeft: 6 }}>
                    Ваше устройство
                  </Pill>
                )}
              </span>
              <InstallAction
                platform="ios"
                current={platform}
                canInstall={canInstall}
                isIOS={isIOS}
                install={install}
              />
            </div>
          </div>
          <div className="about-row">
            <div className="about-row-icon">
              <IconTelegram />
            </div>
            <div className="about-row-body">
              <span className="about-row-label">Telegram-бот</span>
              <a
                href="https://t.me/vantoryx_tg_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="about-row-link"
              >
                @vantoryx_tg_bot
                <IconExternal />
              </a>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Технологии">
        <div className="about-section">
          <div className="about-row">
            <div className="about-row-icon">
              <IconCode />
            </div>
            <div className="about-row-body">
              <span className="about-row-label">Backend</span>
              <span className="about-row-value">Django + Django Channels</span>
            </div>
          </div>
          <div className="about-row">
            <div className="about-row-icon">
              <IconStar />
            </div>
            <div className="about-row-body">
              <span className="about-row-label">ИИ</span>
              <span className="about-row-value">
                GPT-4o-mini + Whisper tiny
              </span>
            </div>
          </div>
          <div className="about-row">
            <div className="about-row-icon">
              <IconDevice />
            </div>
            <div className="about-row-body">
              <span className="about-row-label">Frontend</span>
              <span className="about-row-value">
                React 19 + Vite + TypeScript
              </span>
            </div>
          </div>
          <div className="about-row">
            <div className="about-row-icon">
              <IconShield />
            </div>
            <div className="about-row-body">
              <span className="about-row-label">Деплой</span>
              <span className="about-row-value">Ubuntu LTS 2.22.0</span>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Инструменты">
        <div className="about-modes">
          {[
            {
              icon: <IconShield />,
              label: "Текст",
              desc: "Риск сообщения, опасные фразы и резюме",
            },
            {
              icon: <IconLink />,
              label: "Ссылки",
              desc: "Найдём URL и оценим каждый на фишинг",
            },
            {
              icon: <IconMessage />,
              label: "Что ответить",
              desc: "Безопасный ответ без личных данных",
            },
            {
              icon: <IconWand />,
              label: "Истинный смысл",
              desc: "Снимем манипуляции, покажем суть",
            },
            {
              icon: <IconTimer />,
              label: "Обратный фишинг",
              desc: "Ответ-заглушка + защита от утечек",
            },
            {
              icon: <IconMic />,
              label: "Аудио",
              desc: "Запись + Whisper + разбор ИИ",
            },
          ].map((m) => (
            <div key={m.label} className="about-mode-item">
              <div className="about-mode-emoji">{m.icon}</div>
              <div>
                <div className="about-mode-name">{m.label}</div>
                <div className="about-mode-desc">{m.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Команда">
        <div className="about-section" style={{ gap: 4 }}>
          {[
            {
              initial: "A",
              name: "Амир",
              role: "Разработчик",
              tg: "new26qwerty",
            },
            {
              initial: "M",
              name: "Муниса",
              role: "UI/UX Дизайнер, Project meneger",
              tg: "mnsrahimova",
            },
            {
              initial: "R",
              name: "Рухсора",
              role: "Технический писатель. Документация к проекту и API",
              tg: "rukhhsora",
            },
          ].map((m) => (
            <div key={m.name} className="about-row">
              <div className="about-dev-avatar">{m.initial}</div>
              <div className="about-row-body">
                <span className="about-row-label">
                  {m.name} — {m.role}
                </span>
                <a
                  href={`https://t.me/${m.tg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="about-row-link"
                >
                  <IconTelegram />@{m.tg}
                  <IconExternal />
                </a>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Приватность" fullWidth>
        <div className="prose">
          <p>
            Регистрация не нужна. Личные данные не храним. Каждый запрос —
            отдельный, без истории. Не вводите настоящие пароли, коды из SMS и
            номера карт.
          </p>
          <p>
            Текст уходит на сервер только для анализа и удаляется после ответа.
          </p>
        </div>
      </Card>
    </Grid>
  );
}
