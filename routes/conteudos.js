const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyJWT, verifyAdmin } = require('../middleware/auth');
const tmdbClient = require('../config/tmdb');

// Listar todos os conteúdos (filmes/séries)
router.get('/', async (req, res) => {
    try {
        const { tipo, genero, search } = req.query;
        let query = `
            SELECT c.*, 
                   GROUP_CONCAT(DISTINCT g.nome) as generos
            FROM conteudos c
            LEFT JOIN conteudo_generos cg ON c.id = cg.conteudo_id
            LEFT JOIN generos g ON cg.genero_id = g.id
            WHERE 1=1
        `;
        const params = [];
        
        if (tipo) {
            query += ' AND c.tipo = ?';
            params.push(tipo);
        }
        
        if (search) {
            query += ' AND c.titulo LIKE ?';
            params.push(`%${search}%`);
        }
        
        query += ' GROUP BY c.id ORDER BY c.ano_lancamento DESC';
        
        const [conteudos] = await db.execute(query, params);
        
        res.json(conteudos);
    } catch (error) {
        console.error('Erro ao listar conteúdos:', error);
        res.status(500).json({ message: 'Erro ao listar conteúdos.' });
    }
});

// Obter conteúdo por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [conteudos] = await db.execute(
            'SELECT * FROM conteudos WHERE id = ?',
            [id]
        );
        
        if (conteudos.length === 0) {
            return res.status(404).json({ message: 'Conteúdo não encontrado.' });
        }
        
        const conteudo = conteudos[0];
        
        // Buscar géneros
        const [generos] = await db.execute(
            `SELECT g.* FROM generos g
             INNER JOIN conteudo_generos cg ON g.id = cg.genero_id
             WHERE cg.conteudo_id = ?`,
            [id]
        );
        
        // Buscar elenco
        const [elenco] = await db.execute(
            `SELECT p.*, e.personagem FROM pessoas p
             INNER JOIN elenco e ON p.id = e.pessoa_id
             WHERE e.conteudo_id = ?`,
            [id]
        );
        
        // Buscar diretores
        const [diretores] = await db.execute(
            `SELECT p.* FROM pessoas p
             INNER JOIN diretores_conteudo dc ON p.id = dc.pessoa_id
             WHERE dc.conteudo_id = ?`,
            [id]
        );
        
        // Buscar reviews
        const [reviews] = await db.execute(
            `SELECT r.*, u.username, u.nome as nome_utilizador
             FROM reviews r
             INNER JOIN utilizadores u ON r.utilizador_id = u.id
             WHERE r.conteudo_id = ?
             ORDER BY r.data_review DESC`,
            [id]
        );
        
        conteudo.generos = generos;
        conteudo.elenco = elenco;
        conteudo.diretores = diretores;
        conteudo.reviews = reviews;
        
        res.json(conteudo);
    } catch (error) {
        console.error('Erro ao obter conteúdo:', error);
        res.status(500).json({ message: 'Erro ao obter conteúdo.' });
    }
});

