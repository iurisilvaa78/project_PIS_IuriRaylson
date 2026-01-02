const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

async function ensureSchema() {
    try {
        const [cols] = await db.execute(
            `SELECT COUNT(*) AS cnt
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'conteudos'
               AND COLUMN_NAME = 'tmdb_rating'`
        );

        if (cols[0]?.cnt === 0) {
            console.log('A aplicar migração: adicionar coluna conteudos.tmdb_rating...');
            await db.execute(
                `ALTER TABLE conteudos
                 ADD COLUMN tmdb_rating DECIMAL(3,1) NULL AFTER trailer_url`
            );
        }

        await db.execute(
            `UPDATE conteudos c
             LEFT JOIN (
                SELECT conteudo_id, COUNT(*) AS cnt
                FROM reviews
                GROUP BY conteudo_id
             ) r ON r.conteudo_id = c.id
             SET c.tmdb_rating = c.rating,
                 c.rating = NULL
             WHERE c.tmdb_id IS NOT NULL
               AND c.tmdb_rating IS NULL
               AND c.rating IS NOT NULL
               AND IFNULL(r.cnt, 0) = 0`
        );
    } catch (error) {
        console.error('Erro ao validar/aplicar migrações da base de dados:', error);
    }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir ficheiros estáticos
app.use(express.static('public'));

async function startServer() {
    await ensureSchema();

    // Rotas
    try {
        app.use('/api/auth', require('./routes/auth'));
        app.use('/api/conteudos', require('./routes/conteudos'));
        app.use('/api/reviews', require('./routes/reviews'));
        app.use('/api/admin', require('./routes/admin'));
        app.use('/api/favoritos', require('./routes/favoritos'));
        app.use('/api/listas', require('./routes/listas'));
        app.use('/api/tmdb', require('./routes/tmdb'));
        console.log('Todas as rotas carregadas com sucesso');
    } catch (error) {
        console.error('Erro ao carregar rotas:', error);
    }

    // Rota raiz
    app.get('/', (req, res) => {
        res.sendFile(__dirname + '/public/index.html');
    });

    // Middleware para rotas não encontradas
    app.use((req, res) => {
        console.log(`Rota não encontrada: ${req.method} ${req.url}`);
        res.status(404).json({ message: 'Rota não encontrada' });
    });

    // Iniciar servidor
    app.listen(PORT, () => {
        console.log(`Servidor a correr na porta ${PORT}`);
        console.log(`http://localhost:${PORT}`);
    });
}

startServer();

