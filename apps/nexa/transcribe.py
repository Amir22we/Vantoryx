from __future__ import annotations
import threading
from faster_whisper import WhisperModel

_MODEL_LOCK = threading.Lock()
_MODEL = None

def _get_model(model_name: str = "turbo"):
    global _MODEL
    if _MODEL is None:
        with _MODEL_LOCK:
            if _MODEL is None:
                _MODEL = WhisperModel(
                    model_name,
                    device="cpu",
                    compute_type="int8",  
                    cpu_threads=8,       
                    num_workers=2,        
                )
    return _MODEL

def transcribe_with_whisper_local(file_path: str, language: str = "ru", model_name: str = "turbo") -> str:
    model = _get_model(model_name)
    segments, info = model.transcribe(
        file_path,
        language=language,
        vad_filter=True,              
        vad_parameters=dict(
            min_silence_duration_ms=300,
        ),
        beam_size=1,                
        best_of=1,                    
        temperature=0.0,              
    )
    text = " ".join(segment.text for segment in segments)
    return text.strip()