/*
 * Middleware de Autenticação
 * 
 * Verifica tokens JWT e permissões de utilizadores
 * Protege rotas que requerem autenticação e/ou privilégios de admin
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Middleware para verificar token JWT
 * Valida o token enviado no header e extrai informações do utilizador
 * 
 * @param {Object} req - Request do Express
 * @param {Object} res - Response do Express
 * @param {Function} next - Callback para próximo middleware
 */
function verifyJWT(req, res, next) {
    const token = req.headers['x-access-token'] || req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ auth: false, message: 'No token provided.' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'palavrasecreta', function(err, decoded) {
        if (err) {
            return res.status(500).json({ auth: false, message: 'Failed to authenticate token.' });
        }
        req.userId = decoded.id;
        req.isAdmin = decoded.isAdmin || false;
        next();
    });
}

/**
 * Middleware para verificar se utilizador é administrador
 * Deve ser usado após verifyJWT
 * 
 * @param {Object} req - Request do Express (deve conter req.isAdmin)
 * @param {Object} res - Response do Express
 * @param {Function} next - Callback para próximo middleware
 */
function verifyAdmin(req, res, next) {
    if (!req.isAdmin) {
        return res.status(403).json({ message: 'Admin access required.' });
    }
    next();
}

module.exports = { verifyJWT, verifyAdmin };

