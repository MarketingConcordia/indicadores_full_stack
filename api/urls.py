from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import routers
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    SetorViewSet,
    UsuarioViewSet,
    IndicadorViewSet,
    PreenchimentoViewSet,
    ConfiguracaoArmazenamentoViewSet,
    LogDeAcaoViewSet,
    ConfiguracaoViewSet,

    # Views customizadas
    get_me,
    meu_usuario,
    meus_preenchimentos,
    indicadores_pendentes,
    gerar_relatorio_pdf,
    gerar_relatorio_excel,
    RelatorioView,
    IndicadorListCreateView,
    MetaCreateView,
    PreenchimentoListCreateView,
    MyTokenObtainPairView,
)

# 🔹 ROTAS PADRÃO (ViewSets com router)
router = routers.DefaultRouter()
router.register(r'setores', SetorViewSet)
router.register(r'usuarios', UsuarioViewSet)
router.register(r'indicadores', IndicadorViewSet, basename='indicadores')
router.register(r'preenchimentos', PreenchimentoViewSet, basename='preenchimentos')
router.register(r'configuracao_armazenamento', ConfiguracaoArmazenamentoViewSet)
router.register(r'logs', LogDeAcaoViewSet, basename='logs')
router.register(r'configuracoes', ConfiguracaoViewSet)

# 🔹 ROTAS CUSTOMIZADAS
urlpatterns = [
    path('me/', get_me),
    path('meu-usuario/', meu_usuario, name="meu-usuario"),
    path('preenchimentos/meus/', meus_preenchimentos, name='meus-preenchimentos'),
    path('indicadores/pendentes/', indicadores_pendentes, name='indicadores-pendentes'),

    path('relatorios/', RelatorioView.as_view(), name='relatorios'),
    path('relatorio/pdf/', gerar_relatorio_pdf, name='relatorio_pdf'),
    path('relatorio/excel/', gerar_relatorio_excel, name='relatorio_excel'),

    path('indicadores/', IndicadorListCreateView.as_view(), name='indicadores'),
    path('metas/', MetaCreateView.as_view(), name='criar-meta'),
    path('preenchimentos/', PreenchimentoListCreateView.as_view(), name='preenchimentos'),

    # 🔐 Autenticação
    path('token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Inclui o router (viewsets) no final
    path('', include(router.urls)),
]

# 🔹 Arquivos de mídia (upload)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
