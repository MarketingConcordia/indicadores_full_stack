// 🔹 Estado compartilhado
let preenchimentosRealizados = new Set();
let indicadorSelecionado = null;

// 🔸 Carregar preenchimentos realizados pelo usuário logado
async function carregarPreenchimentos() {
  const token = localStorage.getItem('access');

  try {
    const res = await fetch('http://127.0.0.1:8000/api/preenchimentos/meus/', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Erro ao buscar preenchimentos");

    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Resposta inválida (esperado array)");

    data.forEach(item => {
      const indicadorId = typeof item.indicador === 'object' ? item.indicador.id : item.indicador;
      const chave = `${indicadorId}_${item.mes}_${item.ano}`;
      preenchimentosRealizados.add(chave);
    });

    console.log("✔️ Preenchimentos carregados:", preenchimentosRealizados);

  } catch (err) {
    console.error("Erro ao carregar preenchimentos:", err);
  }
}

// 🔸 Carregar indicadores pendentes (exceto os já preenchidos)
function carregarIndicadores() {
  const token = localStorage.getItem('access');

  fetch('http://127.0.0.1:8000/api/indicadores/pendentes/', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
    .then(res => {
      if (!res.ok) throw new Error("Erro ao buscar indicadores");
      return res.json();
    })
    .then(data => {
      if (!Array.isArray(data)) throw new Error("Resposta inválida (esperado array)");

      const container = document.getElementById('indicadores-container');
      container.innerHTML = '';

      const hoje = new Date();
      const mesAtual = hoje.getMonth() + 1;
      const anoAtual = hoje.getFullYear();

      data.forEach(indicador => {
        const chaveAtual = `${indicador.id}_${mesAtual}_${anoAtual}`;

        if (!preenchimentosRealizados.has(chaveAtual)) {
          const div = document.createElement('div');
          div.className = "bg-white p-4 rounded shadow-md";

          div.innerHTML = `
            <h3 class="text-lg font-bold mb-1">${indicador.nome}</h3>
            <p class="text-sm text-gray-600">${indicador.descricao || ''}</p>
            <div class="mt-2 p-2 bg-yellow-100 text-yellow-700 text-sm rounded">
              Preenchimento pendente deste mês.
            </div>
            <button onclick='abrirModal(${JSON.stringify(indicador)})' class="mt-2 bg-blue-600 text-white px-4 py-1 rounded">
              Preencher
            </button>
          `;

          container.appendChild(div);
        }
      });
    })
    .catch(error => {
      console.error('Erro ao carregar indicadores:', error);
    });
}

// 🔸 Abrir modal de preenchimento
function abrirModal(indicador) {
    indicadorSelecionado = indicador;
    document.getElementById('titulo-indicador').innerText = `Preencher - ${indicador.nome}`;
    document.getElementById('modal-preencher').classList.remove('hidden');

    // 🆕 Limpar campos ao abrir
    document.getElementById('valor').value = '';

    // 🆕 Pré-preencher mês atual
    const hoje = new Date();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    document.getElementById('mes').value = `${mes}/${ano}`;
}


// 🔸 Fechar modal
function fecharModal() {
  document.getElementById('modal-preencher').classList.add('hidden');
}

// 🔸 Submissão do preenchimento
document.getElementById('formPreenchimento').addEventListener('submit', async function (e) {
    e.preventDefault();

    const token = localStorage.getItem('access');
    const valor = document.getElementById('valor').value;
    const mesAno = document.getElementById('mes').value;
    const comentario = document.getElementById('comentario').value;
    const arquivo = document.getElementById('provas').files[0];
    const origem = document.getElementById('origem').value;

    if (!indicadorSelecionado || !valor || !mesAno) {
        alert("Preencha os campos obrigatórios.");
        return;
    }

    const [mes, ano] = mesAno.split('/');

    const formData = new FormData();
    formData.append('indicador', indicadorSelecionado.id);
    formData.append('valor_realizado', valor);
    formData.append('mes', parseInt(mes));
    formData.append('ano', parseInt(ano));

    if (comentario) formData.append('comentario', comentario);        
    if (origem) formData.append('origem', origem);                     
    if (arquivo) formData.append('arquivo', arquivo);                 

    try {
        const response = await fetch('http://127.0.0.1:8000/api/preenchimentos/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const erro = await response.json();
            console.error("⚠️ Erro da API:", erro); // Mostra o erro detalhado no console
            const mensagem = Object.values(erro).flat().join('\n');
            throw new Error(mensagem || "Erro ao salvar o preenchimento.");
        }

        alert('Preenchimento salvo com sucesso!');
        fecharModal();
        await carregarPreenchimentos();
        carregarIndicadores();

    } catch (error) {
        const errorText = await error.response?.text?.() || error.message;
        console.error("Erro detalhado:", errorText);
        alert("Erro ao salvar o preenchimento:\n" + errorText);
    }
});


// 🔸 Iniciar carregamento ao abrir a página
window.onload = async () => {
  await carregarPreenchimentos();
  carregarIndicadores();
};