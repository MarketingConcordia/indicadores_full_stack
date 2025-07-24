function carregarDadosUsuario() {
  const nomeUsuario = localStorage.getItem("nome_usuario") || "Usuário";
  const perfil = localStorage.getItem("perfil_usuario") || "gestor";

  document.getElementById("campo-nome-usuario").textContent = nomeUsuario;
  document.getElementById("campo-detalhe-perfil").textContent = `Perfil: ${perfil}`;
  document.getElementById("iniciais-usuario").textContent = nomeUsuario.charAt(0).toUpperCase();
}

// ⚙️ Lida com o formulário de conta
function configurarFormularioConta() {
  const formConta = document.querySelectorAll("form")[0];

  formConta.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const senhaAtual = document.getElementById("senhaAtual").value;
    const novaSenha = document.getElementById("novaSenha").value;
    const confirmar = document.getElementById("confirmarSenha").value;

    if (novaSenha && novaSenha !== confirmar) {
      alert("A nova senha e a confirmação não coincidem.");
      return;
    }

    const token = localStorage.getItem("access");
    const usuarioId = localStorage.getItem("usuario_id");

    if (!usuarioId || !token) {
      alert("Sessão inválida. Faça login novamente.");
      localStorage.clear();
      window.location.href = "login.html";
      return;
    }

    const body = {
      email: email,
      password: novaSenha
    };

    fetch(`http://127.0.0.1:8000/api/usuarios/${usuarioId}/`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => { throw new Error(JSON.stringify(err)); });
        }
        return res.json();
      })
      .then(() => {
        alert("Senha alterada com sucesso.");
        formConta.reset();
      })
      .catch(err => {
        console.error("Erro ao alterar senha:", err);
        alert("Erro ao salvar senha. Tente novamente.");
      });
  });
}

// 🚀 Inicialização
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem('access');
  if (!token || isTokenExpired(token)) {
    alert("Sua sessão expirou. Faça login novamente.");
    localStorage.clear();
    window.location.href = "login.html";
    return;
  }

  const perfil = localStorage.getItem("perfil_usuario");
  if (perfil !== "gestor") {
    alert("Acesso negado. Esta página é exclusiva para gestores.");
    window.location.href = "index.html";
    return;
  }

  carregarDadosUsuario();
  configurarFormularioConta();
});
