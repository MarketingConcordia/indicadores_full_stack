from django.core.mail import EmailMessage, get_connection
from api.models import EmailConfig

def enviar_email_personalizado(empresa_config, assunto, corpo, destinatarios):
    try:
        email_conf = EmailConfig.objects.get(empresa=empresa_config)

        connection = get_connection(
            host=email_conf.host,
            port=email_conf.port,
            username=email_conf.username,
            password=email_conf.password,
            use_tls=email_conf.use_tls,
            fail_silently=False
        )

        email = EmailMessage(
            subject=assunto,
            body=corpo,
            from_email=email_conf.default_from_email,
            to=destinatarios,
            connection=connection
        )
        email.send()
        return True
    except EmailConfig.DoesNotExist:
        return False
