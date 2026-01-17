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

// API Endpoint to get problems with optional rating filtering
app.get('/api/problems', (req, res) => {
    const { minRating, maxRating } = req.query;
    let problems = readData();

    if (minRating !== undefined || maxRating !== undefined) {
        const min = (minRating !== undefined && minRating !== '') ? parseFloat(minRating) : -Infinity;
        const max = (maxRating !== undefined && maxRating !== '') ? parseFloat(maxRating) : Infinity;
        console.log(`Filtering problems: minRating=${min}, maxRating=${max}`);
        problems = problems.filter(p => p.Rating >= min && p.Rating <= max);
        console.log(`Filter complete. Found ${problems.length} problems.`);
    }

    res.json(problems);
});

const { exec } = require('child_process');

// Cron job to sync data (runs every minute for testing)
// To run daily at midnight, change back to '0 0 * * *'
cron.schedule('0 0 * * *', async () => {
    console.log('Running LeetCode data sync script...');

    const scriptPath = path.join(__dirname, 'scripts', 'scrape-leetcode.js');

    // Execute the scraper script
    // We use --limit=10 for testing to avoid long runs every minute
    exec(`node ${scriptPath} `, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing sync script: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Sync script stderr: ${stderr}`);
        }
        console.log(`Sync script output:\n${stdout}`);
        console.log('Sync completed successfully.');
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Initial data loaded: ${readData().length} problems`);
});
