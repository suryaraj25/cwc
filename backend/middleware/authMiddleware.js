const fp = require('fastify-plugin');
const User = require('../models/User');
const Admin = require('../models/Admin');

async function authMiddleware(fastify, options) {
    // Auth Decorator for Students
    fastify.decorate("authenticate", async function (request, reply) {
        try {
            const token = request.cookies.cwc_voting_token;
            if (!token) {
                return reply.code(401).send({ success: false, message: 'Unauthorized: No Token' });
            }

            const decoded = fastify.jwt.verify(token);
            const { userId, sessionToken } = decoded;

            const user = await User.findById(userId);

            // If user not found OR session token doesn't match current DB token
            if (!user || user.currentSessionToken !== sessionToken) {
                return reply.code(401).send({ success: false, message: 'Session Expired: Logged in on another device.' });
            }

            // Attach user to request
            request.authUser = user;
        } catch (err) {
            reply.code(401).send({ success: false, message: 'Unauthorized: Invalid Token' });
        }
    });

    // Auth Decorator for Admins
    fastify.decorate("authenticateAdmin", async function (request, reply) {
        try {
            const token = request.cookies.cwc_admin_token;
            if (!token) {
                return reply.code(401).send({ success: false, message: 'Unauthorized: No Admin Token' });
            }

            const decoded = fastify.jwt.verify(token);
            const { adminId, sessionToken } = decoded;

            const admin = await Admin.findOne({ username: adminId });

            if (!admin || admin.currentSessionToken !== sessionToken) {
                return reply.code(401).send({ success: false, message: 'Session Expired: Logged in on another device.' });
            }

            request.authAdmin = admin;
        } catch (err) {
            reply.code(401).send({ success: false, message: 'Unauthorized: Invalid Admin Token' });
        }
    });
}

module.exports = fp(authMiddleware);
