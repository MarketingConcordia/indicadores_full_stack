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

  document.getElementById('formArmazenamento').addEventListener('submit', function (e) {
    e.preventDefault();

    const token = localStorage.getItem('access');

    const tipo = document.getElementById('tipo').value;

    // Dados AWS
    const aws_access_key = document.getElementById('aws_access_key').value;
    const aws_secret_key = document.getElementById('aws_secret_key').value;
    const aws_bucket_name = document.getElementById('aws_bucket_name').value;
    const aws_region = document.getElementById('aws_region').value;

    // Dados Azure
    const azure_connection_string = document.getElementById('azure_connection_string').value;
    const azure_container = document.getElementById('azure_container').value;

    // Dados Google
    const gcp_credentials_json = document.getElementById('gcp_credentials_json').value;
    const gcp_bucket_name = document.getElementById('gcp_bucket_name').value;

    const payload = {
        tipo,
        aws_access_key,
        aws_secret_key,
        aws_bucket_name,
        aws_region,
        azure_connection_string,
        azure_container,
        gcp_credentials_json,
        gcp_bucket_name
    };

    fetch('http://127.0.0.1:8000/api/configuracao_armazenamento/', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erro ao salvar a configuração.');
        }
        return response.json();
    })
    .then(data => {
        alert('Configuração salva com sucesso!');
        window.location.reload();
    })
    .catch(error => {
        alert('Erro: ' + error.message);
    });
});

const token = localStorage.getItem('access');

    function carregarNotificacoesConfig() {
        fetch('http://127.0.0.1:8000/api/configuracao_notificacao/', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            const lista = document.getElementById('listaNotificacoes');
            lista.innerHTML = '';
            data.forEach(n => {
                const item = document.createElement('li');
                item.className = 'flex justify-between bg-gray-100 px-3 py-2 rounded';
                item.innerHTML = `
                    <div>
                        <p class="font-semibold">${n.nome} (Dia ${n.dia_do_mes})</p>
                        <p class="text-sm text-gray-600">${n.mensagem}</p>
                        <p class="text-xs text-gray-400">${n.destinatarios.toUpperCase()} | ${n.repetir_todo_mes ? 'Repetir' : 'Único'} | ${n.ativo ? 'Ativo' : 'Inativo'}</p>
                    </div>
                    <button onclick="excluirNotificacao(${n.id})" class="text-red-600 hover:underline">Excluir</button>
                `;
                lista.appendChild(item);
            });
        });
    }

    function excluirNotificacao(id) {
        fetch(`http://127.0.0.1:8000/api/configuracao_notificacao/${id}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(() => carregarNotificacoesConfig());
    }

    document.getElementById('formNotificacao').addEventListener('submit', function (e) {
        e.preventDefault();
        const payload = {
            nome: document.getElementById('nome').value,
            mensagem: document.getElementById('mensagem').value,
            dia_do_mes: document.getElementById('dia').value,
            destinatarios: document.getElementById('destinatarios').value,
            repetir_todo_mes: document.getElementById('repetir').checked,
            ativo: true
        };

        fetch('http://127.0.0.1:8000/api/configuracao_notificacao/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        }).then(() => {
            this.reset();
            carregarNotificacoesConfig();
        });
    });


    document.getElementById('tipo').addEventListener('change', function() {
  const tipo = this.value;

  document.getElementById('awsFields').classList.add('hidden');
  document.getElementById('azureFields').classList.add('hidden');
  document.getElementById('gcpFields').classList.add('hidden');

  if (tipo === 'aws') {
    document.getElementById('awsFields').classList.remove('hidden');
  } else if (tipo === 'azure') {
    document.getElementById('azureFields').classList.remove('hidden');
  } else if (tipo === 'gcp') {
    document.getElementById('gcpFields').classList.remove('hidden');
  }
});

function carregarLogs() {
  fetch('http://127.0.0.1:8000/api/logs/', {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('access')}` }
  })
  .then(res => res.json())
  .then(data => {
    const tbody = document.getElementById('listaLogs');
    tbody.innerHTML = '';
    data.forEach(log => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="px-4 py-2 text-sm">${log.usuario || 'Desconhecido'}</td>
        <td class="px-4 py-2 text-sm">${log.acao}</td>
        <td class="px-4 py-2 text-sm">${new Date(log.data).toLocaleString()}</td>
      `;
      tbody.appendChild(row);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // === SETORES ===

  document.getElementById("form-setor").addEventListener("submit", function (e) {
    e.preventDefault();
    const nome = document.getElementById("nomeSetor").value.trim();
    const token = localStorage.getItem("access");

    if (!nome) {
      alert("Digite o nome do setor.");
      return;
    }

    fetch("http://127.0.0.1:8000/api/setores/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ nome }),
    })
      .then((res) => {
        if (res.ok) return res.json();
        return res.json().then((err) => {
          throw new Error(JSON.stringify(err));
        });
      })
      .then(() => {
        document.getElementById("nomeSetor").value = "";
        listarSetores();
      })
      .catch((err) => {
        console.error("Erro ao cadastrar setor:", err);
        alert("Erro ao cadastrar setor. Verifique se o token é válido ou se o nome já existe.");
      });
  });

  // === FUNÇÕES EXISTENTES (já estavam no seu arquivo) ===
  carregarNotificacoesConfig();
  carregarLogs();  
  listarSetores(); 
})

function listarSetores() {
  const token = localStorage.getItem("access");

  fetch("http://127.0.0.1:8000/api/setores/", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((res) => {
      if (!res.ok) throw new Error("Erro ao buscar setores");
      return res.json();
    })
    .then((dados) => {
      const setores = dados.results; // 👈 CORREÇÃO CRÍTICA
      const lista = document.getElementById("lista-setores");
      if (!lista) return;

      lista.innerHTML = "";

      if (setores.length === 0) {
        lista.innerHTML = "<p class='text-gray-500'>Nenhum setor cadastrado.</p>";
        return;
      }

      setores.forEach((setor) => {
        const item = document.createElement("div");
        item.className = "flex justify-between items-center border rounded px-3 py-2 bg-gray-50";

        item.innerHTML = `
          <span>ID ${setor.id}: ${setor.nome}</span>
          <div class="space-x-2">
            <button onclick="editarSetor(${setor.id}, '${setor.nome}')" class="text-blue-600 hover:underline">Editar</button>
            <button onclick="excluirSetor(${setor.id})" class="text-red-600 hover:underline">Excluir</button>
          </div>
        `;

        lista.appendChild(item);
      });
    })
    .catch((err) => {
      console.error("Erro ao buscar setores:", err);
    });
}

function excluirSetor(id) {
  if (!confirm("Tem certeza que deseja excluir este setor?")) return;

  const token = localStorage.getItem("access");

  fetch(`http://127.0.0.1:8000/api/setores/${id}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((res) => {
      if (!res.ok) throw new Error("Erro ao excluir setor.");
      listarSetores();
    })
    .catch((err) => {
      console.error("Erro ao excluir setor:", err);
      alert("Erro ao excluir setor.");
    });
}


function editarSetor(id, nomeAtual) {
  const novoNome = prompt("Editar nome do setor:", nomeAtual);
  if (!novoNome || novoNome.trim() === "") return;

  const token = localStorage.getItem("access");

  fetch(`http://127.0.0.1:8000/api/setores/${id}/`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ nome: novoNome.trim() }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("Erro ao editar setor.");
      listarSetores();
    })
    .catch((err) => {
      console.error("Erro ao editar setor:", err);
      alert("Erro ao editar setor.");
    });
}
