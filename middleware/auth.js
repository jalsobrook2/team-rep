const jwt = require('jsonwebtoken');

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'your-access-secret-key';

// Local helper to avoid circular require with controllers
function sendResponse(res, statusCode, success, data = null, error = null) {
  const response = { success };
  if (success && data !== null) response.data = data;
  if (!success && error) response.error = error;
  return res.status(statusCode).json(response);
}

const authMiddleware = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.warn('Auth: missing or invalid Authorization header', { path: req.path, method: req.method, authHeader: !!authHeader });
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
            // Log token verification failure for diagnostics
            console.warn('Auth: token verification failed', { path: req.path, method: req.method, error: tokenError && tokenError.name });
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