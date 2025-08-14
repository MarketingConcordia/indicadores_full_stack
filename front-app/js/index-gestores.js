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
                            id: p.id,
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
                )

                .filter(indicador => indicador.ativo); // <- NOVO FILTRO: só mostra indicadores ativos

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

    // 🎨 50 cores fixas mapeadas por ID de setor
    const coresSetores = {
        1: "#4f46e5",  // indigo
        2: "#ec4899",  // pink
        3: "#f59e0b",  // amber
        4: "#06b6d4",  // cyan
        5: "#10b981",  // emerald
        6: "#8b5cf6",  // violet
        7: "#f43f5e",  // rose
        8: "#0ea5e9",  // sky
        9: "#84cc16",  // lime
        10: "#6366f1", // indigo
        11: "#d946ef", // fuchsia
        12: "#64748b", // slate
        13: "#0891b2", // cyan
        14: "#22c55e", // green
        15: "#3b82f6", // blue
        16: "#ef4444", // red
        17: "#a855f7", // purple
        18: "#14b8a6", // teal
        19: "#f97316", // orange
        20: "#0d9488", // teal dark
        21: "#2563eb", // blue strong
        22: "#dc2626", // red strong
        23: "#15803d", // green dark
        24: "#7c3aed", // purple deep
        25: "#ca8a04", // yellow brown
        26: "#334155", // slate dark
        27: "#1d4ed8", // royal blue
        28: "#facc15", // yellow
        29: "#65a30d", // lime dark
        30: "#c026d3", // magenta
        31: "#f87171", // red light
        32: "#3f6212", // olive green
        33: "#0284c7", // blue cyan
        34: "#9333ea", // violet strong
        35: "#fbbf24", // amber light
        36: "#166534", // forest green
        37: "#9d174d", // pink deep
        38: "#0e7490", // cyan deep
        39: "#92400e", // brown
        40: "#1e293b", // dark slate
        41: "#fde047", // yellow bright
        42: "#5b21b6", // purple dark
        43: "#ea580c", // orange deep
        44: "#15803d", // green intense
        45: "#0369a1", // ocean blue
        46: "#f43f5e", // pink/red
        47: "#047857", // emerald deep
        48: "#7f1d1d", // maroon
        49: "#4338ca", // indigo deep
        50: "#d97706"  // amber deep
    };

    dados.forEach(indicador => {
        const card = document.createElement('div');
        card.className = `indicador-card bg-white rounded-lg shadow-md overflow-hidden relative`;
        card.dataset.id = indicador.id;

        // Barra de status (meta atingida ou não) no lado esquerdo
        const atingido = indicador.atingido;
        let statusClass = 'bg-red-500'; // padrão: não atingido
        let statusText = 'Meta não atingida';
        let statusIcon = '❌';

        if (indicador.tipo_meta === 'monitoramento') {
            statusClass = 'bg-blue-500'; // azul para monitoramento
            statusIcon = '📊'; // ícone para monitoramento
            statusText = 'Monitoramento';
        } else if (atingido) {
            statusClass = 'bg-green-500'; // verde se atingido
            statusIcon = '✅';
            statusText = 'Meta atingida';
        }

        const statusBar = `<div class="trend-bar ${statusClass}"></div>`;

        // Cor do setor pelo ID
        const corSetor = coresSetores[indicador.setor] || "#64748b";

        // Formatação do valor e meta
        const formatarValor = (valor) => {
            if (valor >= 1000) {
                return parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            }
            return parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        };

        // Variação com seta
        let variacaoIcon = '';
        let variacaoClass = '';
        let variacaoText = '';

        if (indicador.tipo_meta === 'crescente') {
            variacaoIcon = indicador.variacao >= 0 ? '↑' : '↓';
            variacaoClass = indicador.variacao >= 0 ? 'text-green-500' : 'text-red-500';
            variacaoText = `<span class="tooltip ${variacaoClass} font-semibold">${indicador.variacao >= 0 ? '+' : ''}${indicador.variacao}% ${variacaoIcon}<span class="tooltiptext">Comparado ao mês anterior ou meta do período</span></span>`;
        } else if (indicador.tipo_meta === 'decrescente') {
            variacaoIcon = indicador.variacao > 0 ? '↑' : '↓';
            variacaoClass = indicador.variacao < 0 ? 'text-green-500' : 'text-red-500';
            variacaoText = `<span class="tooltip ${variacaoClass} font-semibold">${indicador.variacao > 0 ? '+' : ''}${indicador.variacao}% ${variacaoIcon}<span class="tooltiptext">Comparado ao mês anterior ou meta do período</span></span>`;
        } else if (indicador.tipo_meta === 'monitoramento') {
            // Não exibe a variação para indicadores de monitoramento
            variacaoText = '';
        }

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
                    <span class="text-sm">${statusText}</span>
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

        <div id="historico-container" class="w-full bg-white rounded p-4 mb-6 border shadow overflow-auto max-h-[300px]">
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
            ${podeEditar ? `
            <td class="px-4 py-2 border text-center">
                <button class="text-blue-600 underline text-sm hover:text-blue-800" onclick="abrirModalEdicaoIndividual(${item.id}, ${item.valor})">
                    Editar Valor
                </button>
                <button class="text-blue-600 underline text-sm hover:text-blue-800" onclick="abrirModalEdicaoComentario(${item.id}, '${item.comentario?.replace(/'/g, "\\'") || ''}')">
                    Editar Comentário
                </button>
                <button class="text-blue-600 underline text-sm hover:text-blue-800" onclick="abrirModalEdicaoProva(${item.id}, '${item.provas[0] || ''}')">
                    Editar Prova
                </button>
            </td>
            ` : ''}
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
        const historicoContainer = document.getElementById('historico-container');
        
        // 1. Salvar os estilos originais
        const originalMaxHeight = historicoContainer.style.maxHeight;
        const originalOverflow = historicoContainer.style.overflow;
        
        // 2. Remover os estilos que causam o corte
        historicoContainer.style.maxHeight = 'none';
        historicoContainer.style.overflow = 'visible';

        const options = {
            margin: 0,
            filename: `${indicador.nome}_detalhes.pdf`,
            image: {
                type: 'jpeg',
                quality: 0.98
            },
            html2canvas: {
                scale: 3
            },
            jsPDF: {
                unit: 'in',
                format: 'a4',
                orientation: 'portrait'
            }
        };

        html2pdf().from(elemento).set(options).save().then(() => {
            // 3. Restaurar os estilos originais após a exportação
            historicoContainer.style.maxHeight = originalMaxHeight;
            historicoContainer.style.overflow = originalOverflow;
        });
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
    modal.classList.remove("hidden");

    document.getElementById('btn-aplicar-filtro-periodo').addEventListener('click', () => {
        const dataInicio = document.getElementById('filtro-inicio').value;
        const dataFim = document.getElementById('filtro-fim').value;
        aplicarFiltroHistorico(indicador, dataInicio, dataFim);
    });

    // Event listeners para os novos modais
    document.getElementById('cancelar-edicao-comentario').addEventListener('click', () => {
        document.getElementById('editar-comentario-modal').classList.add('hidden');
    });

    document.getElementById('salvar-comentario').addEventListener('click', salvarComentario);

    document.getElementById('cancelar-edicao-prova').addEventListener('click', () => {
        document.getElementById('editar-prova-modal').classList.add('hidden');
    });

    document.getElementById('salvar-prova').addEventListener('click', salvarProva);
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

    // Fechar modais ao clicar fora deles
    const detalheModal = document.getElementById('detalhe-modal');
    const editarValorUnicoModal = document.getElementById('editar-valor-unico-modal');
    const editarComentarioModal = document.getElementById('editar-comentario-modal');
    const editarProvaModal = document.getElementById('editar-prova-modal');

    detalheModal.addEventListener('click', (e) => {
        if (e.target === detalheModal) {
            detalheModal.classList.add('hidden');
        }
    });

    editarValorUnicoModal.addEventListener('click', (e) => {
        if (e.target === editarValorUnicoModal) {
            editarValorUnicoModal.classList.add('hidden');
        }
    });
    
    editarComentarioModal.addEventListener('click', (e) => {
        if (e.target === editarComentarioModal) {
            editarComentarioModal.classList.add('hidden');
        }
    });

    editarProvaModal.addEventListener('click', (e) => {
        if (e.target === editarProvaModal) {
            editarProvaModal.classList.add('hidden');
        }
    });

    // Event listeners para o novo modal de edição de valor único
    document.getElementById('cancelar-edicao-unico').addEventListener('click', () => {
        document.getElementById('editar-valor-unico-modal').classList.add('hidden');
    });

    document.getElementById('salvar-valor-unico').addEventListener('click', salvarValorUnico);
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
    const setorGestor = localStorage.getItem("setor_usuario");
    const podeEditar = indicador.setor_nome === setorGestor;

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
            <td class="px-4 py-2 border">
                ${formatarValorComTipo(item.valor, indicador.tipo_valor)}
                ${podeEditar ? `
                    <button class="text-blue-600 text-xs px-2 py-1 ml-2 rounded hover:text-blue-800" onclick="abrirModalEdicaoIndividual(${item.id}, ${item.valor})">
                    <i class="fas fa-edit"></i>
                    </button>` : ''
                }
            </td>
            <td class="px-4 py-2 border">${formatarValorComTipo(metaFinal, indicador.tipo_valor)}</td>
            <td class="px-4 py-2 border">${statusTexto}</td>
            <td class="px-4 py-2 border text-center">
                <button class="text-blue-600 underline text-sm hover:text-blue-800" onclick="abrirComentarioPopup('${item.comentario?.replace(/'/g, "\\'") || ''}')">
                    Ver
                </button>
                ${podeEditar ? `
                    <button class="text-blue-600 text-xs px-2 py-1 ml-2 rounded hover:text-blue-800" onclick="abrirModalEdicaoComentario(${item.id}, '${item.comentario?.replace(/'/g, "\\'") || ''}')">
                    <i class="fas fa-edit"></i>
                    </button>` : ''
                }
            </td>
            <td class="px-4 py-2 border text-center">
                ${item.provas?.length > 0
                    ? `<button class="text-blue-600 underline text-sm hover:text-blue-800" onclick="abrirProvasPopup('${item.provas[0]}')">Abrir</button>`
                    : '-'}
                ${podeEditar ? `
                    <button class="text-blue-600 text-xs px-2 py-1 ml-2 rounded hover:text-blue-800" onclick="abrirModalEdicaoProva(${item.id}, '${item.provas[0] || ''}')">
                    <i class="fas fa-edit"></i>
                    </button>` : ''
                }
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


// NOVA FUNÇÃO: Abre o modal de edição para um único valor
function abrirModalEdicaoIndividual(idPreenchimento, valorAtual) {
    const modal = document.getElementById('editar-valor-unico-modal');
    const input = document.getElementById('campo-novo-valor');
    input.value = valorAtual;
    input.dataset.preenchimentoId = idPreenchimento; // Salva o ID no dataset do input
    modal.classList.remove('hidden');
}

// NOVA FUNÇÃO: Salva o valor único editado
async function salvarValorUnico() {
    const token = localStorage.getItem("access");
    const input = document.getElementById('campo-novo-valor');
    const idPreenchimento = input.dataset.preenchimentoId;
    const novoValor = parseFloat(input.value);

    if (isNaN(novoValor)) {
        alert("Valor inválido.");
        return;
    }

    try {
        const response = await fetch(`${window.API_BASE_URL}/api/preenchimentos/${idPreenchimento}/`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ valor_realizado: novoValor })
        });

        if (!response.ok) {
            throw new Error(`Erro na API: ${response.statusText}`);
        }

        alert("Valor atualizado com sucesso.");
        document.getElementById('editar-valor-unico-modal').classList.add('hidden');
        location.reload(); // Recarrega a página para atualizar os dados
    } catch (err) {
        console.error("Erro ao atualizar o valor:", err);
        alert("Erro ao atualizar o valor. Verifique o console.");
    }
}

