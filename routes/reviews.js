const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyJWT } = require('../middleware/auth');

// Criar review
router.post('/', verifyJWT, async (req, res) => {
    try {
        const { conteudo_id, avaliacao, comentario } = req.body;
        const utilizador_id = req.userId;
        
        if (!conteudo_id || !avaliacao) {
            return res.status(400).json({ message: 'Conteúdo ID e avaliação são obrigatórios.' });
        }
        
        if (avaliacao < 1 || avaliacao > 10) {
            return res.status(400).json({ message: 'Avaliação deve estar entre 1 e 10.' });
        }
        
        // Verificar se já existe review
        const [existing] = await db.execute(
            'SELECT id FROM reviews WHERE utilizador_id = ? AND conteudo_id = ?',
            [utilizador_id, conteudo_id]
        );
        
        if (existing.length > 0) {
            // Atualizar review existente
            await db.execute(
                'UPDATE reviews SET avaliacao = ?, comentario = ? WHERE id = ?',
                [avaliacao, comentario || null, existing[0].id]
            );
            
            // Atualizar rating médio do conteúdo
            await updateConteudoRating(conteudo_id);
            
            return res.json({ message: 'Review atualizada com sucesso.', id: existing[0].id });
        }
        
        // Criar nova review
        const [result] = await db.execute(
            'INSERT INTO reviews (utilizador_id, conteudo_id, avaliacao, comentario) VALUES (?, ?, ?, ?)',
            [utilizador_id, conteudo_id, avaliacao, comentario || null]
        );
        
        // Atualizar rating médio do conteúdo
        await updateConteudoRating(conteudo_id);
        
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

// Listar reviews de um utilizador
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
        
        const [reviews] = await db.execute(
            `SELECT r.*, c.titulo as titulo_conteudo, c.tipo as tipo_conteudo, 
                    c.poster_url, c.ano_lancamento
             FROM reviews r
             INNER JOIN conteudos c ON r.conteudo_id = c.id
             WHERE r.utilizador_id = ?
             ORDER BY r.data_review DESC`,
            [utilizador_id]
        );
        
        res.json(reviews);
    } catch (error) {
        console.error('Erro ao listar reviews do utilizador:', error);
        res.status(500).json({ message: 'Erro ao listar reviews.' });
    }
});

// Votar na utilidade de uma review (toggle)
router.post('/:review_id/voto', verifyJWT, async (req, res) => {
    try {
        const { review_id } = req.params;
        const utilizador_id = req.userId;
        
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
        
        // Verificar se já votou
        const [existing] = await db.execute(
            'SELECT id FROM votos_reviews WHERE review_id = ? AND utilizador_id = ?',
            [review_id, utilizador_id]
        );
        
        if (existing.length > 0) {
            // Remover voto
            await db.execute(
                'DELETE FROM votos_reviews WHERE review_id = ? AND utilizador_id = ?',
                [review_id, utilizador_id]
            );
            
            // Atualizar contador
            await db.execute(
                'UPDATE reviews SET votos_utilidade = votos_utilidade - 1 WHERE id = ?',
                [review_id]
            );
            
            return res.json({ message: 'Voto removido com sucesso.', voted: false });
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
        
        res.json({ message: 'Voto registado com sucesso.', voted: true });
    } catch (error) {
        console.error('Erro ao votar:', error);
        res.status(500).json({ message: 'Erro ao registar voto.' });
    }
});

// Verificar se utilizador votou numa review
router.get('/:review_id/voto', verifyJWT, async (req, res) => {
    try {
        const { review_id } = req.params;
        const utilizador_id = req.userId;
        
        const [existing] = await db.execute(
            'SELECT id FROM votos_reviews WHERE review_id = ? AND utilizador_id = ?',
            [review_id, utilizador_id]
        );
        
        res.json({ voted: existing.length > 0 });
    } catch (error) {
        console.error('Erro ao verificar voto:', error);
        res.status(500).json({ message: 'Erro ao verificar voto.' });
    }
});

// Eliminar review
router.delete('/:id', verifyJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const utilizador_id = req.userId;
        
        // Verificar se é o dono da review ou admin
        const [review] = await db.execute(
            'SELECT r.utilizador_id, r.conteudo_id, u.is_admin FROM reviews r LEFT JOIN utilizadores u ON u.id = ? WHERE r.id = ?',
            [utilizador_id, id]
        );
        
        if (review.length === 0) {
            return res.status(404).json({ message: 'Review não encontrada.' });
        }
        
        const isAdmin = review[0].is_admin === 1;
        if (review[0].utilizador_id !== utilizador_id && !isAdmin) {
            return res.status(403).json({ message: 'Não tem permissão para eliminar esta review.' });
        }
        
        const conteudo_id = review[0].conteudo_id;
        
        await db.execute('DELETE FROM reviews WHERE id = ?', [id]);
        
        // Atualizar rating médio do conteúdo
        await updateConteudoRating(conteudo_id);
        
        res.json({ message: 'Review eliminada com sucesso.' });
    } catch (error) {
        console.error('Erro ao eliminar review:', error);
        res.status(500).json({ message: 'Erro ao eliminar review.' });
    }
});

// Função auxiliar para atualizar rating médio do conteúdo
async function updateConteudoRating(conteudo_id) {
    try {
        const [result] = await db.execute(
            'SELECT AVG(avaliacao) as rating_medio FROM reviews WHERE conteudo_id = ?',
            [conteudo_id]
        );
        
        const rating = result[0].rating_medio || null;
        
        await db.execute(
            'UPDATE conteudos SET rating = ? WHERE id = ?',
            [rating, conteudo_id]
        );
    } catch (error) {
        console.error('Erro ao atualizar rating:', error);
    }
}

module.exports = router;

