const mongoose = require('mongoose');
const Admin = require('./models/Admin');
require('dotenv').config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected for Seeding');

        const adminDetails = {
            username: 'BITADMIN2026',
            passwordHash: 'cwc2026'
        };

        const existing = await Admin.findOne({ username: adminDetails.username });
        if (existing) {
            console.log('Admin already exists');
        } else {
            await Admin.create(adminDetails);
            console.log('Admin created successfully');
            console.log('Username:', adminDetails.username);
            console.log('Password:', adminDetails.passwordHash);
        }

        mongoose.connection.close();
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedAdmin();

module.exports = { seedAdmin };