// NOVO: Abre o modal de edição para o comentário
function abrirModalEdicaoComentario(idPreenchimento, comentarioAtual) {
    const modal = document.getElementById('editar-comentario-modal');
    const textarea = document.getElementById('campo-novo-comentario');
    textarea.value = comentarioAtual;
    textarea.dataset.preenchimentoId = idPreenchimento;
    modal.classList.remove('hidden');
}

// NOVO: Salva o comentário editado
async function salvarComentario() {
    const token = localStorage.getItem("access");
    const textarea = document.getElementById('campo-novo-comentario');
    const idPreenchimento = textarea.dataset.preenchimentoId;
    const novoComentario = textarea.value;

    try {
        const response = await fetch(`${window.API_BASE_URL}/api/preenchimentos/${idPreenchimento}/`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ comentario: novoComentario })
        });

        if (!response.ok) {
            throw new Error(`Erro na API: ${response.statusText}`);
        }

        alert("Comentário atualizado com sucesso.");
        document.getElementById('editar-comentario-modal').classList.add('hidden');
        location.reload();
    } catch (err) {
        console.error("Erro ao atualizar o comentário:", err);
        alert("Erro ao atualizar o comentário. Verifique o console.");
    }
}

// Abre o modal de edição para a prova
function abrirModalEdicaoProva(idPreenchimento, provaAtual) {
    const modal = document.getElementById('editar-prova-modal');
    const provaInfo = document.getElementById('prova-atual-info');
    const nomeProva = document.getElementById('nome-prova-atual');
    const linkProva = document.getElementById('link-prova');
    const input = document.getElementById('campo-nova-prova');

    input.value = ''; // Reseta o campo de upload para evitar problemas

    if (provaAtual && provaAtual.trim() !== '') {
        const nomeArquivo = provaAtual.split('/').pop().split('?')[0];
        nomeProva.textContent = nomeArquivo;
        linkProva.href = provaAtual;
        provaInfo.classList.remove('hidden');
    } else {
        provaInfo.classList.add('hidden');
    }

    // Salva o ID no dataset do input para uso na função de salvar
    input.dataset.preenchimentoId = idPreenchimento;

    modal.classList.remove('hidden');
}

