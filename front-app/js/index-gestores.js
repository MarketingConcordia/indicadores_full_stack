const token = localStorage.getItem('access');
let graficoDesempenho = null;
let indicadoresComValoresGlobais = []; // Variável global para os indicadores processados
let periodosDisponiveis = {}; // Para armazenar anos e meses disponíveis { 'YYYY': Set('MM', 'MM'), ... }

// Função para verificar se a meta foi atingida, com base no tipo de meta
function verificarAtingimento(tipo, valor, meta) {
    if (!tipo || valor == null || meta == null) return false;
    if (tipo === 'crescente') return valor >= meta;
    if (tipo === 'decrescente') return valor <= meta;
    if (tipo === 'monitoramento') return Math.abs(valor - meta) <= 5;
    return false;
}

// Função para formatar valores com base no tipo_valor
function formatarValorComTipo(valor, tipo) {
    if (valor == null) return "-";
    const numero = parseFloat(valor);
    if (isNaN(numero)) return "-";

    if (tipo === "monetario") {
        return `R$ ${numero.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    } else if (tipo === "percentual") {
        return `${numero.toFixed(2)}%`;
    } else {
        return numero.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    }
}

if (!token) {
    window.location.href = 'login.html';
}

function gerarIntervaloDeMeses(dataInicio, dataFim) {
  const [anoInicio, mesInicio] = dataInicio.split("-").map(Number);
  const [anoFim, mesFim] = dataFim.split("-").map(Number);

  const datas = [];
  let ano = anoInicio;
  let mes = mesInicio;

  while (ano < anoFim || (ano === anoFim && mes <= mesFim)) {
    datas.push(`${ano}-${String(mes).padStart(2, "0")}-01`); // Formato YYYY-MM-01
    mes++;
    if (mes > 12) {
      mes = 1;
      ano++;
    }
  }

  return datas;
}

document.addEventListener('DOMContentLoaded', () => {

    const perfil = localStorage.getItem("perfil_usuario");
    if (perfil !== "gestor") {
        alert("Acesso negado. Esta página é exclusiva para perfil gestor.");
        window.location.href = "login.html";
    }

    preencherSelectSetores();

    Promise.all([
            fetch(`${window.API_BASE_URL}/api/indicadores/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }).then(res => res.json()),
            fetch(`${window.API_BASE_URL}/api/preenchimentos/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }).then(res => res.json()),
            fetch(`${window.API_BASE_URL}/api/metas-mensais/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }).then(res => res.json())
        ])
        .then(([indicadoresData, preenchimentosData, metasMensaisData]) => {
            const indicadoresBase = indicadoresData.results || indicadoresData;
            const preenchimentos = preenchimentosData.results || preenchimentosData;
            const metasMensais = metasMensaisData.results || metasMensaisData;

            const setoresBrutos = JSON.parse(localStorage.getItem("setores_usuario") || "[]");
            const setoresUsuario = setoresBrutos.map(setor => setor.nome);

            const indicadoresCalculados = indicadoresBase
                .map(indicador => {
                    const preenchimentosDoIndicador = preenchimentos.filter(p => p.indicador === indicador.id);
                    const metasDoIndicador = metasMensais.filter(m => m.indicador === indicador.id);

                    preenchimentosDoIndicador.sort((a, b) => {
                        // Primeiro, compara pelo ano
                        if (a.ano !== b.ano) {
                            return a.ano - b.ano; // Ordena anos em ordem crescente
                        }
                        // Se os anos forem iguais, compara pelo mês
                        return a.mes - b.mes; // Ordena meses em ordem crescente
                    });

                    const historico = preenchimentosDoIndicador.map(p => {
                        const dataReferencia = new Date(p.ano, p.mes - 1, 1);
                        const metaDoMes = metasDoIndicador.find(m => m.mes.startsWith(`${p.ano}-${String(p.mes).padStart(2, '0')}`));
                        const metaValor = metaDoMes ? parseFloat(metaDoMes.valor_meta) : parseFloat(indicador.valor_meta);

                        return {
                            id: p.id, // ✅ Adicione esta linha
                            data: dataReferencia,
                            valor: p.valor_realizado,
                            meta: metaValor,
                            comentario: p.comentario,
                            provas: p.arquivo ? [p.arquivo] : []
                        };
                    });

                    const ultimoPreenchimento = preenchimentosDoIndicador.at(-1);

                    let valorAtual = 0;
                    let valorMeta = parseFloat(indicador.valor_meta);
                    let ultimaAtualizacao = null;
                    let atingido = false;
                    let variacao = 0;
                    let comentarios = '';
                    let provas = [];
                    let responsavel = '—';

                    if (ultimoPreenchimento) {
                        const ano = ultimoPreenchimento.ano;
                        const mes = String(ultimoPreenchimento.mes).padStart(2, '0');
                        // Use a meta correspondente ao ano e mês do último preenchimento
                        const metaMensal = metasDoIndicador.find(m => m.mes.startsWith(`${ano}-${mes}`));
                        valorMeta = metaMensal ? parseFloat(metaMensal.valor_meta) : parseFloat(indicador.valor_meta);


                        valorAtual = parseFloat(ultimoPreenchimento.valor_realizado);
                        ultimaAtualizacao = ultimoPreenchimento.data_preenchimento;
                        atingido = verificarAtingimento(indicador.tipo_meta, valorAtual, valorMeta);

                        if (valorMeta !== 0) {
                            variacao = ((valorAtual - valorMeta) / valorMeta) * 100;
                        }

                        comentarios = ultimoPreenchimento.comentario || '';
                        provas = ultimoPreenchimento.arquivo ? [ultimoPreenchimento.arquivo] : [];
                        responsavel = ultimoPreenchimento?.preenchido_por?.first_name || ultimoPreenchimento?.preenchido_por?.username || 'Desconhecido';
                    }

                    return {
                        ...indicador,
                        valor_atual: valorAtual,
                        valor_meta: valorMeta,
                        atingido: atingido,
                        variacao: parseFloat(variacao.toFixed(2)),
                        responsavel: responsavel,
                        ultimaAtualizacao: ultimaAtualizacao,
                        comentarios: comentarios,
                        origem: ultimoPreenchimento?.origem || '',
                        provas: provas,
                        historico: historico,
                        metas_mensais: metasDoIndicador
                    };
                })
                .filter(ind =>
                    ind.ultimaAtualizacao !== null &&
                    (ind.visibilidade === true || setoresUsuario.includes(ind.setor_nome))
                );

            indicadoresComValoresGlobais = indicadoresCalculados; // Atribui ao global
            preencherFiltrosAnoMes(); // Chama para popular os filtros de ano/mês
            aplicarFiltros(); // Chama aplicarFiltros inicialmente para renderizar com os filtros padrão
        })
        .catch(error => {
            console.error('Erro ao carregar indicadores ou preenchimentos:', error);
            alert('Erro ao carregar dados. Verifique sua conexão ou faça login novamente.');
        });
});

