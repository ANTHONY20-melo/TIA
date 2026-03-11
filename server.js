const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();

// Configurações básicas e segurança
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const DATA_FILE = './dados.json';

// Utilitário Sênior: Gerenciamento de persistência
const lerBanco = () => {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            const inicial = { pacientes: [], financeiro: { total: 0, historico: [] } };
            fs.writeFileSync(DATA_FILE, JSON.stringify(inicial, null, 2));
            return inicial;
        }
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        return { pacientes: [], financeiro: { total: 0, historico: [] } };
    }
};

const salvarBanco = (dados) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(dados, null, 2));
};

// --- ROTAS DE CONSULTA ---

app.get('/pacientes', (req, res) => {
    const dados = lerBanco();
    res.json(dados.pacientes || []);
});

app.get('/financeiro', (req, res) => {
    const dados = lerBanco();
    res.json(dados.financeiro || { total: 0, historico: [] });
});

// --- ROTA DE AUDITORIA (NOVA: Para o Excel Consolidado) ---
app.get('/financeiro/relatorio', (req, res) => {
    const dados = lerBanco();
    const historico = (dados.financeiro && dados.financeiro.historico) ? dados.financeiro.historico : [];
    
    console.log(`\n[REPORTE] Exportação de histórico solicitada: ${historico.length} registros.`);
    res.json(historico);
});

// --- ROTAS DE OPERAÇÃO ---

app.post('/pacientes', (req, res) => {
    const novoPaciente = req.body;

    // --- VALIDAÇÃO SÊNIOR ---
    // Garante que os campos essenciais não são nulos, indefinidos ou vazios.
    if (!novoPaciente.nome || !novoPaciente.telefone || novoPaciente.nome.trim() === '' || novoPaciente.telefone.trim() === '') {
        console.log(`[ERRO] Tentativa de cadastro de paciente com dados inválidos:`, novoPaciente);
        return res.status(400).json({ mensagem: "Erro de validação: Nome e telefone são obrigatórios e não podem estar em branco." });
    }

    const dados = lerBanco();
    if (!dados.pacientes) dados.pacientes = [];
    dados.pacientes.push(novoPaciente);
    salvarBanco(dados);
    
    console.log(`[FILA] Novo paciente/agendamento cadastrado: ${novoPaciente.nome}`);
    res.status(201).json({ mensagem: "Paciente cadastrado!" });
});

app.delete('/pacientes/:id', (req, res) => {
    const index = parseInt(req.params.id);
    const corpo = req.body || {};
    const valor = corpo.valor;
    const metodo = corpo.metodo;

    let dados = lerBanco();

    if (index >= 0 && index < dados.pacientes.length) {
        const removido = dados.pacientes.splice(index, 1)[0];
        
        const valorFinal = parseFloat(valor) || 0;
        const dataAtual = new Date().toLocaleDateString('pt-BR');
        const horaAtual = new Date().toLocaleTimeString('pt-BR');
        
        if (!dados.financeiro) {
            dados.financeiro = { total: 0, historico: [] };
        }

        const transacao = {
            data: dataAtual,
            hora: horaAtual,
            paciente: removido.nome,
            servico: removido.servico,
            valor: valorFinal,
            metodo: metodo || "Pix"
        };

        dados.financeiro.total += valorFinal;
        dados.financeiro.historico.push(transacao);

        salvarBanco(dados);

        // --- LOG NO TERMINAL ---
        console.log("\n" + "=".repeat(45));
        console.log("💰 NOVO PAGAMENTO REGISTRADO - CLÍNICA SBM");
        console.log("=".repeat(45));
        console.log(`👤 PACIENTE:  ${removido.nome}`);
        console.log(`📋 SERVIÇO:   ${removido.servico}`);
        console.log(`💳 MÉTODO:    ${transacao.metodo}`);
        console.log(`💵 VALOR:     R$ ${valorFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
        console.log(`⏰ HORÁRIO:   ${dataAtual} às ${horaAtual}`);
        console.log("=".repeat(45));
        console.log("✅ Sistema atualizado com sucesso!");
        console.log("=".repeat(45) + "\n");

        res.json({ mensagem: "Sucesso!", transacao: transacao });
    } else {
        res.status(404).json({ mensagem: "Erro: Paciente não encontrado." });
    }
});

// --- AUTENTICAÇÃO ---

app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;
    if (usuario === 'admin' && senha === '123') {
        res.json({ logado: true, role: 'admin' });
    } else if (usuario === 'user' && senha === '123') {
        res.json({ logado: true, role: 'recepcao' });
    } else {
        res.status(401).json({ logado: false, mensagem: "Usuário ou senha inválidos" });
    }
});

// --- TRATAMENTO GLOBAL DE ERROS ---
app.use((err, req, res, next) => {
    console.error("❌ ERRO NO SISTEMA:", err.stack);
    res.status(500).json({ 
        mensagem: "Algo deu errado internamente!", 
        erro: err.message 
    });
});

app.listen(3000, () => {
    console.log("\n" + "=".repeat(45));
    console.log("      SBM API - SISTEMA DE GESTÃO MÉDICA     ");
    console.log("      Status: OPERACIONAL (Online)           ");
    console.log("      Endpoint: http://localhost:3000        ");
    console.log("=".repeat(45) + "\n");
});