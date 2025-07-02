// === GERAÇÃO DE RELATÓRIOS PDF/EXCEL ===

function baixarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.text("Relatório de Indicadores", 14, 15);

    const rows = [];
    document.querySelectorAll("#historico-body tr").forEach(tr => {
        const row = Array.from(tr.querySelectorAll("td")).map(td => td.innerText);
        rows.push(row);
    });

    doc.autoTable({
        head: [['Indicador', 'Mês/Ano', 'Valor', 'Comentário', 'Prova', 'Status']],
        body: rows,
        startY: 25
    });

    doc.save("relatorio.pdf");
}

function baixarExcel() {
    const wb = XLSX.utils.book_new();
    const ws_data = [["Indicador", "Mês/Ano", "Valor", "Comentário", "Prova", "Status"]];

    document.querySelectorAll("#historico-body tr").forEach(tr => {
        const row = Array.from(tr.querySelectorAll("td")).map(td => td.innerText);
        ws_data.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, "relatorio.xlsx");
}

// === INÍCIO DO BLOCO DE HISTÓRICO COM FILTROS ===

document.addEventListener("DOMContentLoaded", () => {
    const perfil = localStorage.getItem("perfil_usuario");
    if (perfil !== "master") {
      alert("Acesso negado. Esta página é exclusiva para perfil master.");
      window.location.href = "indexgestores.html"; // redireciona o gestor
    }
    
    const token = localStorage.getItem("access");
    if (!token) {
        alert("Você precisa estar logado.");
        window.location.href = "login.html";
        return;
    }

    carregarSetores();
    carregarPreenchimentos();
    configurarEventosDeFiltro();
});

function carregarSetores() {
    const token = localStorage.getItem("access");
    fetch("http://127.0.0.1:8000/api/setores/", {
        headers: { "Authorization": `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        const select = document.getElementById("filtro-setor");
        select.innerHTML = `<option value="">Todos os setores</option>`;
        data.forEach(setor => {
            select.innerHTML += `<option value="${setor.nome}">${setor.nome}</option>`;
        });
    });
}

function carregarPreenchimentos() {
    const token = localStorage.getItem("access");
    fetch("http://127.0.0.1:8000/api/preenchimentos/", {
        headers: { "Authorization": `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => aplicarFiltros(data))
    .catch(err => {
        console.error("Erro ao carregar preenchimentos:", err);
        alert("Erro ao buscar os dados do histórico.");
    });
}

function aplicarFiltros(preenchimentos) {
    const setorSelecionado = document.getElementById("filtro-setor").value;
    const periodo = document.getElementById("filtro-periodo").value;
    const [anoFiltro, mesFiltro] = periodo ? periodo.split("-") : [null, null];

    const filtrados = preenchimentos.filter(p => {
        const data = new Date(p.data_preenchimento);
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = String(data.getFullYear());

        const condSetor = setorSelecionado ? p.setor_nome === setorSelecionado : true;
        const condMes = mesFiltro ? mes === mesFiltro : true;
        const condAno = anoFiltro ? ano === anoFiltro : true;

        return condSetor && condMes && condAno;
    });

    renderizarHistorico(filtrados);
}

function renderizarHistorico(preenchimentos) {
    const tbody = document.getElementById("historico-body");
    tbody.innerHTML = "";

    preenchimentos.forEach(p => {
        const data = new Date(p.data_preenchimento);
        const mesAno = `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
        const comentario = p.comentario || "-";
        const provas = p.provas ? `<a href="${p.provas}" target="_blank" class="text-blue-600 underline">Ver</a>` : "—";
        const status = calcularStatus(p.valor_realizado, p.meta, p.tipo_meta);
        const corStatus = status === "Atingida" ? "text-green-600" : "text-red-600";

        const linha = `
            <tr>
                <td class="px-4 py-2">${p.indicador_nome}</td>
                <td class="px-4 py-2">${mesAno}</td>
                <td class="px-4 py-2">${p.valor_realizado}</td>
                <td class="px-4 py-2">${comentario}</td>
                <td class="px-4 py-2">${provas}</td>
                <td class="px-4 py-2 font-semibold ${corStatus}">${status}</td>
            </tr>
        `;
        tbody.innerHTML += linha;
    });
}

function calcularStatus(valor, meta, tipo_meta) {
    if (tipo_meta === "para_cima") return valor >= meta ? "Atingida" : "Não atingida";
    if (tipo_meta === "para_baixo") return valor <= meta ? "Atingida" : "Não atingida";
    return "Acompanhamento";
}

function configurarEventosDeFiltro() {
    document.getElementById("filtro-setor").addEventListener("change", carregarPreenchimentos);
    document.getElementById("filtro-periodo").addEventListener("change", carregarPreenchimentos);
}

carregarUsuarioLogado();