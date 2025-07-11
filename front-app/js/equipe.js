document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-gestor");

  const perfil = localStorage.getItem("perfil_usuario");
  if (perfil !== "master") {
    alert("Acesso negado. Esta página é exclusiva para perfil master.");
    window.location.href = "indexgestores.html"; // redireciona o gestor
  }

  listarGestores();
  preencherSelectSetores();

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

    if (isNaN(setorSelecionado)) {
      alert("Selecione um setor válido.");
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
      perfil: document.getElementById("perfil").value,
      setores_ids: [setorSelecionado]
    };

    fetch("http://127.0.0.1:8000/api/usuarios/", {
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

  fetch("http://127.0.0.1:8000/api/usuarios/", {
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

        const btnStatus = usuario.is_active
          ? `<button onclick="alterarStatusUsuario(${usuario.id}, false)" class="text-red-600 hover:underline">Inativar</button>`
          : `<button onclick="alterarStatusUsuario(${usuario.id}, true)" class="text-green-600 hover:underline">Ativar</button>`;

        tr.innerHTML = `
          <td class="px-4 py-2">${usuario.first_name}</td>
          <td class="px-4 py-2">${usuario.email}</td>
          <td class="px-4 py-2">${usuario.perfil === "master" ? "Master" : "Gestor"}</td>
          <td class="px-4 py-2">${setores}</td>
          <td class="px-4 py-2 text-center">${statusLabel}</td>
          <td class="px-4 py-2 text-center space-x-2">
            <button onclick="editarUsuario(${usuario.id})" class="text-blue-600 hover:underline">Editar</button>
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

  fetch(`http://127.0.0.1:8000/api/usuarios/${id}/`, {
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

  fetch(`http://127.0.0.1:8000/api/usuarios/${id}/`, {
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

  fetch(`http://127.0.0.1:8000/api/usuarios/${id}/`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(gestor => {
      document.getElementById("edit-id").value = gestor.id;
      document.getElementById("edit-nome").value = gestor.first_name;
      document.getElementById("edit-email").value = gestor.email;
      document.getElementById("edit-senha").value = "";
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
  const senha = document.getElementById("edit-senha").value;

  const payload = {
    first_name: nome,
    email: email
  };

  if (senha) {
    payload.password = senha;
  }

  const token = localStorage.getItem("access");

  fetch(`http://127.0.0.1:8000/api/usuarios/${id}/`, {
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
        alert("Erro ao atualizar gestor.");
      }
    });
});

function preencherSelectSetores() {
  const token = localStorage.getItem("access");
  const select = document.getElementById("setorGestor");

  if (!select) return;

  fetch("http://127.0.0.1:8000/api/setores/", {
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
      select.innerHTML = '<option value="">Selecione o setor</option>';

      setores.forEach(setor => {
        const opt = document.createElement("option");
        opt.value = setor.id;
        opt.textContent = setor.nome;
        select.appendChild(opt);
      });
    })
    .catch(err => {
      console.error("Erro ao preencher setores:", err);
    });
}