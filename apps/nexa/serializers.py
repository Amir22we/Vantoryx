from rest_framework import serializers
from .models import AudioTask


class AudioTaskCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AudioTask
        fields = ['id', 'file']


class AudioTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = AudioTask
        fields = [
            'id',
            'file',
            'status',
            'transcription',
            'summary',
        ]
