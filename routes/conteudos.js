/*
 * Rotas de Conteúdos (Filmes e Séries)
 * 
 * Gestão completa de conteúdos multimédia:
 * - Listagem com filtros (tipo, género, pesquisa)
 * - Detalhes de conteúdos individuais
 * - Importação de dados do TMDB
 * - CRUD de conteúdos (admin)
 * 
 * Rotas principais:
 * - GET /api/conteudos - Listar conteúdos
 * - GET /api/conteudos/:id - Detalhes de conteúdo
 * - POST /api/conteudos/tmdb/import - Importar do TMDB
 * - POST /api/conteudos - Criar conteúdo manual
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyJWT, verifyAdmin } = require('../middleware/auth');
const tmdbClient = require('../config/tmdb');

console.log('Conteudos router loaded');

/**
 * GET /api/conteudos
 * Lista conteúdos com filtros opcionais (tipo, género, pesquisa)
 * Público
 */
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

/**
 * GET /api/conteudos/:id
 * Obtém detalhes completos de um conteúdo incluindo géneros e reviews
 * Público
 */
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
        
        const [generos] = await db.execute(
            `SELECT g.nome
             FROM conteudo_generos cg
             INNER JOIN generos g ON cg.genero_id = g.id
             WHERE cg.conteudo_id = ?`,
            [id]
        );
        
        conteudo.generos = generos.map(g => g.nome).join(', ');
        
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

/**
 * GET /api/conteudos/:id/elenco
 * Obtém lista de elenco de um conteúdo ordenado por importância
 * Público
 */
router.get('/:id/elenco', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [elenco] = await db.execute(
            'SELECT * FROM elenco WHERE conteudo_id = ? ORDER BY ordem ASC',
            [id]
        );
        
        res.json(elenco);
    } catch (error) {
        console.error('Erro ao obter elenco:', error);
        res.status(500).json({ message: 'Erro ao obter elenco.' });
    }
});

/**
 * GET /api/conteudos/tmdb/search
 * Pesquisa filmes/séries na API do TMDB
 * Parâmetros: query (obrigatório), tipo (movie/tv), page
 * Público
 */
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

/**
 * GET /api/conteudos/tmdb/popular
 * Obtém conteúdos populares do TMDB
 * Suporta filtro por género e paginação
 * Retorna dados mock em caso de erro (fallback)
 * Público
 */
