const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyJWT, verifyAdmin } = require('../middleware/auth');
const tmdbClient = require('../config/tmdb');

console.log('Conteudos router loaded');

// Listar todos os conteúdos (filmes/séries)
router.get('/', async (req, res) => {
    try {
        const { tipo, genero, search } = req.query;
        let query = `
            SELECT c.*
            FROM conteudos c
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
        
        query += ' ORDER BY c.ano_lancamento DESC';
        
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
        
        // Buscar reviews
        const [reviews] = await db.execute(
            `SELECT r.*, u.username, u.nome as nome_utilizador
             FROM reviews r
             INNER JOIN utilizadores u ON r.utilizador_id = u.id
             WHERE r.conteudo_id = ?
             ORDER BY r.data_review DESC`,
            [id]
        );
        
        conteudo.reviews = reviews;
        
        res.json(conteudo);
    } catch (error) {
        console.error('Erro ao obter conteúdo:', error);
        res.status(500).json({ message: 'Erro ao obter conteúdo.' });
    }
});

router.get('/tmdb/search', async (req, res) => {
    console.log('Rota /tmdb/search chamada');
    try {
        const { query, tipo = 'movie', page = 1 } = req.query;
        
        if (!query) {
            return res.status(400).json({ message: 'Parâmetro query é obrigatório.' });
        }
        
        console.log('Buscando na TMDB:', `/search/${tipo}`, 'query:', query, 'página:', page);
        
        const axios = require('axios');
        const response = await axios.get(`https://api.themoviedb.org/3/search/${tipo}`, {
            params: {
                api_key: process.env.TMDB_API_KEY,
                query,
                language: 'pt-PT',
                page
            }
        });
        
        console.log('Resposta TMDB status:', response.status);
        
        res.json(response.data);
    } catch (error) {
        console.error('Erro ao pesquisar TMDB:', error.message);
        console.error('Erro response:', error.response?.status, error.response?.data);
        res.status(500).json({ message: 'Erro ao pesquisar na API TMDB.' });
    }
});

router.get('/tmdb/popular', async (req, res) => {
    console.log('Rota /tmdb/popular chamada');
    try {
        const { tipo = 'movie', page = 1, genero } = req.query;

        console.log('Buscando populares da TMDB para tipo:', tipo, 'página:', page, 'género:', genero);

        const axios = require('axios');
        
        // Se tem género, usar endpoint discover em vez de popular
        const endpoint = genero ? `https://api.themoviedb.org/3/discover/${tipo}` : `https://api.themoviedb.org/3/${tipo}/popular`;
        
        const params = {
            api_key: process.env.TMDB_API_KEY,
            language: 'pt-PT',
            page
        };
        
        // Adicionar filtro de género se especificado
        if (genero) {
            params.with_genres = genero;
            params.sort_by = 'popularity.desc'; // Ordenar por popularidade no discover
        }
        
        const response = await axios.get(endpoint, {
            params,
            timeout: 10000 // 10 segundos timeout
        });

        console.log('Resposta da TMDB:', response.status);

        res.json(response.data);
    } catch (error) {
        console.error('Erro ao buscar filmes populares TMDB:', error.message);
        if (error.response) {
            console.error('Status da resposta:', error.response.status);
            console.error('Dados do erro:', error.response.data);
        }

        // Retornar dados mock em caso de erro
        console.log('Retornando dados mock devido a erro na TMDB');
        const mockData = {
            page: parseInt(page),
            results: [
                {
                    id: 1,
                    title: 'Erro na API - Filme Mock 1',
                    name: 'Erro na API - Série Mock 1',
                    overview: 'Conteúdo mock devido a erro na API TMDB',
                    poster_path: '/error.jpg',
                    release_date: '2023-01-01',
                    first_air_date: '2023-01-01',
                    vote_average: 5.0
                }
            ],
            total_pages: 1,
            total_results: 1
        };

        res.json(mockData);
    }
});

