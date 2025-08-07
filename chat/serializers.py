from channels.auth import get_user
from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import ChatModel, MessageModel

User = get_user_model()


class ChatSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField() # Ищет get_display_name и берет от туда имя собеседника, которое выводит в GET запрос.
    display_photo = serializers.SerializerMethodField()
    display_time = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S.%fZ", read_only=True)

    class Meta:
        model = ChatModel
        fields = ["id", "title", "is_group", "members", "display_photo", "created_at", "display_name", "display_time", "last_message"]

    def get_display_name(self, obj):
        if not obj.is_group:
            other_members = obj.members.exclude(id=self.context['request'].user.id)
            return other_members.first().username if other_members.exists() else "Неизвестный пользователь"
        return obj.title

    def get_display_photo(self, obj): # Возвращает автарку чата в зависимости от типа чата.
        if not obj.is_group:
            other_members = obj.members.exclude(id=self.context['request'].user.id)
            return other_members.first().avatar.url if other_members.exists() else "Неизвестный пользователь"
        return obj.avatar.url

    def get_last_message(self, obj):
        return obj.messages.last().text if obj.messages.exists() else ''

    def get_display_time(self, obj):
        if not obj.messages.exists():
            return None
        last_message = obj.messages.last()
        return last_message.edited_at if last_message.edited_at else last_message.created_at


class UserShortSerializer(serializers.ModelSerializer): # Сериализер для подробной информации об авторе.
    class Meta:
        model = User
        fields = ['id', 'username', 'avatar']


class MessageSerializer(serializers.ModelSerializer):
    author = UserShortSerializer(read_only=True)
    created_at = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S.%fZ", read_only=True)

    class Meta:
        model = MessageModel
        fields = ["id", "author", "text", "chat", "is_read", "edited_at", "created_at"]

