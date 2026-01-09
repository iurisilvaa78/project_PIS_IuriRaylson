/*
 * Configuração da Base de Dados MySQL
 * 
 * Cria e exporta um pool de conexões MySQL usando mysql2
 * com suporte a Promises para operações assíncronas
 */

const mysql = require('mysql2');
require('dotenv').config();

// Configurações de conexão obtidas das variáveis de ambiente
const connectionOptions = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'pis_filmes_series',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0 // Sem limite de fila de conexões
};

// Criar pool de conexões e converter para API baseada em Promises
const pool = mysql.createPool(connectionOptions);
const promisePool = pool.promise();

// Exportar pool com suporte a async/await
module.exports = promisePool;

