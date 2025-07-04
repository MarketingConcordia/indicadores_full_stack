const BASE_URL = "http://127.0.0.1:8000/api";
let todosIndicadores = [];
let indicadorEditandoId = null;

// 🔹 Carregar setores e preencher selects
async function carregarSetores() {
  try {
    const token = localStorage.getItem('access');
    const response = await fetch(`${BASE_URL}/setores/`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error("Erro ao buscar setores");

    const data = await response.json();
    const setores = data.results;
    console.log("Setores recebidos:", setores);

    const selectSetor = document.getElementById('setorMetrica');
    const filtroSetor = document.getElementById('filtro-setor');
    const editSelectSetor = document.getElementById('edit-setor');

    selectSetor.innerHTML = '<option value="">Selecione</option>';
    filtroSetor.innerHTML = '<option value="todos">Todos</option>';
    editSelectSetor.innerHTML = '<option value="">Selecione</option>';

    setores.forEach(setor => {
      selectSetor.appendChild(new Option(setor.nome, setor.id));
      filtroSetor.appendChild(new Option(setor.nome, setor.id));
      editSelectSetor.appendChild(new Option(setor.nome, setor.id));
    });
  } catch (error) {
    console.error("Erro ao carregar setores:", error);
  }
}

// 🔹 Carregar indicadores
async function carregarIndicadores() {
  try {
    const token = localStorage.getItem('access');
    const response = await fetch(`${BASE_URL}/indicadores/`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error("Erro ao carregar indicadores");

    const data = await response.json();
    todosIndicadores = data.results;
    console.log("Indicadores recebidos:", todosIndicadores);

    renderizarIndicadores();
  } catch (error) {
    console.error("Erro ao buscar indicadores:", error);
  }
}

// 🔹 Renderizar lista de indicadores
function renderizarIndicadores() {
  const lista = document.getElementById('indicadores-lista');
  const filtro = document.getElementById('filtro-setor').value;
  lista.innerHTML = '';

  const filtrados = todosIndicadores
    .filter(i => filtro === 'todos' || i.setor == filtro)
    .sort((a, b) => (a.status === 'pendente' ? -1 : 1));

  if (filtrados.length === 0) {
    lista.innerHTML = '<li class="text-gray-500">Nenhum indicador encontrado.</li>';
    return;
  }

  filtrados.forEach(ind => {
    const li = document.createElement('li');
    li.className = 'border-b py-2 flex justify-between items-center';
    li.innerHTML = `
      <div>
        <p class="font-semibold">${ind.nome}</p>
        <p class="text-sm text-gray-500">Setor: ${ind.setor_nome} | Meta: ${ind.valor_meta} (${ind.tipo_meta})</p>
        <p class="text-sm text-gray-400">${ind.descricao}</p>
        <p class="text-sm ${ind.status === 'pendente' ? 'text-red-500' : 'text-green-600'} font-bold">${ind.status.toUpperCase()}</p>
      </div>
      <div class="space-x-2">
        <button onclick='abrirModal(${JSON.stringify(ind)})' class="text-blue-600 hover:underline">Editar</button>
        <button onclick="excluirIndicador(${ind.id})" class="text-red-600 hover:underline">Excluir</button>
      </div>
    `;
    lista.appendChild(li);
  });
}

// 🔹 Excluir indicador
async function excluirIndicador(id) {
  if (!confirm("Deseja realmente excluir?")) return;
  try {
    const token = localStorage.getItem('access');
    const response = await fetch(`${BASE_URL}/indicadores/${id}/`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error("Erro ao excluir");
    todosIndicadores = todosIndicadores.filter(i => i.id !== id);
    renderizarIndicadores();
  } catch (error) {
    console.error("Erro ao excluir indicador:", error);
  }
}

// 🔹 Salvar novo indicador
async function salvarIndicador(event) {
  event.preventDefault();
  const token = localStorage.getItem('access');

  const payload = {
    nome: document.getElementById('nomeMetrica').value,
    setor: document.getElementById('setorMetrica').value,
    valor_meta: document.getElementById('metaMetrica').value,
    tipo_meta: document.getElementById('tipo_meta').value,
    descricao: document.getElementById('descricaoMetrica').value,
    status: 'pendente'
  };

  if (!payload.nome || !payload.setor || !payload.valor_meta || !payload.tipo_meta) {
    alert("Preencha todos os campos obrigatórios.");
    return;
  }

  const botao = event.submitter;
  botao.disabled = true;

  try {
    const url = indicadorEditandoId
      ? `${BASE_URL}/indicadores/${indicadorEditandoId}/`
      : `${BASE_URL}/indicadores/`;

    const method = indicadorEditandoId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error("Erro ao salvar");

    indicadorEditandoId = null;
    document.getElementById('form-metrica').reset();
    await carregarIndicadores();

  } catch (error) {
    console.error("Erro ao salvar:", error);
    alert("Erro ao salvar indicador.");
  } finally {
    botao.disabled = false;
  }
}

// 🔹 Abrir modal de edição
function abrirModal(indicador) {
  document.getElementById('edit-id').value = indicador.id;
  document.getElementById('edit-nome').value = indicador.nome;
  document.getElementById('edit-setor').value = indicador.setor;
  document.getElementById('edit-meta').value = indicador.valor_meta;
  document.getElementById('edit-tipo').value = indicador.tipo_meta;
  document.getElementById('edit-descricao').value = indicador.descricao || '';
  document.getElementById('modal-edicao').classList.remove('hidden');
}

// 🔹 Fechar modal
function fecharModal() {
  document.getElementById('modal-edicao').classList.add('hidden');
}

// 🔹 Submeter edição do indicador
document.getElementById('form-edicao-indicador').addEventListener('submit', async (event) => {
  event.preventDefault();
  const token = localStorage.getItem('access');
  const id = document.getElementById('edit-id').value;

  const payload = {
    nome: document.getElementById('edit-nome').value,
    setor: document.getElementById('edit-setor').value,
    valor_meta: document.getElementById('edit-meta').value,
    tipo_meta: document.getElementById('edit-tipo').value,
    descricao: document.getElementById('edit-descricao').value,
    status: 'pendente'
  };

  try {
    const response = await fetch(`${BASE_URL}/indicadores/${id}/`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error("Erro ao atualizar indicador");

    await carregarIndicadores();
    fecharModal();

  } catch (error) {
    console.error("Erro ao editar indicador:", error);
    alert("Erro ao editar indicador.");
  }
});

// 🔹 Inicialização ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  carregarSetores();
  carregarIndicadores();

  document.getElementById('filtro-setor').addEventListener('change', renderizarIndicadores);
  document.getElementById('form-metrica').addEventListener('submit', salvarIndicador);
});
