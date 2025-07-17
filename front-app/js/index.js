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

if (!token) {
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {

    const perfil = localStorage.getItem("perfil_usuario");
    if (perfil !== "master") {
        alert("Acesso negado. Esta página é exclusiva para perfil master.");
        window.location.href = "indexgestores.html";
    }

    preencherSelectSetores();

    Promise.all([
            fetch('http://127.0.0.1:8000/api/indicadores/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }).then(res => res.json()),
            fetch('http://127.0.0.1:8000/api/preenchimentos/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }).then(res => res.json()),
            fetch('http://127.0.0.1:8000/api/metas-mensais/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }).then(res => res.json())
        ])
        .then(([indicadoresData, preenchimentosData, metasMensaisData]) => {
            const indicadoresBase = indicadoresData.results || indicadoresData;
            const preenchimentos = preenchimentosData.results || preenchimentosData;
            const metasMensais = metasMensaisData.results || metasMensaisData;

            const indicadoresCalculados = indicadoresBase
                .map(indicador => {
                    const preenchimentosDoIndicador = preenchimentos.filter(p => p.indicador === indicador.id);
                    const metasDoIndicador = metasMensais.filter(m => m.indicador === indicador.id);

                    preenchimentosDoIndicador.sort((a, b) => new Date(a.data_preenchimento) - new Date(b.data_preenchimento));

                    const historico = preenchimentosDoIndicador.map(p => {
                        const dataPreenchimento = new Date(p.data_preenchimento);
                        const mes = `${dataPreenchimento.getFullYear()}-${String(dataPreenchimento.getMonth() + 1).padStart(2, '0')}-01`;

                        const metaDoMes = metasDoIndicador.find(m => m.mes === mes);
                        const metaValor = metaDoMes ? parseFloat(metaDoMes.valor_meta) : parseFloat(indicador.valor_meta);

                        return {
                            data: p.data_preenchimento,
                            valor: p.valor_realizado,
                            meta: metaValor,
                            comentario: p.comentario,
                            provas: p.arquivo ? [p.arquivo] : []
                        };
                    });

                    const ultimoPreenchimento = preenchimentosDoIndicador.at(-1);
                    let variacao = 0;
                    if (ultimoPreenchimento && indicador.valor_meta) {
                        const valor = parseFloat(ultimoPreenchimento.valor_realizado);
                        const meta = parseFloat(indicador.valor_meta);
                        if (!isNaN(valor) && !isNaN(meta) && meta !== 0) {
                            variacao = ((valor - meta) / meta) * 100;
                        }
                    }

                    return {
                        ...indicador,
                        valor_atual: ultimoPreenchimento?.valor_realizado || 0,
                        atingido: verificarAtingimento(
                            indicador.tipo_meta,
                            ultimoPreenchimento?.valor_realizado,
                            parseFloat(indicador.valor_meta)
                        ),
                        variacao: parseFloat(variacao.toFixed(2)),
                        responsavel: ultimoPreenchimento?.nome_usuario || 'Desconhecido',
                        ultimaAtualizacao: ultimoPreenchimento?.data_preenchimento || null,
                        comentarios: ultimoPreenchimento?.comentario || '',
                        origem: ultimoPreenchimento?.origem || '',
                        provas: ultimoPreenchimento?.arquivo ? [ultimoPreenchimento.arquivo] : [],
                        historico: historico
                    };
                })
                .filter(indicador => indicador.ultimaAtualizacao !== null); // <- só exibe preenchidos

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
        const formatarValor = (valor) => {
            if (valor >= 1000) {
                return parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            }
            return parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        };

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
                    Atual: ${formatarValor(indicador.valor_atual)} / Meta: ${formatarValor(indicador.valor_meta)}
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

    // Formatação do valor e meta
    const formatarValor = (valor) => {
        if (valor >= 1000) {
            return parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        }
        return parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    };

    // Criar conteúdo do modal
    modalContent.innerHTML = `
        <div class="w-full bg-white rounded p-4 mb-6 border shadow">
            <button id="fechar-modal" class="absolute top-4 right-4 text-white hover:text-gray-700 text-xl font-bold focus:outline-none">
                ✕
            </button>
            <h2 id="titulo-indicador" class="text-2xl font-bold text-blue-800 mb-2">Nome do Indicador</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
                <p><strong>Tipo de Meta:</strong> <span id="tipo-meta-indicador"></span></p>
                <p><strong>Setor:</strong> <span id="setor-indicador"></span></p>
                <p><strong>Meta Esperada:</strong> R$ <span id="meta-indicador"></span></p>
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
            <label for="filtro-data-modal" class="block text-sm font-medium text-gray-700 mb-1">Filtrar histórico por mês/ano:</label>
            <input type="month" id="filtro-data-modal" class="border px-3 py-2 rounded w-48">
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
                <tbody id="corpo-historico-modal">
                    </tbody>
            </table>
            <div class="mt-4 flex gap-2 flex-wrap">
                <button id="editar-meta" data-id="${indicador.id}" class="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-800">
                    Editar Meta
                </button>
                <button id="solicitar-revisao" class="bg-yellow-500 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700">
                    Solicitar Revisão
                </button>
            </div>
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

    // ✅ Botão de fechar modal
    const btnFechar = document.getElementById('fechar-modal');
    if (btnFechar) {
        btnFechar.addEventListener('click', () => {
            document.getElementById('detalhe-modal').classList.add('hidden');
        });
    }

    // 🟦 Preencher os dados do topo do modal
    document.getElementById('titulo-indicador').textContent = indicador.nome;
    document.getElementById('tipo-meta-indicador').textContent = indicador.tipo_meta;
    document.getElementById('setor-indicador').textContent = indicador.setor_nome;
    document.getElementById('meta-indicador').textContent = indicador.valor_meta?.toLocaleString('pt-BR', {
        minimumFractionDigits: 2
    });
    document.getElementById('responsavel-indicador').textContent = indicador.responsavel;
    document.getElementById('ultimo-preenchimento-indicador').textContent = indicador.ultimaAtualizacao ?
        new Date(indicador.ultimaAtualizacao).toLocaleDateString('pt-BR') :
        'Sem dados';
    const filtroDataInput = document.getElementById('filtro-data-modal');
    if (filtroDataInput) {
        filtroDataInput.addEventListener('change', (e) => {
            const mesAnoSelecionado = e.target.value;
            aplicarFiltroHistorico(indicador, mesAnoSelecionado);
        });

        // Garantir que ao abrir o modal o histórico venha completo inicialmente
        aplicarFiltroHistorico(indicador, "");
    }


    // 🟨 Preencher a tabela de histórico
    const corpoTabela = document.getElementById('corpo-historico-modal');
    corpoTabela.innerHTML = '';

    (indicador.historico || []).forEach(item => {
        const tr = document.createElement('tr');

        const statusTexto = verificarAtingimento(
                indicador.tipo_meta,
                parseFloat(item.valor),
                parseFloat(item.meta)
            ) ?
            '✅ Atingida' :
            (indicador.tipo_meta === 'monitoramento' ? '📊 Monitoramento' : '❌ Não Atingida');

        tr.innerHTML = `
            <td class="px-4 py-2 border">${new Date(item.data).toLocaleDateString('pt-BR')}</td>
            <td class="px-4 py-2 border">R$ ${parseFloat(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td class="px-4 py-2 border">R$ ${parseFloat(item.meta).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
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

    // 🟢 Exportar histórico em Excel
    document.getElementById('exportar-excel').addEventListener('click', () => {
        const dados = (indicador.historico || []).map(item => ({
            Data: new Date(item.data).toLocaleDateString('pt-BR'),
            "Valor Realizado": parseFloat(item.valor).toLocaleString('pt-BR', {
                minimumFractionDigits: 2
            }),
            "Meta": parseFloat(item.meta).toLocaleString('pt-BR', {
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
                labels: (indicador.historico || []).map(item => new Date(item.data).toLocaleDateString('pt-BR')),
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
                        data: (indicador.historico || []).map(item => item.meta),
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


    function salvarMeta(indicadorId) {
        const novaMeta = document.getElementById('input-nova-meta').value;
        const token = localStorage.getItem('access');

        fetch(`http://127.0.0.1:8000/api/indicadores/${indicadorId}/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    meta: novaMeta
                })
            })
            .then(response => {
                if (response.ok) {
                    alert('Meta atualizada com sucesso!');
                    fecharModalMeta();
                    // carregarIndicadores(); // 🔥 Atualiza os cards no dashboard após salvar - Removido ou alterado
                    location.reload(); // Recarrega tudo para refletir a nova meta
                } else {
                    alert('Erro ao atualizar a meta.');
                }
            })
            .catch(error => {
                console.error('Erro:', error);
                alert('Erro na conexão com o servidor.');
            });
    }

    // Adicionar evento para o botão de editar meta
    document.getElementById('editar-meta').addEventListener('click', () => {
        const editarMetaModal = document.getElementById('editar-meta-modal');
        document.getElementById('editar-meta-nome').value = indicador.nome;
        document.getElementById('editar-meta-atual').value = indicador.valor_meta?.toLocaleString('pt-BR', {
            minimumFractionDigits: 2
        });
        document.getElementById('editar-meta-nova').value = indicador.valor_meta;
        editarMetaModal.dataset.id = indicador.id; // Guardar o ID no próprio modal
        editarMetaModal.classList.remove('hidden');
    });

    // Adicionar evento para o botão de solicitar revisão
    document.getElementById('solicitar-revisao').addEventListener('click', () => {
        alert(`Solicitação de revisão enviada para ${indicador.responsavel}`);
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

    // Configurar eventos do modal de edição de meta
    const editarMetaModal = document.getElementById('editar-meta-modal');
    const cancelarMeta = document.getElementById('cancelar-meta');
    const salvarMeta = document.getElementById('btn-salvar-meta');

    // Cancelar edição
    cancelarMeta.addEventListener('click', () => {
        editarMetaModal.classList.add('hidden');
    });

    // Salvar nova meta
    salvarMeta.addEventListener('click', () => {
        const novaMeta = parseFloat(document.getElementById('editar-meta-nova').value);
        const indicadorId = editarMetaModal.dataset.id;

        if (isNaN(novaMeta)) {
            alert("Insira um valor válido para a nova meta.");
            return;
        }

        fetch(`http://127.0.0.1:8000/api/indicadores/${indicadorId}/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    valor_meta: novaMeta
                })
            })
            .then(res => {
                if (!res.ok) throw new Error("Erro ao atualizar meta");
                return res.json();
            })
            .then(() => {
                alert("Meta atualizada com sucesso!");
                editarMetaModal.classList.add('hidden');
                document.getElementById('detalhe-modal').classList.add('hidden');
                location.reload(); // Recarrega tudo para refletir a nova meta
            })
            .catch(err => {
                console.error("Erro ao atualizar meta:", err);
                alert("Erro ao atualizar a meta.");
            });
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

    editarMetaModal.addEventListener('click', (e) => {
        if (e.target === editarMetaModal) {
            editarMetaModal.classList.add('hidden');
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
        selectMes.appendChild(option);
    });
}

function aplicarFiltroHistorico(indicador, mesAnoSelecionado) {
    const corpoTabela = document.getElementById('corpo-historico-modal');
    const canvas = document.getElementById('grafico-desempenho');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    corpoTabela.innerHTML = '';

    // Filtrar os itens pelo mês/ano
    const historicoFiltrado = (indicador.historico || []).filter(item => {
        const data = new Date(item.data);
        const anoMes = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        return mesAnoSelecionado === "" || anoMes === mesAnoSelecionado;
    });

    // Preencher tabela com dados filtrados
    historicoFiltrado.forEach(item => {
        const atingido = verificarAtingimento(indicador.tipo_meta, Number(item.valor), Number(item.meta));
        const statusTexto = atingido ?
            '✅ Atingida' :
            (indicador.tipo_meta === 'monitoramento' ? '📊 Monitoramento' : '❌ Não Atingida');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-4 py-2 border">${new Date(item.data).toLocaleDateString('pt-BR')}</td>
            <td class="px-4 py-2 border">R$ ${parseFloat(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td class="px-4 py-2 border">R$ ${parseFloat(item.meta).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
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

    // Atualizar gráfico
    if (window.graficoDesempenho) {
        window.graficoDesempenho.destroy();
    }

    window.graficoDesempenho = new Chart(ctx, {
        type: 'line',
        data: {
            labels: historicoFiltrado.map(item => new Date(item.data).toLocaleDateString('pt-BR')),
            datasets: [{
                    label: 'Valor',
                    data: historicoFiltrado.map(item => item.valor),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Meta',
                    data: historicoFiltrado.map(item => item.meta),
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