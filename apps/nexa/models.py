from django.db import models


class AudioTask(models.Model):
    transcription = models.TextField(blank=True, null=True)
    summary = models.TextField(blank=True, null=True)

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('done', 'Done'),
        ('failed', 'Failed'),
    ]

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
    )

    created_at = models.DateTimeField(auto_now_add=True)


class HistoryEntry(models.Model):
    ENTRY_TYPES = [
        ('text', 'Text Scam'),
        ('link', 'Link Analysis'),
        ('reply', 'What to Reply'),
        ('rewrite', 'Human Rewrite'),
        ('reverse', 'Reverse Phishing'),
        ('audio', 'Audio'),
    ]

    entry_type = models.CharField(max_length=20, choices=ENTRY_TYPES)
    device_id = models.CharField(max_length=64, blank=True, default='')
    device_type = models.CharField(max_length=32, blank=True, default='')
    input_text = models.TextField(blank=True, null=True)
    audio_task = models.ForeignKey(
        AudioTask, null=True, blank=True, on_delete=models.SET_NULL, related_name='history_entries'
    )
    result = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
