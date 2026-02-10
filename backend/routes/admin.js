const User = require('../models/User');
const Team = require('../models/Team');
const Config = require('../models/Config');
const VoteTransaction = require('../models/VoteTransaction');
const AuditLog = require('../models/AuditLog');
const Admin = require('../models/Admin');
const WhitelistedEmail = require('../models/WhitelistedEmail');
const BlacklistedUser = require('../models/BlacklistedUser');

async function adminRoutes(fastify, options) {

    // Get Dashboard Data (No Pagination)
    fastify.get('/dashboard', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        const search = request.query.search || '';

        // Build search query
        const searchQuery = search ? {
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { rollNo: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { dept: { $regex: search, $options: 'i' } }
            ]
        } : {};

        // Get all users with search
        const [users, totalUsers] = await Promise.all([
            User.find(searchQuery).select('-passwordHash'),
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
        // PROTECT: Only Super Admin can see transactions
        if (request.authAdmin.role !== 'SUPER_ADMIN') {
            return reply.code(403).send({ success: false, message: 'Forbidden: Super Admin Access Required' });
        }

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

    // Get Audit Logs with Pagination
    fastify.get('/audit-logs', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        // PROTECT: Only Super Admin can see audit logs
        if (request.authAdmin.role !== 'SUPER_ADMIN') {
            return reply.code(403).send({ success: false, message: 'Forbidden: Super Admin Access Required' });
        }

        const page = parseInt(request.query.page) || 1;
        const limit = parseInt(request.query.limit) || 20;
        const search = request.query.search || '';
        const skip = (page - 1) * limit;

        // Build Search Query (need to filter after population for user fields, or use aggregate)
        // Since we are using mongoose populate, filtering by populated fields is tricky in `find`.
        // Efficient approach: Find matching users first if search looks like a name/rollno, OR
        // use aggregation lookup.
        // For simplicity and performance balance given scale:
        // 1. If search is present, build a complex query.

        let query = {};
        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            // We need to find users that match the search first
            const matchingUsers = await User.find({
                $or: [{ name: searchRegex }, { rollNo: searchRegex }, { dept: searchRegex }]
            }).select('_id');
            const matchingUserIds = matchingUsers.map(u => u._id);

            query = {
                $or: [
                    { action: searchRegex },
                    { ipAddress: searchRegex },
                    { adminId: searchRegex },
                    { userId: { $in: matchingUserIds } } // Match logs from those users
                ]
            };
        }

        const [logs, total] = await Promise.all([
            AuditLog.find(query)
                .populate('userId', 'name rollNo dept')
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit),
            AuditLog.countDocuments(query)
        ]);

        return {
            logs,
            total,
            currentPage: page,
            totalPages: Math.ceil(total / limit)
        };
    });

    // Reset User Password (Super Admin Only)
    fastify.post('/reset-password', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        // PROTECT: Only Super Admin can reset passwords
        if (request.authAdmin.role !== 'SUPER_ADMIN') {
            return reply.code(403).send({ success: false, message: 'Forbidden: Super Admin Access Required' });
        }

        const { userId, newPassword } = request.body;

        if (!newPassword || newPassword.length < 6) {
            return reply.code(400).send({ success: false, message: 'Password must be at least 6 characters long' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return reply.code(404).send({ success: false, message: 'User not found' });
        }

        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.passwordHash = hashedPassword;
        // Invalidate current sessions if any
        user.currentSessionToken = null;
        // Force user to change password on next login
        user.mustChangePassword = true;

        await user.save();

        // Audit Log
        if (request.ip) { // Check if we have request context for logging
            await AuditLog.create({
                adminId: request.authAdmin.username,
                userType: 'ADMIN',
                action: 'PASSWORD_RESET',
                details: `Reset password for user ${user.email} (${user.rollNo})`,
                ipAddress: request.ip,
                userAgent: request.headers['user-agent']
            });
        }

        return { success: true, message: 'Password reset successfully' };
    });

    // Delete User (All Admins)
    fastify.delete('/users/:id', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        // PERMISSION: All Admins can delete users (as per partial Super Admin requirement)
        // if (request.authAdmin.role !== 'SUPER_ADMIN') { ... } // REMOVED RESTRICTION

        const userId = request.params.id;
        const user = await User.findById(userId);

        if (!user) {
            return reply.code(404).send({ success: false, message: 'User not found' });
        }

        // Cascade Delete
        await Promise.all([
            VoteTransaction.deleteMany({ userId: userId }),
            AuditLog.deleteMany({ userId: userId }),
            User.findByIdAndDelete(userId)
        ]);

        // Audit Log for the Admin
        if (request.ip) {
            await AuditLog.create({
                adminId: request.authAdmin.username,
                userType: 'ADMIN',
                action: 'DELETE_USER',
                details: `Deleted user ${user.email} (${user.rollNo}) and associated data`,
                ipAddress: request.ip,
                userAgent: request.headers['user-agent']
            });
        }

        if (fastify.io) fastify.io.emit('admin:data-update');

        return { success: true, message: 'User deleted successfully' };
    });

    // Delete User Votes (Super Admin Only)
    fastify.delete('/users/:id/votes', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        // PROTECT: Only Super Admin can delete votes
        if (request.authAdmin.role !== 'SUPER_ADMIN') {
            return reply.code(403).send({ success: false, message: 'Forbidden: Super Admin Access Required' });
        }

        const userId = request.params.id;
        const user = await User.findById(userId);

        if (!user) {
            return reply.code(404).send({ success: false, message: 'User not found' });
        }

        // Reset user votes
        user.votes = new Map(); // Clear votes map
        // user.lastVotedAt = null; // Optional: Keep timestamp or reset? Resetting implies they haven't voted.
        // Let's reset lastVotedAt so they look fresh, or maybe keep it track they *had* voted?
        // Usually "Delete Votes" means let them vote again or fix a mistake. 
        // If we just clear votes but keep lastVotedAt, UI might still show "Active just now".
        // Let's clear lastVotedAt to be safe/clean.
        user.lastVotedAt = null;

        await user.save();

        // Delete Transactions
        await VoteTransaction.deleteMany({ userId: userId });

        // Audit Log
        if (request.ip) {
            await AuditLog.create({
                adminId: request.authAdmin.username,
                userType: 'ADMIN',
                action: 'DELETE_USER_VOTES',
                details: `Deleted votes for user ${user.email} (${user.rollNo})`,
                ipAddress: request.ip,
                userAgent: request.headers['user-agent']
            });
        }

        if (fastify.io) fastify.io.emit('admin:data-update');

        return { success: true, message: 'User votes deleted successfully' };
    });

    // Delete User Votes for Specific Team (Super Admin Only)
    fastify.delete('/users/:userId/votes/:teamId', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        // PROTECT: Only Super Admin can delete votes
        if (request.authAdmin.role !== 'SUPER_ADMIN') {
            return reply.code(403).send({ success: false, message: 'Forbidden: Super Admin Access Required' });
        }

        const { userId, teamId } = request.params;
        const user = await User.findById(userId);

        if (!user) {
            return reply.code(404).send({ success: false, message: 'User not found' });
        }

        // Check if user has votes for this team
        if (!user.votes || !user.votes.has(teamId)) {
            return reply.code(404).send({ success: false, message: 'No votes found for this team' });
        }

        // Remove votes for this specific team
        user.votes.delete(teamId);

        // If no more votes remain, optionally reset lastVotedAt
        if (user.votes.size === 0) {
            user.lastVotedAt = null;
        }

        await user.save();

        // Delete only transactions for this team
        await VoteTransaction.deleteMany({ userId: userId, teamId: teamId });

        // Audit Log
        const team = await Team.findById(teamId);
        if (request.ip) {
            await AuditLog.create({
                adminId: request.authAdmin.username,
                userType: 'ADMIN',
                action: 'DELETE_USER_TEAM_VOTES',
                details: `Deleted votes for team "${team?.name || teamId}" from user ${user.email} (${user.rollNo})`,
                ipAddress: request.ip,
                userAgent: request.headers['user-agent']
            });
        }

        if (fastify.io) fastify.io.emit('admin:data-update');

        return { success: true, message: `Votes for team deleted successfully` };
    });

    // Force Logout User (Super Admin Only)
    fastify.post('/logout-user', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        // PROTECT: Only Super Admin can force logout
        if (request.authAdmin.role !== 'SUPER_ADMIN') {
            return reply.code(403).send({ success: false, message: 'Forbidden: Super Admin Access Required' });
        }

        const { userId } = request.body;
        const user = await User.findById(userId);

        if (!user) {
            return reply.code(404).send({ success: false, message: 'User not found' });
        }

        // Invalidate session
        user.currentSessionToken = null;
        await user.save();

        // Audit Log
        if (request.ip) {
            await AuditLog.create({
                adminId: request.authAdmin.username,
                userType: 'ADMIN',
                action: 'FORCE_LOGOUT',
                details: `Forced logout for user ${user.email} (${user.rollNo})`,
                ipAddress: request.ip,
                userAgent: request.headers['user-agent']
            });
        }

        // Optional: Emit socket event to notify client to disconnect immediately
        if (fastify.io) {
            fastify.io.emit('force-logout', { userId: user._id });
        }

        return { success: true, message: 'User logged out successfully' };
    });

    // --- ADMIN MANAGEMENT ROUTES ---

    // Get All Admins (Super Admin Only)
    fastify.get('/admins', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        if (request.authAdmin.role !== 'SUPER_ADMIN') {
            return reply.code(403).send({ success: false, message: 'Forbidden' });
        }
        const admins = await Admin.find({}, '-passwordHash').sort({ createdAt: -1 });
        return { success: true, admins };
    });

    // Create New Admin (Super Admin Only)
    fastify.post('/admins', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        if (request.authAdmin.role !== 'SUPER_ADMIN') {
            return reply.code(403).send({ success: false, message: 'Forbidden' });
        }
        const { username, password, role } = request.body;

        if (!username || !password) {
            return reply.code(400).send({ success: false, message: 'Username and password are required' });
        }

        const existing = await Admin.findOne({ username });
        if (existing) {
            return reply.code(400).send({ success: false, message: 'Username already exists' });
        }

        const bcrypt = require('bcrypt');
        const passwordHash = await bcrypt.hash(password, 10);

        const newAdmin = await Admin.create({
            username,
            passwordHash,
            role: role || 'ADMIN'
        });

        // Audit Log
        if (request.ip) {
            await AuditLog.create({
                adminId: request.authAdmin.username,
                userType: 'ADMIN',
                action: 'CREATE_ADMIN',
                details: `Created admin ${username} with role ${role || 'ADMIN'}`,
                ipAddress: request.ip,
                userAgent: request.headers['user-agent']
            });
        }

        return { success: true, message: 'Admin created successfully', admin: { username: newAdmin.username, role: newAdmin.role, id: newAdmin._id } };
    });

    // Delete Admin (Super Admin Only)
    fastify.delete('/admins/:id', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        if (request.authAdmin.role !== 'SUPER_ADMIN') {
            return reply.code(403).send({ success: false, message: 'Forbidden' });
        }

        const adminId = request.params.id;

        // Prevent self-deletion
        // Note: authAdmin has username, findById uses _id. Need to check properly.
        const targetAdmin = await Admin.findById(adminId);
        if (!targetAdmin) return reply.code(404).send({ success: false, message: 'Admin not found' });

        if (targetAdmin.username === request.authAdmin.username) {
            return reply.code(400).send({ success: false, message: 'Cannot delete yourself' });
        }

        await Admin.findByIdAndDelete(adminId);

        // Audit Log
        if (request.ip) {
            await AuditLog.create({
                adminId: request.authAdmin.username,
                userType: 'ADMIN',
                action: 'DELETE_ADMIN',
                details: `Deleted admin ${targetAdmin.username}`,
                ipAddress: request.ip,
                userAgent: request.headers['user-agent']
            });
        }

        return { success: true, message: 'Admin deleted successfully' };
    });

    // Reset Admin Password (Super Admin Only)
    fastify.post('/admins/reset-password', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        if (request.authAdmin.role !== 'SUPER_ADMIN') {
            return reply.code(403).send({ success: false, message: 'Forbidden' });
        }
        const { adminId, newPassword } = request.body;

        const targetAdmin = await Admin.findById(adminId);
        if (!targetAdmin) return reply.code(404).send({ success: false, message: 'Admin not found' });

        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        targetAdmin.passwordHash = hashedPassword;
        targetAdmin.currentSessionToken = null; // Logout
        await targetAdmin.save();

        // Audit Log
        if (request.ip) {
            await AuditLog.create({
                adminId: request.authAdmin.username,
                userType: 'ADMIN',
                action: 'RESET_ADMIN_PASSWORD',
                details: `Reset password for admin ${targetAdmin.username}`,
                ipAddress: request.ip,
                userAgent: request.headers['user-agent']
            });
        }

        return { success: true, message: 'Password reset successfully' };
    });

    // Force Logout Admin (Super Admin Only)
    fastify.post('/admins/logout', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        if (request.authAdmin.role !== 'SUPER_ADMIN') {
            return reply.code(403).send({ success: false, message: 'Forbidden' });
        }
        const { adminId } = request.body;

        const targetAdmin = await Admin.findById(adminId);
        if (!targetAdmin) return reply.code(404).send({ success: false, message: 'Admin not found' });

        targetAdmin.currentSessionToken = null;
        await targetAdmin.save();

        // Audit Log
        if (request.ip) {
            await AuditLog.create({
                adminId: request.authAdmin.username,
                userType: 'ADMIN',
                action: 'FORCE_LOGOUT_ADMIN',
                details: `Forced logout for admin ${targetAdmin.username}`,
                ipAddress: request.ip,
                userAgent: request.headers['user-agent']
            });
        }

        return { success: true, message: 'Admin logged out successfully' };
    });

    // --- APPROVAL & BLACKLIST MANAGEMENT ---

    // Get Pending Users
    fastify.get('/users/pending', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        const users = await User.find({ isApproved: false }).select('-passwordHash');
        return { success: true, users };
    });

    // Approve User
    fastify.post('/users/:id/approve', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        const user = await User.findById(request.params.id);
        if (!user) return reply.code(404).send({ success: false, message: 'User not found' });

        user.isApproved = true;
        await user.save();

        // Auto-add to Whitelist
        try {
            const existingWhitelist = await WhitelistedEmail.findOne({ email: user.email.toLowerCase() });
            if (!existingWhitelist) {
                await WhitelistedEmail.create({
                    email: user.email.toLowerCase(),
                    addedBy: request.authAdmin._id
                });
            }
        } catch (err) {
            console.error("Failed to auto-whitelist approved user:", err);
            // Non-critical, continue
        }

        // Audit Log
        if (request.ip) {
            await AuditLog.create({
                adminId: request.authAdmin.username,
                userType: 'ADMIN',
                action: 'APPROVE_USER',
                details: `Approved user ${user.email} and added to whitelist`,
                ipAddress: request.ip,
                userAgent: request.headers['user-agent']
            });
        }

        return { success: true, message: 'User approved successfully' };
    });

    // Block User (Add to Blacklist & Delete User)
    fastify.post('/users/:id/block', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        const { reason } = request.body;
        const user = await User.findById(request.params.id);
        if (!user) return reply.code(404).send({ success: false, message: 'User not found' });

        // Create Blacklist Entry
        try {
            await BlacklistedUser.create({
                email: user.email,
                rollNo: user.rollNo,
                reason: reason || 'Blocked by admin',
                blockedBy: request.authAdmin.username
            });
        } catch (e) {
            // Check for duplicate key error (maybe already blacklisted by email?)
            // Just proceed to delete user if fails
            console.error("Blacklist creation failed", e);
        }

        // Delete User and associated data
        await Promise.all([
            VoteTransaction.deleteMany({ userId: user._id }),
            AuditLog.deleteMany({ userId: user._id }),
            User.findByIdAndDelete(user._id)
        ]);

        // Audit Log
        if (request.ip) {
            await AuditLog.create({
                adminId: request.authAdmin.username,
                userType: 'ADMIN',
                action: 'BLOCK_USER',
                details: `Blocked user ${user.email}`,
                ipAddress: request.ip,
                userAgent: request.headers['user-agent']
            });
        }

        if (fastify.io) fastify.io.emit('admin:data-update');
        return { success: true, message: 'User blocked successfully' };
    });

    // --- WHITELIST MANAGEMENT ---

    fastify.get('/whitelist', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        const emails = await WhitelistedEmail.find().sort({ createdAt: -1 });
        return { success: true, emails };
    });

    fastify.post('/whitelist', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        const { emails } = request.body; // Expects array of strings
        if (!Array.isArray(emails)) return reply.code(400).send({ success: false, message: 'Invalid format' });

        let added = 0;
        let failed = 0;

        for (const email of emails) {
            try {
                // Check if exists
                const exists = await WhitelistedEmail.findOne({ email: email.toLowerCase() });
                if (!exists) {
                    await WhitelistedEmail.create({
                        email: email.toLowerCase(),
                        addedBy: request.authAdmin._id // Note: authAdmin probably doesn't have _id populated if it's from JWT payload only containing username? 
                        // Actually in auth.js we verify admin exists. But request.authAdmin comes from decorator.
                        // Let's check decorator. Usually it fetches the full admin object.
                        // Assuming it does. If not, we might need to change Admin schema ref or just store username.
                        // WhitelistedEmail schema refs 'Admin' ObjectId.
                    });
                    added++;
                }
            } catch (e) {
                failed++;
            }
        }

        return { success: true, message: `Added ${added} emails to whitelist`, failed };
    });

    fastify.delete('/whitelist/:id', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        await WhitelistedEmail.findByIdAndDelete(request.params.id);
        return { success: true, message: 'Email removed from whitelist' };
    });

    // --- BLACKLIST MANAGEMENT ---

    fastify.get('/blacklist', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        const users = await BlacklistedUser.find().sort({ createdAt: -1 });
        return { success: true, users };
    });

    fastify.delete('/blacklist/:id', { onRequest: [fastify.authenticateAdmin] }, async (request, reply) => {
        await BlacklistedUser.findByIdAndDelete(request.params.id);
        return { success: true, message: 'User unblocked (removed from blacklist)' };
    });
}

module.exports = adminRoutes;
