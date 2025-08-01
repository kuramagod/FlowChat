from datetime import datetime

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from django.views.generic import ListView
from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from .models import ChatModel, MessageModel
from .serializers import ChatSerializer, MessageSerializer

User = get_user_model()

class HomePage(ListView):
    model = ChatModel
    template_name = "chat/index.html"
    context_object_name = "chats"

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            return ChatModel.objects.filter(members=user)
        return None


class ChatViewSet(viewsets.ModelViewSet):
    queryset = ChatModel.objects.all()
    serializer_class = ChatSerializer
    permission_classes = [IsAuthenticated, ]

    def get_queryset(self):
        return ChatModel.objects.filter(members=self.request.user) # Методы list и retrieve будут доступны только участникам чата.

    @action(detail=False, methods=['post'])
    def get_or_create(self, request):
        current_user = request.user
        companion_id = request.data.get("user_id")

        if not companion_id:
            return Response({"detail": "user_id обязателен."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            companion = User.objects.get(id=companion_id)
        except User.DoesNotExist:
            return Response({'detail': 'Пользователь не найден.'}, status=status.HTTP_404_NOT_FOUND)

        chat = ChatModel.objects.filter(is_group=False, members__in=[current_user]).filter(members__in=[companion]).distinct().first()

        if not chat:
            chat = ChatModel.objects.create(is_group=False)
            chat.title = f"Чат {current_user.username}|{companion.username}"
            chat.members.add(current_user, companion)

        channel_layer = get_channel_layer()

        async_to_sync(channel_layer.group_send)(
            f"user_{companion.id}",
            {
                "type": "new_chat",
                "chat_id": chat.id
            }
        )

        serializer = self.get_serializer(chat, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get']) # Маршрут GET /api/chats/pk/get_messages/, выводит все сообщения pk чата.
    def get_messages(self, request, pk=None):
        user = request.user
        messages = MessageModel.objects.filter(chat=pk, chat__members=user) # QuerySet сообщений чата pk, доступен только пользователям которые является участниками чата.

        if not messages.exists():
            return Response()

        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)


class MessageViewSet(mixins.CreateModelMixin,
                   mixins.UpdateModelMixin,
                   mixins.DestroyModelMixin,
                   mixins.RetrieveModelMixin,
                   GenericViewSet):
    queryset = MessageModel.objects.all()
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated, ]

    def perform_create(self, serializer):
        chat = serializer.validated_data.get('chat')
        if self.request.user not in chat.members.all(): # Проверка является ли пользователь участником чата.
            raise PermissionDenied("Вы не являетесь участником чата и не можете отправлять сообщения")
        serializer.save(author=self.request.user)

    def perform_update(self, serializer):
        if self.request.user != serializer.instance.author:
            raise PermissionDenied("Вы не являетесь автором и не можете редактировать этот объект")
        serializer.instance.edited_at = datetime.now()
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user != instance.author:
            raise PermissionDenied("Вы не являетесь автором и не можете удалять этот объект")
        instance.delete()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        if request.user not in instance.chat.members.all():
            raise PermissionDenied("Вы не являетесь автором или участником чата, и не можете просматривать этот объект")
        return Response(serializer.data)