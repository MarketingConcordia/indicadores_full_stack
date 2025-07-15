document.addEventListener("DOMContentLoaded", () => {
  verificarPermissaoMaster();
  configurarFormularioConta();
  configurarFormularioPreferencias();
});

// 🔐 Verifica se o usuário tem perfil Master
function verificarPermissaoMaster() {
  const perfil = localStorage.getItem("perfil_usuario");
  if (perfil !== "master") {
    alert("Acesso negado. Esta página é exclusiva para perfil master.");
    window.location.href = "indexgestores.html";
  }
}

// ✉️ Formulário de alteração de conta
function configurarFormularioConta() {
  const formConta = document.querySelector("form");

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

    // Aqui você pode implementar o envio para a API real se necessário
    console.log("📧 Email:", email);
    console.log("🔐 Senha Atual:", senhaAtual);
    console.log("🆕 Nova Senha:", novaSenha);

    alert("Alterações da conta salvas com sucesso (simulado).");
    formConta.reset();
  });
}

// 🎨 Formulário de preferências visuais
function configurarFormularioPreferencias() {
  const formPreferencias = document.querySelectorAll("form")[1];

  formPreferencias.addEventListener("submit", (e) => {
    e.preventDefault();

    const tema = document.getElementById("tema").value;
    const paginaInicial = document.getElementById("paginaInicial").value;

    localStorage.setItem("preferencia_tema", tema);
    localStorage.setItem("preferencia_pagina_inicial", paginaInicial);

    alert("Preferências visuais salvas!");
  });
}
