const VoteTransaction = require('../models/VoteTransaction');
const Config = require('../models/Config');

async function votingRoutes(fastify, options) {

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

        // 2. Check Time Window
        if (config.startTime && config.endTime) {
            const now = new Date();
            if (now < config.startTime || now > config.endTime) {
                return reply.code(403).send({ success: false, message: 'Voting is only allowed between the scheduled times.' });
            }
        }

        // 3. Calculate Votes Used Today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const todayTransactions = await VoteTransaction.find({
            userId: user._id,
            createdAt: { $gte: startOfDay }
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

        // 4. Record Transactions & Update User
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
                    date: new Date()
                });
            }
        }

        user.votes = currentVotes;
        user.lastVotedAt = new Date();
        await user.save();

        // Emit real-time update to Admin Dashboard
        if (fastify.io) {
            fastify.io.emit('admin:data-update');
        }

        return { success: true, message: 'Votes Cast Successfully', remainingToday: DAILY_QUOTA - (votesUsedToday + totalNewVotes) };
    });
}

module.exports = votingRoutes;
