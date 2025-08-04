// 🔹 Inicia a página e carrega os logs
document.addEventListener("DOMContentLoaded", () => {
  const perfil = localStorage.getItem("perfil_usuario");

  if (perfil !== "gestor") {
    alert("Acesso negado. Página exclusiva para gestores.");
    window.location.href = "index.html";
    return;
  }

  carregarLogsDoGestor();
  document.getElementById("btn-aplicar-filtros").addEventListener("click", carregarLogsDoGestor);
});

// 🔸 Carrega apenas os logs do gestor autenticado
function carregarLogsDoGestor() {
  const token = localStorage.getItem("access");

  const dataInicio = document.getElementById("filtro-data-inicio").value;
  const dataFim = document.getElementById("filtro-data-fim").value;

  let url = `${window.API_BASE_URL}/api/logs/?`;

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
      console.error("Erro ao carregar logs do gestor:", err);
      alert("Erro ao carregar os logs.");
    });
}

// 🔸 Renderiza os logs na tabela
function renderizarLogs(logs) {
  const tbody = document.getElementById("listaLogs");
  tbody.innerHTML = "";

  if (!logs.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="text-center text-gray-500 py-4">Nenhum log encontrado.</td>
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

// 🔸 Formata a data/hora
function formatarData(isoString) {
  const data = new Date(isoString);
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  const horas = String(data.getHours()).padStart(2, '0');
  const minutos = String(data.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${ano} ${horas}:${minutos}`;
}
