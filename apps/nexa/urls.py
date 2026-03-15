from django.urls import path
from .views import AudioTaskCreateView, AudioTaskDetailView, ping
from .views import recorder_view



urlpatterns = [
    path('ping/', ping),
    path('audio-tasks/', AudioTaskCreateView.as_view()),
    path('audio-tasks/<int:pk>/', AudioTaskDetailView.as_view()),
    path('', recorder_view),
]
