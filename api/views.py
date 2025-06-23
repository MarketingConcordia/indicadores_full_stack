from django.db import models
from rest_framework import viewsets, permissions
from .models import Setor, Usuario, Indicador, Preenchimento, Notificacao
from .models import Preenchimento, PermissaoIndicador, ConfiguracaoArmazenamento
from .serializers import (
    SetorSerializer,
    UsuarioSerializer,
    IndicadorSerializer,
    PreenchimentoSerializer,
    NotificacaoSerializer,
    ConfiguracaoArmazenamentoSerializer
)
from .storage_service import upload_arquivo
from .models import ConfiguracaoArmazenamento
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import F, Q, Count
from .models import Preenchimento, PermissaoIndicador, Indicador


# 🔹 Permitir que qualquer um autenticado use (GET, POST, PUT, DELETE)
class SetorViewSet(viewsets.ModelViewSet):
    queryset = Setor.objects.all()
    serializer_class = SetorSerializer
    permission_classes = [permissions.IsAuthenticated]


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = get_user_model().objects.all()
    serializer_class = UsuarioSerializer
    permission_classes = [permissions.IsAuthenticated]


class IndicadorViewSet(viewsets.ModelViewSet):
    queryset = Indicador.objects.all()
    serializer_class = IndicadorSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()

        setor = self.request.query_params.get('setor')
        status = self.request.query_params.get('status')
        periodo = self.request.query_params.get('periodo')

        if setor:
            queryset = queryset.filter(setor__iexact=setor)

        if status:
            queryset = queryset.filter(status__iexact=status)

        # Filtros de período (exemplo simples)
        # 🔥 Aqui, você pode implementar lógica para pegar "mês atual", "trimestre atual", etc.

        return queryset

class PreenchimentoViewSet(viewsets.ModelViewSet):
    serializer_class = PreenchimentoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Preenchimento.objects.all()
        user = self.request.user

        if user.perfil == 'gestor':
            queryset = queryset.filter(indicador__setor__in=user.setores.all())

        setor = self.request.query_params.get('setor')
        mes = self.request.query_params.get('mes')
        status = self.request.query_params.get('status')

        if setor:
            queryset = queryset.filter(indicador__setor__iexact=setor)

        if mes:
            queryset = queryset.filter(mes=mes)

        if status == 'atingido':
            queryset = queryset.filter(valor__gte=models.F('indicador__meta'))
        elif status == 'nao-atingido':
            queryset = queryset.filter(valor__lt=models.F('indicador__meta'))

        return queryset



class NotificacaoViewSet(viewsets.ModelViewSet):
    queryset = Notificacao.objects.all()
    serializer_class = NotificacaoSerializer
    permission_classes = [permissions.IsAuthenticated]


class RelatorioView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        setor = request.query_params.get('setor')  # ID do setor
        mes = request.query_params.get('mes')      # Formato: MM/YYYY
        indicador = request.query_params.get('indicador')  # ID do indicador

        preenchimentos = Preenchimento.objects.all()

        # 🔥 Aplicar filtro de acordo com permissões
        if user.perfil == 'gestor':
            setores_ids = user.setores.all().values_list('id', flat=True)
            indicadores_ids_setor = Indicador.objects.filter(setor_id__in=setores_ids).values_list('id', flat=True)
            indicadores_ids_manual = PermissaoIndicador.objects.filter(usuario=user).values_list('indicador_id', flat=True)

            indicadores_ids = list(indicadores_ids_setor) + list(indicadores_ids_manual)

            preenchimentos = preenchimentos.filter(indicador_id__in=indicadores_ids)

        # 🔥 Aplicar filtros opcionais
        if setor:
            preenchimentos = preenchimentos.filter(indicador__setor__id=setor)
        if mes:
            preenchimentos = preenchimentos.filter(mes=mes)
        if indicador:
            preenchimentos = preenchimentos.filter(indicador__id=indicador)

        total = preenchimentos.count()

        atingidos = preenchimentos.filter(valor__gte=F('indicador__meta')).count()
        nao_atingidos = total - atingidos

        dados_por_indicador = preenchimentos.values(
            'indicador__nome'
        ).annotate(
            total=Count('id'),
            atingidos=Count('id', filter=Q(valor__gte=F('indicador__meta'))),
            nao_atingidos=Count('id', filter=Q(valor__lt=F('indicador__meta')))
        )

        return Response({
            "total_registros": total,
            "atingidos": atingidos,
            "nao_atingidos": nao_atingidos,
            "detalhes_por_indicador": dados_por_indicador
        })

class ConfiguracaoArmazenamentoViewSet(viewsets.ModelViewSet):
    queryset = ConfiguracaoArmazenamento.objects.all()
    serializer_class = ConfiguracaoArmazenamentoSerializer
    permission_classes = [permissions.IsAuthenticated]