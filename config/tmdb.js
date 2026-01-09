/*
 * Cliente para API do TMDB (The Movie Database)
 * 
 * Configura um cliente HTTP Axios pré-configurado para fazer
 * requisições à API do TMDB com autenticação e idioma português
 */

const axios = require('axios');
require('dotenv').config();

// Configurações da API TMDB obtidas do .env
const TMDB_BASE_URL = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY;

console.log('TMDB_BASE_URL:', TMDB_BASE_URL);
console.log('TMDB_API_KEY presente:', !!TMDB_API_KEY);

// Criar cliente Axios pré-configurado com autenticação e idioma
const tmdbClient = axios.create({
    baseURL: TMDB_BASE_URL,
    params: {
        api_key: TMDB_API_KEY, // Chave de API incluída em todas as requisições
        language: 'pt-PT' // Idioma português para respostas
    }
});

// Exportar cliente configurado
module.exports = tmdbClient;