// Pesquisar na API TMDB
router.get('/tmdb/search', async (req, res) => {
    try {
        const { query, tipo = 'movie' } = req.query;
        
        if (!query) {
            return res.status(400).json({ message: 'Parâmetro query é obrigatório.' });
        }
        
        const response = await tmdbClient.get(`/search/${tipo}`, {
            params: { query }
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Erro ao pesquisar TMDB:', error);
        res.status(500).json({ message: 'Erro ao pesquisar na API TMDB.' });
    }
});

// Importar conteúdo da TMDB
router.post('/tmdb/import', verifyJWT, verifyAdmin, async (req, res) => {
    try {
        const { tmdb_id, tipo = 'movie' } = req.body;
        
        if (!tmdb_id) {
            return res.status(400).json({ message: 'tmdb_id é obrigatório.' });
        }
        
        // Verificar se já existe
        const [existing] = await db.execute(
            'SELECT id FROM conteudos WHERE tmdb_id = ?',
            [tmdb_id]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Conteúdo já importado.' });
        }
        
        // Buscar dados da TMDB
        const endpoint = tipo === 'movie' ? `/movie/${tmdb_id}` : `/tv/${tmdb_id}`;
        const [details, videos] = await Promise.all([
            tmdbClient.get(endpoint),
            tmdbClient.get(`${endpoint}/videos`)
        ]);
        
        const data = details.data;
        const videoData = videos.data;
        
        // Extrair trailer
        const trailer = videoData.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
        const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
        
        // Inserir conteúdo
        const [result] = await db.execute(
            `INSERT INTO conteudos (tmdb_id, titulo, sinopse, duracao, ano_lancamento, tipo, poster_url, trailer_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tmdb_id,
                data.title || data.name,
                data.overview,
                data.runtime || (data.episode_run_time?.[0] || null),
                new Date(data.release_date || data.first_air_date).getFullYear(),
                tipo === 'movie' ? 'filme' : 'serie',
                data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
                trailerUrl
            ]
        );
        
        const conteudoId = result.insertId;
        
        // Inserir géneros
        if (data.genres && data.genres.length > 0) {
            for (const genre of data.genres) {
                // Verificar se género existe, se não criar
                let [generos] = await db.execute('SELECT id FROM generos WHERE nome = ?', [genre.name]);
                let generoId;
                
                if (generos.length === 0) {
                    const [newGenre] = await db.execute('INSERT INTO generos (nome) VALUES (?)', [genre.name]);
                    generoId = newGenre.insertId;
                } else {
                    generoId = generos[0].id;
                }
                
                await db.execute(
                    'INSERT INTO conteudo_generos (conteudo_id, genero_id) VALUES (?, ?)',
                    [conteudoId, generoId]
                );
            }
        }
        
        res.status(201).json({ message: 'Conteúdo importado com sucesso.', id: conteudoId });
    } catch (error) {
        console.error('Erro ao importar conteúdo:', error);
        res.status(500).json({ message: 'Erro ao importar conteúdo da TMDB.' });
    }
});

// Criar conteúdo manualmente (backoffice)
router.post('/', verifyJWT, verifyAdmin, async (req, res) => {
    try {
        const { titulo, sinopse, duracao, ano_lancamento, tipo, poster_url, trailer_url } = req.body;
        
        if (!titulo || !tipo) {
            return res.status(400).json({ message: 'Título e tipo são obrigatórios.' });
        }
        
        const [result] = await db.execute(
            `INSERT INTO conteudos (titulo, sinopse, duracao, ano_lancamento, tipo, poster_url, trailer_url)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [titulo, sinopse, duracao, ano_lancamento, tipo, poster_url, trailer_url]
        );
        
        res.status(201).json({ message: 'Conteúdo criado com sucesso.', id: result.insertId });
    } catch (error) {
        console.error('Erro ao criar conteúdo:', error);
        res.status(500).json({ message: 'Erro ao criar conteúdo.' });
    }
});

// Atualizar conteúdo
router.put('/:id', verifyJWT, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { titulo, sinopse, duracao, ano_lancamento, tipo, poster_url, trailer_url } = req.body;
        
        await db.execute(
            `UPDATE conteudos 
             SET titulo = ?, sinopse = ?, duracao = ?, ano_lancamento = ?, tipo = ?, poster_url = ?, trailer_url = ?
             WHERE id = ?`,
            [titulo, sinopse, duracao, ano_lancamento, tipo, poster_url, trailer_url, id]
        );
        
        res.json({ message: 'Conteúdo atualizado com sucesso.' });
    } catch (error) {
        console.error('Erro ao atualizar conteúdo:', error);
        res.status(500).json({ message: 'Erro ao atualizar conteúdo.' });
    }
});

// Eliminar conteúdo
router.delete('/:id', verifyJWT, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        await db.execute('DELETE FROM conteudos WHERE id = ?', [id]);
        
        res.json({ message: 'Conteúdo eliminado com sucesso.' });
    } catch (error) {
        console.error('Erro ao eliminar conteúdo:', error);
        res.status(500).json({ message: 'Erro ao eliminar conteúdo.' });
    }
});

module.exports = router;

