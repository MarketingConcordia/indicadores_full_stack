const token = localStorage.getItem('access');
let graficoDesempenho = null;

if (!token) {
    window.location.href = 'login.html';
}

let indicadores = [];

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access');

    const perfil = localStorage.getItem("perfil_usuario");
    if (perfil !== "master") {
      alert("Acesso negado. Esta página é exclusiva para perfil master.");
      window.location.href = "indexgestores.html";
    }

    preencherSelectSetores();

    Promise.all([
        fetch('http://127.0.0.1:8000/api/indicadores/', {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json()),
        fetch('http://127.0.0.1:8000/api/preenchimentos/', {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json())
    ])
    .then(([indicadoresData, preenchimentosData]) => {
        const indicadores = indicadoresData.results || indicadoresData;
        const preenchimentos = preenchimentosData.results || preenchimentosData;

        console.log('📦 Indicadores recebidos:', indicadores);
        console.log('📝 Preenchimentos recebidos:', preenchimentos);

        const indicadoresComValores = indicadores.map(indicador => {
            const preenchimento = preenchimentos.find(p => p.indicador === indicador.id);
            return {
                ...indicador,
                valor_atual: preenchimento?.valor_realizado || 0,
                atingido: preenchimento?.valor_realizado >= parseFloat(indicador.valor_meta),
                responsavel: preenchimento?.nome_usuario || 'Desconhecido',
                ultimaAtualizacao: preenchimento?.data_preenchimento || null,
                comentarios: preenchimento?.comentario || '',
                origem: preenchimento?.origem || '',
                provas: preenchimento?.arquivo ? [preenchimento.arquivo] : [],
                historico: [] // Pode ser atualizado depois
            };
        });

        renderizarIndicadores(indicadoresComValores);
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
                const coresSetores = {   // FAZER COM QUE ISSO SEJA DE FORMA RANDOMICA!!!
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
                    "Projetos": "#14b8a6"  // teal
                    };
                    
                    dados.forEach(indicador => {
                        const card = document.createElement('div');
                        card.className = `indicador-card bg-white rounded-lg shadow-md overflow-hidden relative`;
                        card.dataset.id = indicador.id;
                        
                        // Barra de status (meta atingida ou não) no lado esquerdo
                        const statusClass = indicador.status === 'atingido' ? 'bg-green-500' : 'bg-red-500';
                        const statusBar = `<div class="trend-bar ${statusClass}"></div>`;
                        
                        // Cor de fundo para o badge do setor
                        const corSetor = coresSetores[indicador.setor_nome] || "#64748b"; // cor padrão se não encontrar
                        
                        // Formatação do valor e meta
                        const formatarValor = (valor) => {
                            if (valor >= 1000) {
                                return valor.toLocaleString('pt-BR');
                            }
                            return valor;
                            };
                            
                            // Variação com seta
                            const variacaoIcon = indicador.variacao >= 0 ? '↑' : '↓';
                            const variacaoClass = indicador.variacao >= 0 ? 'text-green-500' : 'text-red-500';
                            const variacaoText = `<span class="tooltip ${variacaoClass} font-semibold">${indicador.variacao >= 0 ? '+' : ''}${indicador.variacao}% ${variacaoIcon}<span class="tooltiptext">Comparado ao mês anterior</span></span>`;
                            
                            // Status icon
                            const statusIcon = indicador.status === 'atingido' ? '✅' : '❌';
                            
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
                    <span class="text-sm">${indicador.status === 'atingido' ? 'Meta atingida' : 'Meta não atingida'}</span>
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
                    return valor.toLocaleString('pt-BR');
                }
                return valor;
                };
                
                // Criar conteúdo do modal
                modalContent.innerHTML = `
                <!-- TOPO -->
                <div class="w-full bg-white rounded p-4 mb-6 border shadow">
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
                    <button id="fechar-modal" class="ml-auto text-gray-500 hover:text-gray-700">
                        ✕ Fechar
                    </button>
                    </div>
                </div>

                <!-- FILTRO DE DATA -->
                <div class="w-full bg-white rounded p-4 mb-6 border shadow">
                    <label for="filtro-data-modal" class="block text-sm font-medium text-gray-700 mb-1">Filtrar histórico por mês/ano:</label>
                    <input type="month" id="filtro-data-modal" class="border px-3 py-2 rounded w-48">
                </div>

                <!-- HISTÓRICO -->
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
                        <!-- Conteúdo dinâmico via JS -->
                    </tbody>
                    </table>
                </div>

                <!-- GRÁFICO -->
                <div class="w-full bg-white rounded p-4 border shadow">
                    <h3 class="text-lg font-semibold mb-3">Gráfico de Desempenho</h3>
                    <canvas id="grafico-desempenho" class="w-full h-64"></canvas>
                </div>
        `;

        // 🟦 Preencher os dados do topo do modal
        document.getElementById('titulo-indicador').textContent = indicador.nome;
        document.getElementById('tipo-meta-indicador').textContent = indicador.tipo_meta;
        document.getElementById('setor-indicador').textContent = indicador.setor_nome;
        document.getElementById('meta-indicador').textContent = indicador.valor_meta?.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        document.getElementById('responsavel-indicador').textContent = indicador.responsavel;
        document.getElementById('ultimo-preenchimento-indicador').textContent = indicador.ultimaAtualizacao 
        ? new Date(indicador.ultimaAtualizacao).toLocaleDateString('pt-BR') 
        : 'Sem dados';

        // 🟨 Preencher a tabela de histórico
        const corpoTabela = document.getElementById('corpo-historico-modal');
        corpoTabela.innerHTML = '';

        (indicador.historico || []).forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-4 py-2 border">${new Date(item.data).toLocaleDateString('pt-BR')}</td>
            <td class="px-4 py-2 border">R$ ${parseFloat(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td class="px-4 py-2 border">R$ ${parseFloat(item.meta).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td class="px-4 py-2 border">${item.valor >= item.meta ? '✅ Atingida' : '❌ Não Atingida'}</td>
            <td class="px-4 py-2 border">${item.comentario || '-'}</td>
            <td class="px-4 py-2 border">
            ${item.provas?.length > 0 
                ? `<a href="${item.provas[0]}" target="_blank" class="text-blue-600 underline">Ver arquivo</a>` 
                : '-'}
            </td>
        `;
        corpoTabela.appendChild(tr);
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
            datasets: [
                {
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
                legend: { position: 'top' }
            },
            scales: {
                y: { beginAtZero: false }
            }
            }
        });
        }

        // ✅ Botão de fechar modal
        const btnFechar = document.getElementById('fechar-modal');
        if (btnFechar) {
        btnFechar.addEventListener('click', () => {
            document.getElementById('detalhe-modal').classList.add('hidden');
        });
        }

        // Exportar histórico para Excel
        document.getElementById('exportar-excel').addEventListener('click', () => {
        const linhas = [['Data', 'Valor', 'Meta', 'Status', 'Comentário']];
        (indicador.historico || []).forEach(item => {
            linhas.push([
            new Date(item.data).toLocaleDateString('pt-BR'),
            item.valor,
            item.meta,
            item.valor >= item.meta ? 'Atingida' : 'Não Atingida',
            item.comentario || ''
            ]);
        });

        const csv = linhas.map(row => row.join(';')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `historico_${indicador.nome}.csv`;
        link.click();
        });

        // Exportar modal para PDF (será melhorado depois com html2pdf ou jsPDF)
        document.getElementById('exportar-pdf').addEventListener('click', () => {
        window.print(); // simples por enquanto — depois substituímos
        });

        
        // Mostrar o modal
        modal.classList.remove('hidden');
        
        // Criar gráfico de tendência
        setTimeout(() => {
            const ctx = document.getElementById('grafico-tendencia').getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: (indicador.historico || []).map(item => item.mes),
                    datasets: [
                        {
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
                            position: 'top',
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false
                        }
                    }
                }
            });
        }, 100);

                        
                        function salvarMeta(indicadorId) {
                            const novaMeta = document.getElementById('input-nova-meta').value;
                            const token = localStorage.getItem('access');
                            
                            fetch(`http://127.0.0.1:8000/api/indicadores/${indicadorId}/`, {
                                method: 'PATCH',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({ meta: novaMeta })
                                    })
                                    .then(response => {
                                        if (response.ok) {
                                            alert('Meta atualizada com sucesso!');
                                            fecharModalMeta();
                                            carregarIndicadores(); // 🔥 Atualiza os cards no dashboard após salvar
                                            } else {
                                                alert('Erro ao atualizar a meta.');
                                            }
                                            })
                                            .catch(error => {
                                                console.error('Erro:', error);
                                                alert('Erro na conexão com o servidor.');
                                            });
                                        }
                                        
                                        
                                        // Adicionar evento para fechar o modal
                                        document.getElementById('fechar-modal').addEventListener('click', () => {
                                            modal.classList.add('hidden');
                                        });
                                        
                                        // Adicionar evento para o botão de editar meta
                                        document.getElementById('editar-meta').addEventListener('click', () => {
                                            const editarMetaModal = document.getElementById('editar-meta-modal');
                                            document.getElementById('editar-meta-nome').value = indicador.nome;
                                            document.getElementById('editar-meta-atual').value = indicador.meta;
                                            document.getElementById('editar-meta-nova').value = indicador.meta;
                                            editarMetaModal.classList.remove('hidden');
                                        });
                                        
                                        // Adicionar evento para o botão de solicitar revisão
                                        document.getElementById('solicitar-revisao').addEventListener('click', () => {
                                            alert(`Solicitação de revisão enviada para ${indicador.responsavel}`);
                                        });
                                    }
                                    
                                    // Inicializar a página
                                    document.addEventListener('DOMContentLoaded', () => {
                                        // Renderizar indicadores
                                        renderizarIndicadores(indicadores);
                                        carregarUsuarioLogado();
                                        
                                        // Configurar eventos de filtro
                                        const filtroSetor = document.getElementById('filter-setor');
                                        const filtroPeriodo = document.getElementById('filter-periodo');
                                        const filtroStatus = document.getElementById('filter-status');
                                        const limparFiltros = document.getElementById('limpar-filtros');
                                        
                                        function aplicarFiltrosAPI() {
                                            const token = localStorage.getItem('access');
                                            
                                            const setorSelecionado = document.getElementById('filter-setor').value;
                                            const statusSelecionado = document.getElementById('filter-status').value;
                                            const periodoSelecionado = document.getElementById('filter-periodo').value;
                                            
                                            let url = 'http://127.0.0.1:8000/api/indicadores/?';
                                            
                                            if (setorSelecionado !== 'todos') {
                                                url += `setor=${setorSelecionado}&`;
                                            }
                                            
                                            if (statusSelecionado !== 'todos') {
                                                url += `status=${statusSelecionado}&`;
                                            }
                                            
                                            if (periodoSelecionado !== 'mes-atual') {
                                                url += `periodo=${periodoSelecionado}&`;
                                            }
                                            
                                            fetch(url, {
                                                headers: {
                                                    'Authorization': `Bearer ${token}`
                                                }
                                                })
                                                .then(response => {
                                                    if (!response.ok) {
                                                        throw new Error('Erro ao carregar indicadores');
                                                    }
                                                    return response.json();
                                                    })
                                                    .then(data => {
                                                        indicadores = data;
                                                        renderizarIndicadores(indicadores);
                                                        })
                                                        .catch(error => {
                                                            console.error('Erro:', error);
                                                            alert('Erro ao aplicar filtros.');
                                                        });
                                                    }
                                                    
                                                    
                                                    filtroSetor.addEventListener('change', aplicarFiltrosAPI);
                                                    filtroPeriodo.addEventListener('change', aplicarFiltrosAPI);
                                                    filtroStatus.addEventListener('change', aplicarFiltrosAPI);
                                                    
                                                    
                                                    limparFiltros.addEventListener('click', () => {
                                                        filtroSetor.value = 'todos';
                                                        filtroPeriodo.value = 'mes-atual';
                                                        filtroStatus.value = 'todos';
                                                        renderizarIndicadores(indicadores);
                                                    });
                                                    
                                                    // Configurar eventos do modal de edição de meta
                                                    const editarMetaModal = document.getElementById('editar-meta-modal');
                                                    const cancelarMeta = document.getElementById('cancelar-meta');
                                                    const salvarMeta = document.getElementById('btn-salvar-meta');
                                                    if (salvarMeta) {
                                                        salvarMeta.addEventListener('click', () => {
                                                            const novaMeta = parseFloat(document.getElementById('editar-meta-nova').value);
                                                            const nomeIndicador = document.getElementById('editar-meta-nome').value;
                                                            // restante da lógica de salvamento
                                                        });
                                                    }
                                                    
                                                    cancelarMeta.addEventListener('click', () => {
                                                        editarMetaModal.classList.add('hidden');
                                                    });
                                                    
                                                    salvarMeta.addEventListener('click', () => {
                                                        const novaMeta = parseFloat(document.getElementById('editar-meta-nova').value);
                                                        const nomeIndicador = document.getElementById('editar-meta-nome').value;
                                                        
                                                        // Aqui você implementaria a lógica para salvar a nova meta
                                                        alert(`Meta do indicador "${nomeIndicador}" atualizada para ${novaMeta}`);
                                                        
                                                        editarMetaModal.classList.add('hidden');
                                                        document.getElementById('detalhe-modal').classList.add('hidden');
                                                        
                                                        // Atualizar os dados e re-renderizar
                                                        const indicadorId = document.getElementById('editar-meta').dataset.id;
                                                        const indicador = indicadores.find(ind => ind.id === parseInt(indicadorId));
                                                        if (indicador) {
                                                            indicador.meta = novaMeta;
                                                            indicador.status = indicador.valorAtual >= novaMeta ? 'atingido' : 'nao-atingido';
                                                            renderizarIndicadores(indicadores);
                                                        }
                                                    });
                                                    
                                                    // Configurar evento para o botão de perfil
                                                    const profileButton = document.getElementById('profileButton');
                                                    const profileMenu = document.getElementById('profileMenu');
                                                    
                                                    profileButton.addEventListener('click', () => {
                                                        profileMenu.classList.toggle('hidden');
                                                    });
                                                        
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
                                                    
                                                    
// Aplica os filtros selecionados
function aplicarFiltros() {
    const setorSelecionado = document.getElementById('filter-setor').value;
    const statusSelecionado = document.getElementById('filter-status').value;
    const periodoSelecionado = document.getElementById('filter-periodo').value;

    let filtrados = [...indicadores]; // usa os indicadores já carregados

    // Filtro por setor
    if (setorSelecionado !== 'todos') {
        filtrados = filtrados.filter(ind => 
            ind.setor_nome?.toLowerCase().includes(setorSelecionado.replace(/-/g, ''))
        );
    }

    // Filtro por status
    if (statusSelecionado !== 'todos') {
        filtrados = filtrados.filter(ind => {
            if (statusSelecionado === 'atingidos') return ind.atingido === true;
            if (statusSelecionado === 'nao-atingidos') return ind.atingido === false;
            return true;
        });
    }

    // Filtro por período
    if (periodoSelecionado !== 'mes-atual') {
        // Aqui você pode ajustar depois a lógica exata conforme o backend
        // Por enquanto, mantemos o carregamento atual
    }

    renderizarIndicadores(filtrados);
}

document.getElementById('filter-setor').addEventListener('change', aplicarFiltros);
document.getElementById('filter-status').addEventListener('change', aplicarFiltros);
document.getElementById('filter-periodo').addEventListener('change', aplicarFiltros);

document.getElementById('limpar-filtros').addEventListener('click', () => {
    document.getElementById('filter-setor').value = 'todos';
    document.getElementById('filter-status').value = 'todos';
    document.getElementById('filter-periodo').value = 'mes-atual';

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

