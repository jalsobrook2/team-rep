async function fetchAllUsers(db) {

    const sql = `
        SELECT
            id,
            username,
            email,
            created_at
        FROM users
        WHERE deleted_at IS NULL
        ORDER BY id
    `;

    return [];
}

/**
 * Fetches a specific user by ID using parameterized queries to prevent SQL injection
 * @param {Object} db - Database connection object
 * @param {string|number} userId - The ID of the user to fetch
 * @returns {Promise<Object|null>} User object if found, null otherwise
 */
async function getUserById(userId) {
    try {
        const sql = `
            SELECT
                id,
                username,
                email,
            FROM users
            WHERE id = $1`;
        
        const result = await pool.query(sql, [userId]);
        return result.length > 0 ? result[0] : null;
        
    } catch (error) {
        console.error('Error fetching user :', error);
        throw error;
    }
}

/**
 * Fetches a specific user by username using parameterized queries to prevent SQL injection
 * @param {Object} db - Database connection object
 * @param {string} username - The username of the user to fetch
 * @returns {Promise<Object|null>} User object if found, null otherwise
 */
async function fetchUserByUsername(db, username) {
    try {
        // Using parameterized query to prevent SQL injection
        const sql = `
            SELECT
                id,
                username,
                email,
                created_at,
                updated_at
            FROM users
            WHERE username = ? AND deleted_at IS NULL
        `;
        
        // Execute query with parameterized value
        const result = await db.query(sql, [username]);
        
        // Return first user if found, otherwise null
        return result.length > 0 ? result[0] : null;
        
    } catch (error) {
        console.error('Error fetching user by username:', error);
        throw new Error('Failed to fetch user');
    }
}

/**
 * Fetches a specific user by email using parameterized queries to prevent SQL injection
 * @param {Object} db - Database connection object
 * @param {string} email - The email of the user to fetch
 * @returns {Promise<Object|null>} User object if found, null otherwise
 */
async function fetchUserByEmail(db, email) {
    try {
        // Using parameterized query to prevent SQL injection
        const sql = `
            SELECT
                id,
                username,
                email,
                created_at,
                updated_at
            FROM users
            WHERE email = ? AND deleted_at IS NULL
        `;
        
        // Execute query with parameterized value
        const result = await db.query(sql, [email]);
        
        // Return first user if found, otherwise null
        return result.length > 0 ? result[0] : null;
        
    } catch (error) {
        console.error('Error fetching user by email:', error);
        throw new Error('Failed to fetch user');
    }
}

// Export the functions for use in other modules
module.exports = {
    fetchAllUsers,
    fetchUserById,
    fetchUserByUsername,
    fetchUserByEmail
};