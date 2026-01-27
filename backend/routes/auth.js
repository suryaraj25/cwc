const User = require('../models/User');
const Admin = require('../models/Admin');
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
        const { identifier, passwordHash, deviceId } = request.body;

        const user = await User.findOne({
            $or: [{ email: identifier }, { rollNo: identifier }],
            passwordHash
        });

        if (!user) {
            return reply.code(401).send({ success: false, message: 'Invalid Credentials.' });
        }

        // Device Binding Logic
        if (user.boundDeviceId && user.boundDeviceId !== deviceId) {
            return reply.code(403).send({ success: false, message: 'Security Alert: This account is locked to another device.' });
        }

        if (!user.boundDeviceId) {
            // Check if device is taken
            const deviceUser = await User.findOne({ boundDeviceId: deviceId });
            if (deviceUser && deviceUser.id !== user.id) {
                return reply.code(403).send({ success: false, message: 'This device is already bound to another account.' });
            }

            user.boundDeviceId = deviceId;
            await user.save();
        }

        return { success: true, message: 'Login Successful', user };
    });

    // Admin Login
    fastify.post('/admin-login', async (request, reply) => {
        const { username, password } = request.body;

        // Simple direct match for demo. In prod, compare hashes.
        const admin = await Admin.findOne({ username, passwordHash: password });

        if (!admin) {
            return reply.code(401).send({ success: false, message: 'Invalid Admin Credentials.' });
        }

        return { success: true, message: 'Admin Access Granted', adminId: admin.username };
    });

    // Get Current User (Session equivalent)
    fastify.get('/me', async (request, reply) => {
        const { deviceId } = request.query;
        if (!deviceId) return { user: null };

        const user = await User.findOne({ boundDeviceId: deviceId });
        return { user: user || null };
    });

    // Get User by ID
    fastify.get('/:id', async (request, reply) => {
        const user = await User.findById(request.params.id);
        return user;
    });
}

module.exports = authRoutes;
