from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.views.static import serve
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
import os

# === URLS PRINCIPAIS ===
urlpatterns = [
    path('admin/', admin.site.urls),

    # 🔹 API e Autenticação
    path('api/', include('api.urls')),
    path('api/auth/', include('rest_framework.urls')),

    # 🔐 JWT
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # 🔸 Rota direta para login.html
    path('login/', TemplateView.as_view(template_name="login.html")),
]

# === SERVE MÍDIA EM DEV ===
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# === SERVE FRONT-END (arquivos HTML) da pasta front-app ===
urlpatterns += [
    re_path(r'^front-app/(?P<path>.*)$', serve, {
        'document_root': os.path.join(settings.BASE_DIR, 'front-app'),
        'show_indexes': True
    }),
]
