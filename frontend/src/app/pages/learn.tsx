import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "../../lib/meta";
import { Card, Grid, Pill } from "../../ui/components";
import { IconShield } from "../../ui/icons";

// ── types ─────────────────────────────────────────────────────

type Verdict = "scam" | "uncertain" | "safe";

type LearnCard = {
  id: number;
  text: string;
  verdict: Verdict;
  category: string;
  explanation: string;
  flags: string[];
};

type Phase = "start" | "question" | "answer" | "finished";

// ── dataset ───────────────────────────────────────────────────

const ALL_CARDS: LearnCard[] = [
  {
    id: 1,
    text: "Поздравляем! Ваш номер телефона выбран победителем акции «Мобильная удача». Ваш выигрыш — 85 000 ₽. Для получения приза позвоните: +7 (900) 555-01-23. Акция действует строго 24 часа.",
    verdict: "scam",
    category: "Лотерея / Приз",
    explanation: "Классический лотерейный лохотрон. Реальные лотереи не выбирают победителей среди случайных номеров. После звонка попросят «оплатить доставку приза» или «налог».",
    flags: ["Несуществующий выигрыш", "Срочность: «24 часа»", "Неизвестный платный номер"],
  },
  {
    id: 2,
    text: "Мама, это я. Попал в аварию, нахожусь в больнице. Телефон разбит, пишу с чужого. Срочно нужны деньги на операцию — 45 000 руб. Переведи на карту 4276 8801 2345 6789. Потом всё объясню, не звони никуда.",
    verdict: "scam",
    category: "Схема «родственник в беде»",
    explanation: "Мошенник имитирует близкого человека — нет имени, сразу реквизиты. «Не звони» не даёт вам проверить. Всегда перезвоните родственнику напрямую по известному вам номеру.",
    flags: ["Нет имени", "«Не звони никуда»", "Паника + срочность", "Сразу реквизиты карты"],
  },
  {
    id: 3,
    text: "Сбербанк: ваша карта *3421 временно заблокирована из-за подозрительной операции. Для разблокировки перейдите: sber-cabinet-online.ru и подтвердите данные.",
    verdict: "scam",
    category: "Банковский фишинг",
    explanation: "Настоящий Сбербанк никогда не шлёт ссылки на сторонние домены. Домен sber-cabinet-online.ru — подделка под sberbank.ru. Цель — украсть данные карты.",
    flags: ["Поддельный домен (не sberbank.ru)", "Просит ввести данные карты", "Давление: «заблокирована»"],
  },
  {
    id: 4,
    text: "Срочно требуются сотрудники для работы на дому! Доход от 5 000 руб/день. Опыт не нужен. Гибкий график. Обучение бесплатно. Для записи напишите «ХОЧУ» в ответ.",
    verdict: "scam",
    category: "Лжеработодатель",
    explanation: "Нереалистичный доход без опыта — признак скама. После отклика попросят «оплатить обучающие материалы» или «внести залог». Реальные работодатели не набирают через SMS.",
    flags: ["«5000 в день» без опыта", "Нет названия компании", "Нет описания работы"],
  },
  {
    id: 5,
    text: "Гражданин! По данным ПФР за вами числится переплата социальных выплат на сумму 12 400 руб. Для добровольного возврата позвоните: 8-800-333-44-55. Срок обращения — 3 рабочих дня.",
    verdict: "scam",
    category: "Фальшивые госслужбы",
    explanation: "ПФР не уведомляет о «переплатах» через SMS. После звонка мошенник попросит продиктовать данные карты «для проверки личности» или перевести деньги «на хранение».",
    flags: ["ПФР не рассылает такие SMS", "Срочность: «3 дня»", "Давление «долгом»"],
  },
  {
    id: 6,
    text: "ВНИМАНИЕ! На вашем устройстве обнаружен вирус. Ваши данные под угрозой. Немедленно позвоните специалисту: +7 (495) 123-45-67. Microsoft Support.",
    verdict: "scam",
    category: "Поддельная техподдержка",
    explanation: "Microsoft никогда не рассылает SMS о вирусах. Мошенник попросит установить программу «для удаления вируса», а на деле получит полный удалённый доступ к компьютеру.",
    flags: ["Microsoft не рассылает SMS", "Создание паники", "Звонок = потеря доступа к ПК"],
  },
  {
    id: 7,
    text: "Привет! Я заработал 180 000 руб. за 3 недели на платформе CryptoEarnings. Вход от 10 000 руб., вывод в любое время. Зарегистрируйся по моей ссылке — бонус +20% на первый депозит.",
    verdict: "scam",
    category: "Инвестиционный скам",
    explanation: "Гарантированная высокая доходность невозможна. «Вывод в любое время» — ложь: деньги заблокируют после пополнения. Это финансовая пирамида под видом крипты.",
    flags: ["Нереальная доходность", "«Вывод в любое время»", "Реферальная схема", "Неизвестная платформа"],
  },
  {
    id: 8,
    text: "Говорит следователь СК РФ Петров А.В. Ваш счёт используется в схеме отмывания. Для сохранения средств переведите их на защищённый счёт ЦБ: +7 (495) 000-11-22.",
    verdict: "scam",
    category: "Лжеследователь",
    explanation: "Следователи СК никогда не просят перевести деньги. ЦБ не принимает вклады физлиц. Это самая распространённая схема 2023–2024 с потерями от миллиона рублей.",
    flags: ["«Переведите на защищённый счёт»", "Давление авторитетом", "ЦБ не принимает вклады"],
  },
  {
    id: 9,
    text: "Вам начислен кешбэк 2 340 руб. от программы лояльности. Для зачисления на карту перейдите: gosuslugi-cashback.net/confirm",
    verdict: "scam",
    category: "Фишинговая ссылка",
    explanation: "Домен gosuslugi-cashback.net не имеет отношения к Госуслугам (gosuslugi.ru). Ссылка ведёт на сайт-клон для кражи данных карты.",
    flags: ["Поддельный домен (не gosuslugi.ru)", "Несуществующий кешбэк", "«Введите данные карты»"],
  },
  {
    id: 10,
    text: "Привет! Это Андрей из бухгалтерии. Потерял доступ к корпоративному кошельку, надо срочно провести платёж 15 000 руб. Верну через час после совещания. Скинь на Тинькофф +7 999 123 45 67.",
    verdict: "uncertain",
    category: "Просьба от «коллеги»",
    explanation: "Может быть как реальной просьбой, так и взломом аккаунта коллеги. Высокий риск: просьба о деньгах без подтверждения личности. Перезвоните Андрею по известному вам номеру, прежде чем переводить.",
    flags: ["Личность не подтверждена", "Срочность", "Просьба денег без объяснений"],
  },
  {
    id: 11,
    text: "МТС: Для вас доступна специальная акция — безлимитный интернет на 3 месяца за 99 руб./мес. Активация: mts-special.ru/promo. Предложение только для номеров до 2020 года.",
    verdict: "uncertain",
    category: "Акция от «оператора»",
    explanation: "Может быть реальной акцией, но домен mts-special.ru — не официальный сайт МТС (mts.ru). Проверьте акцию только через официальное приложение или *111# — никогда по ссылке из SMS.",
    flags: ["Домен не mts.ru", "Слишком выгодно", "Проверяйте только через приложение"],
  },
  {
    id: 12,
    text: "Ваш заказ в СДЭК №CDQ-4453217 прибыл на пункт выдачи. Для получения потребуется паспорт. Адрес: ул. Ленина, 45. Режим работы: 9:00–20:00. Срок хранения — 7 дней.",
    verdict: "uncertain",
    category: "Уведомление о посылке",
    explanation: "Выглядит как реальное уведомление СДЭК — нет ссылок, нет просьбы вводить данные. Но если вы ничего не заказывали — это может быть наложенный платёж мошенника (вы платите при получении за ненужный товар).",
    flags: ["Если ничего не заказывали — не забирайте", "Наложенный платёж = ловушка"],
  },
  {
    id: 13,
    text: "Госуслуги: вы записаны на приём в МФЦ Невский район на 15.11.2024 в 14:30. Адрес: Невский пр., 176. Для отмены записи: gosuslugi.ru или тел. 88001003210.",
    verdict: "safe",
    category: "Официальные Госуслуги",
    explanation: "Стандартное уведомление о записи: официальный домен gosuslugi.ru, нет ссылок на ввод данных, реальный телефон поддержки Госуслуг 8-800-100-32-10.",
    flags: [],
  },
  {
    id: 14,
    text: "Спасибо за покупку в Wildberries! Заказ №WB-88234716 передан в доставку. Ожидаемая дата: 12–14 ноября. Отследить: wildberries.ru/lk/orders",
    verdict: "safe",
    category: "Подтверждение заказа",
    explanation: "Обычное уведомление о доставке: конкретный номер заказа, официальный домен wildberries.ru, нет просьбы ввести данные или позвонить.",
    flags: [],
  },
  {
    id: 15,
    text: "Тинькофф: 25.10 в 14:23 по карте *4401 списано 3 200 руб. в «Пятёрочка». Остаток: 18 450 руб. Если не вы — позвоните 8-800-555-09-11.",
    verdict: "safe",
    category: "SMS от банка",
    explanation: "Типичное банковское уведомление: конкретная сумма, место, частично скрытый номер карты. Нет ссылок, нет просьбы перезвонить куда-то кроме официального номера Тинькофф.",
    flags: [],
  },
];

