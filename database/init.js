const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const connectionOptions = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    multipleStatements: true
};

async function initDatabase() {
    const connection = mysql.createConnection(connectionOptions);
    
    try {
        console.log('A conectar à base de dados...');
        
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        const schemaWithoutAdmin = schema.replace(
            /INSERT INTO utilizadores.*admin.*;/s,
            ''
        );
        
        console.log('A criar base de dados e tabelas...');
        await connection.promise().query(schemaWithoutAdmin);
        
        console.log('A criar utilizador admin...');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        await connection.promise().query(
            `INSERT INTO utilizadores (username, email, password, nome, is_admin) 
             VALUES (?, ?, ?, ?, ?)`,
            ['admin', 'admin@example.com', hashedPassword, 'Administrador', true]
        );
        
        console.log('✅ Base de dados inicializada com sucesso!');
        console.log('📝 Credenciais do admin:');
        console.log('   Username: admin');
        console.log('   Password: admin123');
        
    } catch (error) {
        console.error('❌ Erro ao inicializar base de dados:', error);
        process.exit(1);
    } finally {
        connection.end();
    }
}

initDatabase();

