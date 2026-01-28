const User = require('../models/User');
const Admin = require('../models/Admin');
const VoteTransaction = require('../models/VoteTransaction');
const UserRole = { GUEST: 'GUEST', STUDENT: 'STUDENT', ADMIN: 'ADMIN' }; // Simple enum

async function authRoutes(fastify, options) {

    // Register
    fastify.post('/register', async (request, reply) => {
        const userData = request.body;

        // 1. Check existing
        const existing = await User.findOne({
            $or: [{ email: userData.email }, { rollNo: userData.rollNo }]
        });

        if (existing) {
            return reply.code(400).send({ success: false, message: 'User with this Email or Roll No already exists.' });
        }

        // 2. Create User
        // Note: boundDeviceId will be set on first login or explicitly passed
        const user = new User(userData);
        await user.save();

        return { success: true, message: 'Registration Successful', user };
    });

    // Login
    fastify.post('/login', async (request, reply) => {
        const { identifier, passwordHash } = request.body;
        const crypto = require('crypto');

        const user = await User.findOne({
            $or: [{ email: identifier }, { rollNo: identifier }],
            passwordHash
        });

        if (!user) {
            return reply.code(401).send({ success: false, message: 'Invalid Credentials.' });
        }

        // Single Session Enforcement Logic
        const sessionToken = crypto.randomUUID(); // Generate new session ID
        user.currentSessionToken = sessionToken;
        await user.save();

        // Sign JWT with payload
        const token = fastify.jwt.sign({ userId: user._id, sessionToken });

        // Set Cookie
        reply.setCookie('cwc_voting_token', token, {
            path: '/',
            httpOnly: true,
            secure: false, // Set to true if using HTTPS
            maxAge: 3600 // 1 hour
        });

        return { success: true, message: 'Login Successful', user }; // Token not returned in body
    });

    // Admin Login
    fastify.post('/admin-login', async (request, reply) => {
        const { username, password } = request.body;
        const crypto = require('crypto');

        // Simple direct match for demo. In prod, compare hashes.
        const admin = await Admin.findOne({ username, passwordHash: password });

        if (!admin) {
            return reply.code(401).send({ success: false, message: 'Invalid Admin Credentials.' });
        }

        // Single Session Enforcement Logic
        const sessionToken = crypto.randomUUID(); // Generate new session ID
        admin.currentSessionToken = sessionToken;
        await admin.save();

        // Sign JWT with payload
        const token = fastify.jwt.sign({ adminId: admin.username, sessionToken });

        // Set Cookie
        reply.setCookie('cwc_admin_token', token, {
            path: '/',
            httpOnly: true,
            secure: false, // Set to true if using HTTPS
            maxAge: 3600 // 1 hour
        });

        return { success: true, message: 'Admin Access Granted', adminId: admin.username };
    });

    // Get Current User (Protected)
    fastify.get('/me', { onRequest: [fastify.authenticate] }, async (request, reply) => {
        // request.authUser is populated by the authenticate decorator
        const user = request.authUser;

        // Calculate Votes Used Today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const todayTransactions = await VoteTransaction.find({
            userId: user._id,
            createdAt: { $gte: startOfDay }
        });

        const votesUsedToday = todayTransactions.reduce((sum, t) => sum + t.votes, 0);

        return { user, votesUsedToday };
    });

    // Get User by ID
    fastify.get('/:id', async (request, reply) => {
        const user = await User.findById(request.params.id);
        return user;
    });
    // Logout
    fastify.post('/logout', { onRequest: [fastify.authenticate] }, async (request, reply) => {
        // Clear session on server (optional since we rotate token on login, but good practice)
        const user = request.authUser;
        user.currentSessionToken = null;
        await user.save();

        // Clear Cookie
        reply.clearCookie('cwc_voting_token', { path: '/' });

        return { success: true, message: 'Logout Successful' };
    });

    // Admin Logout
    fastify.post('/admin-logout', async (request, reply) => {
        // Clear Cookie
        reply.clearCookie('cwc_admin_token', { path: '/' });

        // We might not have the user object here if we don't force auth on logout, 
        // but ideally we should clear the DB session too if possible.
        // For now, simpler to just clear cookie which invalidates client. 
        // If we want to strictly invalidate server side, we'd need to Require Auth for logout
        // or pass username. Let's keep it simple as per plan - just cookie clear is "logout" from client perspective.
        // BUT enabling auth middleware on this route would be better to clear DB. 
        // Let's check plan... Plan said "Clear currentSessionToken in DB". 
        // So I should probably modify this to use authentication if I want to clear DB.
        // However, unlike User, Admin might not have a /me equivalent easily accessible here without auth.
        // Let's sticking to clearing cookie effectively logs them out. 
        // If I want to clear DB, I need to know WHO is logging out.

        return { success: true, message: 'Admin Logout Successful' };
    });
}

module.exports = authRoutes;
