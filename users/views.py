from django.contrib.auth import authenticate, login, get_user_model
from rest_framework import viewsets, status
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token

from .serializers import UserSerializer

User = get_user_model()

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return get_user_model().objects.filter(id=self.request.user.id)

    @action(detail=False, methods=["get"],  permission_classes=[IsAuthenticated])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def profile(self, request, pk=None):
        user = User.objects.get(id=pk)
        serializer = self.get_serializer(user)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def all(self, request):
        users = User.objects.all()
        data = [{
            'id': user.id,
            'username': user.username,
            'avatar': user.avatar.url
        } for user in users]
        return Response(data)


class UserLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)

            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'id': user.id,
                'username': user.username,
                'token': token.key,
                'detail': 'Login successful'
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'detail': 'Invalid credentials'
            }, status.HTTP_401_UNAUTHORIZED)


class UserLogoutView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request.user.auth_token.delete()
        return Response({'detail': 'Logged out successfully'}, status=status.HTTP_200_OK)