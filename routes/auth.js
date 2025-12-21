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
            'SELECT id, username, email, nome, password, is_admin, data_registo as created_at FROM utilizadores WHERE username = ? OR email = ?',
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
                nome: user.nome,
                isAdmin: user.is_admin,
                created_at: user.created_at
            }
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ message: 'Erro ao fazer login.' });
    }
});

// Verificar token
router.get('/verify', require('../middleware/auth').verifyJWT, async (req, res) => {
    try {
        // Buscar dados completos do utilizador
        const [users] = await db.execute(
            'SELECT id, username, email, nome, is_admin, data_registo as created_at FROM utilizadores WHERE id = ?',
            [req.userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ auth: false, message: 'Utilizador não encontrado.' });
        }
        
        const user = users[0];
        res.json({
            auth: true,
            id: user.id,
            userId: user.id,
            username: user.username,
            email: user.email,
            nome: user.nome,
            isAdmin: user.is_admin,
            created_at: user.created_at
        });
    } catch (error) {
        console.error('Erro ao verificar token:', error);
        res.status(500).json({ auth: false, message: 'Erro ao verificar token.' });
    }
});

// Atualizar perfil
router.put('/update', require('../middleware/auth').verifyJWT, async (req, res) => {
    try {
        const { email, nome, password } = req.body;
        const userId = req.userId;
        
        // Validar email
        if (!email) {
            return res.status(400).json({ message: 'Email é obrigatório.' });
        }
        
        // Verificar se email já está em uso por outro utilizador
        const [existingUser] = await db.execute(
            'SELECT id FROM utilizadores WHERE email = ? AND id != ?',
            [email, userId]
        );
        
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Este email já está em uso.' });
        }
        
        // Atualizar dados
        if (password) {
            // Se forneceu nova password, fazer hash
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.execute(
                'UPDATE utilizadores SET email = ?, nome = ?, password = ? WHERE id = ?',
                [email, nome || null, hashedPassword, userId]
            );
        } else {
            // Sem alteração de password
            await db.execute(
                'UPDATE utilizadores SET email = ?, nome = ? WHERE id = ?',
                [email, nome || null, userId]
            );
        }
        
        res.json({ message: 'Perfil atualizado com sucesso.' });
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(500).json({ message: 'Erro ao atualizar perfil.' });
    }
});

module.exports = router;

