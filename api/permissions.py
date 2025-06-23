from rest_framework import permissions


class IsMaster(permissions.BasePermission):
    """
    Permissão que permite acesso apenas para usuários perfil Master (CEO).
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.perfil == 'master'


class IsGestor(permissions.BasePermission):
    """
    Permissão que permite acesso apenas para usuários perfil Gestor.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.perfil == 'gestor'
