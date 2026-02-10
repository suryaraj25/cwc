const Team = require('../models/Team');
const TeamScore = require('../models/TeamScore');
const AuditLog = require('../models/AuditLog');
const VoteTransaction = require('../models/VoteTransaction');

async function leaderboardRoutes(fastify, options) {

    // Get Leaderboard (Public - all roles can view)
    fastify.get('/', async (request, reply) => {
        const teams = await Team.find();

        // Get latest score for each team
        const leaderboardData = await Promise.all(
            teams.map(async (team) => {
                const latestScore = await TeamScore.findOne({ teamId: team._id })
                    .sort({ date: -1 })
                    .lean();

                const totalScore = await TeamScore.aggregate([
                    { $match: { teamId: team._id } },
                    { $group: { _id: null, total: { $sum: '$score' } } }
                ]);

                const studentVotes = await VoteTransaction.aggregate([
                    { $match: { teamId: team._id } },
                    { $group: { _id: null, total: { $sum: '$votes' } } }
                ]);

                const totalStudentVotes = studentVotes[0]?.total || 0;

                return {
                    id: team.id,
                    name: team.name,
                    description: team.description,
                    imageUrl: team.imageUrl,
                    totalScore: (totalScore[0]?.total || 0) + totalStudentVotes,
                    lastScore: latestScore?.score || 0,
                    lastUpdated: latestScore?.date || null
                };
            })
        );

        // Sort by total score descending
        const sorted = leaderboardData.sort((a, b) => b.totalScore - a.totalScore);

        // Add rank
        const withRank = sorted.map((team, index) => ({
            ...team,
            rank: index + 1
        }));

        return {
            success: true,
            leaderboard: withRank,
            updatedAt: new Date()
        };
    });

    // Get Leaderboard for a Specific Date Range (Public)
    fastify.get('/range', async (request, reply) => {
        const { startDate, endDate } = request.query;

        let dateQuery = {};
        if (startDate) dateQuery.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setUTCHours(23, 59, 59, 999);
            dateQuery.$lte = end;
        }

        const teams = await Team.find();

        const leaderboardData = await Promise.all(
            teams.map(async (team) => {
                const totalScore = await TeamScore.aggregate([
                    {
                        $match: {
                            teamId: team._id,
                            ...(Object.keys(dateQuery).length > 0 && { date: dateQuery })
                        }
                    },
                    { $group: { _id: null, total: { $sum: '$score' } } }
                ]);

                const studentVotes = await VoteTransaction.aggregate([
                    {
                        $match: {
                            teamId: team._id,
                            ...(Object.keys(dateQuery).length > 0 && { date: dateQuery })
                        }
                    },
                    { $group: { _id: null, total: { $sum: '$votes' } } }
                ]);

                const totalStudentVotes = studentVotes[0]?.total || 0;

                return {
                    id: team.id,
                    name: team.name,
                    description: team.description,
                    imageUrl: team.imageUrl,
                    totalScore: (totalScore[0]?.total || 0) + totalStudentVotes
                };
            })
        );

        const sorted = leaderboardData.sort((a, b) => b.totalScore - a.totalScore);
        const withRank = sorted.map((team, index) => ({
            ...team,
            rank: index + 1
        }));

        return {
            success: true,
            leaderboard: withRank,
            dateRange: { startDate, endDate }
        };
    });

    // Get Daily Leaderboard (Scores from a specific date only)
    fastify.get('/daily', async (request, reply) => {
        const { date } = request.query;
        const targetDate = date ? new Date(date) : new Date();

        const startOfDay = new Date(targetDate);
        startOfDay.setUTCHours(0, 0, 0, 0);

        const endOfDay = new Date(targetDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        console.log("startOfDay", startOfDay)
        console.log("endOfDay", endOfDay)

        const teams = await Team.find();

        const leaderboardData = await Promise.all(
            teams.map(async (team) => {
                const score = await TeamScore.findOne({
                    teamId: team._id,
                    date: { $gte: startOfDay, $lte: endOfDay }
                }).lean();

                // Aggregate student votes for this specific day
                const studentVotes = await VoteTransaction.aggregate([
                    {
                        $match: {
                            teamId: team._id,
                            date: { $gte: startOfDay, $lte: endOfDay }
                        }
                    },
                    { $group: { _id: null, total: { $sum: '$votes' } } }
                ]);

                const totalStudentVotes = studentVotes[0]?.total || 0;

                return {
                    id: team.id,
                    name: team.name,
                    description: team.description,
                    imageUrl: team.imageUrl,
                    score: (score?.score || 0) + totalStudentVotes,
                    advantage: score?.advantage || 0,
                    main: score?.main || 0,
                    special: score?.special || 0,
                    elimination: score?.elimination || 0,
                    immunity: score?.immunity || 0,
                    studentVotes: totalStudentVotes, // Expose student votes separately
                    scoreId: score?._id ? score._id.toString() : null,
                    enteredBy: score?.enteredBy || null,
                    notes: score?.notes || ''
                };
            })
        );

        const sorted = leaderboardData.sort((a, b) => b.score - a.score);
        const withRank = sorted.map((team, index) => ({
            ...team,
            rank: index + 1
        }));

        return {
            success: true,
            date: targetDate.toISOString().split('T')[0],
            leaderboard: withRank
        };
    });

    // Admin: Enter/Update Team Score (Admin Only)
    fastify.post('/scores', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        const { teamId, advantage, main, special, elimination, immunity, date, notes } = request.body;

        if (!teamId) {
            return reply.code(400).send({ success: false, message: 'teamId is required' });
        }

        const adv = advantage || 0;
        const mn = main || 0;
        const sp = special || 0;
        const el = elimination || 0;
        const im = immunity || 0;
        const totalScore = adv + mn + sp + el + im;

        const team = await Team.findById(teamId);
        if (!team) {
            return reply.code(404).send({ success: false, message: 'Team not found' });
        }

        const scoreDate = date ? new Date(date) : new Date();
        scoreDate.setUTCHours(0, 0, 0, 0);

        // Check if score already exists for this team on this date
        const existing = await TeamScore.findOne({
            teamId: teamId,
            date: {
                $gte: scoreDate,
                $lt: new Date(scoreDate.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        let teamScore;
        if (existing) {
            // Update existing
            existing.score = totalScore;
            existing.advantage = adv;
            existing.main = mn;
            existing.special = sp;
            existing.elimination = el;
            existing.immunity = im;
            existing.notes = notes || '';
            existing.enteredBy = request.authAdmin.username;
            await existing.save();
            teamScore = existing;
        } else {
            // Create new
            teamScore = await TeamScore.create({
                teamId,
                score: totalScore,
                advantage: adv,
                main: mn,
                special: sp,
                elimination: el,
                immunity: im,
                date: scoreDate,
                enteredBy: request.authAdmin.username,
                notes: notes || ''
            });
        }

        // Audit Log
        if (request.ip) {
            await AuditLog.create({
                adminId: request.authAdmin.username,
                userType: 'ADMIN',
                action: 'UPDATE_TEAM_SCORE',
                details: `Updated score for team "${team.name}" to ${totalScore}`,
                ipAddress: request.ip,
                userAgent: request.headers['user-agent']
            });
        }

        // Emit real-time update
        if (fastify.io) {
            fastify.io.emit('leaderboard:update');
        }

        return {
            success: true,
            message: existing ? 'Score updated successfully' : 'Score added successfully',
            teamScore
        };
    });

    // Admin: Get All Scores with Filters
    fastify.get('/scores', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        const { teamId, startDate, endDate, page = 1, limit = 20 } = request.query;

        let query = {};
        if (teamId) query.teamId = teamId;

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setUTCHours(23, 59, 59, 999);
                query.date.$lte = end;
            }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [scores, total] = await Promise.all([
            TeamScore.find(query)
                .populate('teamId', 'name description')
                .sort({ date: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            TeamScore.countDocuments(query)
        ]);

        return {
            success: true,
            scores,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        };
    });

    // Admin: Delete Score
    fastify.delete('/scores/:scoreId', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        const { scoreId } = request.params;

        const score = await TeamScore.findById(scoreId);
        if (!score) {
            return reply.code(404).send({ success: false, message: 'Score not found' });
        }

        const team = await Team.findById(score.teamId);
        await TeamScore.findByIdAndDelete(scoreId);

        // Audit Log
        if (request.ip) {
            await AuditLog.create({
                adminId: request.authAdmin.username,
                userType: 'ADMIN',
                action: 'DELETE_TEAM_SCORE',
                details: `Deleted score for team "${team?.name}" dated ${score.date.toISOString().split('T')[0]}`,
                ipAddress: request.ip,
                userAgent: request.headers['user-agent']
            });
        }

        if (fastify.io) {
            fastify.io.emit('leaderboard:update');
        }

        return { success: true, message: 'Score deleted successfully' };
    });

    // Admin: Get Summary of Scores Per Team
    fastify.get('/scores-summary', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        const teams = await Team.find();

        const summary = await Promise.all(
            teams.map(async (team) => {
                const scores = await TeamScore.find({ teamId: team._id });
                const teamScoreTotal = scores.reduce((sum, s) => sum + s.score, 0);

                // Aggregate student votes
                const studentVotes = await VoteTransaction.aggregate([
                    { $match: { teamId: team._id } },
                    { $group: { _id: null, total: { $sum: '$votes' } } }
                ]);
                const totalStudentVotes = studentVotes[0]?.total || 0;

                const latestScore = scores.sort((a, b) => new Date(b.date) - new Date(a.date))[0];

                return {
                    teamId: team.id,
                    teamName: team.name,
                    totalScore: teamScoreTotal + totalStudentVotes,
                    adminScore: teamScoreTotal,
                    studentVotes: totalStudentVotes,
                    scoreCount: scores.length,
                    lastUpdated: latestScore?.date || null,
                    lastScore: latestScore?.score || 0
                };
            })
        );

        // Sort by total score
        const sorted = summary.sort((a, b) => b.totalScore - a.totalScore);
        const withRank = sorted.map((item, index) => ({
            ...item,
            rank: index + 1
        }));

        return {
            success: true,
            summary: withRank
        };
    });
}

module.exports = leaderboardRoutes;
