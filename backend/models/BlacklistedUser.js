const mongoose = require('mongoose');

const blacklistedUserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    rollNo: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    reason: {
        type: String,
        default: 'Violation of rules'
    },
    blockedBy: {
        type: String, // Admin username
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('BlacklistedUser', blacklistedUserSchema);
