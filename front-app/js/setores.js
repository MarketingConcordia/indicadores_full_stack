document.addEventListener("DOMContentLoaded", () => {
  const perfil = localStorage.getItem("perfil_usuario");
  if (perfil !== "master") {
    alert("Acesso negado. Esta página é exclusiva para perfil master.");
    window.location.href = "indexgestores.html";
    return;
  }

  listarSetores();

  configurarFormularioSetor();
});


// 🔹 FORMULÁRIO DE SETOR
function configurarFormularioSetor() {
  document.getElementById("form-setor").addEventListener("submit", function (e) {
    e.preventDefault();
    const nome = document.getElementById("nomeSetor").value.trim();
    const token = localStorage.getItem("access");

    if (!nome) {
      alert("Digite o nome do setor.");
      return;
    }

    fetch("http://127.0.0.1:8000/api/setores/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ nome }),
    })
    .then(res => res.ok ? res.json() : res.json().then(err => { throw new Error(JSON.stringify(err)); }))
    .then(() => {
      document.getElementById("nomeSetor").value = "";
      listarSetores();
    })
    .catch(err => {
      console.error("Erro ao cadastrar setor:", err);
      alert("Erro ao cadastrar setor.");
    });
  });
}


// 🔹 LISTAR / EDITAR / EXCLUIR SETORES
function listarSetores() {
  const token = localStorage.getItem("access");

  fetch("http://127.0.0.1:8000/api/setores/", {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(res => res.ok ? res.json() : Promise.reject("Erro ao buscar setores"))
  .then(dados => {
    const setores = dados.results;
    const lista = document.getElementById("lista-setores");
    if (!lista) return;

    lista.innerHTML = "";

    if (setores.length === 0) {
      lista.innerHTML = "<p class='text-gray-500'>Nenhum setor cadastrado.</p>";
      return;
    }

    setores.forEach(setor => {
      const item = document.createElement("div");
      item.className = "flex justify-between items-center border rounded px-3 py-2 bg-gray-50";
      item.innerHTML = `
        <span>ID ${setor.id}: ${setor.nome}</span>
        <div class="space-x-2">
          <button onclick="editarSetor(${setor.id}, '${setor.nome}')" class="text-blue-600 hover:underline">Editar</button>
          <button onclick="excluirSetor(${setor.id})" class="text-red-600 hover:underline">Excluir</button>
        </div>
      `;
      lista.appendChild(item);
    });
  })
  .catch(err => console.error(err));
}

function excluirSetor(id) {
  if (!confirm("Tem certeza que deseja excluir este setor?")) return;

  const token = localStorage.getItem("access");
  fetch(`http://127.0.0.1:8000/api/setores/${id}/`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(res => {
    if (!res.ok) throw new Error("Erro ao excluir setor.");
    listarSetores();
  })
  .catch(err => {
    console.error("Erro ao excluir setor:", err);
    alert("Erro ao excluir setor.");
  });
}

function editarSetor(id, nomeAtual) {
  const novoNome = prompt("Editar nome do setor:", nomeAtual);
  if (!novoNome?.trim()) return;

  const token = localStorage.getItem("access");
  fetch(`http://127.0.0.1:8000/api/setores/${id}/`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ nome: novoNome.trim() })
  })
  .then(res => {
    if (!res.ok) throw new Error("Erro ao editar setor.");
    listarSetores();
  })
  .catch(err => {
    console.error("Erro ao editar setor:", err);
    alert("Erro ao editar setor.");
  });
}