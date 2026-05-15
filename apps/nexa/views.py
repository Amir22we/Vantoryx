from openai import OpenAI
from django.conf import settings
from django.shortcuts import render
from rest_framework.response import Response
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
import os
import tempfile
from rest_framework import generics
from rest_framework.parsers import MultiPartParser, FormParser

from .models import AudioTask, HistoryEntry
from .serializers import (
    AudioTaskSerializer,
    TextScamAnalysisRequestSerializer,
    LinkAnalysisRequestSerializer,
    WhatToReplyRequestSerializer,
    HumanRewriteRequestSerializer,
    ReversePhishingRequestSerializer,
    HistoryEntrySerializer,
)
from .transcribe import transcribe_with_whisper_local

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.OPENROUTER_API_KEY,
)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def create_audio_task(request):
    audio_file = request.FILES.get("file")
    if not audio_file:
        return Response({"detail": "No file provided"}, status=400)

    content_type = audio_file.content_type or ""
    if "ogg" in content_type:
        suffix = ".ogg"
    elif "mp4" in content_type or "m4a" in content_type:
        suffix = ".mp4"
    else:
        suffix = ".webm"

    obj = AudioTask.objects.create(status="processing")

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp_path = tmp.name
            for chunk in audio_file.chunks():
                tmp.write(chunk)

        transcript = transcribe_with_whisper_local(
            file_path=tmp_path,
            language="ru",
            model_name="base",
        )

        completion = client.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Ты — система классификации телефонных разговоров и сообщений."
                        "Твоя задача — определить, является ли звонок мошенническим."
                        "Проанализируй текст разговора и определи: есть ли признаки мошенничества, попытка обмана, давления, срочности, запросы денег, кодов, паролей, SMS, карт, CVV, представление сотрудником банка, полиции, госорганов без подтверждений, манипуляции страхом, выгодой или угрозами, несоответствия, социальная инженерия"
                        "❗Правила ответа: 1. Отвечай ТОЛЬКО одной из двух фраз. 2. Никаких пояснений, комментариев, знаков препинания или дополнительного текста. 3. Формулировки должны совпадать ТОЧНО."
                        "Допустимые ответы: 'Звонят мошенники!', 'Звонок безопасный'"
                        "Если есть ХОТЬ МАЛЕЙШИЕ признаки мошенничества — выбирай:'Звонят мошенники!'"
                        "Если звонок выглядит обычным, бытовым или нейтральным — выбирай:'Звонок безопасный'"
                    ),
                },
                {
                    "role": "user",
                    "content": transcript,
                },
            ],
            temperature=0.0,
            max_tokens=50,
        )

        verified = (completion.choices[0].message.content or "").strip()
        obj.transcription = transcript
        obj.summary = verified
        obj.status = "done"
    except Exception:
        obj.transcription = ""
        obj.summary = ""
        obj.status = "error"
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

    obj.save(update_fields=["transcription", "status", "summary"])

    HistoryEntry.objects.create(
        entry_type='audio',
        device_id=request.META.get('HTTP_X_DEVICE_ID', ''),
        device_type=request.META.get('HTTP_X_DEVICE_TYPE', ''),
        audio_task=obj,
        result={
            'transcription': obj.transcription,
            'summary': obj.summary,
            'status': obj.status,
        },
    )

    return Response({"id": obj.id}, status=201)


