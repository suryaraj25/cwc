const mongoose = require('mongoose');

const voteTransactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    votes: { type: Number, required: true },
    date: { type: Date, default: Date.now },
}, {
    timestamps: true
});

module.exports = mongoose.model('VoteTransaction', voteTransactionSchema);
