from rest_framework import serializers
from .models import (
    Setor, Usuario, Indicador, Preenchimento,
    Notificacao, ConfiguracaoNotificacao, LogDeAcao,
    Meta, ConfiguracaoArmazenamento
)


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

    class Meta:
        model = Indicador
        fields = '__all__'


# =============================
# 🔹 PREENCHIMENTOS
# =============================
class PreenchimentoSerializer(serializers.ModelSerializer):
    indicador_nome = serializers.CharField(source='indicador.nome', read_only=True)
    setor_nome = serializers.CharField(source='indicador.setor.nome', read_only=True)
    tipo_meta = serializers.CharField(source='indicador.tipo_meta', read_only=True)
    nome_usuario = serializers.CharField(source='preenchido_por.first_name', read_only=True)

    class Meta:
        model = Preenchimento
        fields = '__all__'
        read_only_fields = ['indicador_nome', 'setor_nome', 'tipo_meta', 'nome_usuario']


# =============================
# 🔹 METAS MENSAIS
# =============================
class MetaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Meta
        fields = '__all__'


# =============================
# 🔹 NOTIFICAÇÕES
# =============================
class NotificacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacao
        fields = '__all__'


class ConfiguracaoNotificacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracaoNotificacao
        fields = '__all__'


# =============================
# 🔹 LOG DE AÇÕES
# =============================
class LogDeAcaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogDeAcao
        fields = '__all__'


# =============================
# 🔹 ARMAZENAMENTO
# =============================
class ConfiguracaoArmazenamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracaoArmazenamento
        fields = '__all__'
