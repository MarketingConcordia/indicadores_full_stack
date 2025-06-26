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

        // Inicializar a página
        document.addEventListener('DOMContentLoaded', () => {
            // Renderizar indicadores
            renderizarIndicadores(indicadores);

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
            const salvarMeta = document.getElementById('salvar-meta');

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

            // Fechar o menu de perfil ao clicar fora dele
            document.addEventListener('click', (e) => {
                if (!profileButton.contains(e.target) && !profileMenu.contains(e.target)) {
                    profileMenu.classList.add('hidden');
                }
            });

            // Configurar evento para o botão de alternar sidebar
            const toggleSidebar = document.getElementById('toggle-sidebar');
            const sidebar = document.getElementById('sidebar');
            const sidebarItems = document.querySelectorAll('.sidebar-item');

            toggleSidebar.addEventListener('click', () => {
                sidebar.classList.toggle('sidebar-collapsed');
                sidebarItems.forEach(item => {
                    if (sidebar.classList.contains('sidebar-collapsed')) {
                        item.style.display = 'none';
                    } else {
                        item.style.display = 'inline';
                    }
                });
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

        function toggleDropdown() {
        const dropdown = document.getElementById('dropdown-notificacoes');
        if (dropdown.classList.contains('hidden')) {
            dropdown.classList.remove('hidden');
            carregarNotificacoes();
        } else {
            dropdown.classList.add('hidden');
        }
    }

    function fecharDropdown() {
        document.getElementById('dropdown-notificacoes').classList.add('hidden');
    }

    function carregarNotificacoes() {
        const token = localStorage.getItem('access');

        fetch('http://127.0.0.1:8000/api/notificacoes/', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            const lista = document.getElementById('lista-notificacoes');
            const badge = document.getElementById('badge-notificacoes');

            lista.innerHTML = '';

            const naoLidas = data.filter(n => !n.lida);

            if (naoLidas.length > 0) {
                badge.innerText = naoLidas.length;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }

            if (data.length === 0) {
                const vazio = document.createElement('li');
                vazio.className = 'p-3 text-center text-gray-500';
                vazio.innerText = 'Nenhuma notificação disponível.';
                lista.appendChild(vazio);
            }

            data.forEach(n => {
                const item = document.createElement('li');
                item.className = 'flex justify-between items-start px-4 py-3 hover:bg-gray-50';

                item.innerHTML = `
                    <div class="flex-1">
                        <p class="${n.lida ? 'text-gray-400' : 'text-blue-900 font-medium'}">${n.texto}</p>
                        <p class="text-xs text-gray-400">${new Date(n.data).toLocaleString()}</p>
                    </div>
                    <div class="flex flex-col gap-1 items-end">
                        ${!n.lida ? `<button onclick="marcarComoLida(${n.id})" 
                            class="text-green-600 hover:underline text-xs">Lida</button>` : ''}
                        <button onclick="excluirNotificacao(${n.id})" 
                            class="text-red-600 hover:underline text-xs">Excluir</button>
                    </div>
                `;

                lista.appendChild(item);
            });
        });
    }

    function marcarComoLida(id) {
        const token = localStorage.getItem('access');

        fetch(`http://127.0.0.1:8000/api/notificacoes/${id}/`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ lida: true })
        })
        .then(() => carregarNotificacoes());
    }

    function excluirNotificacao(id) {
        const token = localStorage.getItem('access');

        fetch(`http://127.0.0.1:8000/api/notificacoes/${id}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(() => carregarNotificacoes());
    }

    // 🔥 (Opcional) Fecha dropdown clicando fora
    document.addEventListener('click', function(event) {
        const dropdown = document.getElementById('dropdown-notificacoes');
        const botao = event.target.closest('button');

        if (!dropdown.contains(event.target) && !botao) {
            dropdown.classList.add('hidden');
        }
    });
    function logout() {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        window.location.href = 'login.html';
    }

let preenchimentos = [];
let metas = [];

function renderizarCards() {
    const container = document.getElementById('indicadores-container');
    container.innerHTML = '';
  
    preenchimentos.forEach(item => {
      const meta = metas.find(m =>
        m.indicador === item.indicador &&
        m.mes === item.mes &&
        m.ano === item.ano
      );
  
      const valor = parseFloat(item.valor_realizado);
      const esperado = meta ? parseFloat(meta.valor_esperado) : null;
  
      let status = '---';
      let corBorda = 'gray';
      let statusIcone = '❓';
      let statusTexto = 'Acompanhamento';
  
      if (esperado !== null) {
        if (item.indicador_tipo_meta === 'crescente') {
          status = valor >= esperado ? 'Atingida' : 'Não Atingida';
          corBorda = valor >= esperado ? 'green' : 'red';
          statusIcone = valor >= esperado ? '✅' : '❌';
          statusTexto = `Meta ${status.toLowerCase()}`;
        } else if (item.indicador_tipo_meta === 'decrescente') {
          status = valor <= esperado ? 'Atingida' : 'Não Atingida';
          corBorda = valor <= esperado ? 'green' : 'red';
          statusIcone = valor <= esperado ? '✅' : '❌';
          statusTexto = `Meta ${status.toLowerCase()}`;
        } else {
          statusTexto = 'Acompanhamento';
          corBorda = 'blue';
          statusIcone = '📊';
        }
      }
  
      const card = document.createElement('div');
      card.className = `relative bg-white p-4 rounded-lg shadow-md border-l-8 border-${corBorda}-500 hover:shadow-lg transition cursor-pointer`;
  
      card.innerHTML = `
        <h3 class="text-lg font-bold text-blue-800 mb-1">${item.indicador_nome}</h3>
        <div class="text-sm text-gray-600 mb-1">${item.setor_nome}</div>
        <div class="flex items-center text-sm mb-2">
          <span class="mr-2">${statusIcone}</span>
          <span>${statusTexto}</span>
        </div>
        <div class="text-sm text-gray-700">
          Atual: ${valor.toLocaleString('pt-BR')} / Meta: ${esperado !== null ? esperado.toLocaleString('pt-BR') : '---'}
        </div>
        <div class="text-right mt-2">
          <button class="btn-detalhes bg-amber-400 hover:bg-amber-500 text-amber-900 text-xs px-3 py-1 rounded">Ver +</button>
        </div>
      `;
  
      card.querySelector('.btn-detalhes').addEventListener('click', (e) => {
        e.stopPropagation();
        abrirModalDetalhes(item);
      });
  
      container.appendChild(card);
    });
  }
  

  function abrirModalDetalhes(preenchimento) {
    const modal = document.getElementById("detalhe-modal");
    modal.classList.remove("hidden");
  
    document.getElementById("modal-indicador-nome").innerText = preenchimento.indicador_nome;
    document.getElementById("modal-setor").innerText = preenchimento.setor_nome;
    document.getElementById("modal-valor").innerText = `R$ ${preenchimento.valor_realizado}`;
    document.getElementById("modal-mes-ano").innerText = `${preenchimento.mes}/${preenchimento.ano}`;
  
    // 🧠 1. Filtrar históricos do mesmo indicador
    const historico = preenchimentos
      .filter(p => p.indicador === preenchimento.indicador)
      .sort((a, b) => {
        const dataA = new Date(a.ano, a.mes - 1);
        const dataB = new Date(b.ano, b.mes - 1);
        return dataA - dataB;
      });
  
    // 🧠 2. Criar dados para o gráfico
    const labels = historico.map(p => `${String(p.mes).padStart(2, '0')}/${p.ano}`);
    const valores = historico.map(p => parseFloat(p.valor_realizado));
    const metas = historico.map(p => {
      const metaEncontrada = metas.find(m =>
        m.indicador === p.indicador &&
        m.mes === p.mes &&
        m.ano === p.ano
      );
      return metaEncontrada ? parseFloat(metaEncontrada.valor_esperado) : null;
    });
  
    // 🧠 3. Renderizar o gráfico com Chart.js
    const ctx = document.getElementById("grafico-indicador").getContext("2d");
  
    // Destroi gráfico anterior se existir
    if (window.graficoIndicador) {
      window.graficoIndicador.destroy();
    }
  
    window.graficoIndicador = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Valor Realizado',
            data: valores,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.3
          },
          {
            label: 'Meta Esperada',
            data: metas,
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            borderDash: [5, 5],
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: false
          }
        },
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });

     // Limpa histórico antigo
    const tabelaBody = document.getElementById("tabela-historico-body");
    tabelaBody.innerHTML = "";

    // Monta o histórico linha por linha
    historico.forEach(p => {
    const metaEncontrada = metas.find(m =>
        m.indicador === p.indicador &&
        m.mes === p.mes &&
        m.ano === p.ano
    );

    const esperado = metaEncontrada ? parseFloat(metaEncontrada.valor_esperado) : null;
    const realizado = parseFloat(p.valor_realizado);

    // Define status e cor da linha
    let atingido = false;
    if (p.indicador_tipo_meta === 'crescente') {
        atingido = realizado >= esperado;
    } else if (p.indicador_tipo_meta === 'decrescente') {
        atingido = realizado <= esperado;
    }

    const linha = document.createElement("tr");
    linha.className = atingido ? "bg-green-100" : "bg-red-100";

    linha.innerHTML = `
        <td class="px-4 py-2 font-medium">${mesPorExtenso(p.mes)}/${p.ano}</td>
        <td class="px-4 py-2">R$ ${realizado.toLocaleString('pt-BR')}</td>
        <td class="px-4 py-2">R$ ${esperado?.toLocaleString('pt-BR') || "---"}</td>
        <td class="px-4 py-2 flex items-center gap-2">
        ${atingido ? '<span class="text-green-600">✅ Atingido</span>' : '<span class="text-red-600">❌ Não atingido</span>'}
        </td>
    `;

    tabelaBody.appendChild(linha);
    });

    const containerProvas = document.getElementById("container-provas");
    containerProvas.innerHTML = ""; // Limpa anterior

    if (preenchimento.arquivo) {
        const extensao = preenchimento.arquivo.split('.').pop().toLowerCase();
        const url = preenchimento.arquivo.startsWith('http')
            ? preenchimento.arquivo
            : `http://127.0.0.1:8000${preenchimento.arquivo}`;

        if (['jpg', 'jpeg', 'png', 'webp'].includes(extensao)) {
            const img = document.createElement("img");
            img.src = url;
            img.alt = "Prova anexada";
            img.className = "h-24 w-auto rounded shadow cursor-pointer hover:scale-105 transition";

            img.onclick = () => {
                window.open(url, "_blank");
            };

            containerProvas.appendChild(img);
        } else {
            const link = document.createElement("a");
            link.href = url;
            link.innerText = "Ver arquivo anexado";
            link.target = "_blank";
            link.className = "text-blue-600 underline";

            containerProvas.appendChild(link);
        }
    }

    // Seleciona textarea e botão
    const botaoSalvarComentario = document.querySelector('#botao-salvar-comentario');
    const textareaComentario = document.querySelector('#textarea-comentario');

    // Preenche o comentário atual no campo
    textareaComentario.value = preenchimento.comentario || "";
    document.getElementById('comentario-atual').innerText =
    preenchimento.comentario
        ? `${preenchimento.comentario} - ${preenchimento.nome_usuario || 'Usuário'}`
        : "";


    // Ao clicar no botão, salva o comentário via PATCH
    botaoSalvarComentario.onclick = () => {
        const novoComentario = textareaComentario.value.trim();
        if (!novoComentario) {
            alert("Digite um comentário antes de salvar.");
            return;
        }

        const token = localStorage.getItem("access");

        fetch(`http://127.0.0.1:8000/api/preenchimentos/${preenchimento.id}/`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ comentario: novoComentario })
        })
        .then(res => {
            if (!res.ok) throw new Error("Erro ao salvar comentário");
            return res.json();
        })
        .then(data => {
            alert("Comentário salvo com sucesso!");
            document.getElementById('comentario-atual').innerText = `${novoComentario} - ${preenchimento.nome_usuario || 'Usuário'}`;

        })
        .catch(err => {
            console.error("Erro ao salvar comentário:", err);
            alert("Falha ao salvar. Verifique o console.");
        });
    };
  }

function fecharModal() {
  document.getElementById('detalhe-modal').classList.add('hidden');
}

// Função auxiliar para nome do mês
function mesPorExtenso(mes) {
    const nomes = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    return nomes[mes - 1] || "Mês";
}