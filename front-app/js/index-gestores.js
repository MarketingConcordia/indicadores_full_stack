const token = localStorage.getItem('access');

if (!token) {
    window.location.href = 'login.html';
}

let indicadores = [];

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access');
    
    fetch('http://127.0.0.1:8000/api/indicadores/', {
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
                carregarPreenchimentos();
                })
                .catch(error => {
                    console.error('Erro:', error);
                    alert('Erro ao carregar indicadores. Verifique sua conexão ou faça login novamente.');
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
                        const corSetor = coresSetores[indicador.setor] || "#64748b"; // cor padrão se não encontrar
                        
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
                    <div class="inline-block text-white text-xs px-2 py-1 rounded mb-3" style="background-color: ${corSetor}">${indicador.setor}</div>
                    <div class="flex items-center mb-2">
                    <span class="mr-2">${statusIcon}</span>
                    <span class="text-sm">${indicador.status === 'atingido' ? 'Meta atingida' : 'Meta não atingida'}</span>
                    </div>
                    <div class="text-sm text-gray-600 mb-3">
                Atual: ${formatarValor(indicador.valorAtual)} / Meta: ${formatarValor(indicador.meta)}
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
                <div class="flex justify-between items-start mb-6">
                <h2 class="text-2xl font-bold text-blue-800">${indicador.nome}</h2>
                <button id="fechar-modal" class="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                </button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div class="bg-white p-4 rounded-lg shadow">
                <h3 class="text-lg font-semibold mb-3">Informações Gerais</h3>
                <div class="space-y-2">
                <div class="flex justify-between">
                <span class="text-gray-600">Setor:</span>
                <span class="font-medium">${indicador.setor}</span>
                </div>
                <div class="flex justify-between">
                <span class="text-gray-600">Status:</span>
                <span class="font-medium ${indicador.status === 'atingido' ? 'text-green-600' : 'text-red-600'}">
            ${indicador.status === 'atingido' ? 'Meta atingida' : 'Meta não atingida'}
            </span>
            </div>
            <div class="flex justify-between">
            <span class="text-gray-600">Valor Atual:</span>
            <span class="font-medium">${formatarValor(indicador.valorAtual)}</span>
            </div>
            <div class="flex justify-between">
            <span class="text-gray-600">Meta:</span>
            <span class="font-medium">${formatarValor(indicador.meta)}</span>
            </div>
            <div class="flex justify-between">
            <span class="text-gray-600">Variação:</span>
            <span class="font-medium ${indicador.variacao >= 0 ? 'text-green-600' : 'text-red-600'}">
            ${indicador.variacao >= 0 ? '+' : ''}${indicador.variacao}%
            </span>
            </div>
            <div class="flex justify-between">
            <span class="text-gray-600">Responsável:</span>
            <span class="font-medium">${indicador.responsavel}</span>
            </div>
            <div class="flex justify-between">
            <span class="text-gray-600">Última Atualização:</span>
            <span class="font-medium">${new Date(indicador.ultimaAtualizacao).toLocaleString('pt-BR')}</span>
            </div>
            </div>
            </div>
            
            <div class="bg-white p-4 rounded-lg shadow" style="height: 300px;">
            <h3 class="text-lg font-semibold mb-3">Tendência</h3>
            <canvas id="grafico-tendencia" class="w-full h-full"></canvas>
            </div>
            </div>
            
            <div class="bg-white p-4 rounded-lg shadow mb-6">
            <section class="mt-6">
            <h2 class="text-lg font-bold mb-2">Histórico</h2>
            <table class="w-full text-sm text-left">
            <thead class="bg-gray-100 text-gray-700">
            <tr>
            <th class="px-4 py-2">MÊS/ANO</th>
            <th class="px-4 py-2">VALOR</th>
            <th class="px-4 py-2">META</th>
            <th class="px-4 py-2">STATUS</th>
            </tr>
            </thead>
            <tbody id="tabela-historico-body">
            <!-- Linhas serão inseridas via JS -->
            </tbody>
            </table>
            </section>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div class="bg-white p-4 rounded-lg shadow">
            <h3 class="text-lg font-semibold mb-3">Provas Enviadas</h3>
            <div class="flex flex-wrap gap-2">
            ${indicador.provas.map(prova => `
            <div class="relative group">
            <div class="w-24 h-24 bg-gray-200 rounded flex items-center justify-center overflow-hidden">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            </div>
            <div class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded">
            <button class="text-white bg-blue-600 hover:bg-blue-700 rounded-full p-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" />
            </svg>
            </button>
            </div>
            </div>
        `).join('')}
        </div>
        <div class="mt-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">Origem das Provas:</label>
        <input type="text" id="origem-provas-input" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Informe o link ou caminho da origem das provas" />
        </div>
        </div>
        
        <div class="bg-white p-4 rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-3">Comentários</h3>
        <div id="comentario-atual" class="bg-gray-50 p-3 rounded border border-gray-200 mb-3">
        <p class="text-gray-700">${indicador.comentarios || 'Nenhum comentário registrado.'}</p>
        </div>
        <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Adicionar comentário:</label>
        <textarea id="textarea-comentario" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows="2"></textarea>
        <div class="flex justify-end mt-2">
        <button id="botao-salvar-comentario" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors">
        Salvar
        </button>
        </div>
        </div>
        </div>
        </div>
        
        <div class="flex justify-end space-x-3">
        <button id="solicitar-revisao" class="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
        Solicitar Revisão
        </button>
        <button id="editar-meta" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors" data-id="${indicador.id}">
        Editar Meta
        </button>
        </div>
        `;
        
        // Mostrar o modal
        modal.classList.remove('hidden');
        
        // Criar gráfico de tendência
        setTimeout(() => {
            const ctx = document.getElementById('grafico-tendencia').getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: indicador.historico.map(item => item.mes),
                    datasets: [
                    {
                        label: 'Valor',
                        data: indicador.historico.map(item => item.valor),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.3,
                        fill: true
                        },
                        {
                            label: 'Meta',
                            data: indicador.historico.map(item => item.meta),
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