// Função para renderizar os cards de indicadores
function renderizarIndicadores(dados) {
    const container = document.getElementById('indicadores-container');
    container.innerHTML = '';

    // Cores para os diferentes setores
    const coresSetores = {
        "Financeiro": "#4f46e5", // indigo
        "Marketing": "#ec4899", // pink
        "Logística": "#f59e0b", // amber
        "E-commerce": "#06b6d4", // cyan
        "Produção": "#10b981", // emerald
        "Pós Venda": "#8b5cf6", // violet
        "RH": "#f43f5e", // rose
        "Qualidade": "#0ea5e9", // sky
        "Engenharia": "#84cc16", // lime
        "Corporativo": "#6366f1", // indigo
        "Revenda": "#d946ef", // fuchsia
        "Jurídico": "#64748b", // slate
        "Controladoria": "#0891b2", // cyan
        "Produtos Green": "#22c55e", // green
        "Produtos Blue": "#3b82f6", // blue
        "Produtos RED": "#ef4444", // red
        "Compras": "#a855f7", // purple
        "Projetos": "#14b8a6" // teal
    };

    dados.forEach(indicador => {
        const card = document.createElement('div');
        card.className = `indicador-card bg-white rounded-lg shadow-md overflow-hidden relative`;
        card.dataset.id = indicador.id;

        // Barra de status (meta atingida ou não) no lado esquerdo
        const atingido = indicador.atingido;
        let statusClass = 'bg-red-500'; // padrão: não atingido
        if (indicador.tipo_meta === 'monitoramento') {
            statusClass = 'bg-blue-500'; // azul para monitoramento
        } else if (indicador.atingido) {
            statusClass = 'bg-green-500'; // verde se atingido
        }
        const statusIcon = atingido ? '✅' : '❌';
        const statusBar = `<div class="trend-bar ${statusClass}"></div>`;

        // Cor de fundo para o badge do setor
        const corSetor = coresSetores[indicador.setor_nome] || "#64748b"; // cor padrão se não encontrar

        // Formatação do valor e meta
        // const formatarValor = (valor) => {
        //     if (valor >= 1000) {
        //         return parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        //     }
        //     return parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        // };

        // Variação com seta
        const variacaoIcon = indicador.variacao >= 0 ? '↑' : '↓';
        const variacaoClass = indicador.variacao >= 0 ? 'text-green-500' : 'text-red-500';
        const variacaoText = `<span class="tooltip ${variacaoClass} font-semibold">${indicador.variacao >= 0 ? '+' : ''}${indicador.variacao}% ${variacaoIcon}<span class="tooltiptext">Comparado ao mês anterior ou meta do período</span></span>`;


        card.innerHTML = `
            ${statusBar}
            <div class="p-4">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="text-lg font-bold text-blue-800">${indicador.nome}</h3>
                    ${variacaoText}
                </div>
                <div class="inline-block text-white text-xs px-2 py-1 rounded mb-3" style="background-color: ${corSetor}">${indicador.setor_nome}</div>
                <div class="flex items-center mb-2">
                    <span class="mr-2">${statusIcon}</span>
                    <span class="text-sm">${atingido ? 'Meta atingida' : 'Meta não atingida'}</span>
                </div>
                <div class="text-sm text-gray-600 mb-3">
                    Atual: ${formatarValorComTipo(indicador.valor_atual, indicador.tipo_valor)} / 
                    Meta: ${formatarValorComTipo(indicador.valor_meta, indicador.tipo_valor)}
                </div>
                <div class="flex justify-end">
                    <button class="btn-detalhes bg-amber-400 hover:bg-amber-500 text-amber-900 text-xs px-3 py-1 rounded transition-colors">
                        Ver +
                    </button>
                </div>
            </div>
        `;

        container.appendChild(card);

        // Adicionar evento de clique para mostrar detalhes
        card.querySelector('.btn-detalhes').addEventListener('click', (e) => {
            e.stopPropagation();
            mostrarDetalhes(indicador);
        });

        // Também adicionar evento de clique ao card inteiro
        card.addEventListener('click', () => {
            mostrarDetalhes(indicador);
        });
    });
}

