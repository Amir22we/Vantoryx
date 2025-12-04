from django.db import models
from apps.users.models import UserProfile


class Call(models.Model):
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name="calls")
    caller_number = models.CharField(max_length=20)
    called_number = models.CharField(max_length=20)
    timestamp = models.DateTimeField(auto_now_add=True)
    transcript = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=50, default="pending") 
    result = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"Call from {self.caller_number} at {self.timestamp}"
