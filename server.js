const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const DATA_FILE = './dados.json';

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

// --- OPERAÇÃO DE CADASTRO (CORRIGIDA) ---
app.post('/pacientes', (req, res) => {
    const novoPaciente = req.body; // Declarado uma única vez aqui

    if (!novoPaciente.nome || !novoPaciente.telefone || novoPaciente.nome.trim() === '' || novoPaciente.telefone.trim() === '') {
        console.log(`[ERRO] Dados inválidos:`, novoPaciente);
        return res.status(400).json({ mensagem: "Nome e telefone são obrigatórios." });
    }

    const dados = lerBanco();
    
    // REMOVIDO: novoPaciente = req.body; (Isso causava o SyntaxError)
    
    dados.pacientes.push(novoPaciente);
    salvarBanco(dados);
    
    console.log(`[FILA] Novo agendamento: ${novoPaciente.nome}`);
    res.status(201).json({ mensagem: "Paciente cadastrado!" });
});

// --- ROTA DE PAGAMENTO / DELETE ---
app.delete('/pacientes/:id', (req, res) => {
    const index = parseInt(req.params.id);
    const corpo = req.body || {};
    const valorFinal = parseFloat(corpo.valor) || 0;

    let dados = lerBanco();

    if (index >= 0 && index < dados.pacientes.length) {
        const removido = dados.pacientes.splice(index, 1)[0];
        const dataAtual = new Date().toLocaleDateString('pt-BR');
        const horaAtual = new Date().toLocaleTimeString('pt-BR');
        
        const transacao = {
            data: dataAtual,
            hora: horaAtual,
            paciente: removido.nome,
            servico: removido.servico,
            valor: valorFinal,
            metodo: corpo.metodo || "Pix"
        };

        if (!dados.financeiro) dados.financeiro = { total: 0, historico: [] };
        dados.financeiro.total += valorFinal;
        dados.financeiro.historico.push(transacao);

        salvarBanco(dados);

        console.log(`\n💰 PAGAMENTO REGISTRADO: ${removido.nome} - R$ ${valorFinal}`);
        res.json({ mensagem: "Sucesso!", transacao: transacao });
    } else {
        res.status(404).json({ mensagem: "Paciente não encontrado." });
    }
});

// --- LOGIN ---
app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;
    if (usuario === 'admin' && senha === '123') {
        res.json({ logado: true, role: 'admin' });
    } else if (usuario === 'user' && senha === '123') {
        res.json({ logado: true, role: 'recepcao' });
    } else {
        res.status(401).json({ logado: false, mensagem: "Credenciais inválidas" });
    }
});

app.listen(3000, () => {
    console.log("🚀 SBM API Online em http://localhost:3000");
});