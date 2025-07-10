const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../frontend/build')));

// API endpoint to generate ideas
app.post('/api/generate-idea', async (req, res) => {
  try {
    const { kpi, customKpi, promptText, userName } = req.body;

    if (!promptText) {
      return res.status(400).json({ error: 'Prompt text is required' });
    }

    const kpiText = customKpi || kpi || 'general performance';
    
    const systemPrompt = `You are an expert HubSpot conversational marketing strategist. Generate creative, actionable experiment ideas to improve ${kpiText}. 

Focus on:
- Specific, testable hypotheses
- Clear implementation steps
- Expected outcomes and metrics
- Innovative approaches that haven't been tried before
- Practical solutions that can be implemented quickly

Format your response as a structured experiment proposal with:
1. Experiment Title
2. Hypothesis
3. Implementation Steps
4. Success Metrics
5. Timeline
6. Potential Risks/Considerations`;

    const message = await anthropic.messages.create({
      model: 'claude-3-sonnet-20241022',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `${systemPrompt}\n\nUser's goal: ${promptText}`
        }
      ]
    });

    // Log usage data
    await logUsageData({
      userName: userName || 'Anonymous',
      selectedKPI: kpi,
      customKPI: customKpi,
      promptText,
      formSubmissionTime: new Date().toLocaleString(),
      sessionEnd: new Date().toLocaleString(),
      sessionDuration: 0
    });

    res.json({ 
      idea: message.content[0].text,
      success: true 
    });

  } catch (error) {
    console.error('Error generating idea:', error);
    res.status(500).json({ 
      error: 'Failed to generate idea. Please try again.',
      success: false 
    });
  }
});

// Function to log usage data
async function logUsageData(data) {
  try {
    const usageFilePath = path.join(__dirname, '../usage-data.json');
    let usageData = [];
    
    try {
      const existingData = await fs.readFile(usageFilePath, 'utf8');
      usageData = JSON.parse(existingData);
    } catch (error) {
      // File doesn't exist or is empty, start with empty array
    }
    
    usageData.push({
      date: new Date().toLocaleDateString('en-US', { 
        month: '2-digit', 
        day: '2-digit', 
        year: 'numeric' 
      }),
      ...data
    });
    
    await fs.writeFile(usageFilePath, JSON.stringify(usageData, null, 2));
  } catch (error) {
    console.error('Error logging usage data:', error);
  }
}

// API endpoint to get usage analytics
app.get('/api/analytics', async (req, res) => {
  try {
    const usageFilePath = path.join(__dirname, '../usage-data.json');
    const data = await fs.readFile(usageFilePath, 'utf8');
    const usageData = JSON.parse(data);
    
    // Calculate analytics
    const analytics = {
      totalSessions: usageData.length,
      uniqueUsers: [...new Set(usageData.map(d => d.userName))].length,
      averageSessionDuration: usageData.reduce((acc, d) => acc + (d.sessionDuration || 0), 0) / usageData.length,
      topKPIs: getTopKPIs(usageData),
      dailyUsage: getDailyUsage(usageData),
      recentSessions: usageData.slice(-10).reverse()
    };
    
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

function getTopKPIs(data) {
  const kpiCounts = {};
  data.forEach(d => {
    const kpi = d.selectedKPI || 'unknown';
    kpiCounts[kpi] = (kpiCounts[kpi] || 0) + 1;
  });
  
  return Object.entries(kpiCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([kpi, count]) => ({ kpi, count }));
}

function getDailyUsage(data) {
  const dailyCounts = {};
  data.forEach(d => {
    const date = d.date;
    dailyCounts[date] = (dailyCounts[date] || 0) + 1;
  });
  
  return Object.entries(dailyCounts)
    .sort(([a], [b]) => new Date(a) - new Date(b))
    .slice(-7)
    .map(([date, count]) => ({ date, count }));
}

// Catch all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});