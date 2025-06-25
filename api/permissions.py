from rest_framework.permissions import BasePermission

class IsMasterUser(BasePermission):
    """
    Permissão que libera apenas usuários com perfil 'master'
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.perfil == 'master'



class IsGestor(BasePermission):
    """
    Permissão que permite acesso apenas para usuários perfil Gestor.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.perfil == 'gestor'
