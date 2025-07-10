from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import UserCreationForm, UserChangeForm

from .models import Usuario, Setor, Indicador, MetaMensal
from .forms import CustomUserCreationForm

# === CONFIGURAÇÃO PARA USUÁRIOS CUSTOMIZADOS ===
@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    model = Usuario
    add_form = CustomUserCreationForm

    list_display = ('email', 'username', 'first_name', 'last_name', 'perfil')
    list_filter = ('perfil', 'setores')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('email',)
    filter_horizontal = ('setores',)

    # Campos exibidos ao visualizar/editar usuário
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Informações Pessoais', {'fields': ('first_name', 'last_name')}),
        ('Permissões', {
            'fields': (
                'perfil', 'is_active', 'is_staff', 'is_superuser',
                'groups', 'user_permissions'
            )
        }),
        ('Relacionamentos', {'fields': ('setores',)}),
        ('Datas Importantes', {'fields': ('last_login', 'date_joined')}),
    )

    # Campos exibidos ao adicionar novo usuário
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'email', 'username', 'first_name', 'last_name',
                'perfil', 'setores', 'password1', 'password2'
            ),
        }),
    )

# === REGISTRO DO MODELO SETOR ===
@admin.register(Setor)
class SetorAdmin(admin.ModelAdmin):
    list_display = ('nome',)
    ordering = ('nome',)

@admin.register(Indicador)
class IndicadorAdmin(admin.ModelAdmin):
    list_display = ['nome', 'setor', 'valor_meta', 'tipo_meta', 'status', 'periodicidade', 'mes_inicial']
    search_fields = ['nome']
    list_filter = ['setor', 'tipo_meta', 'status']

admin.site.register(MetaMensal)