// Rota de teste
router.get('/test', (req, res) => {
    console.log('Rota /test chamada');
    res.json({ message: 'Teste funcionando' });
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
        const [details, videos, credits] = await Promise.all([
            tmdbClient.get(endpoint),
            tmdbClient.get(`${endpoint}/videos`),
            tmdbClient.get(`${endpoint}/credits`)
        ]);
        
        const data = details.data;
        const videoData = videos.data;
        const creditsData = credits.data;
        
        // Extrair diretor (para filmes) ou criador (para séries)
        let diretor = null;
        if (tipo === 'movie') {
            const director = creditsData.crew?.find(c => c.job === 'Director');
            diretor = director ? director.name : null;
        } else {
            diretor = data.created_by?.map(c => c.name).join(', ') || null;
        }
        
        // Extrair trailer
        const trailer = videoData.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
        const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
        
        // Inserir conteúdo
        const [result] = await db.execute(
            `INSERT INTO conteudos (tmdb_id, titulo, sinopse, duracao, ano_lancamento, tipo, poster_url, trailer_url, tmdb_rating, diretor)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tmdb_id,
                data.title || data.name,
                data.overview,
                data.runtime || (data.episode_run_time?.[0] || null),
                new Date(data.release_date || data.first_air_date).getFullYear(),
                tipo === 'movie' ? 'filme' : 'serie',
                data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
                trailerUrl,
                data.vote_average || null,
                diretor
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

// Verificar se filme TMDB já existe na base de dados
router.get('/check-tmdb/:tmdb_id', async (req, res) => {
    try {
        const { tmdb_id } = req.params;
        
        const [existing] = await db.execute(
            'SELECT id FROM conteudos WHERE tmdb_id = ?',
            [tmdb_id]
        );
        
        if (existing.length > 0) {
            res.json({ exists: true, id: existing[0].id });
        } else {
            res.json({ exists: false });
        }
    } catch (error) {
        console.error('Erro ao verificar TMDB:', error);
        res.status(500).json({ message: 'Erro ao verificar conteúdo.' });
    }
});

// Atualizar rating de filme importado do TMDB (se estiver NULL)
router.post('/update-rating/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Buscar conteúdo
        const [conteudos] = await db.execute(
            'SELECT tmdb_id, tipo, tmdb_rating FROM conteudos WHERE id = ?',
            [id]
        );
        
        if (conteudos.length === 0) {
            return res.status(404).json({ message: 'Conteúdo não encontrado.' });
        }
        
        const conteudo = conteudos[0];
        
        // Se não tem tmdb_id ou já tem tmdb_rating, não fazer nada
        if (!conteudo.tmdb_id || conteudo.tmdb_rating) {
            return res.json({
                message: 'TMDB rating já existe ou conteúdo não é do TMDB.',
                tmdb_rating: conteudo.tmdb_rating
            });
        }
        
        // Buscar rating do TMDB
        const mediaType = conteudo.tipo === 'filme' ? 'movie' : 'tv';
        const endpoint = `/${mediaType}/${conteudo.tmdb_id}`;
        const response = await tmdbClient.get(endpoint);
        const rating = response.data.vote_average;
        
        // Atualizar na base de dados
        await db.execute(
            'UPDATE conteudos SET tmdb_rating = ? WHERE id = ?',
            [rating, id]
        );
        
        res.json({ message: 'TMDB rating atualizado com sucesso.', tmdb_rating: rating });
    } catch (error) {
        console.error('Erro ao atualizar rating:', error);
        res.status(500).json({ message: 'Erro ao atualizar rating.' });
    }
});

// Importar filme/série do TMDB para base de dados local
router.post('/importar-tmdb', verifyJWT, verifyAdmin, async (req, res) => {
    try {
        const { tmdb_id, media_type } = req.body;
        
        if (!tmdb_id || !media_type) {
            return res.status(400).json({ message: 'ID TMDB e tipo são obrigatórios.' });
        }
        
        // Buscar detalhes do TMDB (incluindo vídeos para trailer)
        const [tmdbResponse, videosResponse] = await Promise.all([
            tmdbClient.get(`/${media_type}/${tmdb_id}`),
            tmdbClient.get(`/${media_type}/${tmdb_id}/videos`)
        ]);
        
        const tmdbData = tmdbResponse.data;
        const videos = videosResponse.data.results || [];
        
        const titulo = tmdbData.title || tmdbData.name;
        const sinopse = tmdbData.overview || null;
        const ano_lancamento = tmdbData.release_date ? new Date(tmdbData.release_date).getFullYear() : 
                               (tmdbData.first_air_date ? new Date(tmdbData.first_air_date).getFullYear() : null);
        const tipo = media_type === 'movie' ? 'filme' : 'serie';
        const poster_url = tmdbData.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : null;
        const duracao = tmdbData.runtime || null;
        
        // Encontrar trailer
        const trailer = videos.find(v => 
            v.type === 'Trailer' && v.site === 'YouTube' && (v.iso_639_1 === 'pt' || v.iso_639_1 === 'en')
        ) || videos.find(v => v.type === 'Trailer' && v.site === 'YouTube');
        
        const trailer_url = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
        
        // Verificar se já existe
        const [existing] = await db.execute(
            'SELECT id FROM conteudos WHERE tmdb_id = ?',
            [tmdb_id]
        );
        
        if (existing.length > 0) {
            return res.status(200).json({ 
                message: 'Este conteúdo já existe na base de dados!',
                id: existing[0].id,
                already_exists: true
            });
        }
        
        // Inserir na base de dados
        const [result] = await db.execute(
            `INSERT INTO conteudos (titulo, sinopse, duracao, ano_lancamento, tipo, poster_url, trailer_url, tmdb_id, tmdb_rating)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [titulo, sinopse, duracao, ano_lancamento, tipo, poster_url, trailer_url, tmdb_id, tmdbData.vote_average || null]
        );
        
        res.json({ 
            message: 'Conteúdo importado com sucesso!',
            id: result.insertId
        });
    } catch (error) {
        console.error('Erro ao importar TMDB:', error);
        
        res.status(500).json({ message: 'Erro ao importar conteúdo.' });
    }
});

module.exports = router;

