from django_cron import CronJobBase, Schedule
from datetime import datetime
from .models import ConfiguracaoNotificacao, Usuario, Notificacao


class NotificacaoConfiguravelCron(CronJobBase):
    RUN_AT_TIMES = ['09:00']
    schedule = Schedule(run_at_times=RUN_AT_TIMES)
    code = 'api.notificacao_configuravel_cron'

    def do(self):
        hoje = datetime.now().day
        configuracoes = ConfiguracaoNotificacao.objects.filter(
            dia_do_mes=hoje,
            ativo=True
        )

        for config in configuracoes:
            perfis = []
            if config.destinatarios in ['gestor', 'todos']:
                perfis.append('gestor')
            if config.destinatarios in ['master', 'todos']:
                perfis.append('master')

            for perfil in perfis:
                usuarios = Usuario.objects.filter(perfil=perfil)
                for usuario in usuarios:
                    Notificacao.objects.create(usuario=usuario, texto=config.mensagem)

            if not config.repetir_todo_mes:
                config.ativo = False
                config.save()
