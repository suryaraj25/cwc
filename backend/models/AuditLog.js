const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // Can be null if admin or unknown
    adminId: { type: String, required: false }, // Store username for admins
    userType: { type: String, enum: ['USER', 'ADMIN'], required: true },
    action: { type: String, required: true }, // LOGIN, LOGOUT
    ipAddress: { type: String },
    userAgent: { type: String },
    details: { type: Object }, // Any extra info
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
