const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
require('dotenv').config();

// Registro de utilizador
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, nome } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Username, email e password são obrigatórios.' });
        }
        
        // Verificar se utilizador já existe
        const [existingUser] = await db.execute(
            'SELECT id FROM utilizadores WHERE username = ? OR email = ?',
            [username, email]
        );
        
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Utilizador já existe.' });
        }
        
        // Hash da password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Inserir utilizador
        const [result] = await db.execute(
            'INSERT INTO utilizadores (username, email, password, nome) VALUES (?, ?, ?, ?)',
            [username, email, hashedPassword, nome || null]
        );
        
        res.status(201).json({ message: 'Utilizador criado com sucesso.', userId: result.insertId });
    } catch (error) {
        console.error('Erro no registo:', error);
        res.status(500).json({ message: 'Erro ao criar utilizador.' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ message: 'Username e password são obrigatórios.' });
        }
        
        // Buscar utilizador
        const [users] = await db.execute(
            'SELECT id, username, email, password, is_admin FROM utilizadores WHERE username = ? OR email = ?',
            [username, username]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }
        
        const user = users[0];
        
        // Verificar password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }
        
        // Gerar token JWT
        const token = jwt.sign(
            { id: user.id, isAdmin: user.is_admin },
            process.env.JWT_SECRET || 'palavrasecreta',
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );
        
        res.json({
            auth: true,
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                isAdmin: user.is_admin
            }
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ message: 'Erro ao fazer login.' });
    }
});

// Verificar token
router.get('/verify', require('../middleware/auth').verifyJWT, (req, res) => {
    res.json({ auth: true, userId: req.userId, isAdmin: req.isAdmin });
});

module.exports = router;

