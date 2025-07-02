document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('access');

  const perfil = localStorage.getItem("perfil_usuario");
    if (perfil !== "master") {
      alert("Acesso negado. Esta página é exclusiva para perfil master.");
      window.location.href = "indexgestores.html"; // redireciona o gestor
    }

  carregarUsuarioLogado();
  preencherSelectSetores();
  carregarIndicadores();

  // Envia o formulário de cadastro do indicador
  const form = document.getElementById('form-metrica');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const nome = document.getElementById('nomeMetrica').value;
      const setor = document.getElementById('setorMetrica').value;
      const tipo_meta = document.getElementById('tipo_meta').value;
      const descricao = document.getElementById('descricaoMetrica').value;
      const meta = parseFloat(document.getElementById('metaMetrica').value);

      fetch('http://127.0.0.1:8000/api/indicadores/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nome,
          setor,
          tipo_meta,
          descricao,
          meta
        })
      })
      .then(res => {
        if (!res.ok) throw new Error('Erro ao cadastrar indicador');
        return res.json();
      })
      .then(() => {
        const mensagem = document.createElement('div');
        mensagem.innerText = '✅ Indicador cadastrado com sucesso!';
        mensagem.className = 'bg-green-100 text-green-800 px-4 py-2 rounded mb-4 mt-4';
        form.parentNode.insertBefore(mensagem, form);

        setTimeout(() => mensagem.remove(), 3000);

        form.reset();
        carregarIndicadores();
      })
      .catch(err => {
        alert('Erro: ' + err.message);
      });
    });
  }
});

// Função para preencher os setores
function preencherSelectSetores() {
  const token = localStorage.getItem("access");
  const select = document.getElementById("setorMetrica");

  if (!select) return;

  fetch("http://127.0.0.1:8000/api/setores/", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  .then(res => {
    if (!res.ok) {
      throw new Error("Erro ao buscar indicadores");
    }
    return res.json();
  })
  .then(data => {
    const lista = document.getElementById('indicadores-lista');
    if (!lista) return;
  
    lista.innerHTML = '';
  
    if (!Array.isArray(data) || data.length === 0) {
      lista.innerHTML = '<p class="text-gray-500">Nenhum indicador pendente neste mês.</p>';
      return;
    }
  
    data.forEach(ind => {
      const li = document.createElement('li');
      li.className = 'border-b py-2';
      li.innerHTML = `<strong>${ind.nome}</strong> — ${ind.setor_nome} (${ind.tipo_meta})`;
      lista.appendChild(li);
    });
  })
  .catch(err => {
    console.error("Erro ao carregar indicadores:", err);
  });
  
}

// Função para listar indicadores pendentes
function carregarIndicadores() {
  const token = localStorage.getItem('access');

  fetch('http://127.0.0.1:8000/api/indicadores/pendentes/', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(res => res.json())
  .then(response => {
    const data = response.results || response;

    const lista = document.getElementById('indicadores-lista');
    if (!lista) return;

    lista.innerHTML = '';

    if (data.length === 0) {
      lista.innerHTML = '<p class="text-gray-500">Nenhum indicador cadastrado.</p>';
      return;
    }

    data.forEach(ind => {
      const li = document.createElement('li');
      li.className = 'border-b py-2';
      li.innerHTML = `<strong>${ind.nome}</strong> — ${ind.setor_nome || ''} (${ind.tipo_meta || ''})`;
      lista.appendChild(li);
    });
  })
  .catch(err => {
    console.error("Erro ao carregar indicadores:", err);
  });
}
