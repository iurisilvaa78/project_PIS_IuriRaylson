const axios = require('axios');
require('dotenv').config();

const TMDB_BASE_URL = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY;

console.log('TMDB_BASE_URL:', TMDB_BASE_URL);
console.log('TMDB_API_KEY presente:', !!TMDB_API_KEY);

const tmdbClient = axios.create({
    baseURL: TMDB_BASE_URL,
    params: {
        api_key: TMDB_API_KEY,
        language: 'pt-PT'
    }
});

module.exports = tmdbClient;

