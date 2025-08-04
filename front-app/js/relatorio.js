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
    carregarIndicadores();
    configurarEventosDeFiltro();
    carregarUsuarioLogado();

    // ✅ Aciona o carregamento apenas quando clicar no botão
    document.getElementById("btn-ver-historico").addEventListener("click", carregarPreenchimentos);
});

// === FUNÇÕES DE FILTRO E HISTÓRICO ===

function configurarEventosDeFiltro() {
    document.getElementById("filter-setor").addEventListener("change", () => {
        carregarIndicadores();
    });
}

function carregarSetores() {
    const token = localStorage.getItem("access");

    fetch(`${window.API_BASE_URL}/api/setores/`, {
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

function carregarIndicadores() {
    const token = localStorage.getItem("access");
    const setorSelecionado = document.getElementById("filter-setor").value;

    fetch(`${window.API_BASE_URL}/api/indicadores/`, {
        headers: { "Authorization": `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        const select = document.getElementById("filter-indicador");
        select.innerHTML = `<option value="">Todos os Indicadores</option>`;

        const indicadores = Array.isArray(data) ? data : data.results || [];
        indicadores
            .filter(i => !setorSelecionado || i.setor_nome === setorSelecionado)
            .forEach(indicador => {
                select.innerHTML += `<option value="${indicador.nome}">${indicador.nome}</option>`;
            });
    });
}

function carregarPreenchimentos() {
    const token = localStorage.getItem("access");

    fetch(`${window.API_BASE_URL}/api/preenchimentos/`, {
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
    const indicadorSelecionado = document.getElementById("filter-indicador").value;
    const dataInicialStr = document.getElementById("filter-data-inicial").value;
    const dataFinalStr = document.getElementById("filter-data-final").value;
    const statusSelecionado = document.getElementById("filter-status").value;

    if (!dataInicialStr || !dataFinalStr || !statusSelecionado) {
        console.warn("Preencha todos os filtros para aplicar.");
        document.getElementById("historico-container").classList.add("hidden");
        return;
    }

    // ✅ Corrige a diferença de mês no UTC
    const [anoIni, mesIni] = dataInicialStr.split("-").map(Number);
    const [anoFim, mesFim] = dataFinalStr.split("-").map(Number);
    const inicioTimestamp = new Date(anoIni, mesIni - 1).getTime();
    const fimTimestamp = new Date(anoFim, mesFim - 1).getTime();

    const lista = Array.isArray(preenchimentos) ? preenchimentos : preenchimentos.results || [];

    const filtrados = lista.filter(p => {
        const dataTimestamp = new Date(p.ano, p.mes - 1).getTime();

        const condDataInicial = dataTimestamp >= inicioTimestamp;
        const condDataFinal = dataTimestamp <= fimTimestamp;
        const condSetor = setorSelecionado ? p.setor_nome === setorSelecionado : true;
        const condIndicador = indicadorSelecionado ? p.indicador_nome === indicadorSelecionado : true;

        let condStatus = true;
        if (statusSelecionado === "atingidos") {
            condStatus = calcularStatus(p.valor_realizado, p.meta, p.tipo_meta) === "Atingida";
        } else if (statusSelecionado === "nao-atingidos") {
            condStatus = calcularStatus(p.valor_realizado, p.meta, p.tipo_meta) === "Não atingida";
        }

        return condSetor && condIndicador && condDataInicial && condDataFinal && condStatus;
    });

    renderizarHistorico(filtrados);

    const historicoDiv = document.getElementById("historico-container");
    if (filtrados.length > 0) {
        historicoDiv.classList.remove("hidden");
    } else {
        historicoDiv.classList.add("hidden");
    }
}

function renderizarHistorico(preenchimentos) {
    const tbody = document.getElementById("historico-body");
    const thead = document.getElementById("historico-head");
    tbody.innerHTML = "";
    thead.innerHTML = "";

    const dadosAgrupados = {};
    const mesesSet = new Set();

    preenchimentos.forEach(p => {
        const chaveMes = `${p.ano}-${String(p.mes).padStart(2, '0')}`;
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

    const mesesOrdenados = Array.from(mesesSet).sort();

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
                    <td class="px-4 py-2 border-l border-gray-300">${formatarValor(dados.valor)}</td>
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
