from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Usuario, Setor

@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    model = Usuario
    list_display = ('email', 'first_name', 'last_name', 'perfil')
    list_filter = ('perfil', 'setores')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('email',)
    filter_horizontal = ('setores',)

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Informações Pessoais', {'fields': ('first_name', 'last_name')}),
        ('Permissões', {'fields': ('perfil', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Relacionamentos', {'fields': ('setores',)}),
        ('Datas Importantes', {'fields': ('last_login', 'date_joined')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'perfil', 'setores', 'password1', 'password2'),
        }),
    )

    add_form_template = None

# Registrar o modelo Setor também, se ainda não estiver registrado
@admin.register(Setor)
class SetorAdmin(admin.ModelAdmin):
    list_display = ('nome',)
