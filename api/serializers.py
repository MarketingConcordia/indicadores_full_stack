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
        many=True,
        queryset=Setor.objects.all()
    )

    class Meta:
        model = get_user_model()
        fields = ['id', 'first_name', 'last_name', 'email', 'perfil', 'setores']



class IndicadorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Indicador
        fields = '__all__'


class PreenchimentoSerializer(serializers.ModelSerializer):
    indicador_nome = serializers.CharField(source='indicador.nome', read_only=True)
    setor_nome = serializers.CharField(source='indicador.setor.nome', read_only=True)

    class Meta:
        model = Preenchimento
        fields = fields = ['__all__', 'indicador_nome', 'setor_nome']



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

class IndicadorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Indicador
        fields = '__all__'


class MetaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Meta
        fields = '__all__'


class PreenchimentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Preenchimento
        fields = '__all__'