from rest_framework import serializers
from .models import Setor, Usuario, Indicador, Preenchimento, Notificacao
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
    class Meta:
        model = Preenchimento
        fields = '__all__'


class NotificacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacao
        fields = '__all__'


from .models import ConfiguracaoArmazenamento


class ConfiguracaoArmazenamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracaoArmazenamento
        fields = '__all__'