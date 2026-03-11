/* =============================================
   SISTEMA DE GESTÃO - CLÍNICA SBM (SÊNIOR V5.2)
   ============================================= */

const API_BASE = "http://localhost:3000";
// Mudamos para sessionStorage para alinhar com o login que criamos
const USUARIO_LOGADO = JSON.parse(sessionStorage.getItem('usuario_logado'));
const USER_ROLE = USUARIO_LOGADO ? USUARIO_LOGADO.role : 'user';

let state = { pacientes: [], financeiro: { total: 0, historico: [] }, chart: null };

window.onload = async () => {
    // 1. Configurações de Interface e Erros de Escrita
    configurarCabecalho();
    
    // 2. Inicialização de Dados (Se estiver no Dashboard)
    if(document.getElementById('corpo-tabela-pacientes') || document.getElementById('table-appointments')) {
        await refreshData();
        // initChart(); // Ative se tiver o Chart.js instalado
    }

    // 3. Motores de Interface
    initScrollReveal();
    initSiteForm(); 
};

/**
 * CORREÇÃO: CONFIGURAÇÃO DE CABEÇALHO E BOTÃO VOLTAR
 * Resolve a sobreposição de textos e gerencia o botão de navegação
 */
function configurarCabecalho() {
    const hoje = new Date();
    const dataAtualEl = document.getElementById('data-atual');
    const userDisplayEl = document.getElementById('user-display-name');
    const btnVoltar = document.getElementById('btn-voltar');

    // Atualiza Data
    if(dataAtualEl) dataAtualEl.innerText = hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

    // Atualiza Nome do Usuário (Evita duplicidade)
    if(userDisplayEl && USUARIO_LOGADO) {
        userDisplayEl.innerHTML = `Olá, <strong>${USUARIO_LOGADO.name}</strong>`;
    }

    // Lógica do Botão Voltar (Aparece em todas menos na index)
    if (btnVoltar) {
        const isHome = window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/');
        btnVoltar.style.display = isHome ? 'none' : 'flex';
    }
}

/**
 * MOTOR DE AGENDAMENTO ONLINE (SITE)
 * Agora salva e já atualiza a lista de pacientes selecionáveis
 */
function initSiteForm() {
    const formSite = document.getElementById('form-clinica-site');
    if (!formSite) return;

    formSite.addEventListener('submit', async (e) => {
        e.preventDefault();

        const novoAgendamento = {
            nome: document.getElementById('nome-cliente').value,
            telefone: document.getElementById('tel-cliente').value,
            servico: document.getElementById('servico-cliente').value,
            mensagem: document.getElementById('msg-cliente').value,
            data: new Date().toISOString().split('T')[0],
            hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            status: 'Pendente'
        };

        try {
            // CORREÇÃO DE ERRO: Enviando para a rota correta do servidor
            const response = await fetch(`${API_BASE}/pacientes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novoAgendamento)
            });

            if (response.ok) {
                alert("✅ Sucesso! Seu agendamento foi enviado para o nosso painel.");
                formSite.reset();
                if(window.location.pathname.includes('index.html')) refreshData();
            } else {
                throw new Error("Erro no servidor");
            }
        } catch (err) {
            console.error("Erro no agendamento:", err);
            alert("❌ O servidor está offline ou o comando está errado. Verifique o terminal.");
        }
    });
}

/**
 * MOTOR DE REVELAÇÃO AO ROLAR (SCROLL REVEAL)
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
    }, { threshold: 0.1 });
    revealElements.forEach(el => observer.observe(el));
}

/**
 * SINCRONIZAÇÃO DE DADOS
 */
async function refreshData() {
    try {
        const resPac = await fetch(`${API_BASE}/pacientes`);
        state.pacientes = await resPac.json();
        
        renderTable(); 
        atualizarSelectAtendimento(); // Automação: preenche os selects com os nomes
    } catch (err) { 
        console.log("Servidor não detectado. Usando dados locais para demonstração."); 
    }
}

/**
 * AUTOMATIZAÇÃO: Preenche o select de atendimento com os pacientes cadastrados
 */
function atualizarSelectAtendimento() {
    const select = document.getElementById('select-paciente-atendimento');
    if (!select) return;

    select.innerHTML = '<option value="">Selecione um paciente...</option>';
    state.pacientes.forEach(p => {
        const option = document.createElement('option');
        option.value = p.nome;
        option.textContent = p.nome;
        select.appendChild(option);
    });
}

function efetuarLogout() {
    if (confirm("Clínica SBM: Deseja encerrar sua sessão?")) {
        sessionStorage.clear();
        window.location.href = "login.html";
    }
}