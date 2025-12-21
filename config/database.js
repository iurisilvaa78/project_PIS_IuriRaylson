const mysql = require('mysql2');
require('dotenv').config();

const connectionOptions = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'pis_filmes_series',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(connectionOptions);
const promisePool = pool.promise();

module.exports = promisePool;

