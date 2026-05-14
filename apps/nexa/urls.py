from django.urls import path
from .views import create_audio_task, AudioTaskDetailView, ping, text_scam, link_analysis, what_to_reply, human_rewrite, reverse_phishing, history_list, analytics_history
from .views import recorder_view


urlpatterns = [
    path('ping/', ping),
    path('text/', text_scam),
    path('link/', link_analysis),
    path('reply/', what_to_reply),
    path('rewrite/', human_rewrite),
    path('reverse/', reverse_phishing),
    path('audio-tasks/', create_audio_task),
    path('audio-tasks/<int:pk>/', AudioTaskDetailView.as_view()),
    path('history/', history_list),
    path('history/all/', analytics_history),
    path('', recorder_view),
]
