const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3002;

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.use(cors());
app.use(express.json());

// Simple homepage for now
app.get('/', (req, res) => {
  res.send(`
    <h1>🎉 HubSpot Marketing Idea Generator</h1>
    <p>Your API is running successfully!</p>
    <p><strong>Ready for your team to use!</strong></p>
    <h3>Available API endpoints:</h3>
    <ul>
      <li>POST /api/generate-ideas</li>
      <li>POST /api/refine-idea-custom</li>
      <li>POST /api/refine-idea</li>
    </ul>
  `);
});

// HubSpot Conversational Marketing Experiment Library Context (Based on 2024-2025 Data)
// ... rest of your code
