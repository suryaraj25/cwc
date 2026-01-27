const Team = require('../models/Team');

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
        return team;
    });

    // Update Team
    fastify.put('/:id', async (request, reply) => {
        const team = await Team.findByIdAndUpdate(request.params.id, request.body, { new: true });
        return team;
    });

    // Delete Team
    fastify.delete('/:id', async (request, reply) => {
        await Team.findByIdAndDelete(request.params.id);
        return { success: true };
    });
}

module.exports = teamRoutes;
