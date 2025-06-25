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
            if config.destinatarios in ['gestor', 'todos']:
                gestores = Usuario.objects.filter(perfil='gestor')
                for gestor in gestores:
                    Notificacao.objects.create(
                        usuario=gestor,
                        texto=config.mensagem
                    )

            if config.destinatarios in ['master', 'todos']:
                masters = Usuario.objects.filter(perfil='master')
                for master in masters:
                    Notificacao.objects.create(
                        usuario=master,
                        texto=config.mensagem
                    )

            if not config.repetir_todo_mes:
                config.ativo = False
                config.save()
