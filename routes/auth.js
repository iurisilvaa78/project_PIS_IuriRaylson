/*
 * Rotas de Autenticação
 * 
 * Gestão de registo, login, verificação e atualização de utilizadores
 * 
 * Rotas:
 * - POST /api/auth/register - Registo de novo utilizador
 * - POST /api/auth/login - Login e geração de token JWT
 * - GET /api/auth/verify - Verificar token e obter dados do utilizador
 * - PUT /api/auth/update - Atualizar perfil do utilizador
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
require('dotenv').config();

/**
 * POST /api/auth/register
 * Regista um novo utilizador no sistema
 * Valida dados obrigatórios e encripta password com bcrypt
 */
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, nome } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Username, email e password são obrigatórios.' });
        }
        
        const [existingUser] = await db.execute(
            'SELECT id FROM utilizadores WHERE username = ? OR email = ?',
            [username, email]
        );
        
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Utilizador já existe.' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
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

/**
 * POST /api/auth/login
 * Autentica utilizador e retorna token JWT
 * Valida credenciais, compara password encriptada e gera token com expiração
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ message: 'Username e password são obrigatórios.' });
        }
        
        const [users] = await db.execute(
            'SELECT id, username, email, nome, password, is_admin, data_criacao as created_at FROM utilizadores WHERE username = ? OR email = ?',
            [username, username]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }
        
        const user = users[0];
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }
        
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

/**
 * GET /api/auth/verify
 * Verifica token JWT e retorna dados do utilizador autenticado
 * Requer: Token JWT válido
 */
router.get('/verify', require('../middleware/auth').verifyJWT, async (req, res) => {
    try {
        const [users] = await db.execute(
            'SELECT id, username, email, nome, is_admin, data_criacao as created_at FROM utilizadores WHERE id = ?',
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

/**
 * PUT /api/auth/update
 * Atualiza dados do perfil do utilizador autenticado
 * Permite atualizar email, nome e password
 * Requer: Token JWT válido
 */
router.put('/update', require('../middleware/auth').verifyJWT, async (req, res) => {
    try {
        const { email, nome, password } = req.body;
        const userId = req.userId;
        
        if (!email) {
            return res.status(400).json({ message: 'Email é obrigatório.' });
        }
        
        const [existingUser] = await db.execute(
            'SELECT id FROM utilizadores WHERE email = ? AND id != ?',
            [email, userId]
        );
        
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Este email já está em uso.' });
        }
        
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.execute(
                'UPDATE utilizadores SET email = ?, nome = ?, password = ? WHERE id = ?',
                [email, nome || null, hashedPassword, userId]
            );
        } else {
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

