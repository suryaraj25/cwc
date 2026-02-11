const fastify = require('fastify')({ logger: true });
const path = require("path");
const fastifyStatic = require("@fastify/static");
const mongoose = require('mongoose');
require('dotenv').config();

// Register CORS
fastify.register(require('@fastify/cors'), {
    origin: true, // Allow all origins for dev, or specify frontend URL
    credentials: true, // Important for Cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE']
});

fastify.register(require('@fastify/cookie'), {
    secret: process.env.COOKIE_SECRET || 'cookie-super-secret', // shift to env
    parseOptions: {} // options for parsing cookies
});

// Rate Limiting
fastify.register(require('@fastify/rate-limit'), {
    max: parseInt(process.env.RATE_LIMIT_MAX) || 10000,
    timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute'
});

fastify.register(fastifyStatic, {
    root: path.join(__dirname, "../frontend/dist"),
    prefix: "/",
});

// Socket.IO
fastify.register(require('fastify-socket.io'), {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// JWT Configuration
fastify.register(require('@fastify/jwt'), {
    secret: process.env.JWT_SECRET || 'supersecretkey_dev_only', // Use ENV in prod
    cookie: {
        cookieName: 'cwc_voting_token',
        signed: false
    }
});

// Register Auth Middleware
fastify.register(require('./middleware/authMiddleware'));

// Database Connection
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            maxPoolSize: 500, // Increased for 400+ concurrent users
        });
        fastify.log.info(`MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

// Register Routes (These just define paths, they don't execute DB calls yet)
fastify.register(require('./routes/auth'), { prefix: '/api/auth' });
fastify.register(require('./routes/teams'), { prefix: '/api/teams' });
fastify.register(require('./routes/voting'), { prefix: '/api/voting' });
fastify.register(require('./routes/admin'), { prefix: '/api/admin' });
fastify.register(require('./routes/leaderboard'), { prefix: '/api/leaderboard' });

fastify.setNotFoundHandler((request, reply) => {
    if (request.raw.url.startsWith('/api')) {
        return reply.code(404).send({
            success: false,
            message: 'API route not found'
        });
    }

    // SPA fallback
    return reply.sendFile('index.html');
});


// Online Users Tracking
const onlineUsers = new Map(); // userId -> count
const onlineAdmins = new Map(); // adminId -> count

fastify.ready().then(() => {
    fastify.io.on('connection', (socket) => {
        fastify.log.info(`Socket connected: ${socket.id}`);

        const cookies = socket.handshake.headers.cookie;
        if (!cookies) {
            fastify.log.warn(`Socket ${socket.id} has no cookies`);
            return;
        }

        // Simple cookie parsing
        const getCookie = (name) => {
            const value = `; ${cookies}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
        };

        const votingToken = getCookie('cwc_voting_token');
        const adminToken = getCookie('cwc_admin_token');

        if (adminToken) {
            try {
                // Verify Admin
                fastify.jwt.verify(adminToken, (err, decoded) => {
                    if (err) {
                        fastify.log.error(`Socket ${socket.id} Admin Token Verify Error: ${err.message}`);
                    } else if (decoded.adminId) {
                        const adminId = decoded.adminId; // This is username based on auth.js
                        socket.userId = adminId;
                        socket.userType = 'ADMIN';
                        socket.join('admins');

                        // Increment count
                        const currentCount = onlineAdmins.get(adminId) || 0;
                        onlineAdmins.set(adminId, currentCount + 1);

                        // Broadcast updates
                        // Send current lists to this new admin
                        socket.emit('admin:online-users', Array.from(onlineUsers.keys()));
                        fastify.io.to('admins').emit('admin:online-admins', Array.from(onlineAdmins.keys())); // Broadcast to all admins including self

                        fastify.log.info(`Admin connected via socket: ${adminId}`);
                    }
                });
            } catch (e) { fastify.log.error(`Socket Admin Token Exception: ${e.message}`); }
        }

        if (votingToken) {
            try {
                // Verify User
                fastify.jwt.verify(votingToken, (err, decoded) => {
                    if (err) {
                        // checking if it's just an admin logging in as user concurrently or just irrelevant 
                        // fastify.log.error(`Socket ${socket.id} User Token Verify Error: ${err.message}`);
                    } else if (decoded.userId) {
                        const userId = decoded.userId;
                        socket.userId = userId; // Store for disconnect
                        socket.userType = 'USER';

                        // Increment connection count
                        const currentCount = onlineUsers.get(userId) || 0;
                        onlineUsers.set(userId, currentCount + 1);

                        // Broadcast if this is the first connection
                        if (currentCount === 0) {
                            fastify.io.to('admins').emit('admin:online-users', Array.from(onlineUsers.keys()));
                        }
                        fastify.log.info(`User connected via socket: ${userId}`);
                    }
                });
            } catch (e) { fastify.log.error(`Socket User Token Exception: ${e.message}`); }
        }

        socket.on('disconnect', () => {
            if (socket.userId) {
                const id = socket.userId;

                if (socket.userType === 'ADMIN') {
                    const currentCount = onlineAdmins.get(id) || 0;
                    if (currentCount <= 1) {
                        onlineAdmins.delete(id);
                        fastify.io.to('admins').emit('admin:online-admins', Array.from(onlineAdmins.keys()));
                    } else {
                        onlineAdmins.set(id, currentCount - 1);
                    }
                    fastify.log.info(`Admin disconnected socket: ${id}`);
                } else if (socket.userType === 'USER') {
                    const currentCount = onlineUsers.get(id) || 0;
                    if (currentCount <= 1) {
                        onlineUsers.delete(id);
                        fastify.io.to('admins').emit('admin:online-users', Array.from(onlineUsers.keys()));
                    } else {
                        onlineUsers.set(id, currentCount - 1);
                    }
                    fastify.log.info(`User disconnected socket: ${id}`);
                }
            }
        });
    });
});

// Start Server
const start = async () => {
    try {
        // STEP 1: Connect to DB
        await connectDB();

        // STEP 2: Run Seed (Now that DB is ready)
        // Make sure seedAdmin handles "admin already exists" errors internally

        // STEP 3: Listen for requests
        await fastify.listen({
            port: process.env.PORT || 5000,
            host: '0.0.0.0'
        });
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();