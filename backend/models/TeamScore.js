const mongoose = require('mongoose');

const teamScoreSchema = new mongoose.Schema({
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true
    },
    score: {
        type: Number,
        required: true,
        default: 0
    },
    date: {
        type: Date,
        required: true
    },
    enteredBy: {
        type: String,
        required: true // Admin username
    },
    notes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Compound index for unique daily scores per team
teamScoreSchema.index({ teamId: 1, date: 1 }, { unique: false });

module.exports = mongoose.model('TeamScore', teamScoreSchema);
