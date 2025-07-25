from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include, re_path
from rest_framework import routers

from chat.views import ChatViewSet, MessageViewSet
from users.views import UserViewSet, UserLoginView

router = routers.DefaultRouter()
router.register(r"users", UserViewSet)
router.register(r"chats", ChatViewSet)
router.register(r"messages", MessageViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include("chat.urls")),
    path('api/', include(router.urls)),
    path('api/login/', UserLoginView.as_view()),
    path('api-auth/', include('rest_framework.urls')),
]  + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
