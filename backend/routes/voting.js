const VoteTransaction = require('../models/VoteTransaction');
const Config = require('../models/Config');
const User = require('../models/User');

async function votingRoutes(fastify, options) {

    // Get Voting Config (Public - but enhanced if auth token provided)
    fastify.get('/config', async (request, reply) => {
        let userSpecificData = {};

        // Check for Auth Header manually since this is a public route
        // This allows the frontend to fetch config + user status in one go or separately
        let token = request.headers.authorization?.split(' ')[1];

        // If no header token, check cookie
        if (!token && request.cookies.cwc_voting_token) {
            token = request.cookies.cwc_voting_token;
        }

        if (token) {
            try {
                const decoded = fastify.jwt.verify(token);
                // Fix: Use User model and correct payload field (userId)
                const user = await User.findById(decoded.userId);
                if (user) {
                    const config = await Config.findOne() || new Config();

                    // Determine Active Slot for Quota calculation
                    const now = new Date();
                    const activeSlot = config.slots?.find(slot => {
                        const start = new Date(slot.startTime);
                        const end = new Date(slot.endTime);
                        return now >= start && now <= end;
                    });

                    let startBoundary, endBoundary;
                    if (activeSlot) {
                        // Per-slot quota!
                        startBoundary = new Date(activeSlot.startTime);
                        endBoundary = new Date(activeSlot.endTime);
                    } else {
                        // Daily fallback
                        const effectiveDate = config.currentSessionDate ? new Date(config.currentSessionDate) : new Date();
                        startBoundary = new Date(effectiveDate);
                        startBoundary.setUTCHours(0, 0, 0, 0);
                        endBoundary = new Date(effectiveDate);
                        endBoundary.setUTCHours(23, 59, 59, 999);
                    }

                    const slotTransactions = await VoteTransaction.find({
                        userId: user._id,
                        createdAt: { $gte: startBoundary, $lte: endBoundary }
                    });
                    const votesUsed = slotTransactions.reduce((sum, t) => sum + t.votes, 0);

                    // Calculate per-team usage in this slot/boundary
                    const votesByTeam = {};
                    slotTransactions.forEach(t => {
                        const tid = t.teamId.toString();
                        votesByTeam[tid] = (votesByTeam[tid] || 0) + t.votes;
                    });

                    userSpecificData = {
                        votesUsedToday: votesUsed,
                        remainingToday: (config.dailyQuota || 100) - votesUsed,
                        votesByTeamInSlot: votesByTeam
                    };
                }
            } catch (e) {
                // Ignore invalid token on public route
            }
        }

        const config = await Config.findOne() || new Config();

        // Determine Active Slot or Next Slot
        const now = new Date();
        let activeSlotLabel = "";
        let nextSlot = null;

        if (config.slots && config.slots.length > 0) {
            // Find active slot
            const activeSlot = config.slots.find(slot => {
                const start = new Date(slot.startTime);
                const end = new Date(slot.endTime);
                return now >= start && now <= end;
            });

            if (activeSlot) {
                activeSlotLabel = activeSlot.label || "";
            } else {
                // No active slot, find next one
                const futureSlots = config.slots
                    .filter(slot => new Date(slot.startTime) > now)
                    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

                if (futureSlots.length > 0) {
                    nextSlot = futureSlots[0];
                }
            }
        }

        const isSessionLive = config.isVotingOpen && (config.slots.length === 0 || !!activeSlotLabel);

        return {
            isVotingOpen: config.isVotingOpen,
            isSessionLive,
            startTime: config.startTime,
            endTime: config.endTime,
            dailyQuota: config.dailyQuota || 100,
            currentSessionDate: config.currentSessionDate,
            slots: config.slots || [],
            activeSlotLabel,
            nextSlot,
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

        // 2. Determine Active Slot and Effective Date
        const now = new Date();
        let activeSlot = null;
        if (config.slots && config.slots.length > 0) {
            activeSlot = config.slots.find(slot => {
                const start = new Date(slot.startTime);
                const end = new Date(slot.endTime);
                return now >= start && now <= end;
            });
        }

        let effectiveDate = config.currentSessionDate ? new Date(config.currentSessionDate) : new Date();

        // If slot is active, it overrides currentSessionDate and time window checks
        if (activeSlot) {
            effectiveDate = new Date(activeSlot.date);
        } else if (config.slots && config.slots.length > 0) {
            // If slots exist but none are active, voting is closed
            return reply.code(403).send({ success: false, message: 'Voting is not active for any scheduled slot at this time.' });
        }

        // 3. Time Window Check (Legacy fallback if no slots defined)
        if (!activeSlot && !config.currentSessionDate && config.startTime && config.endTime) {
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

        // 4. Calculate Votes Used in current context (Slot or Day)
        let startBoundary, endBoundary;
        if (activeSlot) {
            startBoundary = new Date(activeSlot.startTime);
            endBoundary = new Date(activeSlot.endTime);
        } else {
            const effectiveDate = config.currentSessionDate ? new Date(config.currentSessionDate) : new Date();
            startBoundary = new Date(effectiveDate);
            startBoundary.setUTCHours(0, 0, 0, 0);
            endBoundary = new Date(effectiveDate);
            endBoundary.setUTCHours(23, 59, 59, 999);
        }

        const slotTransactions = await VoteTransaction.find({
            userId: user._id,
            createdAt: { $gte: startBoundary, $lte: endBoundary }
        });

        const votesUsedToday = slotTransactions.reduce((sum, t) => sum + t.votes, 0);
        const totalNewVotes = Object.values(votes).reduce((a, b) => a + b, 0);

        if (totalNewVotes === 0) {
            return reply.code(400).send({ success: false, message: `You must cast at least one vote.` });
        }

        // 4.1 Check Per-Team Limit (max 15)
        for (const [teamId, count] of Object.entries(votes)) {
            if (count > 0) {
                const teamVotesInSlot = slotTransactions
                    .filter(t => t.teamId.toString() === teamId)
                    .reduce((sum, t) => sum + t.votes, 0);

                if (teamVotesInSlot + count > 15) {
                    return reply.code(400).send({
                        success: false,
                        message: `Max 15 votes per team allowed. You have already cast ${teamVotesInSlot} votes for this team.`
                    });
                }
            }
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
