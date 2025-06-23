import boto3
from azure.storage.blob import BlobServiceClient
from google.cloud import storage
from django.core.files.storage import default_storage
from django.conf import settings
import os
import json


def upload_arquivo(file, nome_arquivo, config: object):
    """
    Upload dinâmico baseado na configuração de armazenamento.
    """

    if config.tipo == 'aws':
        s3 = boto3.client(
            's3',
            aws_access_key_id=config.aws_access_key,
            aws_secret_access_key=config.aws_secret_key,
            region_name=config.aws_region
        )

        s3.upload_fileobj(
            file,
            config.aws_bucket_name,
            f'provas/{nome_arquivo}',
            ExtraArgs={'ACL': 'public-read'}
        )

        url = f"https://{config.aws_bucket_name}.s3.{config.aws_region}.amazonaws.com/provas/{nome_arquivo}"
        return url

    elif config.tipo == 'azure':
        blob_service_client = BlobServiceClient.from_connection_string(
            config.azure_connection_string
        )
        blob_client = blob_service_client.get_blob_client(
            container=config.azure_container,
            blob=f'provas/{nome_arquivo}'
        )

        blob_client.upload_blob(file, overwrite=True)
        url = f"https://{blob_service_client.account_name}.blob.core.windows.net/{config.azure_container}/provas/{nome_arquivo}"
        return url

    elif config.tipo == 'gcp':
        client = storage.Client.from_service_account_info(
            json.loads(config.gcp_credentials_json)
        )
        bucket = client.get_bucket(config.gcp_bucket_name)
        blob = bucket.blob(f'provas/{nome_arquivo}')
        blob.upload_from_file(file)
        blob.make_public()
        return blob.public_url

    else:
        # LOCAL
        caminho = os.path.join('provas', nome_arquivo)
        file_path = default_storage.save(caminho, file)
        url = f"{settings.MEDIA_URL}{file_path}"
        return url
