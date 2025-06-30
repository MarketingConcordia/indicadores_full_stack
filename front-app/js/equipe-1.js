document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("form-gestor");

    carregarCheckboxSetores(); // 🔹 Chama função para preencher checkboxes
    listarGestores();

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const nome = document.getElementById("nomeGestor").value;
      const email = document.getElementById("emailGestor").value;
      const senha = document.getElementById("senhaGestor").value;
      const confirmarSenha = document.getElementById("confirmarSenhaGestor").value;

      if (senha !== confirmarSenha) {
        alert("As senhas não coincidem.");
        return;
      }

      const setoresMarcados = Array.from(document.querySelectorAll('input[name="setores"]:checked')).map(cb => cb.value);

      const token = localStorage.getItem("access");
      if (!token) {
        alert("Sessão expirada. Faça login novamente.");
        window.location.href = "login.html";
        return;
      }

      const payload = {
        first_name: nome,
        email: email,
        password: senha,
        perfil: "gestor",
        setores: setoresMarcados
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
      })
      .catch(error => {
        console.error("Erro ao cadastrar gestor:", error);
        alert("Erro ao cadastrar. Verifique se o e-mail já está em uso ou outro problema.");
      });
    });
  });

  function listarGestores() {
    const token = localStorage.getItem("access");
  
    fetch("http://127.0.0.1:8000/api/usuarios/", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    .then(res => res.json())
    .then(data => {
      const lista = document.getElementById("lista-gestores");
      lista.innerHTML = "";
  
      const gestores = data.filter(u => u.perfil === "gestor");
  
      if (gestores.length === 0) {
        lista.innerHTML = `<p class="text-gray-500">Nenhum gestor cadastrado.</p>`;
        return;
      }
  
      gestores.forEach(gestor => {
        const card = document.createElement("div");
        card.className = "bg-white p-4 rounded shadow flex justify-between items-center";
  
        card.innerHTML = `
          <div>
            <p class="font-medium">${gestor.first_name}</p>
            <p class="text-sm text-gray-600">${gestor.email}</p>
            <p class="text-sm text-gray-500">Setores: ${gestor.setores?.map(s => s.nome).join(", ") || '-'}</p>
          </div>
          <div class="flex gap-2">
            <button onclick="editarGestor(${gestor.id})" class="text-blue-600 hover:underline text-sm">Editar</button>
            <button onclick="excluirGestor(${gestor.id})" class="text-red-600 hover:underline text-sm">Excluir</button>
          </div>
        `;
  
        lista.appendChild(card);
      });
    })
    .catch(error => {
      console.error("Erro ao listar gestores:", error);
      alert("Erro ao buscar gestores.");
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
        listarGestores(); // Atualiza lista
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
  
  document.getElementById("form-editar-gestor").addEventListener("submit", function(e) {
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
  