const User = require('../models/User');
const Config = require('../models/Config');

async function votingRoutes(fastify, options) {

    fastify.post('/cast', async (request, reply) => {
        const { userId, votes } = request.body; // votes: { teamId: count }

        const config = await Config.findOne() || new Config();

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

        const user = await User.findById(userId);
        if (!user) return reply.code(404).send({ success: false, message: 'User not found.' });

        // 3. Check Daily Vote
        if (user.lastVotedAt) {
            const lastDate = new Date(user.lastVotedAt).toDateString();
            const todayDate = new Date().toDateString();
            if (lastDate === todayDate) {
                return reply.code(403).send({ success: false, message: 'You have already utilized your voting chance for today.' });
            }
        }

        // 4. Validate Quota
        const totalNewVotes = Object.values(votes).reduce((a, b) => a + b, 0);
        if (totalNewVotes > config.dailyQuota) {
            return reply.code(400).send({ success: false, message: `Cannot exceed ${config.dailyQuota} votes per day.` });
        }
        if (totalNewVotes === 0) {
            return reply.code(400).send({ success: false, message: `You must cast at least one vote.` });
        }

        // 5. Update Votes
        // We need to merge votes manually since it's a Map in Mongoose
        const currentVotes = user.votes || new Map();

        for (const [teamId, count] of Object.entries(votes)) {
            const current = currentVotes.get(teamId) || 0;
            currentVotes.set(teamId, current + count);
        }

        user.votes = currentVotes;
        user.lastVotedAt = new Date();
        await user.save();

        return { success: true, message: 'Votes confirmed and locked successfully.' };
    });
}

module.exports = votingRoutes;
