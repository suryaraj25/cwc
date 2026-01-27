const fastify = require('fastify')({ logger: true });
const path = require("path");
const fastifyStatic = require("@fastify/static");
const mongoose = require('mongoose');
require('dotenv').config();

// Register CORS
fastify.register(require('@fastify/cors'), {
    origin: '*', // Adjust this for production security
    methods: ['GET', 'POST', 'PUT', 'DELETE']
});

fastify.register(fastifyStatic, {
  root: path.join(__dirname, "../frontend/dist"),
  prefix: "/",
});

fastify.get("/", async (req, reply) => {
  return reply.sendFile("index.html");
});

// Database Connection
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        fastify.log.info(`MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

// Basic Route
fastify.get('/api', async (request, reply) => {
    return { hello: 'world' };
});

// Register Routes
fastify.register(require('./routes/auth'), { prefix: '/api/auth' });
fastify.register(require('./routes/teams'), { prefix: '/api/teams' });
fastify.register(require('./routes/voting'), { prefix: '/api/voting' });
fastify.register(require('./routes/admin'), { prefix: '/api/admin' });

// Start Server
const start = async () => {
    try {
        await connectDB();
        await fastify.listen({ port: process.env.PORT || 5000,
            host: '0.0.0.0'
         });
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
