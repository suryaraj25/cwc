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
    max: 100,
    timeWindow: '1 minute'
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

// Auth Decorator
fastify.decorate("authenticate", async function (request, reply) {
    try {
        const token = request.cookies.cwc_voting_token;
        if (!token) {
            return reply.code(401).send({ success: false, message: 'Unauthorized: No Token' });
        }

        const decoded = fastify.jwt.verify(token);
        const { userId, sessionToken } = decoded;

        // DB Lookup (No Redis)
        const User = require('./routes/auth').User || require('./models/User'); // Load User model
        const user = await User.findById(userId);

        // If user not found OR session token doesn't match current DB token
        if (!user || user.currentSessionToken !== sessionToken) {
            return reply.code(401).send({ success: false, message: 'Session Expired: Logged in on another device.' });
        }

        // Attach user to request for convenience
        request.authUser = user;
    } catch (err) {
        reply.code(401).send({ success: false, message: 'Unauthorized: Invalid Token' });
    }
});

// Admin Auth Decorator
fastify.decorate("authenticateAdmin", async function (request, reply) {
    try {
        const token = request.cookies.cwc_admin_token;
        if (!token) {
            return reply.code(401).send({ success: false, message: 'Unauthorized: No Admin Token' });
        }

        const decoded = fastify.jwt.verify(token);
        const { adminId, sessionToken } = decoded;

        const Admin = require('./models/Admin');
        const admin = await Admin.findOne({ username: adminId });

        if (!admin || admin.currentSessionToken !== sessionToken) {
            return reply.code(401).send({ success: false, message: 'Session Expired: Logged in on another device.' });
        }

        request.authAdmin = admin;
    } catch (err) {
        reply.code(401).send({ success: false, message: 'Unauthorized: Invalid Admin Token' });
    }
});

// Database Connection
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
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

fastify.get('*', (request, reply) => {
    if (request.raw.url?.startsWith('/api')) {
        return reply.callNotFound(); // This triggers 404 properly for unknown API routes
    }
    return reply.sendFile('index.html');
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