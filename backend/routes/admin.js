const User = require('../models/User');
const Team = require('../models/Team');
const Config = require('../models/Config');
const VoteTransaction = require('../models/VoteTransaction');

async function adminRoutes(fastify, options) {

    // Get Dashboard Data with Pagination and Search
    fastify.get('/dashboard', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        const page = parseInt(request.query.page) || 1;
        const limit = parseInt(request.query.limit) || 10;
        const search = request.query.search || '';
        const skip = (page - 1) * limit;

        // Build search query
        const searchQuery = search ? {
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { rollNo: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { dept: { $regex: search, $options: 'i' } }
            ]
        } : {};

        // Get paginated users with search
        const [users, totalUsers] = await Promise.all([
            User.find(searchQuery).skip(skip).limit(limit),
            User.countDocuments(searchQuery)
        ]);

        const teams = await Team.find();
        const config = await Config.findOne() || new Config();

        // Calculate Votes
        const teamVotes = {};
        teams.forEach(t => teamVotes[t.id] = 0);

        users.forEach(u => {
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
            totalUsers,
            currentPage: page,
            totalPages: Math.ceil(totalUsers / limit),
            teams,
            config,
            teamVotes,
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

    // Get Transactions with Pagination and Search
    fastify.get('/transactions', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        const page = parseInt(request.query.page) || 1;
        const limit = parseInt(request.query.limit) || 20;
        const search = request.query.search || '';
        const skip = (page - 1) * limit;

        // Build search query - search in populated user fields
        let query = VoteTransaction.find()
            .populate('userId', 'name rollNo dept')
            .populate('teamId', 'name')
            .sort({ createdAt: -1 });

        // Get all for filtering if search exists
        if (search) {
            const allTransactions = await VoteTransaction.find()
                .populate('userId', 'name rollNo dept')
                .populate('teamId', 'name')
                .sort({ createdAt: -1 });

            const filtered = allTransactions.filter(tx => {
                const userName = tx.userId?.name?.toLowerCase() || '';
                const rollNo = tx.userId?.rollNo?.toLowerCase() || '';
                const teamName = tx.teamId?.name?.toLowerCase() || '';
                const searchLower = search.toLowerCase();
                return userName.includes(searchLower) ||
                    rollNo.includes(searchLower) ||
                    teamName.includes(searchLower);
            });

            const paginatedFiltered = filtered.slice(skip, skip + limit);

            return {
                transactions: paginatedFiltered,
                total: filtered.length,
                currentPage: page,
                totalPages: Math.ceil(filtered.length / limit)
            };
        }

        // No search - use efficient pagination
        const [transactions, total] = await Promise.all([
            VoteTransaction.find()
                .populate('userId', 'name rollNo dept')
                .populate('teamId', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            VoteTransaction.countDocuments()
        ]);

        return {
            transactions,
            total,
            currentPage: page,
            totalPages: Math.ceil(total / limit)
        };
    });
}

module.exports = adminRoutes;
