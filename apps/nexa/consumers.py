import json
import asyncio
import tempfile
import os
from channels.generic.websocket import AsyncWebsocketConsumer
from openai import OpenAI
from django.conf import settings

from .transcribe import transcribe_with_whisper_local


class TranscribeConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        self.audio_chunks = []
        self.full_transcript = ""
        print("WS connected")

    async def disconnect(self, close_code):
        print(f"WS disconnected: {close_code}")

    async def receive(self, text_data=None, bytes_data=None):
        if bytes_data:
            self.audio_chunks.append(bytes_data)
            total_size = sum(len(c) for c in self.audio_chunks)

            # Каждые ~200KB (~5-7 секунд) — транскрибируем
            if total_size >= 50_000:
                await self.flush_and_transcribe()

        # Получаем управляющие команды
        elif text_data:
            data = json.loads(text_data)

            if data.get("type") == "stop":
                # Финальный чанк
                if self.audio_chunks:
                    await self.flush_and_transcribe()

                # Отправляем весь текст на классификацию
                await self.classify()

    async def flush_and_transcribe(self):
        """Сохраняем буфер в файл, транскрибируем, возвращаем текст."""
        chunk_data = b"".join(self.audio_chunks)
        self.audio_chunks = []
        tmp_dir = '/var/www/Vantoryx/tmp'
        os.makedirs(tmp_dir, exist_ok=True)
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False, dir=tmp_dir) as f:  # ← добавить dir=tmp_dir
            f.write(chunk_data)
            tmp_path = f.name
        try:
            loop = asyncio.get_event_loop()
            text = await loop.run_in_executor(
                None,
                transcribe_with_whisper_local,
                tmp_path, "ru", "turbo"
            )

            if text:
                self.full_transcript += " " + text
                await self.send(json.dumps({
                    "type": "partial",
                    "text": text.strip(),
                    "full": self.full_transcript.strip(),
                }))
        except Exception as e:
            print("Transcribe error:", repr(e))
        finally:
            os.unlink(tmp_path)

    async def classify(self):
        """Отправляем итоговый текст в GPT для классификации."""
        transcript = self.full_transcript.strip()
        if not transcript:
            await self.send(json.dumps({
                "type": "result",
                "verdict": "Нет речи",
                "transcript": "",
            }))
            return

        await self.send(json.dumps({"type": "classifying"}))

        try:
            client = OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=settings.OPENROUTER_API_KEY,
            )
            loop = asyncio.get_event_loop()
            completion = await loop.run_in_executor(
                None,
                lambda: client.chat.completions.create(
                    model="openai/gpt-4o-mini",
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "Ты — система классификации телефонных разговоров. "
                                "Определи, является ли звонок мошенническим. "
                                "Отвечай ТОЛЬКО одной фразой: "
                                "'Звонят мошенники!' или 'Звонок безопасный'"
                            ),
                        },
                        {"role": "user", "content": transcript},
                    ],
                    temperature=0.0,
                    max_tokens=50,
                ),
            )
            verdict = (completion.choices[0].message.content or "").strip()
        except Exception as e:
            verdict = f"Ошибка классификации: {repr(e)}"

        await self.send(json.dumps({
            "type": "result",
            "verdict": verdict,
            "transcript": transcript,
        }))