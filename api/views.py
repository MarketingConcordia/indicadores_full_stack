# Imports padrão do views.py
from datetime import datetime
from django.utils.dateparse import parse_date
from django.db.models import Q
from django.db import models
from rest_framework import viewsets, permissions, generics
from .models import (
    Setor, Usuario, Indicador, Preenchimento, LogDeAcao,
    PermissaoIndicador, ConfiguracaoArmazenamento, Meta, Configuracao
)
from .serializers import (
    SetorSerializer, UsuarioSerializer, IndicadorSerializer, PreenchimentoSerializer, MetaSerializer,
      ConfiguracaoArmazenamentoSerializer,
    LogDeAcaoSerializer, ConfiguracaoSerializer
)
from .storage_service import upload_arquivo
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from django.db.models import F, Q, Count
from reportlab.pdfgen import canvas
from django.http import HttpResponse
from openpyxl import Workbook
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from .permissions import IsMasterUser
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from datetime import datetime
from django.utils.timezone import now
from rest_framework import status

# 🔹 SETOR
class SetorViewSet(viewsets.ModelViewSet):
    queryset = Setor.objects.all().order_by("id")
    serializer_class = SetorSerializer
    permission_classes = [permissions.IsAuthenticated]


# 🔹 USUARIO
class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [AllowAny()]  # ✅ Libera requisição POST para cadastro
        return [IsAuthenticated()]