// Funcao corrigida, usa FormData para enviar o arquivo e simplifica a lógica
async function salvarProva() {
    const token = localStorage.getItem("access");
    const input = document.getElementById('campo-nova-prova');
    const idPreenchimento = input.dataset.preenchimentoId;
    const file = input.files[0];

    // Se nenhum arquivo for selecionado, não faz nada
    if (!file) {
        alert("Nenhum novo arquivo selecionado. A prova não foi alterada.");
        document.getElementById('editar-prova-modal').classList.add('hidden');
        return;
    }

    // ✅ Verificar se o arquivo excede 2MB
    if (file.size > 2 * 1024 * 1024) {
        alert("O arquivo é muito grande. O tamanho máximo permitido é 2MB.");
        return;
    }

    // Prepara o FormData
    let formData = new FormData();
    formData.append('arquivo', file);

    try {
        const response = await fetch(`${window.API_BASE_URL}/api/preenchimentos/${idPreenchimento}/`, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            let mensagemErro = `Erro na API: ${response.statusText}`;
            try {
                const erro = await response.json();
                console.error("Erro da API:", erro);
                mensagemErro = Object.values(erro).flat().join('\n');
            } catch (e) {
                console.error("Erro de parse do JSON:", e);
            }
            throw new Error(mensagemErro);
        }

        alert("Prova atualizada com sucesso.");
        document.getElementById('editar-prova-modal').classList.add('hidden');
        location.reload();
    } catch (err) {
        console.error("Erro ao atualizar a prova:", err);
        alert("Erro ao atualizar a prova:\n" + err.message);
    }
}