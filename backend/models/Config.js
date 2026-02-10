const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
    isVotingOpen: { type: Boolean, default: false },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    currentSessionDate: { type: Date, default: null }, // If set, overrides actual date for voting
    dailyQuota: { type: Number, default: 100 },
    slots: [{
        date: { type: Date, required: true }, // The logical date for the session
        startTime: { type: Date, required: true }, // Actual start time
        endTime: { type: Date, required: true }, // Actual end time
        label: { type: String } // Optional label like "Day 1 - slot 1"
    }]
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

module.exports = mongoose.model('Config', configSchema);
