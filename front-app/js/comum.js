document.addEventListener("DOMContentLoaded", () => {
    carregarUsuarioLogado();
    configurarToggleSidebar();
});

// 🔹 Carrega dados do usuário logado e exibe no topo
function carregarUsuarioLogado() {
    const token = localStorage.getItem("access");
    if (!token) return;

    fetch("http://127.0.0.1:8000/api/meu-usuario/", {
        headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(user => {
        const nome = user.first_name || user.username || user.email;
        const perfil = user.perfil;
        const setores = user.setores || [];

        // Nome do usuário
        document.querySelectorAll("#campo-nome-usuario").forEach(el => {
            el.textContent = nome;
        });

        // Detalhe do perfil (Master ou Setores)
        const detalhe = perfil === "master"
            ? "Perfil Master"
            : `Setores: ${setores.map(s => s.nome).join(", ")}`;

        document.querySelectorAll("#campo-detalhe-perfil").forEach(el => {
            el.textContent = detalhe;
        });

        // Iniciais do usuário (ex: FS)
        const iniciais = nome.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
        const avatar = document.getElementById("iniciais-usuario");
        if (avatar) avatar.textContent = iniciais;
    })
    .catch(err => {
        console.error("Erro ao carregar dados do usuário:", err);
    });
}

// 🔹 Lógica do botão de expandir/recolher sidebar
function configurarToggleSidebar() {
    const toggleSidebar = document.getElementById("toggle-sidebar");
    const sidebar = document.getElementById("sidebar");
    const sidebarItems = document.querySelectorAll(".sidebar-item");
    const mainContent = document.getElementById("main-content");

    if (toggleSidebar && sidebar) {
        toggleSidebar.addEventListener("click", () => {
            sidebar.classList.toggle("sidebar-collapsed");

            if (mainContent) {
                mainContent.classList.toggle("ml-64");
            }

            sidebarItems.forEach(item => {
                item.style.display = sidebar.classList.contains("sidebar-collapsed") ? "none" : "inline";
            });
        });
    }
}

// 🔹 Alternar dropdown de notificações
function toggleDropdown() {
    const dropdown = document.getElementById("dropdown-notificacoes");
    if (dropdown.classList.contains("hidden")) {
        dropdown.classList.remove("hidden");
        carregarNotificacoes();
    } else {
        dropdown.classList.add("hidden");
    }
}

// 🔹 Fecha dropdown se clicar fora
document.addEventListener("click", function (event) {
    const dropdown = document.getElementById("dropdown-notificacoes");
    const botao = event.target.closest("button");

    if (dropdown && !dropdown.contains(event.target) && !botao) {
        dropdown.classList.add("hidden");
    }
});

// 🔹 Carrega notificações do backend
function carregarNotificacoes() {
    const token = localStorage.getItem("access");

    fetch("http://127.0.0.1:8000/api/notificacoes/", {
        headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        const lista = document.getElementById("lista-notificacoes");
        const badge = document.getElementById("badge-notificacoes");

        lista.innerHTML = "";

        const naoLidas = data.filter(n => !n.lida);

        if (naoLidas.length > 0) {
            badge.innerText = naoLidas.length;
            badge.classList.remove("hidden");
        } else {
            badge.classList.add("hidden");
        }

        if (data.length === 0) {
            const vazio = document.createElement("li");
            vazio.className = "p-3 text-center text-gray-500";
            vazio.innerText = "Nenhuma notificação disponível.";
            lista.appendChild(vazio);
        }

        data.forEach(n => {
            const item = document.createElement("li");
            item.className = "flex justify-between items-start px-4 py-3 hover:bg-gray-50";

            item.innerHTML = `
                <div class="flex-1">
                    <p class="${n.lida ? "text-gray-400" : "text-blue-900 font-medium"}">${n.texto}</p>
                    <p class="text-xs text-gray-400">${new Date(n.data).toLocaleString()}</p>
                </div>
                <div class="flex flex-col gap-1 items-end">
                    ${!n.lida ? `<button onclick="marcarComoLida(${n.id})" class="text-green-600 hover:underline text-xs">Lida</button>` : ""}
                    <button onclick="excluirNotificacao(${n.id})" class="text-red-600 hover:underline text-xs">Excluir</button>
                </div>
            `;

            lista.appendChild(item);
        });
    });
}

// 🔹 Marcar notificação como lida
function marcarComoLida(id) {
    const token = localStorage.getItem("access");

    fetch(`http://127.0.0.1:8000/api/notificacoes/${id}/`, {
        method: "PATCH",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ lida: true })
    })
    .then(() => carregarNotificacoes());
}

// 🔹 Excluir notificação
function excluirNotificacao(id) {
    const token = localStorage.getItem("access");

    fetch(`http://127.0.0.1:8000/api/notificacoes/${id}/`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
    .then(() => carregarNotificacoes());
}

// 🔹 Logout global
function logout() {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    window.location.href = "login.html";
}