router.get('/tmdb/popular', async (req, res) => {
    console.log('Rota /tmdb/popular chamada');
    try {
        const { tipo = 'movie', page = 1, genero } = req.query;

        console.log('Buscando populares da TMDB para tipo:', tipo, 'página:', page, 'género:', genero);

        const axios = require('axios');
        
        const endpoint = genero ? `https://api.themoviedb.org/3/discover/${tipo}` : `https://api.themoviedb.org/3/${tipo}/popular`;
        
        const params = {
            api_key: process.env.TMDB_API_KEY,
            language: 'pt-PT',
            page
        };
        
        if (genero) {
            params.with_genres = genero;
            params.sort_by = 'popularity.desc';
        }
        
        const response = await axios.get(endpoint, {
            params,
            timeout: 10000
        });
        
        console.log('Resposta da TMDB:', response.status);

        res.json(response.data);
    } catch (error) {
        console.error('Erro ao buscar filmes populares TMDB:', error.message);
        if (error.response) {
            console.error('Status da resposta:', error.response.status);
            console.error('Dados do erro:', error.response.data);
        }

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

router.get('/test', (req, res) => {
    console.log('Rota /test chamada');
    res.json({ message: 'Teste funcionando' });
});

/**
 * POST /api/conteudos/tmdb/import
 * Importa conteúdo do TMDB para a base de dados local
 * Busca dados completos incluindo géneros, trailer, elenco e diretor
 * Requer: Admin
 */
router.post('/tmdb/import', verifyJWT, verifyAdmin, async (req, res) => {
    try {
        const { tmdb_id, tipo = 'movie' } = req.body;
        
        if (!tmdb_id) {
            return res.status(400).json({ message: 'tmdb_id é obrigatório.' });
        }
        

        const [existing] = await db.execute(
            'SELECT id FROM conteudos WHERE tmdb_id = ?',
            [tmdb_id]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Conteúdo já importado.' });
        }
        
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
        
        if (data.genres && data.genres.length > 0) {
            for (const genre of data.genres) {
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

/**
 * POST /api/conteudos
 * Cria conteúdo manualmente na base de dados
 * Para conteúdos não disponíveis no TMDB
 * Requer: Admin
 */
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

/**
 * PUT /api/conteudos/:id
 * Atualiza dados de um conteúdo existente
 * Requer: Admin
 */
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

/**
 * DELETE /api/conteudos/:id
 * Elimina conteúdo da base de dados
 * Requer: Admin
 */
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
        
        if (!conteudo.tmdb_id || conteudo.tmdb_rating) {
            return res.json({
                message: 'TMDB rating já existe ou conteúdo não é do TMDB.',
                tmdb_rating: conteudo.tmdb_rating
            });
        }
        
        const mediaType = conteudo.tipo === 'filme' ? 'movie' : 'tv';
        const endpoint = `/${mediaType}/${conteudo.tmdb_id}`;
        const response = await tmdbClient.get(endpoint);
        const rating = response.data.vote_average;
        
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
        
        const [tmdbResponse, videosResponse, creditsResponse] = await Promise.all([
            tmdbClient.get(`/${media_type}/${tmdb_id}`),
            tmdbClient.get(`/${media_type}/${tmdb_id}/videos`),
            tmdbClient.get(`/${media_type}/${tmdb_id}/credits`)
        ]);
        
        const tmdbData = tmdbResponse.data;
        const videos = videosResponse.data.results || [];
        const creditsData = creditsResponse.data;
        
        const titulo = tmdbData.title || tmdbData.name;
        const sinopse = tmdbData.overview || null;
        const ano_lancamento = tmdbData.release_date ? new Date(tmdbData.release_date).getFullYear() : 
                               (tmdbData.first_air_date ? new Date(tmdbData.first_air_date).getFullYear() : null);
        const tipo = media_type === 'movie' ? 'filme' : 'serie';
        const poster_url = tmdbData.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : null;
        const duracao = tmdbData.runtime || null;
        
        // Extrair diretor (para filmes) ou criador (para séries)
        let diretor = null;
        if (media_type === 'movie') {
            const director = creditsData.crew?.find(c => c.job === 'Director');
            diretor = director ? director.name : null;
        } else {
            diretor = tmdbData.created_by?.map(c => c.name).join(', ') || null;
        }
        
        const trailer = videos.find(v => 
            v.type === 'Trailer' && v.site === 'YouTube' && (v.iso_639_1 === 'pt' || v.iso_639_1 === 'en')
        ) || videos.find(v => v.type === 'Trailer' && v.site === 'YouTube');
        
        const trailer_url = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
        
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
            `INSERT INTO conteudos (titulo, sinopse, duracao, ano_lancamento, tipo, poster_url, trailer_url, tmdb_id, tmdb_rating, diretor)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [titulo, sinopse, duracao, ano_lancamento, tipo, poster_url, trailer_url, tmdb_id, tmdbData.vote_average || null, diretor]
        );
        
        const conteudoId = result.insertId;
        
        // Inserir géneros
        if (tmdbData.genres && tmdbData.genres.length > 0) {
            for (const genre of tmdbData.genres) {
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
        
        // Inserir elenco
        if (creditsData.cast && creditsData.cast.length > 0) {
            try {
                const cast = creditsData.cast;
                for (let i = 0; i < cast.length; i++) {
                    const actor = cast[i];
                    const foto_url = actor.profile_path 
                        ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` 
                        : null;
                    
                    await db.execute(
                        'INSERT INTO elenco (conteudo_id, tmdb_id, nome, personagem, foto_url, ordem) VALUES (?, ?, ?, ?, ?, ?)',
                        [conteudoId, actor.id, actor.name, actor.character || null, foto_url, i]
                    );
                }
            } catch (elencoError) {
                console.warn('Aviso: Não foi possível inserir elenco. Tabela pode não existir:', elencoError.message);
            }
        }
        
        res.json({ 
            message: 'Conteúdo importado com sucesso!',
            id: conteudoId
        });
    } catch (error) {
        console.error('Erro ao importar TMDB:', error);
        
        res.status(500).json({ message: 'Erro ao importar conteúdo.' });
    }
});

module.exports = router;

