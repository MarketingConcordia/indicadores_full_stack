# Generated by Django 5.2.3 on 2025-07-09 12:25

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_delete_notificacao'),
    ]

    operations = [
        migrations.AddField(
            model_name='configuracaoarmazenamento',
            name='dia_limite_preenchimento',
            field=models.PositiveSmallIntegerField(default=10, help_text='Apenas até esse dia do mês os gestores poderão preencher indicadores.', verbose_name='Dia limite para preenchimento'),
        ),
    ]
