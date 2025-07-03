let preenchimentosRealizados = new Set();

function carregarPreenchimentos() {
    const token = localStorage.getItem('access');

    return fetch('http://127.0.0.1:8000/api/preenchimentos/meus/', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(res => {
        if (!res.ok) throw new Error("Erro ao buscar preenchimentos");
        return res.json();
    })
    .then(data => {
        if (!Array.isArray(data)) throw new Error("Resposta inválida (esperado array)");
        data.forEach(item => {
            const chave = `${item.indicador}_${item.mes}_${item.ano}`;
            preenchimentosRealizados.add(chave);
        });
    })
    .catch(err => console.error("Erro ao carregar preenchimentos:", err));
}



let indicadorSelecionado = null;

// 🔥 Função para buscar e listar os indicadores
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



// 🔥 Função para abrir o modal de preenchimento
function abrirModal(indicador) {
  indicadorSelecionado = indicador;
  document.getElementById('titulo-indicador').innerText = `Preencher - ${indicador.nome}`;
  document.getElementById('modal-preencher').classList.remove('hidden');
}

// 🔥 Fechar modal
function fecharModal() {
    document.getElementById('modal-preencher').classList.add('hidden');
}

// 🔥 Função para enviar o preenchimento
document.getElementById('formPreenchimento').addEventListener('submit', function (e) {
    e.preventDefault();

    const token = localStorage.getItem('access');

    const valor = document.getElementById('valor').value;
    const mesAno = document.getElementById('mes').value; // formato: MM/AAAA

    const [mes, ano] = mesAno.split('/');  // divide "06/2025" em ["06", "2025"]

    const payload = {
        indicador: indicadorSelecionado.id,
        valor_realizado: valor,
        mes: parseInt(mes),
        ano: parseInt(ano)
    };

    fetch('http://127.0.0.1:8000/api/preenchimentos/', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erro ao salvar o preenchimento');
        }
        return response.json();
    })
    .then(data => {
        alert('Preenchimento salvo com sucesso!');
        fecharModal();
        carregarIndicadores();
    })
    .catch(error => {
        alert('Erro: ' + error.message);
    });
});


window.onload = async () => {
  await carregarPreenchimentos(); // garante que o Set foi preenchido
  carregarIndicadores();          // só então renderiza os indicadores
};

