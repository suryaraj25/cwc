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

// Register Auth Middleware
fastify.register(require('./middleware/authMiddleware'));

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