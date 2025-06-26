from django.urls import path, include
from rest_framework import routers
from .views import (
    SetorViewSet,
    UsuarioViewSet,
    IndicadorViewSet,
    IndicadorListCreateView,
    MetaCreateView,
    PreenchimentoListCreateView,
    PreenchimentoViewSet,
    NotificacaoViewSet,
    RelatorioView,
    ConfiguracaoArmazenamentoViewSet,
    ConfiguracaoNotificacaoViewSet,
    LogDeAcaoViewSet,
    gerar_relatorio_pdf,
    gerar_relatorio_excel,
    get_me,
    indicadores_pendentes
)
from .views import meus_preenchimentos
from .views import MyTokenObtainPairView
from rest_framework_simplejwt.views import TokenRefreshView
from django.conf import settings
from django.conf.urls.static import static


router = routers.DefaultRouter()
router.register(r'setores', SetorViewSet)
router.register(r'usuarios', UsuarioViewSet)
router.register(r'indicadores', IndicadorViewSet)
router.register(r'preenchimentos', PreenchimentoViewSet, basename='preenchimentos')
router.register(r'notificacoes', NotificacaoViewSet)
router.register(r'configuracao_armazenamento', ConfiguracaoArmazenamentoViewSet)
router.register(r'configuracao_notificacao', ConfiguracaoNotificacaoViewSet)
router.register(r'logs', LogDeAcaoViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('relatorios/', RelatorioView.as_view(), name='relatorios'),
    path('relatorio/pdf/', gerar_relatorio_pdf, name='relatorio_pdf'),
    path('relatorio/excel/', gerar_relatorio_excel, name='relatorio_excel'),
    path('indicadores/', IndicadorListCreateView.as_view(), name='indicadores'),
    path('metas/', MetaCreateView.as_view(), name='criar-meta'),
    path('preenchimentos/', PreenchimentoListCreateView.as_view(), name='preenchimentos'),
    path('me/', get_me),
    path('preenchimentos/meus/', meus_preenchimentos, name='meus-preenchimentos'),
    path('indicadores/pendentes/', indicadores_pendentes, name='indicadores-pendentes'),
    path('token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
