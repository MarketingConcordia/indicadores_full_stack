
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("form-gestor");

    listarGestores();
    preencherSelectSetores();

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const nome = document.getElementById("nomeGestor").value;
        const email = document.getElementById("emailGestor").value;
        const senha = document.getElementById("senhaGestor").value;
        const confirmarSenha = document.getElementById("confirmarSenhaGestor").value;
        const setorSelecionado = document.getElementById("setorGestor").value;

        if (senha !== confirmarSenha) {
            alert("As senhas não coincidem.");
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
            perfil: "gestor",
            setores: [parseInt(setorSelecionado)]
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

    fetch("http://127.0.0.1:8000/api/usuarios/", {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
    .then(res => res.json())
    .then(data => {
        const lista = document.getElementById("lista-gestores");
        lista.innerHTML = "";

        const gestores = (data.results || []).filter(u => u.perfil === "gestor");

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
  