class AudioTaskDetailView(generics.RetrieveAPIView):
    queryset = AudioTask.objects.all()
    serializer_class = AudioTaskSerializer


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def ping(request):
    return Response({"message": "API is working!"})


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def text_scam(request):
    serializer = TextScamAnalysisRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    text = serializer.validated_data["text"]

    completion = client.chat.completions.create(
        model="openai/gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "Ты — система анализа текста на признаки мошенничества/скама."
                    " Пользователь вставляет произвольный текст (сообщение, переписка, описание звонка)."
                    " Определи, насколько это похоже на мошенничество/скам."
                    "\n\n"
                    "Верни результат СТРОГО в JSON без markdown и без лишнего текста, по схеме:\n"
                    "{"
                    '"verdict":"scam|safe|uncertain",'
                    '"risk_score":0-100,'
                    '"reasons":["..."],'
                    '"short_explanation":"..."'
                    "}\n"
                    "\n"
                    "Правила:\n"
                    "- verdict=scam если есть явные/существенные признаки (давление, срочность, просьба денег/кодов/карты, подмена личности банка/полиции/госорганов, угрозы, обещания сверхвыгоды, ссылки на фишинг, просьбы установить приложение/дать доступ).\n"
                    "- verdict=safe если выглядит бытовым/нейтральным и нет признаков.\n"
                    "- verdict=uncertain если данных мало или признаки слабые/двусмысленные.\n"
                    "- risk_score: 0 (точно безопасно) .. 100 (почти наверняка скам).\n"
                    "- reasons: 1-6 коротких пунктов, без воды.\n"
                    "- short_explanation: 1-2 предложения.\n"
                ),
            },
            {"role": "user", "content": text},
        ],
        temperature=0.0,
        max_tokens=300,
    )

    raw = (completion.choices[0].message.content or "").strip()
    try:
        import json

        data = json.loads(raw)
    except Exception:
        data = {
            "verdict": "uncertain",
            "risk_score": 50,
            "reasons": [],
            "short_explanation": raw[:500],
        }

    verdict = data.get("verdict")
    if verdict not in {"scam", "safe", "uncertain"}:
        verdict = "uncertain"

    try:
        risk_score = int(data.get("risk_score", 50))
    except Exception:
        risk_score = 50
    risk_score = max(0, min(100, risk_score))

    reasons = data.get("reasons") if isinstance(data.get("reasons"), list) else []
    reasons = [str(x)[:200] for x in reasons][:6]

    short_explanation = str(data.get("short_explanation", ""))[:800]

    response_data = {
        "verdict": verdict,
        "risk_score": risk_score,
        "reasons": reasons,
        "short_explanation": short_explanation,
    }

    HistoryEntry.objects.create(
        entry_type='text',
        device_id=request.META.get('HTTP_X_DEVICE_ID', ''),
        device_type=request.META.get('HTTP_X_DEVICE_TYPE', ''),
        input_text=text,
        result=response_data,
    )

    return Response(response_data)


def _extract_urls(text: str) -> list[str]:
    import re

    pattern = re.compile(r'(?i)\b((?:https?://|www\.)[^\s<>"\'()]+)')
    urls = []
    for m in pattern.finditer(text or ""):
        u = m.group(1).rstrip(".,;:!?)]}\"'")
        if u.lower().startswith("www."):
            u = "http://" + u
        urls.append(u)
    seen = set()
    out = []
    for u in urls:
        if u not in seen:
            seen.add(u)
            out.append(u)
        if len(out) >= 10:
            break
    return out


def _is_private_host(hostname: str) -> bool:
    import ipaddress
    import socket

    if not hostname:
        return True
    try:
        infos = socket.getaddrinfo(hostname, None)
    except Exception:
        return False

    for info in infos:
        ip_str = info[4][0]
        try:
            ip = ipaddress.ip_address(ip_str)
        except Exception:
            continue
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
        ):
            return True
    return False


def _trace_redirects(url: str, timeout_s: float = 5.0, max_hops: int = 5) -> tuple[list[str], str]:
    import requests

    def _check(u: str) -> None:
        from urllib.parse import urlparse
        host = urlparse(u).hostname or ""
        if host in {"localhost"}:
            raise ValueError("blocked_host")
        if _is_private_host(host):
            raise ValueError("blocked_private_ip")

    _check(url)

    redirects = []
    resp = requests.get(
        url,
        allow_redirects=True,
        timeout=timeout_s,
        headers={"User-Agent": "Vantoryx-LinkAnalyzer/1.0"},
        stream=True,
    )
    resp.close()

    for r in resp.history:
        redirects.append(r.headers.get("Location", ""))

    final_url = resp.url

    try:
        _check(final_url)
    except Exception:
        final_url = url
        redirects = []

    return redirects[:max_hops], final_url

