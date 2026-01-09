/*
 * Rotas de Reviews (Avaliações)
 * 
 * Sistema completo de reviews para conteúdos:
 * - Utilizadores podem criar/atualizar reviews com avaliação (1-10) e comentário
 * - Sistema de votos de utilidade
 * - Cálculo automático do rating médio do conteúdo
 * 
 * Rotas:
 * - POST /api/reviews - Criar/atualizar review
 * - GET /api/reviews/conteudo/:id - Listar reviews de conteúdo
 * - GET /api/reviews/user/:id - Listar reviews de utilizador
 * - POST /api/reviews/:id/voto - Votar em review (utilidade)
 * - DELETE /api/reviews/:id - Eliminar review
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyJWT } = require('../middleware/auth');

/**
 * POST /api/reviews
 * Cria nova review ou atualiza existente (1 review por utilizador por conteúdo)
 * Valida avaliação entre 1-10 e recalcula rating do conteúdo
 * Requer: Autenticação
 */
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
        
        const [existing] = await db.execute(
            'SELECT id FROM reviews WHERE utilizador_id = ? AND conteudo_id = ?',
            [utilizador_id, conteudo_id]
        );
        
        if (existing.length > 0) {
            await db.execute(
                'UPDATE reviews SET avaliacao = ?, comentario = ? WHERE id = ?',
                [avaliacao, comentario || null, existing[0].id]
            );
            
            await updateConteudoRating(conteudo_id);
            
            return res.json({ message: 'Review atualizada com sucesso.', id: existing[0].id });
        }
        
        const [result] = await db.execute(
            'INSERT INTO reviews (utilizador_id, conteudo_id, avaliacao, comentario) VALUES (?, ?, ?, ?)',
            [utilizador_id, conteudo_id, avaliacao, comentario || null]
        );
        
        await updateConteudoRating(conteudo_id);
        
        res.status(201).json({ message: 'Review criada com sucesso.', id: result.insertId });
    } catch (error) {
        console.error('Erro ao criar review:', error);
        res.status(500).json({ message: 'Erro ao criar review.' });
    }
});

/**
 * GET /api/reviews/conteudo/:conteudo_id
 * Lista todas as reviews de um conteúdo com dados dos utilizadores
 * Ordenado por data (mais recentes primeiro)
 * Público
 */
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

/**
 * GET /api/reviews/user/:utilizador_id
 * Lista reviews de um utilizador com dados dos conteúdos
 * Verifica permissões (próprio utilizador ou admin)
 * Requer: Autenticação
 */
router.get('/user/:utilizador_id', verifyJWT, async (req, res) => {
    try {
        const { utilizador_id } = req.params;
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

/**
 * POST /api/reviews/:review_id/voto
 * Regista ou remove voto de utilidade numa review
 * Utilizador não pode votar na própria review
 * Toggle: se já votou, remove voto; senão adiciona
 * Requer: Autenticação
 */
router.post('/:review_id/voto', verifyJWT, async (req, res) => {
    try {
        const { review_id } = req.params;
        const utilizador_id = req.userId;
        
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
        
        const [existing] = await db.execute(
            'SELECT id FROM votos_reviews WHERE review_id = ? AND utilizador_id = ?',
            [review_id, utilizador_id]
        );
        
        if (existing.length > 0) {
            await db.execute(
                'DELETE FROM votos_reviews WHERE review_id = ? AND utilizador_id = ?',
                [review_id, utilizador_id]
            );
            
            await db.execute(
                'UPDATE reviews SET votos_utilidade = votos_utilidade - 1 WHERE id = ?',
                [review_id]
            );
            
            return res.json({ message: 'Voto removido com sucesso.', voted: false });
        }
        
        await db.execute(
            'INSERT INTO votos_reviews (review_id, utilizador_id) VALUES (?, ?)',
            [review_id, utilizador_id]
        );
        
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


/**
 * GET /api/reviews/:review_id/voto
 * Verifica se utilizador já votou numa review
 * Requer: Autenticação
 */
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

/**
 * DELETE /api/reviews/:id
 * Elimina uma review
 * Só o autor ou admin pode eliminar
 * Recalcula rating do conteúdo após eliminação
 * Requer: Autenticação
 */
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
        
        await updateConteudoRating(conteudo_id);
        
        res.json({ message: 'Review eliminada com sucesso.' });
    } catch (error) {
        console.error('Erro ao eliminar review:', error);
        res.status(500).json({ message: 'Erro ao eliminar review.' });
    }
});

/**
 * Função auxiliar para atualizar rating médio de um conteúdo
 * Calcula média de todas as avaliações e atualiza tabela conteudos
 * 
 * @param {number} conteudo_id - ID do conteúdo a atualizar
 */
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