// Função para mostrar detalhes do indicador
function mostrarDetalhes(indicador) {
    const modal = document.getElementById('detalhe-modal');
    const modalContent = document.getElementById('modal-content');
    const setorGestor = localStorage.getItem("setor_usuario");
    const podeEditar = indicador.setor_nome === setorGestor;


    // Criar conteúdo do modal (sem meta preenchida ainda)
    modalContent.innerHTML = `
        <div class="w-full bg-white rounded p-4 mb-6 border shadow">
            <button id="fechar-modal" class="absolute top-4 right-4 text-white hover:text-gray-700 text-xl font-bold focus:outline-none">
                ✕
            </button>
            <h2 id="titulo-indicador" class="text-2xl font-bold text-blue-800 mb-2">Nome do Indicador</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
                <p><strong>Tipo de Meta:</strong> <span id="tipo-meta-indicador"></span></p>
                <p><strong>Setor:</strong> <span id="setor-indicador"></span></p>
                <p><strong>Meta Esperada:</strong> <span id="meta-indicador"></span></p>
                <p><strong>Responsável:</strong> <span id="responsavel-indicador"></span></p>
                <p><strong>Último Preenchimento:</strong> <span id="ultimo-preenchimento-indicador"></span></p>
            </div>
            <div class="mt-4 flex gap-2">
                <button id="exportar-excel" class="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">
                    Exportar Excel
                </button>
                <button id="exportar-pdf" class="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                    Exportar PDF
                </button>
            </div>
        </div>

        <div class="w-full bg-white rounded p-4 mb-6 border shadow">
            <div class="flex gap-4 items-end">
            <div>
                <label for="filtro-inicio" class="block text-sm font-medium text-gray-700 mb-1">Início:</label>
                <input type="month" id="filtro-inicio" class="border px-3 py-2 rounded w-40">
            </div>
            <div>
                <label for="filtro-fim" class="block text-sm font-medium text-gray-700 mb-1">Fim:</label>
                <input type="month" id="filtro-fim" class="border px-3 py-2 rounded w-40">
            </div>
            <button id="btn-aplicar-filtro-periodo" class="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-800">
                Aplicar Filtro
            </button>
            </div>
        </div>

        <div class="w-full bg-white rounded p-4 mb-6 border shadow overflow-auto max-h-[300px]">
            <h3 class="text-lg font-semibold mb-3">Histórico de Preenchimentos</h3>
            <table class="w-full text-sm text-left border">
                <thead class="bg-gray-100 text-gray-700">
                    <tr>
                        <th class="px-4 py-2 border">Data</th>
                        <th class="px-4 py-2 border">Valor</th>
                        <th class="px-4 py-2 border">Meta</th>
                        <th class="px-4 py-2 border">Status</th>
                        <th class="px-4 py-2 border">Comentários</th>
                        <th class="px-4 py-2 border">Provas</th>
                    </tr>
                </thead>
                <tbody id="corpo-historico-modal"></tbody>
            </table>
            ${podeEditar ? `
            <div class="mt-4 flex gap-2 flex-wrap">
                <button class="abrir-edicao-multipla bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-800"
                        data-indicador-id="${indicador.id}"
                        data-indicador-nome="${indicador.nome}">
                    Editar Valor
                </button>
            </div>
            ` : ''}
        </div>

        <div class="w-full bg-white rounded p-4 border shadow">
            <h3 class="text-lg font-semibold mb-3">Gráfico de Desempenho</h3>
            <div class="w-full max-w-4xl mx-auto overflow-x-auto">
                <div class="w-full h-[300px] md:h-[350px] lg:h-[400px]">
                    <canvas id="grafico-desempenho" class="w-full h-full"></canvas>
                </div>
            </div>
        </div>
    `;

    // 🟦 Preencher dados do topo do modal
    document.getElementById('titulo-indicador').textContent = indicador.nome;
    document.getElementById('tipo-meta-indicador').textContent = indicador.tipo_meta;
    document.getElementById('setor-indicador').textContent = indicador.setor_nome;
    document.getElementById('meta-indicador').textContent = formatarValorComTipo(indicador.valor_meta, indicador.tipo_valor);
    document.getElementById('responsavel-indicador').textContent = indicador.responsavel || '—';
    document.getElementById('ultimo-preenchimento-indicador').textContent = indicador.ultimaAtualizacao
        ? new Date(indicador.ultimaAtualizacao).toLocaleDateString('pt-BR') : 'Sem dados';

    // 🟨 Preencher a tabela de histórico
    const corpoTabela = document.getElementById('corpo-historico-modal');
    corpoTabela.innerHTML = '';

    (indicador.historico || [])
    .sort((a, b) => new Date(a.data) - new Date(b.data))
    .forEach(item => {
        const data = new Date(item.data);
        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const chave = `${ano}-${mes}`;

        // Busca a meta mensal atualizada
        const metaMensal = indicador.metas_mensais?.find(m => m.mes.startsWith(chave));
        const metaFinal = metaMensal ? parseFloat(metaMensal.valor_meta) : parseFloat(item.meta);

        const atingido = verificarAtingimento(indicador.tipo_meta, parseFloat(item.valor), metaFinal);

        const statusTexto = atingido
            ? '✅ Atingida'
            : (indicador.tipo_meta === 'monitoramento' ? '📊 Monitoramento' : '❌ Não Atingida');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-4 py-2 border">${data.toLocaleDateString('pt-BR')}</td>
            <td class="px-4 py-2 border">${formatarValorComTipo(item.valor, indicador.tipo_valor)}</td>
            <td class="px-4 py-2 border">${formatarValorComTipo(metaFinal, indicador.tipo_valor)}</td>
            <td class="px-4 py-2 border">${statusTexto}</td>
            <td class="px-4 py-2 border text-center">
                <button class="text-blue-600 underline text-sm hover:text-blue-800" onclick="abrirComentarioPopup('${item.comentario?.replace(/'/g, "\\'") || ''}')">
                    Ver
                </button>
            </td>
            <td class="px-4 py-2 border text-center">
                ${item.provas?.length > 0
                    ? `<button class="text-blue-600 underline text-sm hover:text-blue-800" onclick="abrirProvasPopup('${item.provas[0]}')">Abrir</button>`
                    : '-'}
            </td>
        `;
        corpoTabela.appendChild(tr);
    });

    // 🧠 Fechar modal
    const btnFechar = document.getElementById('fechar-modal');
    if (btnFechar) {
        btnFechar.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }

    // 🔍 Filtrar histórico
    aplicarFiltroHistorico(indicador, "", "");

    // 📨 Buscar responsável do último preenchimento
    fetch(`${window.API_BASE_URL}/api/preenchimentos/?indicador=${indicador.id}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(res => res.json())
        .then(preenchimentos => {
            if (!preenchimentos.length) return;

            const ultimo = preenchimentos[preenchimentos.length - 1];
            const responsavel = ultimo?.preenchido_por?.first_name || ultimo?.preenchido_por?.username || "—";
            const data = ultimo?.data_preenchimento
                ? new Date(ultimo.data_preenchimento).toLocaleDateString("pt-BR")
                : "—";

            document.getElementById("responsavel-indicador").textContent = responsavel;
            document.getElementById("ultimo-preenchimento-indicador").textContent = data;
        })
        .catch(error => {
            console.error("Erro ao buscar último preenchimento:", error);
        });


    modal.classList.remove("hidden");

    ativarEdicaoMultiplaDeValor();

    // 🟢 Exportar histórico em Excel
    document.getElementById('exportar-excel').addEventListener('click', () => {
        const dados = (indicador.historico || []).map(item => ({
            Data: (() => {
            if (!item.data || isNaN(new Date(item.data).getTime())) return '—';
            return new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            })(),
            "Valor Realizado": parseFloat(item.valor).toLocaleString('pt-BR', {
                minimumFractionDigits: 2
            }),
            "Meta": parseFloat(item.meta).toLocaleString('pt-BR', { // Use item.meta directly
                minimumFractionDigits: 2
            }),
            "Status": verificarAtingimento(indicador.tipo_meta, item.valor, item.meta) ? "✅ Atingida" : "❌ Não Atingida",
            "Comentário": item.comentario || "-",
            "Provas": item.provas?.length > 0 ? item.provas[0] : "-"
        }));

        const worksheet = XLSX.utils.json_to_sheet(dados);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Histórico");

        XLSX.writeFile(workbook, `${indicador.nome}_historico.xlsx`);
    });

    // 🔴 Exportar o conteúdo do modal completo em PDF
    document.getElementById('exportar-pdf').addEventListener('click', () => {

        const elemento = document.getElementById('modal-content');

        const options = {
            margin: 0.3,
            filename: `${indicador.nome}_detalhes.pdf`,
            image: {
                type: 'jpeg',
                quality: 0.98
            },
            html2canvas: {
                scale: 2
            },
            jsPDF: {
                unit: 'in',
                format: 'a4',
                orientation: 'portrait'
            }
        };

        html2pdf().from(elemento).set(options).save();
    });

    // ✅ AGORA SIM – O canvas já está no DOM
    const canvas = document.getElementById('grafico-desempenho');
    if (canvas) {
        const ctx = canvas.getContext('2d');

        if (window.graficoDesempenho) {
            window.graficoDesempenho.destroy();
        }

        window.graficoDesempenho = new Chart(ctx, {
            type: 'line',
            data: {
                labels: (indicador.historico || []).map(item => (() => {
                if (!item.data || isNaN(new Date(item.data).getTime())) return '—';
                return new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                })()),
                datasets: [{
                        label: 'Valor',
                        data: (indicador.historico || []).map(item => item.valor),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Meta',
                        data: (indicador.historico || []).map(item => parseFloat(item.meta)), // Use item.meta directly
                        borderColor: '#ef4444',
                        borderDash: [5, 5],
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
    }

    // Mostrar o modal
    modal.classList.remove('hidden');

    document.getElementById('btn-aplicar-filtro-periodo').addEventListener('click', () => {
        const dataInicio = document.getElementById('filtro-inicio').value;
        const dataFim = document.getElementById('filtro-fim').value;
        aplicarFiltroHistorico(indicador, dataInicio, dataFim);
    });
}

// Inicializar a página (este bloco é executado após o DOM ser carregado)
document.addEventListener('DOMContentLoaded', () => {
    carregarUsuarioLogado(); // Esta função não foi fornecida, assumindo que existe em outro lugar.

    // Configurar eventos de filtro
    const filtroSetor = document.getElementById('filter-setor');
    const filtroAno = document.getElementById('filter-ano'); // Novo filtro de ano
    const filtroMes = document.getElementById('filter-mes'); // Renomeado de filter-periodo
    const filtroStatus = document.getElementById('filter-status');
    const limparFiltros = document.getElementById('limpar-filtros');

    // Event listeners agora chamam aplicarFiltros
    filtroSetor.addEventListener('change', aplicarFiltros);
    filtroAno.addEventListener('change', () => {
        popularMesesDoAnoSelecionado(filtroAno.value);
        aplicarFiltros(); // Aplica o filtro após mudar o ano e popular os meses
    });
    filtroMes.addEventListener('change', aplicarFiltros);
    filtroStatus.addEventListener('change', aplicarFiltros);

    limparFiltros.addEventListener('click', () => {
        filtroSetor.value = 'todos';
        filtroAno.value = 'todos'; // Resetar ano
        popularMesesDoAnoSelecionado('todos'); // Repopular meses para todos os anos
        filtroMes.value = 'mes-atual'; // Resetar mês
        filtroStatus.value = 'todos';
        aplicarFiltros(); // reseta os filtros
    });

    // // Configurar evento para o botão de perfil
    // const profileButton = document.getElementById('profileButton');
    // const profileMenu = document.getElementById('profileMenu');

    // profileButton.addEventListener('click', () => {
    //     profileMenu.classList.toggle('hidden');
    // });

    // Fechar modais ao clicar fora deles
    const detalheModal = document.getElementById('detalhe-modal');

    detalheModal.addEventListener('click', (e) => {
        if (e.target === detalheModal) {
            detalheModal.classList.add('hidden');
        }
    });
});


// Função para preencher os selects de ano e mês
function preencherFiltrosAnoMes() {
    const selectAno = document.getElementById('filter-ano');
    const selectMes = document.getElementById('filter-mes');

    if (!selectAno || !selectMes) return;

    // Limpa e adiciona a opção padrão para Ano
    selectAno.innerHTML = `<option value="todos">Todos os Anos</option>`;

    // Coleta anos e meses disponíveis
    indicadoresComValoresGlobais.forEach(indicador => {
        (indicador.historico || []).forEach(item => {
            const date = new Date(item.data);
            const year = date.getFullYear().toString();
            const month = String(date.getMonth() + 1).padStart(2, '0');

            if (!periodosDisponiveis[year]) {
                periodosDisponiveis[year] = new Set();
            }
            periodosDisponiveis[year].add(month);
        });
    });

    const sortedYears = Object.keys(periodosDisponiveis).sort((a, b) => parseInt(a) - parseInt(b));

    sortedYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        selectAno.appendChild(option);
    });

    // Inicializa o select de meses com base na seleção padrão de "Todos os Anos"
    popularMesesDoAnoSelecionado(selectAno.value);
}

// Função para popular o select de meses com base no ano selecionado
function popularMesesDoAnoSelecionado(selectedYear) {
    const selectMes = document.getElementById('filter-mes');
    if (!selectMes) return;

    selectMes.innerHTML = `<option value="todos">Todos os Meses</option>`;
    // Adiciona "Mês Atual" apenas se nenhum ano específico for selecionado,
    // pois "Mês Atual" se refere ao último preenchimento geral.
    if (selectedYear === 'todos') {
        selectMes.innerHTML += `<option value="mes-atual">Mês Atual</option>`;
    }


    let mesesParaAdicionar = new Set();
    if (selectedYear === 'todos') {
        // Se "Todos os Anos", coleta todos os meses únicos de todos os anos
        Object.values(periodosDisponiveis).forEach(mesesSet => {
            mesesSet.forEach(mes => mesesParaAdicionar.add(mes));
        });
    } else if (periodosDisponiveis[selectedYear]) {
        // Se um ano específico, coleta os meses daquele ano
        periodosDisponiveis[selectedYear].forEach(mes => mesesParaAdicionar.add(mes));
    }

    const sortedMonths = Array.from(mesesParaAdicionar).sort((a, b) => parseInt(a) - parseInt(b));

    sortedMonths.forEach(month => {
        const monthName = new Date(2000, parseInt(month) - 1, 1).toLocaleString('pt-BR', {
            month: 'long'
        });
        const option = document.createElement('option');
        option.value = month;
        option.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        selectMes.appendChild(option); // Corrigido de 'opt' para 'option'
    });
}

function aplicarFiltroHistorico(indicador, dataInicio = "", dataFim = "") {
    const corpoTabela = document.getElementById('corpo-historico-modal');
    const canvas = document.getElementById('grafico-desempenho');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    corpoTabela.innerHTML = '';

    const inicio = dataInicio
        ? new Date(parseInt(dataInicio.split("-")[0]), parseInt(dataInicio.split("-")[1]) - 1, 1)
        : null;

    const fim = dataFim
        ? new Date(parseInt(dataFim.split("-")[0]), parseInt(dataFim.split("-")[1]) - 1, 1)
        : null;


    const historicoFiltrado = (indicador.historico || []).filter(item => {
        const data = new Date(item.data);
        if (inicio && data < inicio) return false;
        if (fim && data > fim) return false;
        return true;
    });

    historicoFiltrado.forEach(item => {
        const data = new Date(item.data);
        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const chave = `${ano}-${mes}`;
        const metaMensal = indicador.metas_mensais?.find(m => m.mes.startsWith(chave));
        const metaFinal = metaMensal ? parseFloat(metaMensal.valor_meta) : parseFloat(item.meta);

        const atingido = verificarAtingimento(indicador.tipo_meta, Number(item.valor), metaFinal);
        const statusTexto = atingido
            ? '✅ Atingida'
            : (indicador.tipo_meta === 'monitoramento' ? '📊 Monitoramento' : '❌ Não Atingida');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-4 py-2 border">${new Date(item.data).toLocaleDateString('pt-BR')}</td>
            <td class="px-4 py-2 border">${formatarValorComTipo(item.valor, indicador.tipo_valor)}</td>
            <td class="px-4 py-2 border">${formatarValorComTipo(metaFinal, indicador.tipo_valor)}</td>
            <td class="px-4 py-2 border">${statusTexto}</td>
            <td class="px-4 py-2 border text-center">
                <button class="text-blue-600 underline text-sm hover:text-blue-800" onclick="abrirComentarioPopup('${item.comentario?.replace(/'/g, "\\'") || ''}')">
                    Ver
                </button>
            </td>
            <td class="px-4 py-2 border text-center">
                ${item.provas?.length > 0
                    ? `<button class="text-blue-600 underline text-sm hover:text-blue-800" onclick="abrirProvasPopup('${item.provas[0]}')">Abrir</button>`
                    : '-'}
            </td>
        `;
        corpoTabela.appendChild(tr);
    });

    if (window.graficoDesempenho) {
        window.graficoDesempenho.destroy();
    }

    window.graficoDesempenho = new Chart(ctx, {
        type: 'line',
        data: {
            labels: historicoFiltrado.map(item =>
                new Date(item.data).toLocaleDateString('pt-BR')
            ),
            datasets: [
                {
                    label: 'Valor',
                    data: historicoFiltrado.map(item => item.valor),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Meta',
                    data: historicoFiltrado.map(item => {
                        const data = new Date(item.data);
                        const ano = data.getFullYear();
                        const mes = String(data.getMonth() + 1).padStart(2, '0');
                        const chave = `${ano}-${mes}`;
                        const metaMensal = indicador.metas_mensais?.find(m => m.mes.startsWith(chave));
                        return metaMensal ? parseFloat(metaMensal.valor_meta) : parseFloat(item.meta);
                    }),
                    borderColor: '#ef4444',
                    borderDash: [5, 5],
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

// Aplica os filtros selecionados
function aplicarFiltros() {
    const setorSelecionado = document.getElementById('filter-setor').value;
    const statusSelecionado = document.getElementById('filter-status').value;
    const anoSelecionado = document.getElementById('filter-ano').value;
    const mesSelecionado = document.getElementById('filter-mes').value; // Agora é o filtro de mês

    let dadosFiltradosTemporarios = [...indicadoresComValoresGlobais]; // Começa com todos os dados processados

    // 1. Filtrar por setor
    if (setorSelecionado !== 'todos') {
        dadosFiltradosTemporarios = dadosFiltradosTemporarios.filter(ind =>
            ind.setor_nome?.toLowerCase().includes(setorSelecionado.replace(/-/g, ''))
        );
    }

    // 2. Ajustar dados com base no filtro de Ano/Mês
    let indicadoresParaRenderizar = [];

    dadosFiltradosTemporarios.forEach(indicadorOriginal => {
        let valorNoPeriodo = null;
        let metaNoPeriodo = parseFloat(indicadorOriginal.valor_meta); // Meta padrão do indicador
        let ultimaAtualizacaoNoPeriodo = null;
        let comentariosNoPeriodo = indicadorOriginal.comentarios;
        let provasNoPeriodo = indicadorOriginal.provas;
        let responsavelNoPeriodo = indicadorOriginal.responsavel;
        let variacaoNoPeriodo = indicadorOriginal.variacao; // Variacao padrão (a mais recente)

        // Se "Mês Atual" está selecionado ou nenhum filtro de ano/mês está ativo, usa os valores mais recentes
        if (mesSelecionado === 'mes-atual' || (anoSelecionado === 'todos' && mesSelecionado === 'todos')) {
            valorNoPeriodo = indicadorOriginal.valor_atual;
            metaNoPeriodo = parseFloat(indicadorOriginal.valor_meta); // Volta para a meta geral do indicador
            ultimaAtualizacaoNoPeriodo = indicadorOriginal.ultimaAtualizacao;
            comentariosNoPeriodo = indicadorOriginal.comentarios;
            provasNoPeriodo = indicadorOriginal.provas;
            responsavelNoPeriodo = indicadorOriginal.responsavel;
            variacaoNoPeriodo = indicadorOriginal.variacao; // Mantém a variação geral
        } else {
            // Filtrar histórico para encontrar o preenchimento mais recente no período selecionado
            const preenchimentoDoPeriodo = (indicadorOriginal.historico || [])
                .filter(item => {
                    const itemDate = new Date(item.data);
                    const itemYear = itemDate.getFullYear().toString();
                    const itemMonth = String(itemDate.getMonth() + 1).padStart(2, '0');

                    const matchesYear = anoSelecionado === 'todos' || itemYear === anoSelecionado;
                    const matchesMonth = mesSelecionado === 'todos' || itemMonth === mesSelecionado;

                    return matchesYear && matchesMonth;
                })
                .sort((a, b) => new Date(b.data) - new Date(a.data)) // Pega o mais recente dentro do período
                .at(0);

            if (preenchimentoDoPeriodo) {
                valorNoPeriodo = preenchimentoDoPeriodo.valor;
                metaNoPeriodo = preenchimentoDoPeriodo.meta; // Usa a meta específica do mês se houver
                ultimaAtualizacaoNoPeriodo = preenchimentoDoPeriodo.data;
                comentariosNoPeriodo = preenchimentoDoPeriodo.comentario;
                provasNoPeriodo = preenchimentoDoPeriodo.provas;
                // Responsável do histórico não está diretamente no item, mantém o do indicador original por padrão.

                // Recalcular variação para o período selecionado em relação à meta do período
                if (metaNoPeriodo !== 0) {
                    variacaoNoPeriodo = ((valorNoPeriodo - metaNoPeriodo) / metaNoPeriodo) * 100;
                } else {
                    variacaoNoPeriodo = 0;
                }
            } else {
                // Se não há dados para o período selecionado, este indicador não será renderizado neste filtro
                return; // Pula este indicador
            }
        }

        // Cria uma nova representação do indicador com os valores do período filtrado
        const indicadorPeriodo = {
            ...indicadorOriginal,
            valor_atual: valorNoPeriodo,
            atingido: verificarAtingimento(indicadorOriginal.tipo_meta, valorNoPeriodo, metaNoPeriodo),
            variacao: parseFloat(variacaoNoPeriodo.toFixed(2)),
            valor_meta: metaNoPeriodo,
            ultimaAtualizacao: ultimaAtualizacaoNoPeriodo,
            comentarios: comentariosNoPeriodo,
            provas: provasNoPeriodo,
            responsavel: responsavelNoPeriodo
        };
        indicadoresParaRenderizar.push(indicadorPeriodo);
    });


    // 3. Filtrar por status (aplicado após a adaptação dos valores por período)
    if (statusSelecionado !== 'todos') {
        indicadoresParaRenderizar = indicadoresParaRenderizar.filter(ind => {
            if (statusSelecionado === 'atingidos') return ind.atingido === true;
            if (statusSelecionado === 'nao-atingidos') return ind.atingido === false;
            return true;
        });
    }

    renderizarIndicadores(indicadoresParaRenderizar);
}


document.getElementById('filter-setor').addEventListener('change', aplicarFiltros);
// Event listener para filter-ano e filter-mes configurados dentro de DOMContentLoaded

document.getElementById('limpar-filtros').addEventListener('click', () => {
    document.getElementById('filter-setor').value = 'todos';
    document.getElementById('filter-ano').value = 'todos';
    popularMesesDoAnoSelecionado('todos'); // Repopular o select de meses para "Todos os Anos"
    document.getElementById('filter-mes').value = 'mes-atual';
    document.getElementById('filter-status').value = 'todos';

    aplicarFiltros(); // reseta os filtros
});

function preencherSelectSetores() {
    const token = localStorage.getItem("access");
    const select = document.getElementById("filter-setor");

    if (!select) return;

    fetch(`${window.API_BASE_URL}/api/setores/`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        .then(res => {
            if (!res.ok) throw new Error("Erro ao carregar setores.");
            return res.json();
        })
        .then(data => {
            const setores = data.results || data;
            select.innerHTML = '<option value="todos">Todos os Setores</option>';

            setores.forEach(setor => {
                const opt = document.createElement("option");
                opt.value = setor.nome.toLowerCase().replace(/\s+/g, '-'); // ex: "Produtos Green" → "produtos-green"
                opt.textContent = setor.nome;
                select.appendChild(opt);
            });
        })
        .catch(err => {
            console.error("Erro ao preencher setores:", err);
        });
}

function abrirComentarioPopup(texto) {
    document.getElementById('conteudo-comentario').textContent = texto || 'Nenhum comentário disponível.';
    document.getElementById('popup-comentario').classList.remove('hidden');
}

function fecharPopupComentario() {
    document.getElementById('popup-comentario').classList.add('hidden');
}

function abrirProvasPopup(url) {
    const link = document.getElementById('link-prova');
    link.href = url;
    document.getElementById('popup-provas').classList.remove('hidden');
}

function fecharPopupProvas() {
    document.getElementById('popup-provas').classList.add('hidden');
}

function ativarEdicaoMultiplaDeValor() {
  document.querySelectorAll(".abrir-edicao-multipla").forEach(botao => {
    botao.addEventListener("click", () => {
      const indicadorId = botao.dataset.indicadorId;
      const indicadorNome = botao.dataset.indicadorNome;

      const dataInicio = document.getElementById("filtro-inicio").value;
      const dataFim = document.getElementById("filtro-fim").value;

      if (!dataInicio || !dataFim) {
        alert("Selecione o intervalo de mês e ano para editar.");
        return;
      }

      const mesesIntervalo = gerarIntervaloDeMeses(dataInicio, dataFim);
      const indicador = indicadoresComValoresGlobais.find(i => i.id == indicadorId);

      const form = document.getElementById("form-valores-multiplos");
      form.innerHTML = '';

      // Filtrar preenchimentos que caem no intervalo
      const preenchimentosFiltrados = indicador.historico.filter(p => {
        const data = new Date(p.data);
        return mesesIntervalo.some(m => {
            const chaveData = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
            const chaveComparacao = m.slice(0, 7); // "YYYY-MM" de cada item do intervalo
            return chaveData === chaveComparacao;
        });
      });

      if (preenchimentosFiltrados.length === 0) {
        alert("Nenhum preenchimento encontrado no período selecionado.");
        return;
      }

      preenchimentosFiltrados.forEach(p => {
            const data = new Date(p.data);
            const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
            form.innerHTML += `
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">${chave}</label>
                <input type="number" step="0.01" name="valor-${p.id}" value="${p.valor}" class="w-full border px-3 py-2 rounded" />
            </div>
            `;
        });

      document.getElementById("editar-valores-modal").classList.remove("hidden");

      // Botão cancelar
      document.getElementById("cancelar-edicao-valores").onclick = () => {
        document.getElementById("editar-valores-modal").classList.add("hidden");
      };

      // Botão salvar
      document.getElementById("salvar-valores-multiplos").onclick = async () => {
        const token = localStorage.getItem("access");
        const campos = document.querySelectorAll("#form-valores-multiplos input");
        let erros = 0;

        for (const campo of campos) {
          const preenchimentoId = campo.name.split("-")[1];
          const novoValor = parseFloat(campo.value);

          if (isNaN(novoValor)) {
            alert("Valor inválido: " + campo.value);
            erros++;
            continue;
          }

          try {
            const response = await fetch(`${window.API_BASE_URL}/api/preenchimentos/${preenchimentoId}/`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ valor_realizado: novoValor })
            });

            if (!response.ok) {
              console.error("Erro ao atualizar:", preenchimentoId);
              erros++;
            }
          } catch (err) {
            console.error("Erro:", err);
            erros++;
          }
        }

        if (erros === 0) {
          alert("Todos os valores atualizados com sucesso.");
        } else {
          alert("Alguns valores não puderam ser atualizados. Verifique o console.");
        }

        document.getElementById("editar-valores-modal").classList.add("hidden");
        location.reload();
      };
    });
  });
}