def _score_url(url: str, final_url: str, redirects: list[str]) -> dict:
    from urllib.parse import urlparse
    import difflib

    reasons: list[str] = []
    score = 0

    def add(points: int, reason: str):
        nonlocal score
        score += points
        reasons.append(reason)

    parsed = urlparse(url)
    final_parsed = urlparse(final_url)

    host = (final_parsed.hostname or parsed.hostname or "").lower()
    domain = host

    if parsed.scheme not in {"http", "https"}:
        add(10, "нестандартная схема ссылки")
    if "@" in (parsed.netloc or ""):
        add(25, "используется '@' в адресе (частый трюк фишинга)")
    if any(x in (parsed.path or "").lower() for x in ["login", "signin", "verify", "payment", "bank", "secure"]):
        add(10, "подозрительный путь (login/verify/payment/secure)")

    import ipaddress

    try:
        ipaddress.ip_address(host)
        add(35, "вместо домена указан IP-адрес")
    except Exception:
        pass

    if "xn--" in host:
        add(20, "punycode (возможна подмена символов)")

    if host.count(".") >= 3:
        add(10, "много поддоменов")
    if len(host) >= 35:
        add(10, "очень длинный домен")

    if redirects:
        add(min(20, 5 * len(redirects)), "есть редиректы")
        try:
            first_host = (urlparse(url).hostname or "").lower()
            if first_host and host and first_host != host:
                add(10, "редирект на другой домен")
        except Exception:
            pass

    brands = [
        "google.com",
        "telegram.org",
    ]
    if host and all(b not in host for b in brands):
        for b in brands:
            def base(h: str) -> str:
                parts = [p for p in h.split(".") if p]
                return ".".join(parts[-2:]) if len(parts) >= 2 else h

            ratio = difflib.SequenceMatcher(a=base(host), b=base(b)).ratio()
            if ratio >= 0.82:
                add(30, f"похоже на подмену известного домена ({b})")
                break

    score = max(0, min(100, score))
    if score >= 60:
        verdict = "danger"
    elif score <= 25:
        verdict = "neutral"
    else:
        verdict = "unknown"

    return {
        "verdict": verdict,
        "risk_score": score,
        "reasons": reasons[:8],
        "domain": domain,
    }


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def link_analysis(request):
    serializer = LinkAnalysisRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    text = serializer.validated_data["text"]

    urls = _extract_urls(text)
    items = []
    overall_score = 0

    for u in urls:
        redirects = []
        final_url = u
        try:
            redirects, final_url = _trace_redirects(u)
        except Exception:
            redirects, final_url = [], u

        scored = _score_url(u, final_url, redirects)
        items.append(
            {
                "url": u,
                "final_url": final_url,
                "domain": scored["domain"],
                "verdict": scored["verdict"],
                "risk_score": scored["risk_score"],
                "reasons": scored["reasons"],
                "redirects": redirects,
            }
        )
        overall_score = max(overall_score, scored["risk_score"])

    if overall_score >= 60:
        overall_verdict = "danger"
    elif overall_score <= 25:
        overall_verdict = "neutral"
    else:
        overall_verdict = "unknown"

    ai_conclusion = ""
    if urls:
        urls_summary = "\n".join(
            f"- URL: {it['url']}\n  Финальный URL: {it['final_url']}\n  Домен: {it['domain']}\n  Редиректы: {it['redirects']}\n  Технические причины: {it['reasons']}"
            for it in items
        )
        try:
            completion = client.chat.completions.create(
                model="openai/gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Ты — эксперт по кибербезопасности и анализу фишинговых URL."
            " Тебе дают список URL с техническими данными (финальный URL после редиректов, домен, признаки)."
            " Твоя задача — строго определить уровень риска.\n\n"

            "Верни результат СТРОГО в JSON без markdown:\n"
            '{"ai_verdict":"danger|neutral|unknown","ai_explanation":"..."}\n\n'

            "КРИТИЧЕСКИЕ ПРАВИЛА АНАЛИЗА:\n"
            "- Всегда анализируй EFFECTIVE TLD+1 (основной домен), а не просто подстроки.\n"
            "- Игнорируй вводящие в заблуждение поддомены (например: clau.de.ai.com → реальный домен ai.com).\n"
            "- Если известный бренд встречается НЕ в основном домене — это признак фишинга.\n"
            "- Проверяй на typosquatting (g00gle.com, paypa1.com и т.п.).\n"
            "- Проверяй на лишние поддомены, имитирующие легитимность (login.secure.bank.com.fake-domain.ru).\n"
            "- Проверяй punycode/IDN (xn--... домены).\n"
            "- Подозрительны: случайные домены, короткие/генерированные имена, несоответствие бренду.\n"
            "- Подозрительны редиректы на неожиданные домены.\n"
            "- HTTPS НЕ означает безопасность.\n\n"

            "КЛАССИФИКАЦИЯ:\n"
            "- ai_verdict=danger если есть ЛЮБОЙ сильный признак фишинга или обмана.\n"
            "- ai_verdict=neutral только если домен явно легитимный и совпадает с брендом.\n"
            "- ai_verdict=unknown если данных реально недостаточно.\n\n"

            "ai_explanation:\n"
            "- 1-3 коротких предложения.\n"
            "- Обязательно укажи КАКОЙ именно домен является реальным (effective domain).\n"
            "- Укажи конкретную причину (например: 'бренд в поддомене', 'typosquatting').\n"
                        ),
                    },
                    {
                        "role": "user",
                        "content": f"Проанализируй эти ссылки:\n{urls_summary}",
                    },
                ],
                temperature=0.0,
                max_tokens=200,
            )
            raw = (completion.choices[0].message.content or "").strip()
            import json
            ai_data = json.loads(raw)
            ai_verdict = ai_data.get("ai_verdict", "unknown")
            ai_conclusion = ai_data.get("ai_explanation", "")

            if ai_verdict == "danger" and overall_verdict != "danger":
                overall_verdict = "danger"
                overall_score = max(overall_score, 65)

        except Exception:
            ai_conclusion = ""

    response_data = {
        "verdict": overall_verdict,
        "risk_score": overall_score,
        "extracted_urls": urls,
        "ai_conclusion": ai_conclusion,
        "items": items,
    }

    HistoryEntry.objects.create(
        entry_type='link',
        device_id=request.META.get('HTTP_X_DEVICE_ID', ''),
        device_type=request.META.get('HTTP_X_DEVICE_TYPE', ''),
        input_text=text,
        result=response_data,
    )

    return Response(response_data)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def what_to_reply(request):
    serializer = WhatToReplyRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    text = serializer.validated_data["text"]

    completion = client.chat.completions.create(
        model="openai/gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "Ты — помощник в режиме «что ответить?». "
                    "Пользователь даёт входящее сообщение/сценарий (часто мошеннический). "
                    "Твоя задача: сгенерировать безопасный ответ-сообщение: вежливо отказаться, "
                    "не раскрывать никакие личные данные, не подтверждать аккаунты/платежи/коды, "
                    "не переходить по ссылкам и не вступать в спор.\n\n"
                    "Верни результат СТРОГО в JSON без markdown и без лишнего текста, по схеме:\n"
                    "{"
                    '"reply_message":"...",'
                    '"dont_do":["...","..."]'
                    "}\n\n"
                    "Жёсткие правила reply_message:\n"
                    "- Язык: русский.\n"
                    "- Длина: 1-3 коротких предложения, <= 300 символов.\n"
                    "- Никаких персональных данных, кодов, ссылок, имён банков/органов как утверждений.\n"
                    "- Если просят «подтвердить/оплатить/ввести код/дать доступ/установить приложение» — вежливо отказаться и завершить диалог.\n"
                    "- Можно предложить безопасную альтернативу: «проверю через официальный сайт/приложение/номер из договора» (без конкретных ссылок/номеров).\n\n"
                    "Правила dont_do:\n"
                    "- 5-10 коротких пунктов, императив, без воды.\n"
                    "- Темы: не сообщать коды/пароли/CVV, не переводить деньги, не устанавливать ПО, не переходить по ссылкам, не давать удалённый доступ, не диктовать данные карты/документов.\n"
                ),
            },
            {"role": "user", "content": text},
        ],
        temperature=0.2,
        max_tokens=300,
    )

    raw = (completion.choices[0].message.content or "").strip()
    try:
        import json

        data = json.loads(raw)
    except Exception:
        data = {}

    reply_message = str(data.get("reply_message", "")).strip()
    dont_do = data.get("dont_do") if isinstance(data.get("dont_do"), list) else []
    dont_do = [str(x).strip()[:200] for x in dont_do if str(x).strip()][:10]

    if not reply_message:
        reply_message = (
            "Спасибо за сообщение. Я не подтверждаю операции и не сообщаю коды или данные. "
            "Проверю информацию только через официальный канал."
        )
    reply_message = reply_message[:300]

    if len(dont_do) < 5:
        dont_do = [
            "Не сообщать коды из SMS/приложений и пароли",
            "Не передавать данные карты (номер, срок, CVV) и документы",
            "Не переводить деньги и не «возвращать» платежи по просьбе",
            "Не переходить по ссылкам из сообщения и не открывать вложения",
            "Не устанавливать приложения и не давать удалённый доступ",
        ]

    response_data = {"reply_message": reply_message, "dont_do": dont_do}

    HistoryEntry.objects.create(
        entry_type='reply',
        device_id=request.META.get('HTTP_X_DEVICE_ID', ''),
        device_type=request.META.get('HTTP_X_DEVICE_TYPE', ''),
        input_text=text,
        result=response_data,
    )

    return Response(response_data)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def human_rewrite(request):
    serializer = HumanRewriteRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    text = serializer.validated_data["text"]

    completion = client.chat.completions.create(
        model="openai/gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "Ты — режим «перепиши как нормальный человек». "
                    "Тебе дают подозрительное сообщение (часто фишинг/скам). "
                    "Твоя задача — переписать его в честный вариант, прямо называя намерение злоумышленника, "
                    "но без персональных данных и без реальных ссылок/номеров.\n\n"
                    "Верни результат СТРОГО в JSON без markdown и без лишнего текста, по схеме:\n"
                    "{"
                    '"honest_version":"...",'
                    '"red_flags":["...","..."]'
                    "}\n\n"
                    "Правила honest_version:\n"
                    "- Язык: русский.\n"
                    "- 1-2 предложения, <= 220 символов.\n"
                    "- Если в исходнике есть ссылка/телефон/контакты — замени на «[ссылка]»/«[номер]».\n"
                    "- Не призывай к действиям (не «нажмите»), только раскрывай истинный смысл.\n"
                    "- Можно использовать грубую правду: «хотим украсть…», «пытаемся получить код…».\n\n"
                    "Правила red_flags:\n"
                    "- 0-6 коротких пунктов (например: срочность, угроза, просьба кода, ссылка, подмена бренда).\n"
                ),
            },
            {"role": "user", "content": text},
        ],
        temperature=0.2,
        max_tokens=200,
    )

    raw = (completion.choices[0].message.content or "").strip()
    try:
        import json

        data = json.loads(raw)
    except Exception:
        data = {}

    honest_version = str(data.get("honest_version", "")).strip()
    red_flags = data.get("red_flags") if isinstance(data.get("red_flags"), list) else []
    red_flags = [str(x).strip()[:200] for x in red_flags if str(x).strip()][:6]

    if not honest_version:
        honest_version = "Похоже, это попытка выманить ваши данные/доступ или деньги через обман и давление."
    honest_version = honest_version[:220]

    response_data = {"honest_version": honest_version, "red_flags": red_flags}

    HistoryEntry.objects.create(
        entry_type='rewrite',
        device_id=request.META.get('HTTP_X_DEVICE_ID', ''),
        device_type=request.META.get('HTTP_X_DEVICE_TYPE', ''),
        input_text=text,
        result=response_data,
    )

    return Response(response_data)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def reverse_phishing(request):
    serializer = ReversePhishingRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    text = serializer.validated_data["text"]

    completion = client.chat.completions.create(
        model="openai/gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "Ты — режим «обратный фишинг». "
                    "Тебе дают подозрительное сообщение. "
                    "Сгенерируй фейковый ответ от пользователя, но БЕЗОПАСНЫЙ: "
                    "без ссылок, без номеров/кодов/персональных данных, без подтверждений, "
                    "с тянущим временем (например: «проверю позже через официальный сайт/приложение»).\n\n"
                    "Далее САМ оцени, не раскрыл ли человек лишнего в этом ответе.\n\n"
                    "Верни результат СТРОГО в JSON без markdown, схема:\n"
                    "{"
                    '"reply_message":"...",'
                    '"self_check_verdict":"safe|leaky|uncertain",'
                    '"self_check_issues":["..."]'
                    "}\n\n"
                    "Правила reply_message:\n"
                    "- русский, 1-2 предложения, <= 260 символов\n"
                    "- без ссылок/номеров/почт/адресов/ФИО/данных карт/кодов\n"
                    "- не выполнять требования, не спорить, не оправдываться\n"
                    "- обязательно «позже/проверю сам через официальный канал»\n\n"
                    "Правила self_check:\n"
                    "- verdict=safe если нет данных/ссылок/подтверждений.\n"
                    "- verdict=leaky если есть хоть намёк на личные данные, подтверждение аккаунта/операции, коды, контакты.\n"
                    "- issues: 0-6 пунктов, только конкретика.\n"
                ),
            },
            {"role": "user", "content": text},
        ],
        temperature=0.2,
        max_tokens=220,
    )

    raw = (completion.choices[0].message.content or "").strip()
    try:
        import json

        data = json.loads(raw)
    except Exception:
        data = {}

    reply_message = str(data.get("reply_message", "")).strip()
    verdict = str(data.get("self_check_verdict", "")).strip()
    issues = data.get("self_check_issues") if isinstance(data.get("self_check_issues"), list) else []
    issues = [str(x).strip()[:200] for x in issues if str(x).strip()][:6]

    if verdict not in {"safe", "leaky", "uncertain"}:
        verdict = "uncertain"

    if not reply_message:
        reply_message = "Сейчас не могу ответить. Проверю информацию позже через официальный сайт/приложение."
        verdict = "safe"
        issues = []
    reply_message = reply_message[:260]

    response_data = {
        "reply_message": reply_message,
        "self_check_verdict": verdict,
        "self_check_issues": issues,
    }

    HistoryEntry.objects.create(
        entry_type='reverse',
        device_id=request.META.get('HTTP_X_DEVICE_ID', ''),
        device_type=request.META.get('HTTP_X_DEVICE_TYPE', ''),
        input_text=text,
        result=response_data,
    )

    return Response(response_data)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def history_list(request):
    device_id = request.META.get('HTTP_X_DEVICE_ID', '')
    entries = HistoryEntry.objects.select_related('audio_task').filter(device_id=device_id)[:100]
    serializer = HistoryEntrySerializer(entries, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def analytics_history(request):
    # Аналитика по всем пользователям, со всех устройств и за всё время.
    entries = HistoryEntry.objects.select_related('audio_task').all()
    serializer = HistoryEntrySerializer(entries, many=True, context={'request': request})
    return Response(serializer.data)


def recorder_view(request):
    return render(request, 'nexa/recorder.html')