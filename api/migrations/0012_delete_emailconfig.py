# Generated by Django 5.2.3 on 2025-07-24 19:48

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0011_emailconfig'),
    ]

    operations = [
        migrations.DeleteModel(
            name='EmailConfig',
        ),
    ]
