let todosIndicadores = [];
let indicadorEditandoId = null;

// 🔹 Carregar setores e preencher selects
async function carregarSetores() {
  try {
    const token = localStorage.getItem('access');
    const response = await fetch(`${window.API_BASE_URL}/api/setores/`, {
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

// 🔹 Função auxiliar para formatar valor com base no tipo_valor
function formatarComTipo(valor, tipo) {
  if (valor == null || valor === '') return '-';

  const numero = parseFloat(valor);
  if (isNaN(numero)) return valor;

  switch (tipo) {
    case 'monetario':
      return 'R$ ' + numero.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    case 'percentual':
      return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '%';
    default:
      return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  }
}

// 🔹 Carregar indicadores
async function carregarIndicadores() {
  try {
    const token = localStorage.getItem('access');
    let url = `${window.API_BASE_URL}/api/indicadores/?page_size=200`;
    let acumulado = [];

    while (url) {
      const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` }});
      if (!resp.ok) throw new Error("Erro ao carregar indicadores");
      const data = await resp.json();
      const page = data.results || data;         // suporta paginado e não paginado
      acumulado = acumulado.concat(page);
      url = data.next || null;                   // segue o "next" quando existir
    }

    todosIndicadores = acumulado;
    todosIndicadores.forEach(i => console.log("🔎 Indicador:", i));
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
    lista.innerHTML = `
      <tr><td colspan="9" class="text-center text-gray-500 py-4">Nenhum indicador encontrado.</td></tr>
    `;
    return;
  }

  filtrados.forEach(ind => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50';
    tr.innerHTML = `
      <td class="px-4 py-2 font-semibold">${ind.nome}</td>
      <td class="px-4 py-2">${ind.setor_nome}</td>
      <td class="px-4 py-2">${formatarComTipo(ind.valor_meta, ind.tipo_valor)}</td>
      <td class="px-4 py-2 capitalize">${ind.tipo_meta}</td>
      <td class="px-4 py-2">${ind.visibilidade ? 'Todos' : 'Restrito'}</td>
      <td class="px-4 py-2">${ind.periodicidade} mês(es)</td>
      <td class="px-4 py-2">${ind.mes_inicial ? new Date(
        ind.mes_inicial + 'T00:00:00'
      ).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '--'}</td>
      <td class="px-4 py-2">
        <span class="${ind.status === 'Pendente' ? 'text-red-600' : 'text-green-600'} font-bold">${ind.status.toUpperCase()}</span>
      </td>
      <td class="px-4 py-2 text-${ind.ativo ? 'green' : 'red'}-600 font-semibold">
        ${ind.ativo ? 'Ativo' : 'Inativo'}
      </td>
      <td class="px-4 py-2 text-center space-x-2">
        <button onclick='abrirModal(${JSON.stringify(ind)})' class="text-blue-600 hover:underline">Editar</button>
        <button onclick="toggleStatusIndicador(${ind.id}, ${ind.ativo})" class="${ind.ativo ? 'text-red-600' : 'text-green-600'} hover:underline">
          ${ind.ativo ? 'Inativar' : 'Ativar'}
        </button>
      </td>
    `;
    lista.prepend(tr);
  });
}


// 🔹 Inativar indicador
async function toggleStatusIndicador(id, statusAtual) {
  const confirmar = confirm(`Deseja realmente ${statusAtual ? 'inativar' : 'ativar'} este indicador?`);
  if (!confirmar) return;

  const token = localStorage.getItem('access');

  try {
    const response = await fetch(`${window.API_BASE_URL}/api/indicadores/${id}/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ativo: !statusAtual })
    });

    if (!response.ok) throw new Error("Erro ao atualizar status");

    await carregarIndicadores();

  } catch (error) {
    console.error("Erro ao mudar status:", error);
    alert("Erro ao mudar status do indicador.");
  }
}


// 🔹 Salvar novo indicador
async function salvarIndicador(event) {
  event.preventDefault();
  console.log("Tentando salvar indicador...");
  const token = localStorage.getItem('access');

  console.log("Valor de mesInicial:", document.getElementById('mesInicial'));
  console.log("Valor de mesInicial.value:", document.getElementById('mesInicial').value);

  const payload = {
    nome: document.getElementById('nomeMetrica').value,
    setor: document.getElementById('setorMetrica').value,
    valor_meta: document.getElementById('metaMetrica').value,
    tipo_meta: document.getElementById('tipo_meta').value,
    tipo_valor: document.getElementById('tipo_valor').value,
    periodicidade: parseInt(document.getElementById('periodicidade').value),
    mes_inicial: new Date(document.getElementById('mesInicial').value + '-01').toISOString().split('T')[0],
    visibilidade: document.getElementById('visibilidade').value === 'true',
    extracao_indicador: document.getElementById('extracaoIndicador').value,
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
      ? `${window.API_BASE_URL}/api/indicadores/${indicadorEditandoId}/`
      : `${window.API_BASE_URL}/api/indicadores/`;

    const method = indicadorEditandoId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Erro detalhado:", errorData); // <--- Veja isso no console
      throw new Error("Erro ao salvar");
    }

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
  document.getElementById('edit-periodicidade').value = indicador.periodicidade || '';
  document.getElementById('edit-mes-inicial').value = indicador.mes_inicial ? indicador.mes_inicial.slice(0, 7) : '';
  document.getElementById('edit-visibilidade').value = String(indicador.visibilidade);
  document.getElementById('edit-extracao').value = indicador.extracao_indicador || '';
  document.getElementById('edit-tipo-valor').value = indicador.tipo_valor || 'numeral';
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
    tipo_valor: document.getElementById('edit-tipo-valor').value,
    periodicidade: parseInt(document.getElementById('edit-periodicidade').value),
    mes_inicial: new Date(document.getElementById('edit-mes-inicial').value + '-01').toISOString().split('T')[0],
    visibilidade: document.getElementById('edit-visibilidade').value === 'true',
    extracao_indicador: document.getElementById('edit-extracao').value,
    status: 'pendente'
  };


  try {
    const response = await fetch(`${window.API_BASE_URL}/api/indicadores/${id}/`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const erro = await response.json();
      console.error("Erro detalhado:", erro);
      throw new Error("Erro ao atualizar indicador");
    }

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

// 🧠 Preenche automaticamente o campo de meta com 0 se o tipo for "monitoramento"
document.getElementById('tipo_meta').addEventListener('change', () => {
  const tipo = document.getElementById('tipo_meta').value;
  const campoMeta = document.getElementById('metaMetrica');

  if (tipo === 'monitoramento') {
    campoMeta.value = 0;
    campoMeta.disabled = true;
  } else {
    campoMeta.disabled = false;
    campoMeta.value = '';
  }
});

let configuracaoId = null;

function salvarDiaLimite() {
  const token = localStorage.getItem("access");
  const novoValor = parseInt(document.getElementById("input-dia-limite").value);

  if (isNaN(novoValor) || novoValor < 1 || novoValor > 31) {
    alert("Informe um dia válido entre 1 e 31.");
    return;
  }

  if (!configuracaoId) {
    alert("Configuração não carregada.");
    return;
  }

  fetch(`${window.API_BASE_URL}/api/configuracoes/${configuracaoId}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ dia_limite_preenchimento: novoValor })
  })
    .then(res => {
      if (!res.ok) throw new Error("Erro ao salvar configuração");
      document.getElementById("status-dia-limite").textContent = `Dia-limite atualizado para: ${novoValor}`;
    })
    .catch(err => {
      console.error("Erro:", err);
      alert("Erro ao salvar o dia-limite.");
    });
}