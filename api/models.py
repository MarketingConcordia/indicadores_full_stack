from django.db import models
from django.contrib.auth.models import AbstractUser, UserManager
from django.conf import settings


# ======================
# 🔹 MODELO DE SETOR
# ======================
class Setor(models.Model):
    nome = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.nome


# ======================
# 🔹 MODELO DE USUÁRIO
# ======================
class Usuario(AbstractUser):
    PERFIS = (
        ('master', 'Master'),
        ('gestor', 'Gestor'),
    )

    email = models.EmailField(unique=True)
    perfil = models.CharField(max_length=10, choices=PERFIS)
    setores = models.ManyToManyField(Setor, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    objects = UserManager()

    def __str__(self):
        return f"{self.first_name} ({self.get_perfil_display()})"


# ======================
# 🔹 INDICADORES (Master)
# ======================
class Indicador(models.Model):
    TIPO_META_CHOICES = [
        ('crescente', 'Para cima'),
        ('decrescente', 'Para baixo'),
        ('acompanhamento', 'Acompanhamento'),
    ]

    STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('concluido', 'Concluído'),
    ]

    nome = models.CharField(max_length=255)
    descricao = models.TextField(blank=True, null=True)
    setor = models.ForeignKey(Setor, on_delete=models.CASCADE, related_name='indicadores')
    tipo_meta = models.CharField(max_length=20, choices=TIPO_META_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente')
    valor_meta = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome


# ======================
# 🔹 METAS MENSAIS
# ======================
class Meta(models.Model):
    indicador = models.ForeignKey(Indicador, on_delete=models.CASCADE)
    valor_esperado = models.DecimalField(max_digits=10, decimal_places=2)
    mes = models.IntegerField()
    ano = models.IntegerField()
    definida_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        unique_together = ('indicador', 'mes', 'ano')

    def __str__(self):
        return f"Meta de {self.indicador.nome} para {self.mes}/{self.ano}"


# ======================
# 🔹 PREENCHIMENTOS
# ======================
class Preenchimento(models.Model):
    indicador = models.ForeignKey(Indicador, on_delete=models.CASCADE)
    valor_realizado = models.DecimalField(max_digits=10, decimal_places=2)
    mes = models.IntegerField()
    ano = models.IntegerField()
    preenchido_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    data_preenchimento = models.DateTimeField(auto_now_add=True)
    comentario = models.TextField(blank=True, null=True)
    arquivo = models.FileField(upload_to='provas/', blank=True, null=True)

    class Meta:
        unique_together = ('indicador', 'mes', 'ano', 'preenchido_por')

    def __str__(self):
        return f"{self.indicador.nome} - {self.valor_realizado} ({self.mes}/{self.ano})"


# ======================
# 🔹 PERMISSÃO POR INDICADOR
# ======================
class PermissaoIndicador(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    indicador = models.ForeignKey(Indicador, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.usuario} - {self.indicador}"


# ======================
# 🔹 NOTIFICAÇÕES INTERNAS
# ======================
class Notificacao(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    texto = models.CharField(max_length=255)
    lida = models.BooleanField(default=False)
    data = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notificação para {self.usuario.email}"


# ======================
# 🔹 CONFIGURAÇÃO DE ARMAZENAMENTO
# ======================
class ConfiguracaoArmazenamento(models.Model):
    TIPOS_ARMAZENAMENTO = [
        ('local', 'Local'),
        ('aws', 'AWS S3'),
        ('azure', 'Azure Blob Storage'),
        ('gcp', 'Google Cloud Storage'),
    ]

    tipo = models.CharField(max_length=10, choices=TIPOS_ARMAZENAMENTO, default='local')

    # AWS
    aws_access_key = models.CharField(max_length=200, blank=True, null=True)
    aws_secret_key = models.CharField(max_length=200, blank=True, null=True)
    aws_bucket_name = models.CharField(max_length=200, blank=True, null=True)
    aws_region = models.CharField(max_length=50, blank=True, null=True)

    # Azure
    azure_connection_string = models.TextField(blank=True, null=True)
    azure_container = models.CharField(max_length=200, blank=True, null=True)

    # Google Cloud
    gcp_credentials_json = models.TextField(blank=True, null=True)
    gcp_bucket_name = models.CharField(max_length=200, blank=True, null=True)

    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Armazenamento: {self.tipo}"


# ======================
# 🔹 CONFIGURAÇÃO DE NOTIFICAÇÕES
# ======================
class ConfiguracaoNotificacao(models.Model):
    DESTINATARIOS = [
        ('master', 'Master (CEO)'),
        ('gestor', 'Gestores'),
        ('todos', 'Master e Gestores'),
    ]

    nome = models.CharField(max_length=100)
    mensagem = models.TextField()
    dia_do_mes = models.IntegerField()
    repetir_todo_mes = models.BooleanField(default=True)
    destinatarios = models.CharField(max_length=10, choices=DESTINATARIOS)
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nome} - Dia {self.dia_do_mes}"


# ======================
# 🔹 LOG DE AÇÕES
# ======================
class LogDeAcao(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True)
    acao = models.CharField(max_length=255)
    data = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.usuario} - {self.acao} - {self.data.strftime('%d/%m/%Y %H:%M')}"
