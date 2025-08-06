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
    setores_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Setor.objects.all(),
        required=False,
        write_only=True
    )

    class Meta:
        model = Usuario
        fields = '__all__'
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def validate(self, data):
        perfil = data.get('perfil')
        setores = data.get('setores_ids')

        if perfil == 'gestor' and (not setores or len(setores) == 0):
            raise serializers.ValidationError({
                'setores_ids': 'Este campo é obrigatório para gestores.'
            })
        return data

    def create(self, validated_data):
        setores_ids = validated_data.pop('setores_ids', [])
        email = validated_data.get('email')
        username = validated_data.get('username', email)
        password = validated_data.pop('password')

        validated_data['username'] = username
        user = Usuario(**validated_data)
        user.set_password(password)
        user.save()

        if setores_ids:
            user.setores.set(setores_ids)

        return user

    def update(self, instance, validated_data):
        setores = validated_data.pop('setores_ids', None)
        password = validated_data.pop('password', None)
        username = validated_data.get('username', instance.email)

        validated_data['username'] = username

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)

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
    metas_mensais = serializers.SerializerMethodField()

    class Meta:
        model = Indicador
        fields = [
            'id', 'nome', 'setor', 'setor_nome', 'tipo_meta',
            'status', 'valor_meta', 'criado_em', 'periodicidade',
            'mes_inicial', 'visibilidade', 'extracao_indicador', 'tipo_valor',
            'metas_mensais', 'ativo'
        ]

    def get_status(self, obj):
        from datetime import datetime
        hoje = datetime.today()
        preenchido = obj.preenchimento_set.filter(mes=hoje.month, ano=hoje.year).exists()
        return "Concluído" if preenchido else "Pendente"

    def create(self, validated_data):
        indicador = super().create(validated_data)

        data_base = validated_data.get('mes_inicial') or date.today()
        data_base = date(data_base.year, data_base.month, 1)

        for i in range(12):
            mes = data_base + relativedelta(months=i)
            MetaMensal.objects.create(
                indicador=indicador,
                mes=mes,
                valor_meta=indicador.valor_meta
            )

        return indicador
    
    def get_metas_mensais(self, obj):
        metas = obj.metas_mensais.order_by("mes")
        return [
            {
                "id": meta.id,
                "mes": meta.mes.strftime("%Y-%m-%d"),
                "valor_meta": meta.valor_meta
            }
            for meta in metas
        ]



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
    tipo_valor = serializers.CharField(source='indicador.tipo_valor', read_only=True)
    indicador_mes_inicial = serializers.DateField(source='indicador.mes_inicial', read_only=True)
    indicador_periodicidade = serializers.IntegerField(source='indicador.periodicidade', read_only=True)
    preenchido_por = serializers.SerializerMethodField()
    meta = serializers.SerializerMethodField()
    setor_id = serializers.IntegerField(source='indicador.setor.id', read_only=True)

    def validate_arquivo(self, value):
        max_size = 2 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError("O arquivo enviado é muito grande. O tamanho máximo permitido é 2MB.")
        return value

    class Meta:
        model = Preenchimento
        fields = [
            'id', 'indicador', 'valor_realizado', 'data_preenchimento',
            'indicador_nome', 'setor_nome', 'setor_id', 'tipo_meta', 'tipo_valor',
            'indicador_mes_inicial', 'indicador_periodicidade',
            'meta', 'mes', 'ano',
            'comentario', 'arquivo', 'preenchido_por'
        ]

    def get_meta(self, obj):
        try:
            mes_data = date(obj.ano, obj.mes, 1)
            meta_obj = obj.indicador.metas_mensais.filter(mes=mes_data).first()
            return meta_obj.valor_meta if meta_obj else None
        except Exception as e:
            print("Erro ao buscar meta:", e)
            return None

    def get_preenchido_por(self, obj):
        if obj.preenchido_por:
            return {
                "id": obj.preenchido_por.id,
                "first_name": obj.preenchido_por.first_name,
                "username": obj.preenchido_por.username
            }
        return None




# ✅ NOVO: Serializer específico para histórico
class PreenchimentoHistoricoSerializer(serializers.ModelSerializer):
    tipo_valor = serializers.CharField(source='indicador.tipo_valor', read_only=True)

    class Meta:
        model = Preenchimento
        fields = [
            'data_preenchimento', 'valor_realizado', 'comentario',
            'arquivo', 'mes', 'ano', 'tipo_valor'
        ]


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
