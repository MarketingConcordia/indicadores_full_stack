document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-gestor");

  const perfil = localStorage.getItem("perfil_usuario");
  if (perfil !== "master") {
    alert("Acesso negado. Esta página é exclusiva para perfil master.");
    window.location.href = "indexgestores.html"; // redireciona o gestor
  }

  listarGestores();
  preencherSelectSetores();

    // 🧠 Controle do campo setor conforme perfil selecionado
    const perfilSelect = document.getElementById("perfil");
    const setorSelect = document.getElementById("setorGestor");

    perfilSelect.addEventListener("change", function () {
      if (this.value === "master") {
        setorSelect.disabled = true;
        setorSelect.value = "";
      } else {
        setorSelect.disabled = false;
      }
    });


  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const nome = document.getElementById("nomeGestor").value;
    const email = document.getElementById("emailGestor").value;
    const senha = document.getElementById("senhaGestor").value;
    const confirmarSenha = document.getElementById("confirmarSenhaGestor").value;
    const setorSelecionado = parseInt(document.getElementById("setorGestor").value);

    if (senha !== confirmarSenha) {
      alert("As senhas não coincidem.");
      return;
    }

    const perfilSelecionado = document.getElementById("perfil").value;

    if (perfilSelecionado === "gestor" && isNaN(setorSelecionado)) {
      alert("Selecione um setor válido para o gestor.");
      return;
    }

    const token = localStorage.getItem("access");
    if (!token) {
      alert("Sessão expirada. Faça login novamente.");
      window.location.href = "login.html";
      return;
    }

    const payload = {
      first_name: nome,
      email: email,
      username: email,
      password: senha,
      perfil: perfilSelecionado
    };

    if (perfilSelecionado === "gestor") {
      payload.setores_ids = [setorSelecionado];
    }

    fetch(`${window.API_BASE_URL}/api/usuarios/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (res.ok) return res.json();
        return res.json().then(err => { throw new Error(JSON.stringify(err)); });
      })
      .then(data => {
        alert("Gestor cadastrado com sucesso!");
        form.reset();
        listarGestores();
      })
      .catch(error => {
        console.error("Erro completo da API:", error.message);
        try {
          const msg = JSON.parse(error.message);
          if (msg.email) {
            alert("Erro: " + msg.email[0]);
          } else if (msg.detail) {
            alert("Erro: " + msg.detail);
          } else {
            alert("Erro desconhecido: " + JSON.stringify(msg));
          }
        } catch (e) {
          alert("Erro inesperado. Veja o console para mais detalhes.");
        }
      });
  });
});

function listarGestores() {
  const token = localStorage.getItem("access");
  const tabela = document.getElementById("tabela-usuarios");
  if (!tabela) return;

  fetch(`${window.API_BASE_URL}/api/usuarios/`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => {
      const usuarios = data.results || data;
      tabela.innerHTML = "";

      if (usuarios.length === 0) {
        tabela.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-4 text-gray-500">Nenhum usuário encontrado.</td>
          </tr>`;
        return;
      }

      usuarios.forEach(usuario => {
        const tr = document.createElement("tr");

        const setores = (usuario.setores || [])
          .map(s => s.nome)
          .join(", ") || "-";

        const statusLabel = usuario.is_active
          ? `<span class="text-green-600 font-medium">Ativo</span>`
          : `<span class="text-red-600 font-medium">Inativo</span>`;

        const usuarioLogadoId = parseInt(localStorage.getItem("usuario_id"));
        const perfilLogado = localStorage.getItem("perfil_usuario");

        let btnStatus = "";
        // Só mostra o botão se NÃO for o próprio Master logado
        if (!(perfilLogado === "master" && usuario.id === usuarioLogadoId)) {
          btnStatus = usuario.is_active
            ? `<button onclick="alterarStatusUsuario(${usuario.id}, false)" class="text-red-600 hover:underline">Inativar</button>`
            : `<button onclick="alterarStatusUsuario(${usuario.id}, true)" class="text-green-600 hover:underline">Ativar</button>`;
        }
        
        tr.innerHTML = `
          <td class="px-4 py-2">${usuario.first_name}</td>
          <td class="px-4 py-2">${usuario.email}</td>
          <td class="px-4 py-2">${usuario.perfil === "master" ? "Master" : "Gestor"}</td>
          <td class="px-4 py-2">${setores}</td>
          <td class="px-4 py-2 text-center">${statusLabel}</td>
          <td class="px-4 py-2 text-center space-x-2">
            <button onclick="editarGestor(${usuario.id})" class="text-blue-600 hover:underline">Editar</button>
            ${btnStatus}
          </td>
        `;

        tabela.appendChild(tr);
      });
    })
    .catch(error => {
      console.error("Erro ao listar gestores:", error);
      tabela.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4 text-red-500">Erro ao carregar usuários.</td>
        </tr>`;
    });
}

function alterarStatusUsuario(id, novoStatus) {
  const token = localStorage.getItem("access");
  const usuarioLogadoId = parseInt(localStorage.getItem("usuario_id")); // ID salvo no login
  const perfilLogado = localStorage.getItem("perfil_usuario");

  // 🔒 Impede que o próprio Master se inative
  if (perfilLogado === "master" && id === usuarioLogadoId && novoStatus === false) {
    alert("Você não pode inativar a sua própria conta.");
    return;
  }

  fetch(`${window.API_BASE_URL}/api/usuarios/${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ is_active: novoStatus })
  })
    .then(res => {
      if (!res.ok) throw new Error("Falha ao alterar status");
      listarGestores();
    })
    .catch(err => {
      console.error("Erro:", err);
      alert("Erro ao alterar status do usuário.");
    });
}