# 🔹 INDICADOR
class IndicadorViewSet(viewsets.ModelViewSet):
    queryset = Indicador.objects.all().select_related('setor')
    serializer_class = IndicadorSerializer
    permission_classes = [IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        indicador = self.get_object()
        indicador.delete()
        return Response({"detail": "Indicador excluído com sucesso."}, status=status.HTTP_204_NO_CONTENT)

    def update(self, request, *args, **kwargs):
        parcial = kwargs.pop('partial', False)
        indicador = self.get_object()
        serializer = self.get_serializer(indicador, data=request.data, partial=parcial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# 🔹 CONFIGURAÇÃO PREENCHIMENTO
class ConfiguracaoViewSet(viewsets.ModelViewSet):
    queryset = Configuracao.objects.all()
    serializer_class = ConfiguracaoSerializer
    permission_classes = [IsAuthenticated]


# 🔹 PREENCHIMENTO
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

    def perform_create(self, serializer):
        usuario = self.request.user

        if usuario.perfil == 'gestor':
            try:
                config = ConfiguracaoArmazenamento.objects.get(ativo=True)
                limite = config.dia_limite_preenchimento
                hoje = datetime.today().day

                if hoje > limite:
                    raise serializers.ValidationError(
                        f"Preenchimento bloqueado. O prazo terminou no dia {limite}."
                    )
            except ConfiguracaoArmazenamento.DoesNotExist:
                raise serializers.ValidationError("Configuração de preenchimento não encontrada.")

        arquivo = self.request.FILES.get('arquivo')
        origem = self.request.data.get('origem')

        # Configuração de armazenamento (reutilizada)
        try:
            config = ConfiguracaoArmazenamento.objects.get(ativo=True)
        except ConfiguracaoArmazenamento.DoesNotExist:
            raise serializers.ValidationError("Nenhuma configuração de armazenamento ativa encontrada.")

        url_arquivo = None
        if arquivo:
            url_arquivo = upload_arquivo(arquivo, arquivo.name, config)

        preenchimento = serializer.save(preenchido_por=usuario)

        if url_arquivo:
            preenchimento.arquivo = url_arquivo
        if origem:
            preenchimento.origem = origem

        preenchimento.save()

    def perform_destroy(self, instance):
        LogDeAcao.objects.create(
            usuario=self.request.user,
            acao=f"Excluiu preenchimento do indicador '{instance.indicador.nome}' do mês {instance.mes}."
        )
        instance.delete()


# 🔹 CONFIGURAÇÃO DE ARMAZENAMENTO
class ConfiguracaoArmazenamentoViewSet(viewsets.ModelViewSet):
    queryset = ConfiguracaoArmazenamento.objects.all()
    serializer_class = ConfiguracaoArmazenamentoSerializer
    permission_classes = [permissions.IsAuthenticated]


class LogDeAcaoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LogDeAcao.objects.none()
    serializer_class = LogDeAcaoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        # Usuário normal só vê os próprios logs
        if user.perfil == 'gestor':
            queryset = LogDeAcao.objects.filter(usuario=user)
        else:
            queryset = LogDeAcao.objects.all()

        # 🔍 Filtros opcionais
        usuario = self.request.query_params.get('usuario')
        setor = self.request.query_params.get('setor')
        data_inicio = self.request.query_params.get('data_inicio')
        data_fim = self.request.query_params.get('data_fim')

        if usuario:
            queryset = queryset.filter(usuario__id=usuario)

        if setor:
            queryset = queryset.filter(usuario__setores__id=setor)

        if data_inicio:
            try:
                inicio = parse_date(data_inicio)
                if inicio:
                    queryset = queryset.filter(data__date__gte=inicio)
            except:
                pass

        if data_fim:
            try:
                fim = parse_date(data_fim)
                if fim:
                    queryset = queryset.filter(data__date__lte=fim)
            except:
                pass

        return queryset.order_by('-data')


# 🔹 RELATÓRIO
class RelatorioView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        setor = request.query_params.get('setor')
        mes = request.query_params.get('mes')
        indicador = request.query_params.get('indicador')

        preenchimentos = Preenchimento.objects.all()

        if user.perfil == 'gestor':
            setores_ids = user.setores.all().values_list('id', flat=True)
            indicadores_ids_setor = Indicador.objects.filter(setor_id__in=setores_ids).values_list('id', flat=True)
            indicadores_ids_manual = PermissaoIndicador.objects.filter(usuario=user).values_list('indicador_id', flat=True)
            indicadores_ids = list(indicadores_ids_setor) + list(indicadores_ids_manual)
            preenchimentos = preenchimentos.filter(indicador_id__in=indicadores_ids)

        if setor:
            preenchimentos = preenchimentos.filter(indicador__setor__id=setor)
        if mes:
            preenchimentos = preenchimentos.filter(mes=mes)
        if indicador:
            preenchimentos = preenchimentos.filter(indicador__id=indicador)

        total = preenchimentos.count()
        atingidos = preenchimentos.filter(valor__gte=F('indicador__meta')).count()
        nao_atingidos = total - atingidos

        dados_por_indicador = preenchimentos.values('indicador__nome').annotate(
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


# 🔹 PDF
def gerar_relatorio_pdf(request):
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = 'attachment; filename="relatorio.pdf"'

    p = canvas.Canvas(response)
    p.setFont("Helvetica", 14)
    p.drawString(100, 800, "Relatório de Indicadores")

    y = 760
    preenchimentos = Preenchimento.objects.all()

    for pch in preenchimentos:
        texto = f"{pch.indicador.nome} - {pch.mes} - Valor: {pch.valor} - Meta: {pch.indicador.meta}"
        p.drawString(100, y, texto)
        y -= 20
        if y < 50:
            p.showPage()
            y = 800

    p.showPage()
    p.save()
    return response


# 🔹 EXCEL
def gerar_relatorio_excel(request):
    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = 'attachment; filename=relatorio.xlsx'

    wb = Workbook()
    ws = wb.active
    ws.title = "Relatório"

    ws.append(["Indicador", "Mês", "Valor", "Meta", "Comentário"])

    preenchimentos = Preenchimento.objects.all()

    for pch in preenchimentos:
        ws.append([
            pch.indicador.nome,
            pch.mes,
            pch.valor,
            pch.indicador.meta,
            pch.comentario or ""
        ])

    wb.save(response)
    return response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_me(request):
    user = request.user
    return Response({
        'id': user.id,
        'email': user.email,
        'perfil': user.perfil
    })

class IndicadorListCreateView(generics.ListCreateAPIView):
    queryset = Indicador.objects.all()
    serializer_class = IndicadorSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # Apenas usuários master podem criar
        if self.request.user.perfil != 'master':
            raise permissions.PermissionDenied("Apenas usuários Master podem criar indicadores.")
        serializer.save()


class MetaCreateView(generics.CreateAPIView):
    queryset = Meta.objects.all()
    serializer_class = MetaSerializer
    permission_classes = [permissions.IsAuthenticated, IsMasterUser]

    def perform_create(self, serializer):
        serializer.save(definida_por=self.request.user)


class PreenchimentoListCreateView(generics.ListCreateAPIView):
    queryset = Preenchimento.objects.all()
    serializer_class = PreenchimentoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(preenchido_por=self.request.user)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def meus_preenchimentos(request):
    preenchimentos = Preenchimento.objects.filter(preenchido_por=request.user)
    serializer = PreenchimentoSerializer(preenchimentos, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def indicadores_pendentes(request):
    usuario = request.user
    mes_atual = now().month
    ano_atual = now().year

    # Filtra indicadores do setor do gestor
    if usuario.perfil == 'gestor':
        indicadores = Indicador.objects.filter(setor__in=usuario.setores.all())
    else:
        indicadores = Indicador.objects.all()

    indicadores_pendentes = []
    for indicador in indicadores:
        preenchido = Preenchimento.objects.filter(
            indicador=indicador,
            mes=mes_atual,
            ano=ano_atual
        ).exists()

        if not preenchido:
            indicadores_pendentes.append(indicador)

    serializer = IndicadorSerializer(indicadores_pendentes, many=True)
    return Response(serializer.data)

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if email is None or password is None:
            raise serializers.ValidationError("Email e senha são obrigatórios.")

        try:
            user = Usuario.objects.get(email=email)
        except Usuario.DoesNotExist:
            raise serializers.ValidationError("Email ou senha incorretos.")

        if not user.check_password(password):
            raise serializers.ValidationError("Email ou senha incorretos.")

        if not user.is_active:
            raise serializers.ValidationError("Conta inativa.")

        # Esta linha abaixo força a autenticação usando o username interno (necessário para JWT)
        attrs['username'] = user.username

        return super().validate(attrs)

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def meu_usuario(request):
    usuario = request.user
    serializer = UsuarioSerializer(usuario)
    return Response(serializer.data)