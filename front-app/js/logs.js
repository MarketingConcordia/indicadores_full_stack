const BASE_URL = "http://127.0.0.1:8000/api";

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
  fetch(`${BASE_URL}/usuarios/`, {
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
  fetch(`${BASE_URL}/setores/`, {
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

  let url = `${BASE_URL}/logs/?`;

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
