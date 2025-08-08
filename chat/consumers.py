import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import ChatModel, MessageModel

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
        self.room_group_name = f"chat_{self.room_id}"

        # Join room group
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json["text"]
        user = self.scope['user']
        chat = await self.get_chat()
        saved_message = await self.save_message(chat, user, message)

        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name, {
                "type": "chat.message",
                "text": saved_message.text,
                "author_id": saved_message.author.id,
                "author_avatar": saved_message.author.avatar.url,
                "time": saved_message.created_at.isoformat(),
            }
        )

    # Receive message from room group
    async def chat_message(self, event):

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            "text": event["text"],
            "author_id": event["author_id"],
            "author_avatar": event["author_avatar"],
            "time": event["time"],
        }))

    @database_sync_to_async
    def get_chat(self):
        return ChatModel.objects.get(id=self.room_id)

    @database_sync_to_async
    def save_message(self, chat, author, text):
        return MessageModel.objects.create(chat=chat, author=author, text=text)


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        if self.user.is_anonymous:
            await self.close()
        else:
            self.group_name = f"user_{self.user.id}"
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.mark_user_online()
            await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        await self.mark_user_offline()

    async def new_chat(self, event):
        await self.send(text_data=json.dumps({
            "type": "new_chat",
            "chat_id": event["chat_id"]
        }))

    @database_sync_to_async
    def mark_user_online(self):
        self.user.last_active = timezone.now()
        self.user.is_online = True
        User.objects.filter(id=self.user.id).update(
            last_active=timezone.now(),
            is_online=True
        )

    @database_sync_to_async
    def mark_user_offline(self):
        self.user.is_online = False
        User.objects.filter(id=self.user.id).update(is_online=False)