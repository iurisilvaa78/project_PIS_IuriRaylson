const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyJWT } = require('../middleware/auth');

// Obter ou criar lista principal do utilizador e retornar conteúdos
router.get('/minha-lista', verifyJWT, async (req, res) => {
    try {
        const utilizador_id = req.userId;
        
        // Buscar ou criar lista principal
        let [listas] = await db.execute(
            'SELECT id FROM listas WHERE utilizador_id = ? AND nome = ?',
            [utilizador_id, 'Minha Lista']
        );
        
        let listaId;
        if (listas.length === 0) {
            // Criar lista principal
            const [result] = await db.execute(
                'INSERT INTO listas (utilizador_id, nome, descricao) VALUES (?, ?, ?)',
                [utilizador_id, 'Minha Lista', 'Minha lista pessoal de filmes e séries']
            );
            listaId = result.insertId;
        } else {
            listaId = listas[0].id;
        }
        
        // Buscar conteúdos da lista
        const [conteudos] = await db.execute(
            `SELECT c.*, lc.data_adicao
             FROM lista_conteudos lc
             INNER JOIN conteudos c ON lc.conteudo_id = c.id
             WHERE lc.lista_id = ?
             ORDER BY lc.data_adicao DESC`,
            [listaId]
        );
        
        res.json(conteudos);
    } catch (error) {
        console.error('Erro ao obter lista:', error);
        res.status(500).json({ message: 'Erro ao obter lista.' });
    }
});

// Adicionar conteúdo à lista principal
router.post('/minha-lista', verifyJWT, async (req, res) => {
    try {
        const { conteudo_id } = req.body;
        const utilizador_id = req.userId;
        
        if (!conteudo_id) {
            return res.status(400).json({ message: 'Conteúdo ID é obrigatório.' });
        }
        
        // Buscar ou criar lista principal
        let [listas] = await db.execute(
            'SELECT id FROM listas WHERE utilizador_id = ? AND nome = ?',
            [utilizador_id, 'Minha Lista']
        );
        
        let listaId;
        if (listas.length === 0) {
            // Criar lista principal
            const [result] = await db.execute(
                'INSERT INTO listas (utilizador_id, nome, descricao) VALUES (?, ?, ?)',
                [utilizador_id, 'Minha Lista', 'Minha lista pessoal de filmes e séries']
            );
            listaId = result.insertId;
        } else {
            listaId = listas[0].id;
        }
        
        // Verificar se já está na lista
        const [existing] = await db.execute(
            'SELECT * FROM lista_conteudos WHERE lista_id = ? AND conteudo_id = ?',
            [listaId, conteudo_id]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Este conteúdo já está na sua lista.' });
        }
        
        await db.execute(
            'INSERT INTO lista_conteudos (lista_id, conteudo_id) VALUES (?, ?)',
            [listaId, conteudo_id]
        );
        
        res.status(201).json({ message: 'Conteúdo adicionado à lista com sucesso.' });
    } catch (error) {
        console.error('Erro ao adicionar conteúdo à lista:', error);
        res.status(500).json({ message: 'Erro ao adicionar conteúdo à lista.' });
    }
});

// Remover conteúdo da lista principal
router.delete('/minha-lista/:conteudo_id', verifyJWT, async (req, res) => {
    try {
        const { conteudo_id } = req.params;
        const utilizador_id = req.userId;
        
        // Buscar lista principal
        const [listas] = await db.execute(
            'SELECT id FROM listas WHERE utilizador_id = ? AND nome = ?',
            [utilizador_id, 'Minha Lista']
        );
        
        if (listas.length === 0) {
            return res.status(404).json({ message: 'Lista não encontrada.' });
        }
        
        await db.execute(
            'DELETE FROM lista_conteudos WHERE lista_id = ? AND conteudo_id = ?',
            [listas[0].id, conteudo_id]
        );
        
        res.json({ message: 'Conteúdo removido da lista com sucesso.' });
    } catch (error) {
        console.error('Erro ao remover conteúdo da lista:', error);
        res.status(500).json({ message: 'Erro ao remover conteúdo da lista.' });
    }
});

// Criar lista
router.post('/', verifyJWT, async (req, res) => {
    try {
        const { nome, descricao } = req.body;
        const utilizador_id = req.userId;
        
        if (!nome) {
            return res.status(400).json({ message: 'Nome da lista é obrigatório.' });
        }
        
        const [result] = await db.execute(
            'INSERT INTO listas (utilizador_id, nome, descricao) VALUES (?, ?, ?)',
            [utilizador_id, nome, descricao || null]
        );
        
        res.status(201).json({ message: 'Lista criada com sucesso.', id: result.insertId });
    } catch (error) {
        console.error('Erro ao criar lista:', error);
        res.status(500).json({ message: 'Erro ao criar lista.' });
    }
});

// Listar listas do utilizador
router.get('/', verifyJWT, async (req, res) => {
    try {
        const utilizador_id = req.userId;
        
        const [listas] = await db.execute(
            `SELECT l.*, 
                    (SELECT COUNT(*) FROM lista_conteudos WHERE lista_id = l.id) as total_itens
             FROM listas l
             WHERE l.utilizador_id = ?
             ORDER BY l.data_criacao DESC`,
            [utilizador_id]
        );
        
        res.json(listas);
    } catch (error) {
        console.error('Erro ao listar listas:', error);
        res.status(500).json({ message: 'Erro ao listar listas.' });
    }
});

