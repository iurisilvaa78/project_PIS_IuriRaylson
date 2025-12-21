const jwt = require('jsonwebtoken');
require('dotenv').config();

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

function verifyAdmin(req, res, next) {
    if (!req.isAdmin) {
        return res.status(403).json({ message: 'Admin access required.' });
    }
    next();
}

module.exports = { verifyJWT, verifyAdmin };

