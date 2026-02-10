const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
const ADMIN_TOKEN = 'mock-admin-token'; // Adjust if you have a real token or login first

async function testAuth() {
    console.log("--- STARTING VERIFICATION ---")

    // 1. Register Pending User
    const pendingUser = {
        name: "Pending User",
        rollNo: "PEND001",
        email: "pending@test.com",
        dept: "CSE",
        phone: "1234567890",
        gender: "Male",
        year: "1",
        passwordHash: "password"
    };

    try {
        console.log("\n1. Registering Pending User...");
        const res = await axios.post(`${API_URL}/auth/register`, pendingUser);
        console.log("Response:", res.data);
        if (res.data.status === 'PENDING') console.log("✅ Correctly marked as PENDING");
        else console.error("❌ Failed: Expected PENDING status");
    } catch (e) {
        console.error("Error registering pending:", e.response?.data || e.message);
    }

    // 2. Register Whitelisted User (Need Admin to whitelist first)
    // Skipped for script simplicity unless we login as admin first.

    // 3. Login Pending User
    try {
        console.log("\n3. Logging in Pending User...");
        await axios.post(`${API_URL}/auth/login`, {
            rollNo: "PEND001",
            password: "password"
        });
    } catch (e) {
        if (e.response?.status === 403 && e.response?.data?.status === 'PENDING') {
            console.log("✅ Login blocked correctly with PENDING status");
        } else {
            console.error("❌ Login response unexpected:", e.response?.data || e.message);
        }
    }
}

testAuth();
