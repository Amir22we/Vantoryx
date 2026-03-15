import base64

from openai import OpenAI
from django.conf import settings

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",  # если ты через OpenRouter
    api_key=settings.OPENROUTER_API_KEY,
)

from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework import generics
from rest_framework.parsers import MultiPartParser, FormParser

from .models import AudioTask
from .serializers import AudioTaskCreateSerializer, AudioTaskSerializer


from django.conf import settings
from rest_framework import generics
from rest_framework.parsers import MultiPartParser, FormParser

from .models import AudioTask
from .serializers import AudioTaskCreateSerializer, AudioTaskSerializer

from .transcribe import transcribe_with_whisper_local

class AudioTaskCreateView(generics.CreateAPIView):
    queryset = AudioTask.objects.all()
    serializer_class = AudioTaskCreateSerializer
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        obj = serializer.save()
        file_path = obj.file.path

        ext = obj.file.name.rsplit(".", 1)[-1].lower()
        print("AUDIO FORMAT:", ext)

        try:
            
            transcript = transcribe_with_whisper_local(
                file_path=file_path,
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
                    "content": (
                        f"{transcript}"
                    ),
                },
            ],
            temperature=0.0,
            max_tokens=50,
        )

            verified = (completion.choices[0].message.content or "").strip()

            print("\n===== TRANSCRIPTION =====")
            print(transcript)
            print("===== END =====\n")
            print("\n===== VERIFICATION =====")
            print(verified)
            print("===== END =====\n")

            obj.transcription = transcript
            obj.summary = verified
            obj.status = "done"
        except Exception as e:
            obj.transcription = ""
            obj.summary = ""
            obj.status = "error"
            obj.save(update_fields=["transcription", "summary", "status"])
            print("TRANSCRIBE ERROR:", repr(e))

        obj.save(update_fields=["transcription", "status", "summary"])

class AudioTaskDetailView(generics.RetrieveAPIView):
    queryset = AudioTask.objects.all()
    serializer_class = AudioTaskSerializer

@api_view(["GET"])
def ping(request):
    return Response({"message": "Nexa API is working!"})

from django.shortcuts import render

def recorder_view(request):
    return render(request, 'nexa/recorder.html')