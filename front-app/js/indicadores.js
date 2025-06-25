document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access');
  
    // Carrega os setores no select
    fetch('http://127.0.0.1:8000/api/setores/', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        const seletor = document.getElementById('setor');
        data.forEach(setor => {
          const option = document.createElement('option');
          option.value = setor.id;
          option.textContent = setor.nome;
          seletor.appendChild(option);
        });
      });
  
    // Envia o formulário
    document.getElementById('formIndicador').addEventListener('submit', function (e) {
      e.preventDefault();
  
      const nome = document.getElementById('nome').value;
      const setor = document.getElementById('setor').value;
      const tipo_meta = document.getElementById('tipo_meta').value;
  
      fetch('http://127.0.0.1:8000/api/indicadores/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nome,
          setor,
          tipo_meta
        })
      })
      .then(res => {
        if (!res.ok) throw new Error('Erro ao cadastrar indicador');
        return res.json();
      })
      .then(() => {
        alert('Indicador cadastrado com sucesso!');
        document.getElementById('formIndicador').reset();
      })
      .catch(err => {
        alert('Erro: ' + err.message);
      });
    });
  });
  
  function carregarIndicadores() {
    const token = localStorage.getItem('access');
  
    fetch('http://127.0.0.1:8000/api/indicadores/pendentes/', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => res.json())
    .then(data => {
      const lista = document.getElementById('indicadores-lista');
      lista.innerHTML = '';
  
      if (data.length === 0) {
        lista.innerHTML = '<p class="text-gray-500">Nenhum indicador pendente neste mês.</p>';
        return;
      }
  
      data.forEach(ind => {
        const li = document.createElement('li');
        li.className = 'border-b py-2';
        li.innerHTML = `<strong>${ind.nome}</strong> — ${ind.setor_nome} (${ind.tipo_meta})`;
        lista.appendChild(li);
      });
    });
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    carregarIndicadores(); // lista os pendentes
  });
  