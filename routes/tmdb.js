const express = require('express');
const router = express.Router();
const tmdbClient = require('../config/tmdb');

// Buscar detalhes de filme
router.get('/movie/:id', async (req, res) => {
    try {
        const movieId = req.params.id;
        const response = await tmdbClient.get(`/movie/${movieId}`);
        res.json(response.data);
    } catch (error) {
        console.error('Erro ao buscar detalhes do filme:', error);
        res.status(500).json({ message: 'Erro ao buscar detalhes do filme' });
    }
});

// Buscar detalhes de série
router.get('/tv/:id', async (req, res) => {
    try {
        const tvId = req.params.id;
        const response = await tmdbClient.get(`/tv/${tvId}`);
        res.json(response.data);
    } catch (error) {
        console.error('Erro ao buscar detalhes da série:', error);
        res.status(500).json({ message: 'Erro ao buscar detalhes da série' });
    }
});

module.exports = router;
