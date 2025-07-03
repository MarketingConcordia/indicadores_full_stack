from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import Usuario

class CustomUserCreationForm(UserCreationForm):
    class Meta:
        model = Usuario
        fields = ('email', 'username', 'first_name', 'last_name', 'perfil', 'setores')