const VERDICT_CONFIG: Record<Verdict, { label: string; emoji: string; btnClass: string }> = {
  scam:      { label: "Мошенничество", emoji: "🚨", btnClass: "learn-btn--scam" },
  uncertain: { label: "Подозрительно", emoji: "⚠️", btnClass: "learn-btn--uncertain" },
  safe:      { label: "Безопасно",     emoji: "✅", btnClass: "learn-btn--safe" },
};

// ── helpers ───────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pluralFlags(n: number) {
  if (n === 1) return "1 флаг";
  if (n < 5) return `${n} флага`;
  return `${n} флагов`;
}

// ── sub-components ────────────────────────────────────────────

function StreakBadge({ streak }: { streak: number }) {
  if (streak < 2) return null;
  const emoji = streak >= 5 ? "🔥🔥" : "🔥";
  return (
    <span className="learn-streak">
      {emoji} Серия {streak}
    </span>
  );
}

function Stars({ pct }: { pct: number }) {
  const filled = pct >= 80 ? 3 : pct >= 60 ? 2 : pct >= 40 ? 1 : 0;
  return (
    <div className="learn-stars" aria-label={`${filled} из 3 звёзд`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={`learn-star${i < filled ? " learn-star--on" : ""}`}>★</span>
      ))}
    </div>
  );
}

function StartScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="learn-start">
      <div className="learn-start__icon">🧠</div>
      <h2 className="learn-start__title">Тренажёр</h2>
      <p className="learn-start__sub">
        Реальные мошеннические схемы — угадайте вердикт и узнайте как их распознавать
      </p>

      <div className="learn-start__meta">
        <span className="learn-meta-chip">📋 {ALL_CARDS.length} карточек</span>
        <span className="learn-meta-chip">⏱ ~7 мин</span>
        <span className="learn-meta-chip">🏆 Очки и серии</span>
      </div>

      <button className="btn btn--primary learn-start__btn" onClick={onStart}>
        Начать тренировку
      </button>
    </div>
  );
}

function FinishScreen({
  correct, total, score, maxStreak, onRestart,
}: {
  correct: number; total: number; score: number; maxStreak: number; onRestart: () => void;
}) {
  const pct = Math.round((correct / total) * 100);
  const msg =
    pct >= 80 ? "Отличный результат! Мошенникам с вами не повезло." :
    pct >= 60 ? "Хороший результат. Ещё немного практики!" :
    pct >= 40 ? "Неплохо для начала. Попробуйте ещё раз." :
    "Стоит повторить. Мошенники используют одни и те же приёмы.";

  return (
    <div className="learn-finish">
      <Stars pct={pct} />
      <div className="learn-finish__score">{correct}<span>/{total}</span></div>
      <p className="learn-finish__label">правильных ответов</p>
      <p className="learn-finish__msg">{msg}</p>

      <div className="learn-finish__stats">
        <div className="learn-finish__stat">
          <span className="learn-finish__stat-val">{score}</span>
          <span className="learn-finish__stat-key">очков</span>
        </div>
        <div className="learn-finish__stat">
          <span className="learn-finish__stat-val">{pct}%</span>
          <span className="learn-finish__stat-key">точность</span>
        </div>
        <div className="learn-finish__stat">
          <span className="learn-finish__stat-val">{maxStreak}</span>
          <span className="learn-finish__stat-key">макс. серия</span>
        </div>
      </div>

      <div className="learn-finish__actions">
        <button className="btn btn--primary" onClick={onRestart}>Попробовать снова</button>
        <Link className="btn btn--ghost" to="/text">Проверить реальное сообщение</Link>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────

export function LearnPage() {
  usePageMeta({ title: "Тренажёр | Vantoryx", noindex: true });

  const [phase, setPhase]         = useState<Phase>("start");
  const [cards, setCards]         = useState<LearnCard[]>([]);
  const [index, setIndex]         = useState(0);
  const [chosen, setChosen]       = useState<Verdict | null>(null);
  const [score, setScore]         = useState(0);
  const [streak, setStreak]       = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [correct, setCorrect]     = useState(0);

  const revealRef = useRef<HTMLDivElement>(null);

  function start() {
    setCards(shuffle(ALL_CARDS));
    setIndex(0);
    setChosen(null);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setCorrect(0);
    setPhase("question");
  }

  function answer(v: Verdict) {
    const card = cards[index];
    const isCorrect = v === card.verdict;
    setChosen(v);
    if (isCorrect) {
      const ns = streak + 1;
      setStreak(ns);
      setMaxStreak((m) => Math.max(m, ns));
      setCorrect((c) => c + 1);
      setScore((s) => s + 10 + (ns >= 3 ? 5 : 0));
    } else {
      setStreak(0);
    }
    setPhase("answer");
  }

  function next() {
    if (index >= cards.length - 1) {
      setPhase("finished");
    } else {
      setIndex((i) => i + 1);
      setChosen(null);
      setPhase("question");
    }
  }

  useEffect(() => {
    if (phase === "answer") {
      setTimeout(() => revealRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
    }
  }, [phase]);

  const card = cards[index] as LearnCard | undefined;
  const isCorrect = chosen !== null && card !== undefined && chosen === card.verdict;

  return (
    <Grid>
      <Card fullWidth title={phase === "start" ? "Обучение" : phase === "finished" ? "Результат" : `Карточка ${index + 1} из ${ALL_CARDS.length}`}>
        {phase === "start" && <StartScreen onStart={start} />}

        {phase === "finished" && (
          <FinishScreen
            correct={correct}
            total={ALL_CARDS.length}
            score={score}
            maxStreak={maxStreak}
            onRestart={start}
          />
        )}

        {(phase === "question" || phase === "answer") && card && (
          <div className="learn-game">
            {/* ── top bar ── */}
            <div className="learn-topbar">
              <div className="learn-progress-wrap">
                <div
                  className="learn-progress-fill"
                  style={{ width: `${((index + (phase === "answer" ? 1 : 0)) / ALL_CARDS.length) * 100}%` }}
                />
              </div>
              <div className="learn-meta">
                <span className="learn-meta__score">
                  <IconShield /> {score} очков
                </span>
                <StreakBadge streak={streak} />
              </div>
            </div>

            {/* ── message bubble ── */}
            <div className="learn-bubble-wrap">
              <div className="learn-bubble-sender">Входящее сообщение</div>
              <div className="learn-bubble">{card.text}</div>
            </div>

            {/* ── answer buttons / reveal ── */}
            {phase === "question" && (
              <div className="learn-answers">
                {(["scam", "uncertain", "safe"] as Verdict[]).map((v) => {
                  const cfg = VERDICT_CONFIG[v];
                  return (
                    <button
                      key={v}
                      type="button"
                      className={`learn-answer-btn ${cfg.btnClass}`}
                      onClick={() => answer(v)}
                    >
                      <span className="learn-answer-btn__emoji">{cfg.emoji}</span>
                      <span className="learn-answer-btn__label">{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {phase === "answer" && chosen && (
              <div ref={revealRef} className="learn-reveal">
                {/* result banner */}
                <div className={`learn-result-banner ${isCorrect ? "learn-result-banner--correct" : "learn-result-banner--wrong"}`}>
                  <span className="learn-result-banner__icon">{isCorrect ? "✓" : "✕"}</span>
                  <div className="learn-result-banner__body">
                    <span className="learn-result-banner__title">
                      {isCorrect
                        ? `Правильно!${streak >= 3 ? ` 🔥 Серия ${streak}! +${10 + 5} очков` : " +10 очков"}`
                        : "Неверно"}
                    </span>
                    {!isCorrect && (
                      <span className="learn-result-banner__sub">
                        Правильный ответ: {VERDICT_CONFIG[card.verdict].emoji} {VERDICT_CONFIG[card.verdict].label}
                      </span>
                    )}
                  </div>
                </div>

                {/* chosen + correct pills row */}
                <div className="learn-reveal__verdicts">
                  <span className="learn-reveal__verdict-label">Ваш ответ:</span>
                  <Pill tone={chosen === "scam" ? "danger" : chosen === "safe" ? "safe" : "warn"}>
                    {VERDICT_CONFIG[chosen].emoji} {VERDICT_CONFIG[chosen].label}
                  </Pill>
                  {!isCorrect && (
                    <>
                      <span className="learn-reveal__verdict-label">Верный:</span>
                      <Pill tone={card.verdict === "scam" ? "danger" : card.verdict === "safe" ? "safe" : "warn"}>
                        {VERDICT_CONFIG[card.verdict].emoji} {VERDICT_CONFIG[card.verdict].label}
                      </Pill>
                    </>
                  )}
                </div>

                {/* category */}
                <div className="learn-reveal__category">{card.category}</div>

                {/* explanation */}
                <p className="learn-reveal__explanation">{card.explanation}</p>

                {/* flags */}
                {card.flags.length > 0 && (
                  <div className="learn-reveal__flags-section">
                    <span className="learn-reveal__flags-label">
                      {pluralFlags(card.flags.length)} в этом сообщении:
                    </span>
                    <div className="learn-reveal__flags">
                      {card.flags.map((f, i) => (
                        <span key={i} className="flag-item">{f}</span>
                      ))}
                    </div>
                  </div>
                )}

                {card.flags.length === 0 && (
                  <div className="learn-reveal__safe-note">
                    Признаков мошенничества не обнаружено — безопасное сообщение
                  </div>
                )}

                {/* next button */}
                <button
                  type="button"
                  className="btn btn--primary learn-reveal__next"
                  onClick={next}
                >
                  {index < ALL_CARDS.length - 1 ? "Следующая карточка →" : "Посмотреть результат"}
                </button>
              </div>
            )}
          </div>
        )}
      </Card>
    </Grid>
  );
}
