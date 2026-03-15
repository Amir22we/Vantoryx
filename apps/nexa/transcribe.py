from __future__ import annotations

import os
import threading
import whisper

_MODEL_LOCK = threading.Lock()
_MODEL = None

def _get_model(model_name: str = "small"):
    global _MODEL
    if _MODEL is None:
        with _MODEL_LOCK:
            if _MODEL is None:
                _MODEL = whisper.load_model(model_name)
    return _MODEL

def transcribe_with_whisper_local(file_path: str, language: str = "ru", model_name: str = "small") -> str:
    if not os.path.exists(file_path):
        raise FileNotFoundError(file_path)

    model = _get_model(model_name)

    result = model.transcribe(
        file_path,
        language=language,
        fp16=False,
        verbose=False,
        no_speech_threshold=0.9,
        logprob_threshold=-1.0,           
        condition_on_previous_text=False,
    )

    text = (result.get("text") or "").strip()
    return text