// Listar listas de um utilizador específico
router.get('/user/:utilizador_id', verifyJWT, async (req, res) => {
    try {
        const { utilizador_id } = req.params;
        
        // Verificar se é o próprio utilizador ou admin
        if (parseInt(utilizador_id) !== req.userId) {
            const [user] = await db.execute(
                'SELECT is_admin FROM utilizadores WHERE id = ?',
                [req.userId]
            );
            if (user.length === 0 || !user[0].is_admin) {
                return res.status(403).json({ message: 'Sem permissão.' });
            }
        }
        
        const [listas] = await db.execute(
            `SELECT l.*, 
                    (SELECT COUNT(*) FROM lista_conteudos WHERE lista_id = l.id) as total_itens
             FROM listas l
             WHERE l.utilizador_id = ?
             ORDER BY l.data_criacao DESC`,
            [utilizador_id]
        );
        
        res.json(listas);
    } catch (error) {
        console.error('Erro ao listar listas do utilizador:', error);
        res.status(500).json({ message: 'Erro ao listar listas.' });
    }
});

// Obter lista específica com conteúdos
router.get('/:id', verifyJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const utilizador_id = req.userId;
        
        // Verificar se a lista pertence ao utilizador
        const [listas] = await db.execute(
            'SELECT * FROM listas WHERE id = ? AND utilizador_id = ?',
            [id, utilizador_id]
        );
        
        if (listas.length === 0) {
            return res.status(404).json({ message: 'Lista não encontrada.' });
        }
        
        const lista = listas[0];
        
        // Buscar conteúdos da lista
        const [conteudos] = await db.execute(
            `SELECT c.*, lc.data_adicao
             FROM lista_conteudos lc
             INNER JOIN conteudos c ON lc.conteudo_id = c.id
             WHERE lc.lista_id = ?
             ORDER BY lc.data_adicao DESC`,
            [id]
        );
        
        lista.conteudos = conteudos;
        
        res.json(lista);
    } catch (error) {
        console.error('Erro ao obter lista:', error);
        res.status(500).json({ message: 'Erro ao obter lista.' });
    }
});

// Adicionar conteúdo à lista
router.post('/:id/conteudos', verifyJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const { conteudo_id } = req.body;
        const utilizador_id = req.userId;
        
        if (!conteudo_id) {
            return res.status(400).json({ message: 'Conteúdo ID é obrigatório.' });
        }
        
        // Verificar se a lista pertence ao utilizador
        const [listas] = await db.execute(
            'SELECT id FROM listas WHERE id = ? AND utilizador_id = ?',
            [id, utilizador_id]
        );
        
        if (listas.length === 0) {
            return res.status(404).json({ message: 'Lista não encontrada.' });
        }
        
        // Verificar se já está na lista
        const [existing] = await db.execute(
            'SELECT * FROM lista_conteudos WHERE lista_id = ? AND conteudo_id = ?',
            [id, conteudo_id]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Conteúdo já está na lista.' });
        }
        
        await db.execute(
            'INSERT INTO lista_conteudos (lista_id, conteudo_id) VALUES (?, ?)',
            [id, conteudo_id]
        );
        
        res.status(201).json({ message: 'Conteúdo adicionado à lista com sucesso.' });
    } catch (error) {
        console.error('Erro ao adicionar conteúdo à lista:', error);
        res.status(500).json({ message: 'Erro ao adicionar conteúdo à lista.' });
    }
});

// Remover conteúdo da lista
router.delete('/:id/conteudos/:conteudo_id', verifyJWT, async (req, res) => {
    try {
        const { id, conteudo_id } = req.params;
        const utilizador_id = req.userId;
        
        // Verificar se a lista pertence ao utilizador
        const [listas] = await db.execute(
            'SELECT id FROM listas WHERE id = ? AND utilizador_id = ?',
            [id, utilizador_id]
        );
        
        if (listas.length === 0) {
            return res.status(404).json({ message: 'Lista não encontrada.' });
        }
        
        await db.execute(
            'DELETE FROM lista_conteudos WHERE lista_id = ? AND conteudo_id = ?',
            [id, conteudo_id]
        );
        
        res.json({ message: 'Conteúdo removido da lista com sucesso.' });
    } catch (error) {
        console.error('Erro ao remover conteúdo da lista:', error);
        res.status(500).json({ message: 'Erro ao remover conteúdo da lista.' });
    }
});

// Eliminar lista
router.delete('/:id', verifyJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const utilizador_id = req.userId;
        
        // Verificar se a lista pertence ao utilizador
        const [listas] = await db.execute(
            'SELECT id FROM listas WHERE id = ? AND utilizador_id = ?',
            [id, utilizador_id]
        );
        
        if (listas.length === 0) {
            return res.status(404).json({ message: 'Lista não encontrada.' });
        }
        
        await db.execute('DELETE FROM listas WHERE id = ?', [id]);
        
        res.json({ message: 'Lista eliminada com sucesso.' });
    } catch (error) {
        console.error('Erro ao eliminar lista:', error);
        res.status(500).json({ message: 'Erro ao eliminar lista.' });
    }
});

module.exports = router;

