from api.models import LogDeAcao

def registrar_log(usuario, acao):
    if not usuario or not acao:
        return
    
    try:
        LogDeAcao.objects.create(usuario=usuario, acao=acao)
    except Exception as e:
        print(f"[ERRO AO REGISTRAR LOG] {e}")
