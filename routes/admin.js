const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { verifyJWT, verifyAdmin } = require('../middleware/auth');

// Helpers
async function updateConteudoRating(conteudo_id) {
    const [result] = await db.execute(
        'SELECT AVG(avaliacao) as rating_medio FROM reviews WHERE conteudo_id = ?',
        [conteudo_id]
    );

    const rating = result[0].rating_medio || null;

    await db.execute(
        'UPDATE conteudos SET rating = ? WHERE id = ?',
        [rating, conteudo_id]
    );
}

// =========================
// Utilizadores (Admin)
// =========================
router.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
    try {
        const [users] = await db.execute(
            `SELECT id, username, email, nome, is_admin, data_registo as created_at
             FROM utilizadores
             ORDER BY id DESC`
        );

        res.json(users);
    } catch (error) {
        console.error('Erro ao listar utilizadores (admin):', error);
        res.status(500).json({ message: 'Erro ao listar utilizadores.' });
    }
});

router.put('/users/:id', verifyJWT, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, nome, is_admin, password } = req.body;

        if (!username || !email) {
            return res.status(400).json({ message: 'Username e email são obrigatórios.' });
        }

        // Verificar se existe
        const [existing] = await db.execute(
            'SELECT id FROM utilizadores WHERE id = ?',
            [id]
        );
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Utilizador não encontrado.' });
        }

        // Unicidade username/email
        const [conflict] = await db.execute(
            'SELECT id FROM utilizadores WHERE (username = ? OR email = ?) AND id != ?',
            [username, email, id]
        );
        if (conflict.length > 0) {
            return res.status(400).json({ message: 'Username ou email já está em uso.' });
        }

        const adminFlag = is_admin === true || is_admin === 1;

        if (password) {
            if (typeof password !== 'string' || password.length < 6) {
                return res.status(400).json({ message: 'Password deve ter pelo menos 6 caracteres.' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            await db.execute(
                'UPDATE utilizadores SET username = ?, email = ?, nome = ?, is_admin = ?, password = ? WHERE id = ?',
                [username, email, nome || null, adminFlag ? 1 : 0, hashedPassword, id]
            );
        } else {
            await db.execute(
                'UPDATE utilizadores SET username = ?, email = ?, nome = ?, is_admin = ? WHERE id = ?',
                [username, email, nome || null, adminFlag ? 1 : 0, id]
            );
        }

        res.json({ message: 'Utilizador atualizado com sucesso.' });
    } catch (error) {
        console.error('Erro ao atualizar utilizador (admin):', error);
        res.status(500).json({ message: 'Erro ao atualizar utilizador.' });
    }
});

// =========================
// Reviews (Admin)
// =========================
router.get('/reviews', verifyJWT, verifyAdmin, async (req, res) => {
    try {
        const [reviews] = await db.execute(
            `SELECT r.id, r.conteudo_id, r.utilizador_id, r.avaliacao, r.comentario, r.data_review, r.votos_utilidade,
                    u.username, u.nome as nome_utilizador,
                    c.titulo, c.tipo
             FROM reviews r
             INNER JOIN utilizadores u ON u.id = r.utilizador_id
             INNER JOIN conteudos c ON c.id = r.conteudo_id
             ORDER BY r.data_review DESC`
        );

        res.json(reviews);
    } catch (error) {
        console.error('Erro ao listar reviews (admin):', error);
        res.status(500).json({ message: 'Erro ao listar reviews.' });
    }
});

router.put('/reviews/:id', verifyJWT, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { avaliacao, comentario } = req.body;

        if (avaliacao == null) {
            return res.status(400).json({ message: 'Avaliação é obrigatória.' });
        }

        const rating = Number(avaliacao);
        if (!Number.isFinite(rating) || rating < 1 || rating > 10) {
            return res.status(400).json({ message: 'Avaliação deve estar entre 1 e 10.' });
        }

        const [existing] = await db.execute(
            'SELECT id, conteudo_id FROM reviews WHERE id = ?',
            [id]
        );
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Review não encontrada.' });
        }

        const conteudo_id = existing[0].conteudo_id;

        await db.execute(
            'UPDATE reviews SET avaliacao = ?, comentario = ? WHERE id = ?',
            [rating, comentario || null, id]
        );

        await updateConteudoRating(conteudo_id);

        res.json({ message: 'Review atualizada com sucesso.' });
    } catch (error) {
        console.error('Erro ao atualizar review (admin):', error);
        res.status(500).json({ message: 'Erro ao atualizar review.' });
    }
});

module.exports = router;
