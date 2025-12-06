const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyJWT } = require('../middleware/auth');

// Adicionar aos favoritos
router.post('/', verifyJWT, async (req, res) => {
    try {
        const { conteudo_id } = req.body;
        const utilizador_id = req.userId;
        
        if (!conteudo_id) {
            return res.status(400).json({ message: 'Conteúdo ID é obrigatório.' });
        }
        
        // Verificar se já está nos favoritos
        const [existing] = await db.execute(
            'SELECT id FROM favoritos WHERE utilizador_id = ? AND conteudo_id = ?',
            [utilizador_id, conteudo_id]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Já está nos favoritos.' });
        }
        
        await db.execute(
            'INSERT INTO favoritos (utilizador_id, conteudo_id) VALUES (?, ?)',
            [utilizador_id, conteudo_id]
        );
        
        res.status(201).json({ message: 'Adicionado aos favoritos com sucesso.' });
    } catch (error) {
        console.error('Erro ao adicionar favorito:', error);
        res.status(500).json({ message: 'Erro ao adicionar aos favoritos.' });
    }
});

// Remover dos favoritos
router.delete('/:conteudo_id', verifyJWT, async (req, res) => {
    try {
        const { conteudo_id } = req.params;
        const utilizador_id = req.userId;
        
        await db.execute(
            'DELETE FROM favoritos WHERE utilizador_id = ? AND conteudo_id = ?',
            [utilizador_id, conteudo_id]
        );
        
        res.json({ message: 'Removido dos favoritos com sucesso.' });
    } catch (error) {
        console.error('Erro ao remover favorito:', error);
        res.status(500).json({ message: 'Erro ao remover dos favoritos.' });
    }
});

// Listar favoritos do utilizador
router.get('/', verifyJWT, async (req, res) => {
    try {
        const utilizador_id = req.userId;
        
        const [favoritos] = await db.execute(
            `SELECT c.*, f.data_adicao
             FROM favoritos f
             INNER JOIN conteudos c ON f.conteudo_id = c.id
             WHERE f.utilizador_id = ?
             ORDER BY f.data_adicao DESC`,
            [utilizador_id]
        );
        
        res.json(favoritos);
    } catch (error) {
        console.error('Erro ao listar favoritos:', error);
        res.status(500).json({ message: 'Erro ao listar favoritos.' });
    }
});

// Verificar se está nos favoritos
router.get('/:conteudo_id', verifyJWT, async (req, res) => {
    try {
        const { conteudo_id } = req.params;
        const utilizador_id = req.userId;
        
        const [favoritos] = await db.execute(
            'SELECT id FROM favoritos WHERE utilizador_id = ? AND conteudo_id = ?',
            [utilizador_id, conteudo_id]
        );
        
        res.json({ isFavorite: favoritos.length > 0 });
    } catch (error) {
        console.error('Erro ao verificar favorito:', error);
        res.status(500).json({ message: 'Erro ao verificar favorito.' });
    }
});

module.exports = router;

