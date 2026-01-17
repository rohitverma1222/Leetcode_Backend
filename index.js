const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());

// Helper to read data
const readData = () => {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading data file:', error);
        return [];
    }
};

// Helper to write data
const writeData = (data) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing data file:', error);
    }
};

// API Endpoint to get problems
app.get('/api/problems', (req, res) => {
    const problems = readData();
    res.json(problems);
});

// Cron job to sync data (runs every day at midnight)
// For testing, you can change this to '* * * * *' (every minute)
cron.schedule('0 0 * * *', async () => {
    console.log('Running daily LeetCode data sync...');
    try {
        // This is a placeholder for actual LeetCode API sync logic
        // For now, we'll just log that it's running.
        // In a real scenario, you'd fetch from LeetCode and update data.json
        const currentData = readData();
        console.log(`Current problem count: ${currentData.length}`);

        // Example: writeData(updatedData);

        console.log('Sync completed successfully.');
    } catch (error) {
        console.error('Error during sync:', error);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Initial data loaded: ${readData().length} problems`);
});
