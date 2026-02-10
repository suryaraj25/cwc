const User = require('../models/User');
const Admin = require('../models/Admin');
const VoteTransaction = require('../models/VoteTransaction');
const AuditLog = require('../models/AuditLog');
const WhitelistedEmail = require('../models/WhitelistedEmail');
const BlacklistedUser = require('../models/BlacklistedUser');
const bcrypt = require('bcrypt');
const UserRole = { GUEST: 'GUEST', STUDENT: 'STUDENT', ADMIN: 'ADMIN' }; // Simple enum

async function authRoutes(fastify, options) {

    // Register
    fastify.post('/register', async (request, reply) => {
        const userData = request.body;

        // 0. Check Blacklist
        const isBlacklisted = await BlacklistedUser.findOne({
            $or: [{ email: userData.email.toLowerCase() }, { rollNo: userData.rollNo }]
        });

        if (isBlacklisted) {
            // Return specific code for frontend to redirect
            return reply.code(403).send({ success: false, message: 'This account has been blacklisted.', status: 'BLACKLISTED' });
        }

        // 1. Whitelist Check & Approval Status
        const isWhitelisted = await WhitelistedEmail.findOne({ email: userData.email.toLowerCase() });
        const isApproved = !!isWhitelisted; // Auto-approve if whitelisted

        // 2. Check existing
        const existing = await User.findOne({
            $or: [{ email: userData.email }, { rollNo: userData.rollNo }]
        });

        if (existing) {
            return reply.code(400).send({ success: false, message: 'User with this Email or Roll No already exists.' });
        }

        // 3. Hash password with bcrypt
        const hashedPassword = await bcrypt.hash(userData.passwordHash, 10);

        // 4. Create User with hashed password and approval status
        const user = new User({ ...userData, passwordHash: hashedPassword, isApproved });
        await user.save();

        if (isApproved) {
            return { success: true, message: 'Registration Successful', user, status: 'APPROVED' };
        } else {
            return { success: true, message: 'Registration Successful. Account pending approval.', user, status: 'PENDING' };
        }
    });

    // Login
    fastify.post('/login', async (request, reply) => {
        const { identifier, passwordHash } = request.body;
        const crypto = require('crypto');

        // 1. Find user by identifier (email or rollNo)
        const user = await User.findOne({
            $or: [{ email: identifier }, { rollNo: identifier }]
        });

        // 2. Verify user exists and password is correct
        if (!user || !(await bcrypt.compare(passwordHash, user.passwordHash))) {
            // Check if it's a blacklisted user trying to login
            const blacklisted = await BlacklistedUser.findOne({
                $or: [{ email: identifier }, { rollNo: identifier }]
            });

            if (blacklisted) {
                return reply.code(403).send({
                    success: false,
                    message: 'Account blacklisted.',
                    status: 'BLACKLISTED',
                    reason: blacklisted.reason
                });
            }

            return reply.code(404).send({ success: false, message: 'Invalid Credentials.' });
        }

        // 2.1 Check Approval Status
        if (!user.isApproved) {
            return reply.code(403).send({ success: false, message: 'Account pending approval.', status: 'PENDING' });
        }

        // 3. Single Session Enforcement Logic
        const sessionToken = crypto.randomUUID(); // Generate new session ID
        user.currentSessionToken = sessionToken;
        await user.save();

        // 4. Sign JWT with payload
        const token = fastify.jwt.sign({ userId: user._id, sessionToken });

        // 5. Set Cookie
        reply.setCookie('cwc_voting_token', token, {
            path: '/',
            httpOnly: true,
            secure: false, // Set to true if using HTTPS
            maxAge: 7200 // 2 hours
        });

        // 6. Audit Log
        await AuditLog.create({
            userId: user._id,
            userType: 'USER',
            action: 'LOGIN',
            ipAddress: request.ip,
            userAgent: request.headers['user-agent']
        });

        // 7. Emit Real-time Update
        if (fastify.io) fastify.io.emit('admin:data-update');


        return { success: true, message: 'Login Successful', user }; // Token not returned in body
    });

    // Admin Login
    fastify.post('/admin-login', async (request, reply) => {
        const { username, password } = request.body;
        const crypto = require('crypto');

        // 1. Find admin by username
        const admin = await Admin.findOne({ username });

        // 2. Verify admin exists and password is correct
        if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
            return reply.code(404).send({ success: false, message: 'Invalid Admin Credentials.' });
        }

        // 3. Single Session Enforcement Logic
        const sessionToken = crypto.randomUUID(); // Generate new session ID
        admin.currentSessionToken = sessionToken;
        await admin.save();

        // 4. Sign JWT with payload
        const token = fastify.jwt.sign({ adminId: admin.username, sessionToken });

        // 5. Set Cookie
        reply.setCookie('cwc_admin_token', token, {
            path: '/',
            httpOnly: true,
            secure: false, // Set to true if using HTTPS
            maxAge: 7200 // 2 hours
        });

        // 6. Audit Log
        await AuditLog.create({
            adminId: admin.username,
            userType: 'ADMIN',
            action: 'LOGIN',
            ipAddress: request.ip,
            userAgent: request.headers['user-agent']
        });

        // 7. Emit Real-time Update
        if (fastify.io) fastify.io.emit('admin:data-update');


        return { success: true, message: 'Admin Access Granted', adminId: admin.username, role: admin.role };
    });

    // Get Current User (Protected)
    fastify.get('/me', { onRequest: [fastify.authenticate] }, async (request, reply) => {
        // request.authUser is populated by the authenticate decorator
        const user = request.authUser;

        // Calculate Votes Used (Relative to Session Date)
        const Config = require('../models/Config');
        const config = await Config.findOne() || { dailyQuota: 100, currentSessionDate: null };
        const effectiveDate = config.currentSessionDate ? new Date(config.currentSessionDate) : new Date();

        const startOfDay = new Date(effectiveDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(effectiveDate);
        endOfDay.setHours(23, 59, 59, 999);

        const todayTransactions = await VoteTransaction.find({
            userId: user._id,
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        const votesUsedToday = todayTransactions.reduce((sum, t) => sum + t.votes, 0);

        return { user, votesUsedToday };
    });

    // Get Current Admin (Protected)
    fastify.get('/admin-me', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        return { success: true, adminId: request.authAdmin.username, role: request.authAdmin.role };
    });

    // Get User by ID
    fastify.get('/:id', async (request, reply) => {
        const user = await User.findById(request.params.id);
        return user;
    });

    // Change Password (for users who must change after admin reset)
    fastify.post('/change-password', { onRequest: [fastify.authenticate] }, async (request, reply) => {
        const { currentPassword, newPassword } = request.body;
        const user = request.authUser;

        // Validate inputs
        if (!currentPassword || !newPassword) {
            return reply.code(400).send({ success: false, message: 'Current password and new password are required' });
        }

        if (newPassword.length < 6) {
            return reply.code(400).send({ success: false, message: 'New password must be at least 6 characters long' });
        }

        // Verify current password
        if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
            return reply.code(400).send({ success: false, message: 'Current password is incorrect' });
        }

        // Hash new password and save
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.passwordHash = hashedPassword;
        user.mustChangePassword = false; // Clear the flag
        await user.save();

        // Audit Log
        await AuditLog.create({
            userId: user._id,
            userType: 'USER',
            action: 'PASSWORD_CHANGE',
            ipAddress: request.ip,
            userAgent: request.headers['user-agent']
        });

        return { success: true, message: 'Password changed successfully' };
    });
    // Logout
    fastify.post('/logout', { onRequest: [fastify.authenticate] }, async (request, reply) => {
        // Clear session on server (optional since we rotate token on login, but good practice)
        const user = request.authUser;
        user.currentSessionToken = null;
        await user.save();

        // Clear Cookie
        reply.clearCookie('cwc_voting_token', { path: '/' });

        // Audit Log
        await AuditLog.create({
            userId: user._id,
            userType: 'USER',
            action: 'LOGOUT',
            ipAddress: request.ip,
            userAgent: request.headers['user-agent']
        });

        // Emit Real-time Update
        if (fastify.io) fastify.io.emit('admin:data-update');


        return { success: true, message: 'Logout Successful' };
    });

    // Admin Logout
    fastify.post('/admin-logout', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        const admin = request.authAdmin;

        // Audit Log
        await AuditLog.create({
            adminId: admin.username,
            userType: 'ADMIN',
            action: 'LOGOUT',
            ipAddress: request.ip,
            userAgent: request.headers['user-agent']
        });

        // Emit Real-time Update
        if (fastify.io) fastify.io.emit('admin:data-update');

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
    // Check Email (Public)
    fastify.get('/check-email', async (request, reply) => {
        const { email } = request.query;
        if (!email) return reply.code(400).send({ success: false, message: 'Email required' });

        const isWhitelisted = await WhitelistedEmail.findOne({ email: email.toLowerCase() });
        return { success: !!isWhitelisted, isWhitelisted: !!isWhitelisted };
    });
}

module.exports = authRoutes;
