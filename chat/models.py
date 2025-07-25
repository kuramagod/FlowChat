from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()

class ChatModel(models.Model):
    title = models.CharField(max_length=50, null=True, blank=True, verbose_name="Название")
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True, verbose_name="Аватар", default='avatars/chat_default.jpg')
    is_group = models.BooleanField(default=False, verbose_name="Групповой чат")
    members = models.ManyToManyField(User, related_name="chats")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title or f"Chat #{self.id}"

class MessageModel(models.Model):
    chat = models.ForeignKey(ChatModel, on_delete=models.CASCADE, related_name="messages")
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="messages")
    text = models.TextField(max_length=1000, verbose_name="Сообщение")
    created_at = models.DateTimeField(auto_now_add=True)
    edited_at = models.DateTimeField(null=True, blank=True)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.author.username}: {self.text[:20]}"
