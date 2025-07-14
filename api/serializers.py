from rest_framework import serializers
from datetime import date
from .models import (
    Setor, Usuario, Indicador, Preenchimento, LogDeAcao,
    Meta, ConfiguracaoArmazenamento, Configuracao, MetaMensal
)
from dateutil.relativedelta import relativedelta


# =============================
# 🔹 SETORES
# =============================
class SetorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Setor
        fields = '__all__'


class SetorSimplesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Setor
        fields = ['id', 'nome']


# =============================
# 🔹 USUÁRIOS
# =============================
class UsuarioSerializer(serializers.ModelSerializer):
    setores = SetorSimplesSerializer(many=True, read_only=True)
    setores_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=True
    )

    class Meta:
        model = Usuario
        fields = '__all__'
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        setores_ids = validated_data.pop('setores_ids', [])
        email = validated_data.get('email')
        username = validated_data.get('username', email)
        validated_data['username'] = username

        user = Usuario.objects.create_user(**validated_data)
        if setores_ids:
            user.setores.set(setores_ids)
        return user

    def update(self, instance, validated_data):
        setores = validated_data.pop('setores_ids', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if setores is not None:
            instance.setores.set(setores)

        instance.save()
        return instance


# =============================
# 🔹 INDICADORES
# =============================
class IndicadorSerializer(serializers.ModelSerializer):
    setor_nome = serializers.CharField(source='setor.nome', read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = Indicador
        fields = [
            'id', 'nome', 'setor', 'setor_nome', 'tipo_meta',
            'status', 'valor_meta', 'criado_em', 'periodicidade',
            'mes_inicial', 'visibilidade', 'extracao_indicador', 'tipo_valor'
        ]

    def get_status(self, obj):
        from datetime import datetime
        hoje = datetime.today()
        preenchido = obj.preenchimento_set.filter(mes=hoje.month, ano=hoje.year).exists()
        return "Concluído" if preenchido else "Pendente"

    def create(self, validated_data):
        # Cria o indicador normalmente
        indicador = super().create(validated_data)

        # Define a data base do primeiro mês da meta
        data_base = validated_data.get('mes_inicial') or date.today()
        data_base = date(data_base.year, data_base.month, 1)

        # Cria metas mensais com base na periodicidade (ex: 12 meses)
        for i in range(12):
            mes = data_base + relativedelta(months=i)
            MetaMensal.objects.create(
                indicador=indicador,
                mes=mes,
                valor_meta=indicador.valor_meta
            )

        return indicador


# =============================
# 🔹 CONFIGURAÇÃO PREENCHIMENTO
# =============================
class ConfiguracaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Configuracao
        fields = '__all__'


# =============================
# 🔹 PREENCHIMENTOS
# =============================
class PreenchimentoSerializer(serializers.ModelSerializer):
    indicador_nome = serializers.CharField(source='indicador.nome', read_only=True)
    setor_nome = serializers.CharField(source='indicador.setor.nome', read_only=True)
    tipo_meta = serializers.CharField(source='indicador.tipo_meta', read_only=True)
    meta = serializers.SerializerMethodField()

    class Meta:
        model = Preenchimento
        fields = [
            'id', 'indicador', 'valor_realizado', 'data_preenchimento',
            'indicador_nome', 'setor_nome', 'tipo_meta', 
            'meta', 'mes', 'ano'
        ]

    def get_meta(self, obj):
        try:
            mes_data = date(obj.ano, obj.mes, 1)
            meta_obj = obj.indicador.metas_mensais.filter(mes=mes_data).first()
            return meta_obj.valor_meta if meta_obj else None
        except Exception as e:
            print("Erro ao buscar meta:", e)
            return None


# =============================
# 🔹 METAS MENSAIS
# =============================
class MetaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Meta
        fields = '__all__'

class MetaMensalSerializer(serializers.ModelSerializer):
    class Meta:
        model = MetaMensal
        fields = ['id', 'indicador', 'mes', 'valor_meta']
        
# =============================
# 🔹 LOG DE AÇÕES
# =============================
class LogDeAcaoSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.SerializerMethodField()

    class Meta:
        model = LogDeAcao
        fields = ['id', 'usuario_nome', 'acao', 'data']

    def get_usuario_nome(self, obj):
        return obj.usuario.first_name or obj.usuario.username



# =============================
# 🔹 ARMAZENAMENTO
# =============================
class ConfiguracaoArmazenamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracaoArmazenamento
        fields = '__all__'