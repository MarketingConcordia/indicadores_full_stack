from rest_framework import serializers
from .models import Setor, Usuario, Indicador, Preenchimento, Notificacao
from .models import ConfiguracaoNotificacao, LogDeAcao, Meta
from django.contrib.auth import get_user_model


class SetorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Setor
        fields = '__all__'


class UsuarioSerializer(serializers.ModelSerializer):
    setores = serializers.PrimaryKeyRelatedField(
        queryset=Setor.objects.all(),
        many=True,
        required=False
    )

    class Meta:
        model = Usuario
        fields = '__all__'
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        setores = validated_data.pop('setores', [])
        email = validated_data.get('email')
        username = validated_data.get('username', email)
        validated_data['username'] = username

        user = Usuario.objects.create_user(**validated_data)

        if setores:
            user.setores.set(setores)

        return user



class IndicadorSerializer(serializers.ModelSerializer):
    setor_nome = serializers.CharField(source='setor.nome', read_only=True)

    class Meta:
        model = Indicador
        fields = '__all__'


class PreenchimentoSerializer(serializers.ModelSerializer):
    indicador_nome = serializers.CharField(source='indicador.nome', read_only=True)
    setor_nome = serializers.CharField(source='indicador.setor.nome', read_only=True)
    tipo_meta = serializers.CharField(source='indicador.tipo_meta', read_only=True)
    nome_usuario = serializers.CharField(source='preenchido_por.first_name', read_only=True)

    class Meta:
        model = Preenchimento
        fields = '__all__'
        read_only_fields = ['indicador_nome', 'setor_nome', 'tipo_meta', 'nome_usuario']




class NotificacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacao
        fields = '__all__'


from .models import ConfiguracaoArmazenamento


class ConfiguracaoArmazenamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracaoArmazenamento
        fields = '__all__'
        

class ConfiguracaoNotificacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracaoNotificacao
        fields = '__all__'

class LogDeAcaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogDeAcao
        fields = '__all__'

class MetaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Meta
        fields = '__all__'