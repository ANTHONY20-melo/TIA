/* =============================================
   SISTEMA DE GESTÃO - CLÍNICA SBM (SÊNIOR V5.1)
   ============================================= */

const API_BASE = "http://localhost:3000";
const USER_ROLE = localStorage.getItem('role') || 'user';
let state = { pacientes: [], financeiro: { total: 0, historico: [] }, chart: null };
let activePatientId = null;

window.onload = async () => {
    // 1. Configurações de Data e Role
    const hoje = new Date();
    const dataAtualEl = document.getElementById('data-atual');
    const labelRoleEl = document.getElementById('label-role');
    const currentYearEl = document.getElementById('current-year');
    const menuAdminEl = document.getElementById('menu-admin');

    if(dataAtualEl) dataAtualEl.innerText = hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    if(labelRoleEl) labelRoleEl.innerText = USER_ROLE === 'admin' ? "ADMIN" : "RECEPÇÃO";
    
    if(document.getElementById('add-data')) {
        document.getElementById('add-data').value = hoje.toISOString().split('T')[0];
    }

    if(currentYearEl) currentYearEl.innerText = hoje.getFullYear();

    if (menuAdminEl && USER_ROLE === 'admin') menuAdminEl.style.display = 'block';
    
    // 2. Inicialização de Dados (Se estiver no Dashboard)
    if(document.getElementById('corpo-tabela-pacientes')) {
        await refreshData();
        initChart();
    }

    // 3. Motores de Interface
    initScrollReveal();
    initSiteForm(); // Nova função para o Agendamento Online
};

/**
 * MOTOR DE AGENDAMENTO ONLINE (SITE)
 * Captura os dados do formulário de contato e envia para a API
 */
function initSiteForm() {
    const formSite = document.getElementById('form-clinica-site');
    if (!formSite) return;

    formSite.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Extraindo dados dos IDs únicos que definimos
        const novoAgendamento = {
            nome: document.getElementById('nome-cliente').value,
            telefone: document.getElementById('tel-cliente').value,
            servico: document.getElementById('servico-cliente').value,
            mensagem: document.getElementById('msg-cliente').value,
            data: new Date().toISOString().split('T')[0], // Data de hoje
            hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            status: 'Aguardando'
        };

        try {
            const response = await fetch(`${API_BASE}/pacientes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novoAgendamento)
            });

            if (response.ok) {
                alert("✅ Solicitação enviada com sucesso! Nossa equipe entrará em contato.");
                formSite.reset();
                
                // Se o admin estiver com o dashboard aberto em outra aba, 
                // os dados serão atualizados no próximo refreshData.
                if(document.getElementById('corpo-tabela-pacientes')) refreshData();
            } else {
                throw new Error("Erro ao enviar agendamento");
            }
        } catch (err) {
            console.error("Erro no agendamento:", err);
            alert("❌ Ops! Ocorreu um erro ao enviar. Tente novamente mais tarde.");
        }
    });
}

/**
 * MOTOR DE REVELAÇÃO AO ROLAR
 */
function initScrollReveal() {
    const revealElements = document.querySelectorAll(".reveal");
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("active");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    revealElements.forEach(el => observer.observe(el));
}

/**
 * SINCRONIZAÇÃO DE DADOS (DASHBOARD)
 */
async function refreshData() {
    try {
        const [resPac, resFin] = await Promise.all([
            fetch(`${API_BASE}/pacientes`), 
            fetch(`${API_BASE}/financeiro`)
        ]);
        state.pacientes = await resPac.json();
        state.financeiro = await resFin.json();
        
        renderQueue();
        updateKpis();
        if(state.chart) updateChart();
    } catch (err) { console.error("Erro de conexão:", err); }
}

// ... (Mantenha as funções renderQueue, updateKpis, exportarParaExcel, etc.)