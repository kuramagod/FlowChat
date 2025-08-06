from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True, verbose_name="Аватар", default='avatars/default.jpg')
    bio = models.TextField(max_length=70, null=True, blank=True, verbose_name="Описание")
    is_online = models.BooleanField(default=False)
    last_active = models.DateTimeField(null=True, blank=True)