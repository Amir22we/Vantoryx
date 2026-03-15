from django.db import models


class AudioTask(models.Model):
    file = models.FileField(upload_to='audio/')
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
