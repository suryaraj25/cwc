const Team = require('../models/Team');
const User = require('../models/User');
const VoteTransaction = require('../models/VoteTransaction');

async function teamRoutes(fastify, options) {

    // Get All Teams
    fastify.get('/', async (request, reply) => {
        const teams = await Team.find();
        return teams;
    });

    // Add Team
    fastify.post('/', async (request, reply) => {
        const team = new Team(request.body);
        await team.save();
        if (fastify.io) fastify.io.emit('admin:data-update');
        return team;
    });

    // Update Team
    fastify.put('/:id', async (request, reply) => {
        const team = await Team.findByIdAndUpdate(request.params.id, request.body, { new: true });
        if (fastify.io) fastify.io.emit('admin:data-update');
        return team;
    });

    // Delete Team (Cascade: removes votes for this team from all users)
    fastify.delete('/:id', async (request, reply) => {
        const teamId = request.params.id;

        // 1. Delete team document
        await Team.findByIdAndDelete(teamId);

        // 2. Delete all vote transactions for this team
        await VoteTransaction.deleteMany({ teamId: teamId });

        // 3. Remove this team's votes from all users
        const usersWithVotes = await User.find({ [`votes.${teamId}`]: { $exists: true } });
        for (const user of usersWithVotes) {
            user.votes.delete(teamId);
            // If no more votes, reset lastVotedAt
            if (user.votes.size === 0) {
                user.lastVotedAt = null;
            }
            await user.save();
        }

        if (fastify.io) fastify.io.emit('admin:data-update');
        return { success: true, message: 'Team deleted and user votes cleared' };
    });
}

module.exports = teamRoutes;
