const jwt = require('jsonwebtoken');
const { sendResponse } = require('../controllers/workerController');

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'your-access-secret-key';

const authMiddleware = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return sendResponse(res, 401, false, null, "Authorization header missing or invalid format");
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return sendResponse(res, 401, false, null, "No token provided");
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
            
            // Add worker ID to request
            req.workerId = decoded.id;
            req.worker = decoded; // Include full decoded token payload
            next();
        } catch (tokenError) {
            if (tokenError.name === 'TokenExpiredError') {
                return sendResponse(res, 401, false, null, "Token has expired");
            }
            if (tokenError.name === 'JsonWebTokenError') {
                return sendResponse(res, 401, false, null, "Invalid token");
            }
            throw tokenError;
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return sendResponse(res, 500, false, null, "Authentication error");
    }
};

module.exports = authMiddleware;