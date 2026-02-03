const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    rollNo: { type: String, required: true, unique: true },
    dept: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    year: { type: String, required: true },
    passwordHash: { type: String, required: true },
    boundDeviceId: { type: String, default: null }, // Kept for legacy/audit, though logic removed
    currentSessionToken: { type: String, default: null }, // For Single Session Enforcement
    mustChangePassword: { type: Boolean, default: false }, // Set to true when admin resets password
    votes: {
        type: Map,
        of: Number,
        default: {}
    },
    lastVotedAt: { type: Date }
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
        }
    }
});

module.exports = mongoose.model('User', userSchema);
