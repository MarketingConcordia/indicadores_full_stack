from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import Indicador, Usuario, Preenchimento

class Command(BaseCommand):
    help = "Cria preenchimentos automáticos todo dia 8 para os indicadores dos gestores"

    def handle(self, *args, **kwargs):
        hoje = timezone.localdate()
        if hoje.day != 8:
            self.stdout.write("Hoje não é dia 8. Nada será feito.")
            return

        indicadores = Indicador.objects.all()
        gestores = Usuario.objects.filter(perfil='gestor')

        contador = 0

        for indicador in indicadores:
            for gestor in gestores:
                preenchimento, criado = Preenchimento.objects.get_or_create(
                    indicador=indicador,
                    preenchido_por=gestor,
                    mes=hoje.month,
                    ano=hoje.year,
                    defaults={
                        'valor_realizado': 0,
                        'comentario': '',
                        'arquivo': None
                    }
                )
                if criado:
                    contador += 1

        self.stdout.write(self.style.SUCCESS(f"{contador} preenchimentos criados."))