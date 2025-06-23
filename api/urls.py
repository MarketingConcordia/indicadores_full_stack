from django.urls import path, include
from rest_framework import routers
from .views import (
    SetorViewSet,
    UsuarioViewSet,
    IndicadorViewSet,
    PreenchimentoViewSet,
    NotificacaoViewSet,
    RelatorioView,
    ConfiguracaoArmazenamentoViewSet
)

router = routers.DefaultRouter()
router.register(r'setores', SetorViewSet)
router.register(r'usuarios', UsuarioViewSet)
router.register(r'indicadores', IndicadorViewSet)
router.register(r'preenchimentos', PreenchimentoViewSet)
router.register(r'notificacoes', NotificacaoViewSet)
router.register(r'configuracao_armazenamento', ConfiguracaoArmazenamentoViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('relatorios/', RelatorioView.as_view(), name='relatorios'),
]
