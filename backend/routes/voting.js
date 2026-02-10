const VoteTransaction = require('../models/VoteTransaction');
const Config = require('../models/Config');

async function votingRoutes(fastify, options) {

    // Get Voting Config (Public - but enhanced if auth token provided)
    fastify.get('/config', async (request, reply) => {
        let userSpecificData = {};

        // Check for Auth Header manually since this is a public route
        // This allows the frontend to fetch config + user status in one go or separately
        const token = request.headers.authorization?.split(' ')[1];
        if (token) {
            try {
                const decoded = fastify.jwt.verify(token);
                const user = await fastify.mongo.AuthUser.findById(decoded.id);
                if (user) {
                    const config = await Config.findOne() || new Config();
                    const effectiveDate = config.currentSessionDate ? new Date(config.currentSessionDate) : new Date();
                    const startOfDay = new Date(effectiveDate);
                    startOfDay.setHours(0, 0, 0, 0);
                    const endOfDay = new Date(effectiveDate);
                    endOfDay.setHours(23, 59, 59, 999);

                    const todayTransactions = await VoteTransaction.find({
                        userId: user._id,
                        date: { $gte: startOfDay, $lte: endOfDay }
                    });
                    const votesUsed = todayTransactions.reduce((sum, t) => sum + t.votes, 0);
                    userSpecificData = {
                        votesUsedToday: votesUsed,
                        remainingToday: (config.dailyQuota || 100) - votesUsed
                    };
                }
            } catch (e) {
                // Ignore invalid token on public route
            }
        }

        const config = await Config.findOne() || new Config();
        return {
            isVotingOpen: config.isVotingOpen,
            startTime: config.startTime,
            endTime: config.endTime,
            dailyQuota: config.dailyQuota || 100,
            currentSessionDate: config.currentSessionDate,
            ...userSpecificData
        };
    });

    fastify.post('/cast', { onRequest: [fastify.authenticate] }, async (request, reply) => {
        const { votes } = request.body; // votes: { teamId: count }
        const user = request.authUser; // from authenticate decorator

        const config = await Config.findOne() || new Config();
        // Ensure dailyQuota is 100 if not set in DB
        const DAILY_QUOTA = config.dailyQuota || 100;

        // 1. Check Global Switch
        if (!config.isVotingOpen) {
            return reply.code(403).send({ success: false, message: 'Voting is currently closed by Admin.' });
        }

        // 2. Determine Effective Date
        const effectiveDate = config.currentSessionDate ? new Date(config.currentSessionDate) : new Date();

        // 3. Time Window Check (Skip if currentSessionDate is set - implied override)
        if (!config.currentSessionDate && config.startTime && config.endTime) {
            const now = new Date();
            if (now < config.startTime || now > config.endTime) {
                return reply.code(403).send({ success: false, message: 'Voting is only allowed between the scheduled times.' });
            }
        }

        // 2.1 Check Self-Voting (Backend Enforcement)
        if (user.teamId) {
            if (votes[user.teamId.toString()] > 0) {
                return reply.code(403).send({ success: false, message: 'You cannot vote for your own team.' });
            }
        }

        // 4. Calculate Votes Used Today (Relative to effectiveDate)
        const startOfDay = new Date(effectiveDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(effectiveDate);
        endOfDay.setHours(23, 59, 59, 999);

        const todayTransactions = await VoteTransaction.find({
            userId: user._id,
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        const votesUsedToday = todayTransactions.reduce((sum, t) => sum + t.votes, 0);
        const totalNewVotes = Object.values(votes).reduce((a, b) => a + b, 0);

        if (totalNewVotes === 0) {
            return reply.code(400).send({ success: false, message: `You must cast at least one vote.` });
        }

        if ((votesUsedToday + totalNewVotes) > DAILY_QUOTA) {
            return reply.code(400).send({
                success: false,
                message: `Daily Quota Exceeded. You have used ${votesUsedToday}/${DAILY_QUOTA} votes. You can cast ${DAILY_QUOTA - votesUsedToday} more.`
            });
        }

        // 5. Record Transactions & Update User
        const currentVotes = user.votes || new Map();

        for (const [teamId, count] of Object.entries(votes)) {
            if (count > 0) {
                // Update User Total
                const current = currentVotes.get(teamId) || 0;
                currentVotes.set(teamId, current + count);

                // Create Transaction Log
                await VoteTransaction.create({
                    userId: user._id,
                    teamId: teamId,
                    votes: count,
                    date: effectiveDate // Use effective date
                });
            }
        }

        user.votes = currentVotes;
        user.lastVotedAt = effectiveDate; // Use effective date
        await user.save();

        // Emit real-time update to Admin Dashboard
        if (fastify.io) {
            fastify.io.emit('admin:data-update');
        }

        return { success: true, message: 'Votes Cast Successfully', remainingToday: DAILY_QUOTA - (votesUsedToday + totalNewVotes) };
    });
}

module.exports = votingRoutes;