function excluirGestor(id) {
  const confirmar = confirm("Tem certeza que deseja excluir este gestor?");
  if (!confirmar) return;

  const token = localStorage.getItem("access");

  fetch(`${window.API_BASE_URL}/api/usuarios/${id}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
    .then(res => {
      if (res.ok) {
        alert("Gestor excluído com sucesso.");
        listarGestores();
      } else {
        throw new Error("Falha ao excluir gestor.");
      }
    })
    .catch(error => {
      console.error("Erro ao excluir gestor:", error);
      alert("Erro ao excluir o gestor.");
    });
}

function editarGestor(id) {
  const token = localStorage.getItem("access");

  fetch(`${window.API_BASE_URL}/api/usuarios/${id}/`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(gestor => {
      document.getElementById("edit-id").value = gestor.id;
      document.getElementById("edit-nome").value = gestor.first_name;
      document.getElementById("edit-email").value = gestor.email;
      document.getElementById("edit-perfil").value = gestor.perfil;
      document.getElementById("edit-senha").value = "";

      // Habilita ou desabilita campo setor
      const setorWrapper = document.getElementById("edit-setor-wrapper");
      const setorSelect = document.getElementById("edit-setor");

      if (gestor.perfil === "gestor") {
        setorWrapper.classList.remove("hidden");
        setorSelect.disabled = false;

        // Selecionar o setor atual
        if (gestor.setores && gestor.setores.length > 0) {
          setorSelect.value = gestor.setores[0].id;
        }
      } else {
        setorWrapper.classList.add("hidden");
        setorSelect.disabled = true;
        setorSelect.value = "";
      }

      document.getElementById("modal-editar-gestor").classList.remove("hidden");
    });
}

function fecharModalEditar() {
  document.getElementById("modal-editar-gestor").classList.add("hidden");
}

document.getElementById("form-editar-gestor").addEventListener("submit", function (e) {
  e.preventDefault();

  const id = document.getElementById("edit-id").value;
  const nome = document.getElementById("edit-nome").value;
  const email = document.getElementById("edit-email").value;
  const perfil = document.getElementById("edit-perfil").value;
  const setor = document.getElementById("edit-setor").value;
  const senha = document.getElementById("edit-senha").value;

  const payload = {
  first_name: nome,
  email: email,
  username: email,
  perfil: perfil
};

  if (senha.trim()) {
    payload.password = senha.trim();
  }

  if (perfil === "gestor" && setor) {
    payload.setores_ids = [parseInt(setor)];
  }

  const token = localStorage.getItem("access");

  fetch(`${window.API_BASE_URL}/api/usuarios/${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  })
    .then(res => {
      if (res.ok) {
        alert("Gestor atualizado com sucesso!");
        fecharModalEditar();
        listarGestores();
      } else {
        return res.json().then(err => {
          console.error("Erro detalhado:", err);
          alert("Erro ao atualizar gestor.");
        });
      }
    });
});

function preencherSelectSetores() {
  const token = localStorage.getItem("access");

  const selectCadastro = document.getElementById("setorGestor");
  const selectEdicao = document.getElementById("edit-setor");

  fetch(`${window.API_BASE_URL}/api/setores/`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
    .then(res => {
      if (!res.ok) throw new Error("Erro ao carregar setores.");
      return res.json();
    })
    .then(data => {
      const setores = data.results;

      // Preenche o select de cadastro
      if (selectCadastro) {
        selectCadastro.innerHTML = '<option value="">Selecione o setor</option>';
        setores.forEach(setor => {
          const opt = document.createElement("option");
          opt.value = setor.id;
          opt.textContent = setor.nome;
          selectCadastro.appendChild(opt);
        });
      }

      // Preenche o select do modal de edição
      if (selectEdicao) {
        selectEdicao.innerHTML = '<option value="">Selecione o setor</option>';
        setores.forEach(setor => {
          const opt = document.createElement("option");
          opt.value = setor.id;
          opt.textContent = setor.nome;
          selectEdicao.appendChild(opt);
        });
      }

    })
    .catch(err => {
      console.error("Erro ao preencher setores:", err);
    });
}

document.getElementById("edit-perfil").addEventListener("change", function () {
  const setorWrapper = document.getElementById("edit-setor-wrapper");
  const setorSelect = document.getElementById("edit-setor");

  if (this.value === "master") {
    setorWrapper.classList.add("hidden");
    setorSelect.disabled = true;
    setorSelect.value = "";
  } else {
    setorWrapper.classList.remove("hidden");
    setorSelect.disabled = false;
  }
});
