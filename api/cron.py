from django_cron import CronJobBase, Schedule
from datetime import datetime

from .models import ConfiguracaoNotificacao, Usuario, Notificacao


class NotificacaoConfiguravelCron(CronJobBase):
    # ⏰ Define o horário de execução (formato 24h)
    RUN_AT_TIMES = ['09:00']
    schedule = Schedule(run_at_times=RUN_AT_TIMES)
    code = 'api.notificacao_configuravel_cron'

    def do(self):
        hoje = datetime.now().day

        # 🔎 Buscar notificações configuradas para o dia atual e ativas
        configuracoes = ConfiguracaoNotificacao.objects.filter(
            dia_do_mes=hoje,
            ativo=True
        )

        # 📤 Para cada configuração, enviar notificações aos perfis escolhidos
        for config in configuracoes:
            perfis = []

            if config.destinatarios in ['gestor', 'todos']:
                perfis.append('gestor')

            if config.destinatarios in ['master', 'todos']:
                perfis.append('master')

            # 👥 Enviar a todos os usuários do perfil correspondente
            for perfil in perfis:
                usuarios = Usuario.objects.filter(perfil=perfil)

                for usuario in usuarios:
                    Notificacao.objects.create(
                        usuario=usuario,
                        texto=config.mensagem
                    )

            # 🔁 Desativar a notificação se não for recorrente
            if not config.repetir_todo_mes:
                config.ativo = False
                config.save()
