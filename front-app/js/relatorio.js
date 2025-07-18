// === ESTADO GERAL E SEGURANÇA DE ACESSO ===
document.addEventListener("DOMContentLoaded", () => {
    const perfil = localStorage.getItem("perfil_usuario");
    const token = localStorage.getItem("access");

    if (perfil !== "master") {
        alert("Acesso negado. Esta página é exclusiva para perfil master.");
        window.location.href = "indexgestores.html";
        return;
    }

    if (!token) {
        alert("Você precisa estar logado.");
        window.location.href = "login.html";
        return;
    }

    carregarSetores();
    carregarPreenchimentos();
    configurarEventosDeFiltro();
    carregarUsuarioLogado();
});

// === FUNÇÕES DE FILTRO E HISTÓRICO ===

function configurarEventosDeFiltro() {
    document.getElementById("filter-setor").addEventListener("change", carregarPreenchimentos);
    document.getElementById("filter-data-inicial").addEventListener("change", carregarPreenchimentos);
    document.getElementById("filter-data-final").addEventListener("change", carregarPreenchimentos);
    document.getElementById("filter-status").addEventListener("change", carregarPreenchimentos);
}

function carregarSetores() {
    const token = localStorage.getItem("access");

    fetch("http://127.0.0.1:8000/api/setores/", {
        headers: { "Authorization": `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        const select = document.getElementById("filter-setor");
        select.innerHTML = `<option value="">Todos os setores</option>`;

        const setores = Array.isArray(data) ? data : data.results || [];
        setores.forEach(setor => {
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
    .then(data => {
        const preenchimentos = Array.isArray(data) ? data : data.results || [];
        aplicarFiltros(preenchimentos);
    })
    .catch(err => {
        console.error("Erro ao carregar preenchimentos:", err);
        alert("Erro ao buscar os dados do histórico.");
    });
}


function aplicarFiltros(preenchimentos) {
    const setorSelecionado = document.getElementById("filter-setor").value;
    const dataInicial = document.getElementById("filter-data-inicial").value;
    const dataFinal = document.getElementById("filter-data-final").value;
    const statusSelecionado = document.getElementById("filter-status").value;

    const lista = Array.isArray(preenchimentos) ? preenchimentos : preenchimentos.results || [];

    const filtrados = lista.filter(p => {
        const data = new Date(p.data_preenchimento);
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = String(data.getFullYear());
        const dataTimestamp = data.getTime();

        const dataInicialStr = document.getElementById("filter-data-inicial").value;
        const dataFinalStr = document.getElementById("filter-data-final").value;

        const dataInicial = dataInicialStr ? new Date(`${dataInicialStr}-01`).getTime() : null;
        const dataFinal = dataFinalStr ? new Date(`${dataFinalStr}-01`).getTime() : null;

        const condDataInicial = dataInicial ? dataTimestamp >= dataInicial : true;
        const condDataFinal = dataFinal ? dataTimestamp <= dataFinal : true;


        const condSetor = setorSelecionado ? p.setor_nome === setorSelecionado : true;

        let condStatus = true;
        if (statusSelecionado === "atingidos") {
            condStatus = calcularStatus(p.valor_realizado, p.meta, p.tipo_meta) === "Atingido";
        } else if (statusSelecionado === "nao-atingidos") {
            condStatus = calcularStatus(p.valor_realizado, p.meta, p.tipo_meta) === "Não Atingido";
        }


        return condSetor && condDataInicial && condDataFinal && condStatus;
    });

    renderizarHistorico(filtrados);
}


function renderizarHistorico(preenchimentos) {
    const tbody = document.getElementById("historico-body");
    const thead = document.getElementById("historico-head");
    tbody.innerHTML = "";
    thead.innerHTML = "";

    // Agrupar por indicador
    const dadosAgrupados = {};
    const mesesSet = new Set();

    preenchimentos.forEach(p => {
        const data = new Date(p.data_preenchimento);
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = String(data.getFullYear());
        const chaveMes = `${ano}-${mes}`;
        mesesSet.add(chaveMes);

        if (!dadosAgrupados[p.indicador_nome]) {
            dadosAgrupados[p.indicador_nome] = {};
        }

        dadosAgrupados[p.indicador_nome][chaveMes] = {
            valor: p.valor_realizado,
            meta: p.meta,
            status: calcularStatus(p.valor_realizado, p.meta, p.tipo_meta)
        };
    });

    // Ordenar os meses
    const mesesOrdenados = Array.from(mesesSet).sort();

    // Montar cabeçalho
    let header = `<th class="px-4 py-2">Indicador</th>`;
    mesesOrdenados.forEach(mes => {
        const [ano, mesNum] = mes.split("-");
        const mesLabel = `${mesPtBr(mesNum)}/${ano.slice(2)}`;
        header += `
            <th class="px-4 py-2">Valor ${mesLabel}</th>
            <th class="px-4 py-2">Meta ${mesLabel}</th>
            <th class="px-4 py-2">Status ${mesLabel}</th>
        `;
    });
    thead.innerHTML = `<tr>${header}</tr>`;

    // Montar corpo
    for (const indicador in dadosAgrupados) {
        let row = `<td class="px-4 py-2 font-semibold">${indicador}</td>`;

        mesesOrdenados.forEach(mes => {
            const dados = dadosAgrupados[indicador][mes];
            if (dados) {
                const status = (dados.status || "").toLowerCase();

                const corStatus = status === "atingida"
                    ? "text-green-600"
                    : status === "não atingida" || status === "nao atingida"
                    ? "text-red-600"
                    : "text-gray-600";

                const icone = status === "atingida"
                    ? "✅"
                    : status === "não atingida" || status === "nao atingida"
                    ? "❌"
                    : "📊";

                row += `
                    <td class="px-4 py-2">${formatarValor(dados.valor)}</td>
                    <td class="px-4 py-2">${formatarValor(dados.meta)}</td>
                    <td class="px-4 py-2 ${corStatus}">${icone} ${dados.status}</td>
                `;
            } else {
                row += `<td class="px-4 py-2">—</td><td class="px-4 py-2">—</td><td class="px-4 py-2">—</td>`;
            }
        });

        tbody.innerHTML += `<tr>${row}</tr>`;
    }

}

function calcularStatus(valor, meta, tipo) {
    if (valor == null || meta == null) return "Sem dados";
    if (tipo === "crescente") return valor >= meta ? "Atingida" : "Não atingida";
    if (tipo === "decrescente") return valor <= meta ? "Atingida" : "Não atingida";
    return "Monitoramento";
}


function mesPtBr(mes) {
    const nomes = {
        "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr", "05": "Mai", "06": "Jun",
        "07": "Jul", "08": "Ago", "09": "Set", "10": "Out", "11": "Nov", "12": "Dez"
    };
    return nomes[mes] || mes;
}

function formatarValor(valor) {
    if (valor == null) return "—";
    return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}