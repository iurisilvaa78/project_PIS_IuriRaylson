const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyJWT } = require('../middleware/auth');

// Criar review
router.post('/', verifyJWT, async (req, res) => {
    try {
        const { conteudo_id, classificacao, critica } = req.body;
        const utilizador_id = req.userId;
        
        if (!conteudo_id || !classificacao) {
            return res.status(400).json({ message: 'Conteúdo ID e classificação são obrigatórios.' });
        }
        
        if (classificacao < 1 || classificacao > 5) {
            return res.status(400).json({ message: 'Classificação deve estar entre 1 e 5.' });
        }
        
        // Verificar se já existe review
        const [existing] = await db.execute(
            'SELECT id FROM reviews WHERE utilizador_id = ? AND conteudo_id = ?',
            [utilizador_id, conteudo_id]
        );
        
        if (existing.length > 0) {
            // Atualizar review existente
            await db.execute(
                'UPDATE reviews SET classificacao = ?, critica = ? WHERE id = ?',
                [classificacao, critica || null, existing[0].id]
            );
            return res.json({ message: 'Review atualizada com sucesso.', id: existing[0].id });
        }
        
        // Criar nova review
        const [result] = await db.execute(
            'INSERT INTO reviews (utilizador_id, conteudo_id, classificacao, critica) VALUES (?, ?, ?, ?)',
            [utilizador_id, conteudo_id, classificacao, critica || null]
        );
        
        res.status(201).json({ message: 'Review criada com sucesso.', id: result.insertId });
    } catch (error) {
        console.error('Erro ao criar review:', error);
        res.status(500).json({ message: 'Erro ao criar review.' });
    }
});

// Listar reviews de um conteúdo
router.get('/conteudo/:conteudo_id', async (req, res) => {
    try {
        const { conteudo_id } = req.params;
        
        const [reviews] = await db.execute(
            `SELECT r.*, u.username, u.nome as nome_utilizador
             FROM reviews r
             INNER JOIN utilizadores u ON r.utilizador_id = u.id
             WHERE r.conteudo_id = ?
             ORDER BY r.data_review DESC`,
            [conteudo_id]
        );
        
        res.json(reviews);
    } catch (error) {
        console.error('Erro ao listar reviews:', error);
        res.status(500).json({ message: 'Erro ao listar reviews.' });
    }
});

// Votar na utilidade de uma review
router.post('/:review_id/voto', verifyJWT, async (req, res) => {
    try {
        const { review_id } = req.params;
        const utilizador_id = req.userId;
        
        // Verificar se já votou
        const [existing] = await db.execute(
            'SELECT id FROM votos_reviews WHERE review_id = ? AND utilizador_id = ?',
            [review_id, utilizador_id]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Já votou nesta review.' });
        }
        
        // Verificar se não é a própria review
        const [review] = await db.execute(
            'SELECT utilizador_id FROM reviews WHERE id = ?',
            [review_id]
        );
        
        if (review.length === 0) {
            return res.status(404).json({ message: 'Review não encontrada.' });
        }
        
        if (review[0].utilizador_id === utilizador_id) {
            return res.status(400).json({ message: 'Não pode votar na sua própria review.' });
        }
        
        // Adicionar voto
        await db.execute(
            'INSERT INTO votos_reviews (review_id, utilizador_id) VALUES (?, ?)',
            [review_id, utilizador_id]
        );
        
        // Atualizar contador
        await db.execute(
            'UPDATE reviews SET votos_utilidade = votos_utilidade + 1 WHERE id = ?',
            [review_id]
        );
        
        res.json({ message: 'Voto registado com sucesso.' });
    } catch (error) {
        console.error('Erro ao votar:', error);
        res.status(500).json({ message: 'Erro ao registar voto.' });
    }
});

// Eliminar review
router.delete('/:id', verifyJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const utilizador_id = req.userId;
        
        // Verificar se é o dono da review ou admin
        const [review] = await db.execute(
            'SELECT utilizador_id FROM reviews WHERE id = ?',
            [id]
        );
        
        if (review.length === 0) {
            return res.status(404).json({ message: 'Review não encontrada.' });
        }
        
        if (review[0].utilizador_id !== utilizador_id && !req.isAdmin) {
            return res.status(403).json({ message: 'Não tem permissão para eliminar esta review.' });
        }
        
        await db.execute('DELETE FROM reviews WHERE id = ?', [id]);
        
        res.json({ message: 'Review eliminada com sucesso.' });
    } catch (error) {
        console.error('Erro ao eliminar review:', error);
        res.status(500).json({ message: 'Erro ao eliminar review.' });
    }
});

module.exports = router;

