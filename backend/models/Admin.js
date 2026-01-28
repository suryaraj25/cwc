const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true }, // Plain text for this demo as per requirements
    role: { type: String, default: 'ADMIN' },
    currentSessionToken: { type: String }
}, {
    timestamps: true
});

module.exports = mongoose.model('Admin', adminSchema);
