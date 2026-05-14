from rest_framework import serializers
from .models import AudioTask, HistoryEntry


class AudioTaskCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AudioTask
        fields = ['id']


class AudioTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = AudioTask
        fields = [
            'id',
            'status',
            'transcription',
            'summary',
        ]


class TextScamAnalysisRequestSerializer(serializers.Serializer):
    text = serializers.CharField(allow_blank=False, trim_whitespace=True, max_length=20000)


class TextScamAnalysisResponseSerializer(serializers.Serializer):
    verdict = serializers.ChoiceField(choices=["scam", "safe", "uncertain"])
    risk_score = serializers.IntegerField(min_value=0, max_value=100)
    reasons = serializers.ListField(child=serializers.CharField(), allow_empty=True)
    short_explanation = serializers.CharField(allow_blank=True)


class LinkAnalysisRequestSerializer(serializers.Serializer):
    text = serializers.CharField(allow_blank=False, trim_whitespace=True, max_length=20000)


class LinkAnalysisItemSerializer(serializers.Serializer):
    url = serializers.CharField()
    final_url = serializers.CharField(allow_blank=True)
    domain = serializers.CharField(allow_blank=True)
    verdict = serializers.ChoiceField(choices=["danger", "neutral", "unknown"])
    risk_score = serializers.IntegerField(min_value=0, max_value=100)
    reasons = serializers.ListField(child=serializers.CharField(), allow_empty=True)
    redirects = serializers.ListField(child=serializers.CharField(), allow_empty=True)


class LinkAnalysisResponseSerializer(serializers.Serializer):
    verdict = serializers.ChoiceField(choices=["danger", "neutral", "unknown"])
    risk_score = serializers.IntegerField(min_value=0, max_value=100)
    extracted_urls = serializers.ListField(child=serializers.CharField(), allow_empty=True)
    items = LinkAnalysisItemSerializer(many=True)


class WhatToReplyRequestSerializer(serializers.Serializer):
    text = serializers.CharField(allow_blank=False, trim_whitespace=True, max_length=20000)


class WhatToReplyResponseSerializer(serializers.Serializer):
    reply_message = serializers.CharField(allow_blank=False)
    dont_do = serializers.ListField(child=serializers.CharField(), allow_empty=False)


class HumanRewriteRequestSerializer(serializers.Serializer):
    text = serializers.CharField(allow_blank=False, trim_whitespace=True, max_length=20000)


class HumanRewriteResponseSerializer(serializers.Serializer):
    honest_version = serializers.CharField(allow_blank=False)
    red_flags = serializers.ListField(child=serializers.CharField(), allow_empty=True)


class ReversePhishingRequestSerializer(serializers.Serializer):
    text = serializers.CharField(allow_blank=False, trim_whitespace=True, max_length=20000)


class ReversePhishingResponseSerializer(serializers.Serializer):
    reply_message = serializers.CharField(allow_blank=False)
    self_check_verdict = serializers.ChoiceField(choices=["safe", "leaky", "uncertain"])
    self_check_issues = serializers.ListField(child=serializers.CharField(), allow_empty=True)


class HistoryEntrySerializer(serializers.ModelSerializer):
    audio_file = serializers.SerializerMethodField()

    class Meta:
        model = HistoryEntry
        fields = ['id', 'entry_type', 'input_text', 'audio_file', 'result', 'created_at', 'device_id']

    def get_audio_file(self, obj):
        return None
