document.addEventListener("DOMContentLoaded", () => {
  const perfil = localStorage.getItem("perfil_usuario");
  if (perfil !== "master") {
    alert("Acesso negado. Esta página é exclusiva para perfil master.");
    window.location.href = "indexgestores.html";
    return;
  }

  configurarToggleSidebar();
  configurarDropdownPerfil();
  configurarExibicaoCamposArmazenamento();

  carregarNotificacoesConfig();
  listarSetores();

  configurarFormularioSetor();
  configurarFormularioNotificacao();
  configurarFormularioArmazenamento();
});


// 🔹 TOGGLE SIDEBAR
function configurarToggleSidebar() {
  const toggleSidebar = document.getElementById("toggle-sidebar");
  const sidebar = document.getElementById("sidebar");
  const sidebarItems = document.querySelectorAll(".sidebar-item");

  toggleSidebar.addEventListener("click", () => {
    sidebar.classList.toggle("sidebar-collapsed");
    sidebarItems.forEach(item => {
      item.style.display = sidebar.classList.contains("sidebar-collapsed") ? "none" : "inline";
    });
  });
}


// 🔹 PERFIL - Dropdown
function configurarDropdownPerfil() {
  const profileButton = document.getElementById("profileButton");
  const profileMenu = document.getElementById("profileMenu");

  profileButton.addEventListener("click", () => {
    profileMenu.classList.toggle("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!profileButton.contains(e.target) && !profileMenu.contains(e.target)) {
      profileMenu.classList.add("hidden");
    }
  });
}


// 🔹 FORMULÁRIO DE NOTIFICAÇÃO
function configurarFormularioNotificacao() {
  document.getElementById("formNotificacao").addEventListener("submit", function (e) {
    e.preventDefault();

    const payload = {
      nome: document.getElementById("nome").value,
      mensagem: document.getElementById("mensagem").value,
      dia_do_mes: document.getElementById("dia").value,
      destinatarios: document.getElementById("destinatarios").value,
      repetir_todo_mes: document.getElementById("repetir").checked,
      ativo: true
    };

    fetch("http://127.0.0.1:8000/api/configuracao_notificacao/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("access")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
    .then(() => {
      this.reset();
      carregarNotificacoesConfig();
    });
  });
}


// 🔹 LISTAR / EXCLUIR NOTIFICAÇÕES
function carregarNotificacoesConfig() {
  fetch("http://127.0.0.1:8000/api/configuracao_notificacao/", {
    headers: { Authorization: `Bearer ${localStorage.getItem("access")}` }
  })
  .then(res => res.json())
  .then(data => {
    const lista = document.getElementById("listaNotificacoes");
    lista.innerHTML = "";

    data.forEach(n => {
      const item = document.createElement("li");
      item.className = "flex justify-between bg-gray-100 px-3 py-2 rounded";
      item.innerHTML = `
        <div>
          <p class="font-semibold">${n.nome} (Dia ${n.dia_do_mes})</p>
          <p class="text-sm text-gray-600">${n.mensagem}</p>
          <p class="text-xs text-gray-400">${n.destinatarios.toUpperCase()} | ${n.repetir_todo_mes ? 'Repetir' : 'Único'} | ${n.ativo ? 'Ativo' : 'Inativo'}</p>
        </div>
        <button onclick="excluirNotificacao(${n.id})" class="text-red-600 hover:underline">Excluir</button>
      `;
      lista.appendChild(item);
    });
  });
}

function excluirNotificacao(id) {
  fetch(`http://127.0.0.1:8000/api/configuracao_notificacao/${id}/`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${localStorage.getItem("access")}` }
  }).then(() => carregarNotificacoesConfig());
}


// 🔹 FORMULÁRIO DE ARMAZENAMENTO
function configurarFormularioArmazenamento() {
  document.getElementById("formArmazenamento").addEventListener("submit", function (e) {
    e.preventDefault();

    const tipo = document.getElementById("tipo").value;

    const payload = {
      tipo,
      aws_access_key: document.getElementById("aws_access_key").value,
      aws_secret_key: document.getElementById("aws_secret_key").value,
      aws_bucket_name: document.getElementById("aws_bucket_name").value,
      aws_region: document.getElementById("aws_region").value,
      azure_connection_string: document.getElementById("azure_connection_string").value,
      azure_container: document.getElementById("azure_container").value,
      gcp_credentials_json: document.getElementById("gcp_credentials_json").value,
      gcp_bucket_name: document.getElementById("gcp_bucket_name").value
    };

    fetch("http://127.0.0.1:8000/api/configuracao_armazenamento/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("access")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
    .then(res => {
      if (!res.ok) throw new Error("Erro ao salvar a configuração.");
      return res.json();
    })
    .then(() => {
      alert("Configuração salva com sucesso!");
      window.location.reload();
    })
    .catch(error => {
      alert("Erro: " + error.message);
    });
  });
}


// 🔹 EXIBIÇÃO DINÂMICA DOS CAMPOS POR TIPO
function configurarExibicaoCamposArmazenamento() {
  document.getElementById("tipo").addEventListener("change", function () {
    const tipo = this.value;

    document.getElementById("awsFields").classList.add("hidden");
    document.getElementById("azureFields").classList.add("hidden");
    document.getElementById("gcpFields").classList.add("hidden");

    if (tipo === "aws") {
      document.getElementById("awsFields").classList.remove("hidden");
    } else if (tipo === "azure") {
      document.getElementById("azureFields").classList.remove("hidden");
    } else if (tipo === "gcp") {
      document.getElementById("gcpFields").classList.remove("hidden");
    }
  });
}
