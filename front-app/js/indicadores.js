const BASE_URL = "http://127.0.0.1:8000/api";
let todosIndicadores = [];
let indicadorEditandoId = null;

async function carregarSetores() {
  try {
    const token = localStorage.getItem('access');
    const response = await fetch(`${BASE_URL}/setores/`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error("Erro ao buscar setores");

    const data = await response.json();
    const setores = data.results;  // ✅ Correção aqui
    console.log("Setores recebidos:", setores);

    const selectSetor = document.getElementById('setorMetrica');
    const filtroSetor = document.getElementById('filtro-setor');

    selectSetor.innerHTML = '<option value="">Selecione</option>';
    filtroSetor.innerHTML = '<option value="todos">Todos</option>';

    setores.forEach(setor => {
      const opt1 = new Option(setor.nome, setor.id);
      selectSetor.appendChild(opt1);
      const opt2 = new Option(setor.nome, setor.id);
      filtroSetor.appendChild(opt2);
    });

  } catch (error) {
    console.error("Erro ao carregar setores:", error);
  }
}

async function carregarIndicadores() {
  try {
    const token = localStorage.getItem('access');
    const response = await fetch(`${BASE_URL}/indicadores/`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error("Erro ao carregar indicadores");

    const data = await response.json();
    todosIndicadores = data.results; // ✅ Correção aqui
    console.log("Indicadores recebidos:", todosIndicadores);

    renderizarIndicadores();

  } catch (error) {
    console.error("Erro ao buscar indicadores:", error);
  }
}

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
        <p class="text-sm text-gray-500">Setor: ${ind.setor_nome} | Meta: ${ind.meta} (${ind.tipo_meta})</p>
        <p class="text-sm text-gray-400">${ind.descricao}</p>
        <p class="text-sm ${ind.status === 'pendente' ? 'text-red-500' : 'text-green-600'} font-bold">${ind.status.toUpperCase()}</p>
      </div>
      <div class="space-x-2">
        <button onclick="prepararEdicao(${ind.id})" class="text-blue-600 hover:underline">Editar</button>
        <button onclick="excluirIndicador(${ind.id})" class="text-red-600 hover:underline">Excluir</button>
      </div>
    `;
    lista.appendChild(li);
  });
}

async function excluirIndicador(id) {
  if (!confirm("Deseja realmente excluir?")) return;

  try {
    const token = localStorage.getItem('access');
    const response = await fetch(`${BASE_URL}/indicadores/${id}/`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      todosIndicadores = todosIndicadores.filter(i => i.id !== id);
      renderizarIndicadores();
    } else {
      throw new Error("Erro ao excluir");
    }

  } catch (error) {
    console.error("Erro ao excluir indicador:", error);
  }
}

function prepararEdicao(id) {
  const indicador = todosIndicadores.find(i => i.id === id);
  if (!indicador) return;

  document.getElementById('nomeMetrica').value = indicador.nome;
  document.getElementById('setorMetrica').value = indicador.setor;
  document.getElementById('metaMetrica').value = indicador.meta;
  document.getElementById('tipo_meta').value = indicador.tipo_meta;
  document.getElementById('descricaoMetrica').value = indicador.descricao;

  indicadorEditandoId = id;
}

async function salvarIndicador(event) {
  event.preventDefault();

  const token = localStorage.getItem('access');

  const payload = {
    nome: document.getElementById('nomeMetrica').value,
    setor: document.getElementById('setorMetrica').value,
    meta: document.getElementById('metaMetrica').value,
    tipo_meta: document.getElementById('tipo_meta').value,
    descricao: document.getElementById('descricaoMetrica').value,
    status: 'pendente'
  };

  // Validação opcional (recomendada)
  if (!payload.nome || !payload.setor || !payload.meta || !payload.tipo_meta) {
    alert("Preencha todos os campos obrigatórios.");
    return;
  }

  const botao = event.submitter;
  botao.disabled = true; // Desativa botão temporariamente

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
    botao.disabled = false; // Reativa botão mesmo se der erro
  }
}


document.addEventListener('DOMContentLoaded', () => {
  carregarSetores();
  carregarIndicadores();

  document.getElementById('filtro-setor').addEventListener('change', renderizarIndicadores);
  document.getElementById('form-metrica').addEventListener('submit', salvarIndicador);
});
