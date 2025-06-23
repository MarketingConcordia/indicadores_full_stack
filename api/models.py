from django.contrib.auth.models import AbstractUser
from django.db import models


# 🔹 Modelo de Setor
class Setor(models.Model):
    nome = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.nome


# 🔹 Modelo de Usuário Customizado
class Usuario(AbstractUser):
    PERFIS = (
        ('master', 'Master'),
        ('gestor', 'Gestor'),
    )

    email = models.EmailField(unique=True)
    perfil = models.CharField(max_length=10, choices=PERFIS)
    
    setores = models.ManyToManyField(Setor, blank=True)  # Agora pode ter acesso a vários setores

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return f"{self.first_name} ({self.get_perfil_display()})"


# 🔹 Indicadores cadastrados pelo Master
class Indicador(models.Model):
    nome = models.CharField(max_length=100)
    descricao = models.TextField()
    setor = models.ForeignKey(Setor, on_delete=models.CASCADE)
    meta = models.DecimalField(max_digits=10, decimal_places=2)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nome} ({self.setor})"

# 🔹 Preenchimento feito pelo gestor mensalmente
class Preenchimento(models.Model):
    indicador = models.ForeignKey(Indicador, on_delete=models.CASCADE)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    mes = models.CharField(max_length=7)  # Formato: MM/YYYY
    provas = models.URLField(blank=True, null=True)
    comentario = models.TextField(blank=True, null=True)
    data_envio = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.indicador.nome} - {self.mes} - {self.usuario.first_name}"

# 🔹 Notificações internas do sistema
class Notificacao(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    texto = models.CharField(max_length=255)
    lida = models.BooleanField(default=False)
    data = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notificação para {self.usuario.email}"


class PermissaoIndicador(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    indicador = models.ForeignKey(Indicador, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.usuario} - {self.indicador}"

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

