// 🔹 Preenche os filtros ao carregar
document.addEventListener("DOMContentLoaded", () => {
  carregarUsuarios();
  carregarSetores();
  carregarLogsComFiltros();

  document.getElementById("btn-aplicar-filtros").addEventListener("click", () => {
    carregarLogsComFiltros();
  });
});

// 🔸 Carrega os usuários
function carregarUsuarios() {
  const token = localStorage.getItem("access");
  fetch(`${window.API_BASE_URL}/api/usuarios/`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => {
      const usuarios = data.results || data;
      const select = document.getElementById("filtro-usuario");
      select.innerHTML = `<option value="todos">Todos</option>`;
      usuarios.forEach(user => {
        const nome = user.first_name || user.username;
        select.innerHTML += `<option value="${user.id}">${nome}</option>`;
      });
    })
    .catch(err => console.error("Erro ao carregar usuários:", err));
}

// 🔸 Carrega os setores
function carregarSetores() {
  const token = localStorage.getItem("access");
  fetch(`${window.API_BASE_URL}/api/setores/`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => {
      const setores = data.results || data;
      const select = document.getElementById("filtro-setor");
      select.innerHTML = `<option value="todos">Todos</option>`;
      setores.forEach(setor => {
        select.innerHTML += `<option value="${setor.id}">${setor.nome}</option>`;
      });
    })
    .catch(err => console.error("Erro ao carregar setores:", err));
}

// 🔸 Carrega logs com base nos filtros
function carregarLogsComFiltros() {
  const token = localStorage.getItem("access");

  const usuario = document.getElementById("filtro-usuario").value;
  const setor = document.getElementById("filtro-setor").value;
  const dataInicio = document.getElementById("filtro-data-inicio").value;
  const dataFim = document.getElementById("filtro-data-fim").value;

  let url = `${window.API_BASE_URL}/api/logs/?`;

  if (usuario && usuario !== "todos") url += `usuario=${usuario}&`;
  if (setor && setor !== "todos") url += `setor=${setor}&`;
  if (dataInicio) url += `data_inicio=${dataInicio}&`;
  if (dataFim) url += `data_fim=${dataFim}&`;

  fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => {
      renderizarLogs(data.results || data);
    })
    .catch(err => {
      console.error("Erro ao aplicar filtros:", err);
      alert("Erro ao aplicar os filtros.");
    });
}

function renderizarLogs(logs) {
  const tbody = document.getElementById("listaLogs");
  tbody.innerHTML = "";

  if (logs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="text-center text-gray-500 py-4">Nenhum log encontrado com os filtros selecionados.</td>
      </tr>
    `;
    return;
  }

  logs.forEach(log => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="px-4 py-2 text-sm text-gray-900">${log.usuario_nome}</td>
      <td class="px-4 py-2 text-sm text-gray-700">${log.acao}</td>
      <td class="px-4 py-2 text-sm text-gray-500">${formatarData(log.data)}</td>
    `;

    tbody.appendChild(tr);
  });
}

function formatarData(isoString) {
  const data = new Date(isoString);
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  const horas = String(data.getHours()).padStart(2, '0');
  const minutos = String(data.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${ano} ${horas}:${minutos}`;
}