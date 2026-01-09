/*
 * Rotas de Integração com TMDB API
 * 
 * Endpoints para obter dados diretamente do TMDB:
 * - Detalhes de filmes/séries
 * - Listas de géneros
 * - Informações de elenco (créditos)
 * - Vídeos/trailers
 * 
 * Rotas:
 * - GET /api/tmdb/movie/:id - Detalhes de filme
 * - GET /api/tmdb/tv/:id - Detalhes de série
 * - GET /api/tmdb/genres/movie - Géneros de filmes
 * - GET /api/tmdb/genres/tv - Géneros de séries
 * - GET /api/tmdb/movie/:id/credits - Elenco de filme
 * - GET /api/tmdb/tv/:id/credits - Elenco de série
 */

const express = require('express');
const router = express.Router();
const tmdbClient = require('../config/tmdb');

/**
 * GET /api/tmdb/movie/:id
 * Obtém detalhes de um filme do TMDB incluindo trailer
 * Procura trailer em português ou inglês
 * Público
 */
router.get('/movie/:id', async (req, res) => {
    try {
        const movieId = req.params.id;
        const [detailsResponse, videosResponse] = await Promise.all([
            tmdbClient.get(`/movie/${movieId}`),
            tmdbClient.get(`/movie/${movieId}/videos`)
        ]);
        
        const details = detailsResponse.data;
        const videos = videosResponse.data.results;
        
        // Encontrar trailer oficial em português ou inglês
        const trailer = videos.find(v => 
            v.type === 'Trailer' && v.site === 'YouTube' && (v.iso_639_1 === 'pt' || v.iso_639_1 === 'en')
        ) || videos.find(v => v.type === 'Trailer' && v.site === 'YouTube');
        
        if (trailer) {
            details.trailer_url = `https://www.youtube.com/watch?v=${trailer.key}`;
        }
        
        res.json(details);
    } catch (error) {
        console.error('Erro ao buscar detalhes do filme:', error);
        res.status(500).json({ message: 'Erro ao buscar detalhes do filme' });
    }
});

/**
 * GET /api/tmdb/tv/:id
 * Obtém detalhes de uma série do TMDB incluindo trailer
 * Procura trailer em português ou inglês
 * Público
 */
router.get('/tv/:id', async (req, res) => {
    try {
        const tvId = req.params.id;
        const [detailsResponse, videosResponse] = await Promise.all([
            tmdbClient.get(`/tv/${tvId}`),
            tmdbClient.get(`/tv/${tvId}/videos`)
        ]);
        
        const details = detailsResponse.data;
        const videos = videosResponse.data.results;
        
        // Encontrar trailer oficial em português ou inglês
        const trailer = videos.find(v => 
            v.type === 'Trailer' && v.site === 'YouTube' && (v.iso_639_1 === 'pt' || v.iso_639_1 === 'en')
        ) || videos.find(v => v.type === 'Trailer' && v.site === 'YouTube');
        
        if (trailer) {
            details.trailer_url = `https://www.youtube.com/watch?v=${trailer.key}`;
        }
        
        res.json(details);
    } catch (error) {
        console.error('Erro ao buscar detalhes da série:', error);
        res.status(500).json({ message: 'Erro ao buscar detalhes da série' });
    }
});

/**
 * GET /api/tmdb/genres/movie
 * Lista todos os géneros de filmes disponíveis no TMDB
 * Retorna em português
 * Público
 */
router.get('/genres/movie', async (req, res) => {
    try {
        const response = await tmdbClient.get('/genre/movie/list', {
            params: { language: 'pt-PT' }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Erro ao buscar géneros de filmes:', error);
        res.status(500).json({ message: 'Erro ao buscar géneros' });
    }
});

/**
 * GET /api/tmdb/genres/tv
 * Lista todos os géneros de séries disponíveis no TMDB
 * Retorna em português
 * Público
 */
router.get('/genres/tv', async (req, res) => {
    try {
        const response = await tmdbClient.get('/genre/tv/list', {
            params: { language: 'pt-PT' }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Erro ao buscar géneros de séries:', error);
        res.status(500).json({ message: 'Erro ao buscar géneros' });
    }
});

/**
 * GET /api/tmdb/movie/:id/credits
 * Obtém elenco e equipa de um filme
 * Público
 */
router.get('/movie/:id/credits', async (req, res) => {
    try {
        const movieId = req.params.id;
        const response = await tmdbClient.get(`/movie/${movieId}/credits`);
        res.json(response.data);
    } catch (error) {
        console.error('Erro ao buscar créditos do filme:', error);
        res.status(500).json({ message: 'Erro ao buscar créditos' });
    }
});

/**
 * GET /api/tmdb/tv/:id/credits
 * Obtém elenco e equipa de uma série
 * Público
 */
router.get('/tv/:id/credits', async (req, res) => {
    try {
        const tvId = req.params.id;
        const response = await tmdbClient.get(`/tv/${tvId}/credits`);
        res.json(response.data);
    } catch (error) {
        console.error('Erro ao buscar créditos da série:', error);
        res.status(500).json({ message: 'Erro ao buscar créditos' });
    }
});

module.exports = router;
