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

// 🔹 Logout global
function logout() {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    window.location.href = "login.html";
}
