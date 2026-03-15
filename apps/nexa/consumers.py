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
        self.audio_chunks = []       # все чанки с начала записи
        self.full_transcript = ""
        self.pending_size = 0        # размер ещё не обработанных данных
        print("WS connected")

    async def disconnect(self, close_code):
        print(f"WS disconnected: {close_code}")

    async def receive(self, text_data=None, bytes_data=None):
        if bytes_data:
            self.audio_chunks.append(bytes_data)
            self.pending_size += len(bytes_data)

            # Каждые ~50KB необработанных данных — транскрибируем
            if self.pending_size >= 50_000:
                await self.flush_and_transcribe()

        # Получаем управляющие команды
        elif text_data:
            data = json.loads(text_data)

            if data.get("type") == "stop":
                # Финальный чанк
                if self.pending_size > 0:
                    await self.flush_and_transcribe()

                # Отправляем весь текст на классификацию
                await self.classify()

    async def flush_and_transcribe(self):
        """Записываем ВСЕ чанки в файл (валидный WebM), транскрибируем целиком."""
        # Собираем все чанки с начала записи — это всегда валидный WebM
        all_data = b"".join(self.audio_chunks)
        self.pending_size = 0
        
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
            f.write(all_data)
            tmp_path = f.name
        try:
            loop = asyncio.get_running_loop()
            text = await loop.run_in_executor(
                None,
                transcribe_with_whisper_local,
                tmp_path, "ru", "turbo"
            )

            if text:
                self.full_transcript = text
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
            loop = asyncio.get_running_loop()
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