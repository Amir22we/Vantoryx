from django.db import models
from apps.calls.models import Call

class Report(models.Model):
    call = models.OneToOneField(Call, on_delete=models.CASCADE, related_name="report")
    labels = models.JSONField()  # scam/spam/fraud
    risk_level = models.IntegerField()  # 0-100
    model_response_time = models.FloatField()  # seconds
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Report for call {self.call.id}"
