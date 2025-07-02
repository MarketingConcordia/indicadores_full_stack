from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.views.static import serve
from django.urls import re_path
import os
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

BASE_DIR = settings.BASE_DIR

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('api/auth/', include('rest_framework.urls')),  # Login simples opcional
    path('login/', TemplateView.as_view(template_name="login.html")),

    # 🔑 Endpoints JWT
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Serve arquivos HTML diretamente da pasta front-app
urlpatterns += [
    re_path(r'^front-app/(?P<path>.*)$', serve, {
        'document_root': os.path.join(BASE_DIR, 'front-app'),
        'show_indexes': True
    }),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
