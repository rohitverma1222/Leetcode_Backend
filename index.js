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

// Function to run the sync script
const runSync = (limit = null) => {
    return new Promise((resolve, reject) => {
        console.log(`Running LeetCode data sync script${limit ? ` with limit=${limit}` : ''}...`);
        const scriptPath = path.join(__dirname, 'scripts', 'scrape-leetcode.js');
        const command = `node ${scriptPath}${limit ? ` --limit=${limit}` : ''}`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing sync script: ${error.message}`);
                return reject(error);
            }
            if (stderr) {
                console.error(`Sync script stderr: ${stderr}`);
            }
            console.log(`Sync script output:\n${stdout}`);
            console.log('Sync completed successfully.');
            resolve(stdout);
        });
    });
};

// API Endpoint to trigger sync (used by Vercel Cron)
app.get('/api/sync', async (req, res) => {
    const { limit } = req.query;
    // Security check: Vercel Cron can send an Authorization header
    const authHeader = req.headers['authorization'];
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.warn('Unauthorized sync attempt');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        await runSync(limit);
        res.json({ message: 'Sync completed successfully', limit: limit || 'none' });
    } catch (error) {
        res.status(500).json({ error: 'Sync failed', details: error.message });
    }
});

// Local cron job for development (optional, can be disabled if only using Vercel)
if (process.env.NODE_ENV !== 'production') {
    cron.schedule('0 0 * * *', async () => {
        try {
            await runSync();
        } catch (error) {
            console.error('Local cron sync failed:', error);
        }
    });
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Initial data loaded: ${readData().length} problems`);
});
