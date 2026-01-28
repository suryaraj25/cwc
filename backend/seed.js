const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const bcrypt = require('bcrypt');
require('dotenv').config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected for Seeding');

        const adminPassword = 'server';

        const existing = await Admin.findOne({ username: 'BITADMIN2026' });
        if (existing) {
            console.log('Admin already exists');
        } else {
            // Hash password before storing
            const hashedPassword = await bcrypt.hash(adminPassword, 10);

            await Admin.create({
                username: 'BITADMIN2026',
                passwordHash: hashedPassword
            });

            console.log('Admin created successfully');
            console.log('Username: BITADMIN2026');
            console.log('Password:', adminPassword, '(hashed in DB)');
        }

        mongoose.connection.close();
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedAdmin();

module.exports = { seedAdmin };
