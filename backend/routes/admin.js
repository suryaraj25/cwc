const User = require('../models/User');
const Team = require('../models/Team');
const Config = require('../models/Config');
const VoteTransaction = require('../models/VoteTransaction');

async function adminRoutes(fastify, options) {

    // Get Dashboard Data
    fastify.get('/dashboard', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        const users = await User.find();
        const teams = await Team.find();
        const config = await Config.findOne() || new Config();

        // Calculate Votes
        const teamVotes = {};
        teams.forEach(t => teamVotes[t.id] = 0);

        users.forEach(u => {
            // u.votes is a Map
            if (u.votes) {
                for (const [teamId, count] of u.votes) {
                    if (teamVotes[teamId] !== undefined) {
                        teamVotes[teamId] += count;
                    }
                }
            }
        });

        return {
            users,
            teams,
            config,
            teamVotes,
            // devices can be derived from users with boundDeviceId
            deviceCount: users.filter(u => u.boundDeviceId).length
        };
    });

    // Update Config
    fastify.post('/config', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        let config = await Config.findOne();
        if (!config) config = new Config();

        Object.assign(config, request.body);
        await config.save();

        if (fastify.io) fastify.io.emit('admin:data-update');

        return config;
    });

    // Revoke Device
    fastify.post('/revoke-device', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        const { userId } = request.body;
        const user = await User.findById(userId);

        if (user) {
            user.boundDeviceId = null;
            await user.save();
            if (fastify.io) fastify.io.emit('admin:data-update');
            return { success: true };
        }

        return reply.code(404).send({ success: false, message: 'User not found' });
    });

    // Get Transactions
    fastify.get('/transactions', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        const transactions = await VoteTransaction.find()
            .populate('userId', 'name rollNo dept')
            .populate('teamId', 'name')
            .sort({ createdAt: -1 });
        return transactions;
    });
}

module.exports = adminRoutes;
