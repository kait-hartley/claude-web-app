const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');
const multer = require('multer');
const XLSX = require('xlsx');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Enhanced API call with retry logic
async function callAnthropicWithRetry(anthropic, requestConfig, maxRetries = 3, baseDelay = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Anthropic API call attempt ${attempt}/${maxRetries}`);
      const response = await anthropic.messages.create(requestConfig);
      console.log(`Anthropic API call successful on attempt ${attempt}`);
      return response;
      
    } catch (error) {
      const isOverloadError = error.status === 529 || 
                             error.message?.includes('overloaded') || 
                             error.message?.includes('Overloaded');
      
      const isRateLimitError = error.status === 429;
      
      if ((isOverloadError || isRateLimitError) && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        
        console.log(`Anthropic API ${isOverloadError ? 'overloaded' : 'rate limited'} (attempt ${attempt}/${maxRetries})`);
        console.log(`Retrying in ${delay/1000} seconds...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
        
      } else {
        console.error(`Anthropic API error after ${attempt} attempts:`, {
          status: error.status,
          type: error.error?.type,
          message: error.message
        });
        throw error;
      }
    }
  }
}

// Setup file upload handling
const upload = multer({ dest: 'uploads/' });

// GitHub Storage Configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_FILE_PATH = 'usage-data.json';

// Local storage configuration
const dataFile = path.join(__dirname, 'usage-data.json');

// Load existing data on server start
let usageData = [];
let currentSessions = {};

// GitHub API helper
const githubAPI = async (method, endpoint, data = null) => {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'HubSpot-Usage-Tracker'
    }
  };
  
  if (data) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(url, options);
  return { response, data: response.ok ? await response.json() : null };
};

// Save data to GitHub with retry logic
const saveUsageData = async (retryCount = 0) => {
  try {
    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
      console.log('GitHub not configured, using local fallback');
      saveToLocalFile();
      return;
    }

    console.log(`Saving ${usageData.length} records to GitHub... (attempt ${retryCount + 1})`);
    
    const { response: getResponse, data: currentFile } = await githubAPI('GET', `contents/${GITHUB_FILE_PATH}`);
    
    const fileContent = Buffer.from(JSON.stringify(usageData, null, 2)).toString('base64');
    const commitData = {
      message: `Update usage data: ${usageData.length} records (${new Date().toISOString()})`,
      content: fileContent,
      branch: 'main'
    };
    
    if (getResponse.ok && currentFile && currentFile.sha) {
      commitData.sha = currentFile.sha;
    }
    
    const { response: saveResponse } = await githubAPI('PUT', `contents/${GITHUB_FILE_PATH}`, commitData);
    
    if (saveResponse.ok) {
      console.log(`Usage data saved to GitHub successfully! Total records: ${usageData.length}`);
    } else if (saveResponse.status === 409 && retryCount < 3) {
      console.log(`GitHub save conflict (409), retrying... (attempt ${retryCount + 1}/3)`);
      await new Promise(resolve => setTimeout(resolve, 1000 + (retryCount * 500)));
      return await saveUsageData(retryCount + 1);
    } else {
      throw new Error(`GitHub save failed: ${saveResponse.status}`);
    }
    
  } catch (error) {
    if (error.message.includes('409') && retryCount < 3) {
      console.log(`GitHub save conflict, retrying... (attempt ${retryCount + 1}/3)`);
      await new Promise(resolve => setTimeout(resolve, 1000 + (retryCount * 500)));
      return await saveUsageData(retryCount + 1);
    }
    
    console.error('Error saving to GitHub:', error);
    console.log('Falling back to local file...');
    saveToLocalFile();
  }
};

// Load data from GitHub
const loadUsageData = async () => {
  try {
    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
      console.log('GitHub not configured, loading from local file');
      loadFromLocalFile();
      return;
    }

    console.log('Loading usage data from GitHub...');
    
    const { response, data } = await githubAPI('GET', `contents/${GITHUB_FILE_PATH}`);
    
    if (response.ok && data && data.content) {
      const jsonContent = Buffer.from(data.content, 'base64').toString('utf8');
      usageData = JSON.parse(jsonContent);
      console.log(`Loaded ${usageData.length} usage records from GitHub`);
    } else if (response.status === 404) {
      console.log('No existing usage data found in GitHub, starting fresh');
      usageData = [];
    } else {
      throw new Error(`GitHub load failed: ${response.status}`);
    }
    
  } catch (error) {
    console.error('Error loading from GitHub:', error);
    console.log('Falling back to local file...');
    loadFromLocalFile();
  }
};

// Local file fallback functions
const saveToLocalFile = () => {
  try {
    const dir = path.dirname(dataFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dataFile, JSON.stringify(usageData, null, 2));
    console.log(`Fallback: saved ${usageData.length} records to local file`);
  } catch (error) {
    console.error('Local file save failed:', error);
  }
};

const loadFromLocalFile = () => {
  try {
    if (fs.existsSync(dataFile)) {
      const data = fs.readFileSync(dataFile, 'utf8');
      usageData = JSON.parse(data);
      console.log(`Fallback: loaded ${usageData.length} records from local file`);
    } else {
      console.log('No local file found, starting fresh');
      usageData = [];
    }
  } catch (error) {
    console.error('Local file load failed:', error);
    usageData = [];
  }
};

// Load existing data when server starts
loadUsageData();

// Periodic save every 5 minutes
setInterval(async () => {
  if (usageData.length > 0) {
    await saveUsageData();
  }
}, 5 * 60 * 1000);

// Cleanup abandoned sessions every 30 minutes
setInterval(async () => {
  const now = new Date();
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
  
  usageData.forEach((record, index) => {
    if (record.isActive && record.sessionId) {
      const session = currentSessions[record.sessionId];
      
      if (!session || new Date(session.lastActivity) < thirtyMinutesAgo) {
        const estimatedDuration = session ? 
          Math.round((new Date(session.lastActivity) - new Date(session.sessionStart)) / 1000) :
          900; // Default 15 minutes in seconds
        
        const estOptions = { 
          timeZone: 'America/New_York', 
          hour12: true, 
          hour: 'numeric', 
          minute: '2-digit', 
          second: '2-digit' 
        };
        const estDateOptions = { 
          timeZone: 'America/New_York',
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit' 
        };
        
        usageData[index].sessionEnd = (session ? new Date(session.lastActivity) : now).toLocaleTimeString('en-US', estOptions);
        usageData[index].sessionDuration = estimatedDuration;
        usageData[index].isActive = false;
        
        if (!usageData[index].date || usageData[index].date.includes('Mon') || usageData[index].date.includes('Tue')) {
          usageData[index].date = now.toLocaleDateString('en-US', estDateOptions);
        }
        
        delete usageData[index].id;
        delete usageData[index].sessionId;
        
        console.log(`Cleaned up abandoned session for ${record.userName}, estimated duration: ${estimatedDuration} seconds`);
        
        if (session) {
          delete currentSessions[record.sessionId];
        }
      }
    }
  });
  
  await saveUsageData();
}, 30 * 60 * 1000);

// Serve React build files
app.use(express.static(path.join(__dirname, 'build')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'build/index.html'));
});

// Session tracking endpoints
app.post('/api/start-session', (req, res) => {
  try {
    const { userName, sessionId, timestamp, userInput, selectedKPI, customKPI } = req.body;
    
    // Store session data but don't create usage record yet
    currentSessions[sessionId] = {
      userName: userName || 'Anonymous',
      sessionStart: timestamp,
      userInput: userInput,
      selectedKPI: selectedKPI,
      customKPI: customKPI,
      lastActivity: timestamp
    };
    
    console.log(`Session started for ${userName}: ${sessionId}`);
    res.json({ success: true, sessionId });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: 'Failed to start session tracking' });
  }
});

// Track form submission
app.post('/api/track-form-submission', async (req, res) => {
  try {
    const { sessionId, userInput, selectedKPI, customKPI } = req.body;
    
    console.log(`Form submission received for sessionId: ${sessionId}`);
    console.log(`User input preview: "${userInput?.substring(0, 50)}..."`);
    
    if (currentSessions[sessionId]) {
      const session = currentSessions[sessionId];
      const submissionTime = new Date();
      
      const estOptions = { 
        timeZone: 'America/New_York', 
        hour12: true, 
        hour: 'numeric', 
        minute: '2-digit', 
        second: '2-digit' 
      };
      const estDateOptions = { 
        timeZone: 'America/New_York',
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      };
      
      const usageRecord = {
        sessionId: sessionId,
        date: submissionTime.toLocaleDateString('en-US', estDateOptions),
        userName: session.userName,
        selectedKPI: selectedKPI || 'None',
        customKPI: customKPI || '',
        promptText: userInput.substring(0, 200),
        formSubmissionTime: submissionTime.toLocaleTimeString('en-US', estOptions),
        sessionEnd: 'In Progress',
        sessionDuration: 'In Progress',
        isActive: true
      };
      
      const existingIndex = usageData.findIndex(record => record.sessionId === sessionId);
      
      if (existingIndex >= 0) {
        usageData[existingIndex] = usageRecord;
        console.log(`Updated existing record for ${session.userName}`);
      } else {
        usageData.push(usageRecord);
        console.log(`Created new record for ${session.userName}`);
      }
      
      currentSessions[sessionId].lastActivity = submissionTime.toISOString();
      currentSessions[sessionId].formSubmitted = true;
      
      console.log(`Form submission tracked for ${session.userName}: "${userInput.substring(0, 50)}..."`);
      
      // Save to GitHub in background
      saveUsageData().catch(error => {
        console.error('Background save to GitHub failed:', error);
      });
    } else {
      console.log(`No session found for sessionId: ${sessionId}`);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking form submission:', error);
    res.status(500).json({ error: 'Failed to track form submission' });
  }
});

// End session with accurate duration
app.post('/api/end-session', async (req, res) => {
  try {
    console.log('End session request received');
    console.log('Request body:', req.body);
    
    if (!req.body || typeof req.body !== 'object') {
      console.log('req.body is missing or invalid:', req.body);
      return res.status(400).json({ error: 'Invalid request body' });
    }
    
    if (!req.body.sessionId) {
      console.log('sessionId is missing from req.body:', req.body);
      return res.status(400).json({ error: 'Missing sessionId' });
    }
    
    const { sessionId } = req.body;
    const session = currentSessions[sessionId];
    
    if (session && session.formSubmitted) {
      const sessionEndTime = new Date();
      
      // Find the usage record for this session
      const recordIndex = usageData.findIndex(record => record.sessionId === sessionId);
      
      if (recordIndex >= 0) {
        const sessionStartTime = new Date(session.sessionStart);
        const actualSessionDuration = Math.round((sessionEndTime - sessionStartTime) / 1000); // seconds
        
        const estOptions = { 
          timeZone: 'America/New_York', 
          hour12: true, 
          hour: 'numeric', 
          minute: '2-digit', 
          second: '2-digit' 
        };
        
        // Update the record with final data
        usageData[recordIndex].sessionEnd = sessionEndTime.toLocaleTimeString('en-US', estOptions);
        usageData[recordIndex].sessionDuration = actualSessionDuration;
        usageData[recordIndex].isActive = false;
        
        // Clean up temporary fields
        delete usageData[recordIndex].sessionId;
        
        console.log(`Session completed for ${session.userName}: ${actualSessionDuration} seconds`);
        
        // Save updated data
        await saveUsageData();
      }
      
      // Clean up session
      delete currentSessions[sessionId];
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// CSV download endpoint
app.get('/api/download-usage-data', async (req, res) => {
  try {
    console.log(`CSV Download requested. Total records: ${usageData.length}`);
    
    // Clean up any remaining "In Progress" sessions
    const now = new Date();
    const estOptions = { 
      timeZone: 'America/New_York', 
      hour12: true, 
      hour: 'numeric', 
      minute: '2-digit', 
      second: '2-digit' 
    };
    const estDateOptions = { 
      timeZone: 'America/New_York',
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    };
    
    usageData.forEach((record, index) => {
      if (record.sessionEnd === 'In Progress' || record.sessionDuration === 'In Progress') {
        const session = currentSessions[record.sessionId];
        const estimatedDuration = session ? 
          Math.round((now - new Date(session.lastActivity)) / 1000) :
          600; // Default 10 minutes in seconds
        
        usageData[index].sessionEnd = now.toLocaleTimeString('en-US', estOptions);
        usageData[index].sessionDuration = estimatedDuration;
        
        if (!usageData[index].date || usageData[index].date.includes('Mon') || usageData[index].date.includes('Tue')) {
          usageData[index].date = now.toLocaleDateString('en-US', estDateOptions);
        }
        
        delete usageData[index].sessionId;
        delete usageData[index].isActive;
        
        console.log(`Cleaned up incomplete record during CSV generation: ${estimatedDuration} seconds`);
      }
    });
    
    // Filter out malformed records and remove duplicates
    const cleanData = usageData.filter((row, index, self) => 
      row.date && row.userName && row.formSubmissionTime && 
      row.sessionEnd !== 'In Progress' && row.sessionDuration !== 'In Progress' &&
      // Remove duplicates based on userName, date, and promptText
      index === self.findIndex(r => 
        r.userName === row.userName && 
        r.date === row.date && 
        r.promptText === row.promptText &&
        r.formSubmissionTime === row.formSubmissionTime
      )
    );
    
    console.log(`Clean records for CSV: ${cleanData.length}`);
    
    const csvHeader = 'Date,User Name,KPI Selected,Form Submission Time (EST),Session End (EST),Duration (seconds),Prompt Text\n';
    const csvRows = cleanData.map(row => {
      const cleanPrompt = (row.promptText || 'Unknown')
        .replace(/"/g, '""')
        .replace(/[\r\n]/g, ' ')
        .substring(0, 150);
      
      const kpiDisplay = row.selectedKPI === 'other' ? 
        (row.customKPI || 'Custom KPI') : 
        (row.selectedKPI || 'None');
      
      return `"${row.date}","${row.userName}","${kpiDisplay}","${row.formSubmissionTime}","${row.sessionEnd}","${row.sessionDuration}","${cleanPrompt}"`;
    });
    
    const csvContent = csvHeader + csvRows.join('\n');
    
    await saveUsageData();
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=hubspot-idea-generator-usage-data.csv');
    res.send(csvContent);
  } catch (error) {
    console.error('Error generating CSV:', error);
    res.status(500).json({ error: 'Failed to generate usage data' });
  }
});

// Debug endpoint
app.get('/api/debug-data', (req, res) => {
  try {
    const activeRecords = usageData.filter(r => r.isActive);
    const completedRecords = usageData.filter(r => !r.isActive);
    
    res.json({
      totalRecords: usageData.length,
      completedRecords: completedRecords.length,
      activeRecords: activeRecords.length,
      activeSessions: Object.keys(currentSessions).length,
      sampleCompletedData: completedRecords.slice(0, 3),
      sampleActiveData: activeRecords.slice(0, 3),
      activeSessionsData: currentSessions
    });
  } catch (error) {
    console.error('Error getting debug data:', error);
    res.status(500).json({ error: 'Failed to get debug data' });
  }
});

// Usage statistics endpoint
app.get('/api/usage-stats', (req, res) => {
  try {
    const completedRecords = usageData.filter(r => !r.isActive && r.sessionDuration !== 'In Progress');
    const today = new Date().toLocaleDateString('en-US', { 
      timeZone: 'America/New_York',
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
    
    // Calculate DAU/WAU
    const todayUsers = [...new Set(completedRecords
      .filter(r => r.date === today)
      .map(r => r.userName))];
    
    // Last 7 days for WAU
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weeklyUsers = [...new Set(completedRecords
      .filter(r => new Date(r.date) >= sevenDaysAgo)
      .map(r => r.userName))];
    
    const stats = {
      totalFormSubmissions: completedRecords.length,
      uniqueUsers: [...new Set(completedRecords.map(r => r.userName))].length,
      dailyActiveUsers: todayUsers.length,
      weeklyActiveUsers: weeklyUsers.length,
      activeSessions: Object.keys(currentSessions).length,
      averageSessionDuration: completedRecords.length > 0 ? 
        Math.round(completedRecords.reduce((sum, session) => sum + (session.sessionDuration || 0), 0) / completedRecords.length) : 0
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get usage statistics' });
  }
});

// Helper function to clean JSON strings
const cleanJsonString = (str) => {
  return str
    .replace(/[\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// File processing function
async function analyzeUploadedFiles(files) {
  const analysis = {
    previousExperiments: [],
    currentMetrics: {},
    identifiedProblems: [],
    userContext: "",
    alreadyTested: []
  };

  for (const file of files) {
    let content = "";
    
    try {
      if (file.mimetype.includes('sheet') || file.originalname.includes('.xlsx') || file.originalname.includes('.xls')) {
        const workbook = XLSX.readFile(file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        content = XLSX.utils.sheet_to_csv(worksheet);
        
        const rows = content.split('\n');
        rows.forEach(row => {
          if (row.toLowerCase().includes('experiment') || row.toLowerCase().includes('test')) {
            analysis.previousExperiments.push(row);
          }
          if (row.toLowerCase().includes('failed') || row.toLowerCase().includes('didn\'t work') || row.toLowerCase().includes('no impact')) {
            analysis.alreadyTested.push(row);
          }
        });
      }
      
      if (file.mimetype.includes('pdf')) {
        const buffer = fs.readFileSync(file.path);
        const data = await pdfParse(buffer);
        content = data.text;
      }
      
      if (file.mimetype.includes('document')) {
        const result = await mammoth.extractRawText({path: file.path});
        content = result.value;
      }
      
      if (file.mimetype.includes('text') || file.originalname.includes('.txt') || file.originalname.includes('.csv')) {
        content = fs.readFileSync(file.path, 'utf8');
      }
      
      analysis.userContext += content + "\n\n";
      fs.unlinkSync(file.path);
      
    } catch (error) {
      console.error('Error processing file:', file.originalname, error);
    }
  }
  
  return analysis;
}

// Team Context Data
const CURRENT_TEAM_CONTEXT = {
  active_strategic_initiatives: {
    'ISC_Closing_Low_Pro_Pilot': {
      status: 'Live with expansion incoming',
      description: 'ISCs closing 1-10EE Low ASP Pro deals directly via chat (vs booking meetings)',
      current_performance: '31% close rate across 4 deals since May launch',
      expansion_plan: 'Expanding to additional teams by mid-June',
      kpis: ['Number of Low ASP Pro deals closed direct via chat', 'Average sales cycle time', 'ASP', 'CSAT scores'],
      focus_area: 'reactive intent when lead requests to not speak to rep'
    },
    'Sales_Assist_Phase_1': {
      status: 'Live & Will Continue H2',
      description: 'SDR team filtering 1-10EE leads to save reps time on low-ASP qualification',
      current_performance: '81% Low ASP tagging accuracy, $52K pipeline generated',
      goal: '90% deals accurately tagged by 2025',
      kpis: ['% Deals Accurately Tagged', 'QL Work Rate (SLA)', 'SDR Pipeline Generated'],
      journey_stage: 'Bridge toward self-service downmarket (90% Sales → 30%+ Self Service)'
    },
    'Automation_Motion_Scaling': {
      status: 'Active and driving impressive results',
      description: 'Clay automation for outreach scaling and efficiency',
      current_performance: '+46% MoM growth in domains worked, +32% MoM meetings booked',
      impact: '+50% expected MoM growth in Pipeline$ created',
      focus: 'Highly automated process for engagement and qualification'
    }
  },
  
  current_performance_metrics: {
    chat_deflection_rate: {
      current: '76%',
      target: '104% vs plan',
      trend: '+3pts MoM, +7pts YoY',
      status: 'performing_well'
    },
    handled_chats: {
      current: '28,930',
      attainment: '79%',
      trend: '-13% MoM, -33% YoY',
      status: 'concerning_decline'
    },
    ql_volume: {
      current: '14,854',
      attainment: '91%',
      trend: '-4% MoM, -26% YoY',
      status: 'needs_attention'
    },
    won_deal_rate: {
      current: '16.6%',
      attainment: '108%',
      trend: '+1pts MoM, +10pts YoY',
      status: 'strong_performance'
    },
    ql_sourced_mrr: {
      current: '$649,072',
      attainment: '100%',
      trend: '+14% MoM, +107% YoY',
      status: 'meeting_targets'
    },
    tagging_accuracy: {
      current: '78.3%',
      target: '90%',
      trend: 'Improving from Q1 lows',
      status: 'progress_needed'
    }
  },
  
  priority_problem_areas: [
    'QL volume decline (4% MoM, 26% YoY) - need ideas to reverse trend',
    'Overall bot chat volume down 2% MoM - engagement improvements needed',
    'Tagging accuracy gap (78.3% vs 90% goal) - qualification process improvements',
    'Pipeline build monitoring - need sustainable growth strategies',
    'ISC QL volume down 28% YoY - human chat efficiency needed'
  ],
  
  proven_success_patterns_current: [
    'Digital channel overperformance (180% MRR attainment, +40% MoM)',
    'Deal velocity improvements (+10pts YoY won deal rates)',
    'Automation scaling (Clay driving +46% domain growth)',
    'ISC selling experiments (31% close rate early results)',
    'Deflection rate recovery (+3pts MoM improvement)'
  ],
  
  avoid_suggesting_active_work: [
    'ISC Closing Low Pro variations - already live and expanding',
    'Sales Assist SDR filtering - Phase 1 active, Phase 2 planned',
    'Clay automation implementations - already scaled and optimized',
    'Basic tagging accuracy improvements - actively being addressed',
    'Standard deflection rate optimizations - currently performing well'
  ],
  
  focus_alignment_priorities: [
    'Ideas that address QL volume decline specifically',
    'Chat engagement improvements to reverse volume trends', 
    'Qualification process enhancements for tagging accuracy',
    'Self-service journey progression (toward 30%+ self-service MRR)',
    'Digital channel optimization (building on 180% success)',
    'Automation + human hybrid approaches (following Clay success pattern)'
  ]
};

const EXPERIMENT_LIBRARY_CONTEXT = {
  total_experiments: 94,
  success_rate: 55.3,
  
  proven_successful_patterns: {
    'Salesbot': {
      experiments: 17,
      successful: 13,
      success_rate: 76.5,
      description: 'GenAI integration, TOFU/BOFU implementations, deflection improvements',
      metrics: ['Deflection Rate'],
      typical_impact: '6-35% deflection improvement',
      hubspot_implementation: 'ChatFlow with Salesbot integration, GenAI knowledge base',
      example_experiments: [
        'Bot378 Salesbot: Onsite | EN | Partners',
        'Bot397 Salesbot - Onsite | EN | Competitive pages',
        'Bot383 Salesbot - Marketing Catchall AM',
        'Bot 381 Adding Salesbot to Case Studies chatbot',
        'BOT 336 | Onsite | EN | Contact Sales | GAI | Salesbot',
        'BOT 342 | In-App | EN | Paywall Workflows | GAI | Salesbot | All Users'
      ]
    },
    'Self Service Bot': {
      experiments: 19,
      successful: 9,
      success_rate: 47.4,
      description: 'Automated responses, FAQ integration, user self-resolution',
      metrics: ['Deflection Rate', 'Pass Rate'],
      typical_impact: '10-25% deflection improvement',
      hubspot_implementation: 'Knowledge base integration, automated response flows',
      example_experiments: [
        'Bot 313: Generative AI on Marketing Hub Product Homepage',
        'Bot 316: Generative AI Catchall on EN Product Pages',
        'Bot 320: Generative AI on CRM Paid LP (2.0)',
        'BOT373 - Generative AI on InApp DACH Help-in the Nav',
        'Generative AI BOT345 Onsite DACH HomePage',
        'Generative AI BOT355 Onsite Offer Demo Pages'
      ]
    },
    'BAMIC (Book a Meeting in Chat)': {
      experiments: 15,
      successful: 8,
      success_rate: 53.3,
      description: 'Meeting booking optimization within chat interface',
      metrics: ['BAMIC CVR', 'Meeting QLs'],
      typical_impact: '15-45% meeting booking improvement',
      hubspot_implementation: 'ChatFlow with meeting scheduler integration',
      example_experiments: [
        'BAMIC InApp AB Test - EN Pricing Page (All Users) - BOT363',
        'Salesbot on InApp Pricing (1-10 EE) AB Test - BOT365',
        'Bot 407 | Onsite | EN | Contact Sales | GAI | Salesbot | BAMIC',
        'BOT388 - BAMIC New Module - EN InApp Pricing Pages',
        'BOT 325 - FR InApp pricing Pages - BAMIC',
        'BOT 310 BAM Experiment FR Pricing Page'
      ]
    },
    'Quick Replies': {
      experiments: 6,
      successful: 5,
      success_rate: 83.3,
      description: 'Pre-defined response options, conversation flow optimization',
      metrics: ['Engagement Rate', 'Demo CVR'],
      typical_impact: '20-120% engagement improvement',
      hubspot_implementation: 'Quick reply buttons in ChatFlow builder',
      example_experiments: [
        'Experiment w/ QR on EN Knowledge Base Generative AI',
        'QR Optimization on InApp | EN | Academy | Generative AI',
        'QRs on FR Knowledge Base - Generative AI',
        'Quick Win Sprint Experiment'
      ]
    },
    'Demo RFF (Request for Form)': {
      experiments: 5,
      successful: 4,
      success_rate: 80.0,
      description: 'Simplified demo request process, reduced form fields',
      metrics: ['Demo CVR', 'Quick Reply Click'],
      typical_impact: '37-625% demo conversion improvement',
      hubspot_implementation: 'Simplified form integration in chat',
      example_experiments: [
        'Bot406 CRM Catchall AM - Adding Demo RFF',
        'Bot362 Demo Paid LP - Replacing QR Demo with RFF',
        'Bot 376 Homepage - Adding QR Book a Demo with RFF',
        'BOT356 - Demo RFF - Replace actual Demo QL in Chat - FR CRM Signup',
        'BOT331: RFF & Demo QL within Chat'
      ]
    }
  },
  
  extensively_tested_avoid: [
    'Basic Salesbot implementations (17 experiments)',
    'Standard Self Service Bot variations (19 experiments)', 
    'Generic BAMIC approaches (15 experiments)',
    'Simple Quick Reply setups (6 experiments)',
    'Standard Demo RFF flows (5 experiments)'
  ],
  
  primary_metrics: [
    'Deflection Rate', 'Pass Rate', 'Engagement Rate', 'Demo CVR', 
    'BAMIC CVR', 'Handoff Rate', 'MRR', 'IQL Volume'
  ],
  
  current_hubspot_capabilities: {
    chatflow_types: [
      'Rule-based chatbots', 'Live chat', 'Knowledge base & support bot',
      'Offline bot', 'Concierge bot', 'Qualify leads bot', 'Support bot'
    ],
    
    targeting_options: [
      'Website URL targeting', 'Query parameter targeting', 'Contact property targeting',
      'Visitor behavior targeting', 'Lifecycle stage targeting', 'List membership targeting'
    ],
    
    integrations_available: [
      'Lead scoring integration', 'Workflow automation', 'Knowledge base search',
      'Meeting scheduler', 'Ticket creation', 'Contact property updates',
      'List enrollment', 'CRM data sync', 'Email notifications'
    ],
    
    display_triggers: [
      'Exit intent', 'Time on page', 'Scroll percentage', 'Page load delay',
      'Return visitor', 'First-time visitor', 'Mobile/desktop specific'
    ],
    
    advanced_features: [
      'Conversation routing', 'Team availability settings', 'CSAT surveys',
      'Chat transcripts', 'Conversation intelligence', 'Response templates',
      'Automated assignment', 'Escalation rules'
    ]
  },
  
  limitations_constraints: [
    'No cross-chatflow transitions', 'Limited advanced automation in free plan',
    'Knowledge base bot requires Service Hub Pro+', 'Advanced routing needs paid plans',
    'API integrations require Operations Hub Pro+', 'Limited customization in free version'
  ]
};

// KPI Context
const KPI_CONTEXT = {
  engagement_rate: {
    definition: "Bot Engagement divided by Page Views - measures how many visitors actually start interacting with the chatbot",
    chatbotFocus: "Improve conversation triggers, opening messages, and initial user experience to get more visitors engaging",
    successMetrics: ["higher click-through on bot prompts", "increased conversation starts", "reduced bounce rate on chat pages"],
    hubspot_implementation: "ChatFlow targeting rules, display triggers, welcome message optimization"
  },
  deflection_rate: {
    definition: "Bot Handled chats divided by Bot engagements - measures bot's ability to resolve issues without human handoff", 
    chatbotFocus: "Enhance bot knowledge base, improve response accuracy, add better self-service flows",
    successMetrics: ["fewer ISC handoffs", "higher bot completion rates", "maintained or improved user satisfaction"],
    hubspot_implementation: "Knowledge base integration, Salesbot setup, automated response flows"
  },
  handoff_rate: {
    definition: "ISC Handled Chats divided by Bot Engagements - measures when bot transfers to human agents",
    chatbotFocus: "Optimize handoff triggers, improve bot capability before transfer, reduce unnecessary escalations",
    successMetrics: ["more qualified handoffs", "reduced ISC workload", "better handoff context"],
    hubspot_implementation: "Conversation routing, escalation rules, qualification criteria"
  },
  chat_iql: {
    definition: "Inbound Qualified Leads via Chat - measures lead generation through chat interactions",
    chatbotFocus: "Improve lead qualification flows, optimize conversation paths to capture high-intent prospects",
    successMetrics: ["higher lead qualification rates", "better lead quality scores", "increased pipeline contribution"],
    hubspot_implementation: "Lead scoring integration, qualification ChatFlows, CRM property updates"
  },
  pass_rate: {
    definition: "IQLs divided by Handled Chats - measures quality of leads passed from chat to sales",
    chatbotFocus: "Enhance qualification criteria, improve ISC training, optimize handoff processes",
    successMetrics: ["higher sales acceptance rates", "improved lead-to-opportunity conversion", "reduced sales friction"],
    hubspot_implementation: "Lead scoring rules, workflow automation, qualification branching"
  },
  bamic: {
    definition: "Book a Meeting in Chat - measures meeting booking conversions through chat interface",
    chatbotFocus: "Streamline booking flows, reduce friction in scheduling, improve meeting qualification",
    successMetrics: ["higher meeting booking rates", "reduced booking abandonment", "improved meeting show rates"],
    hubspot_implementation: "Meeting scheduler integration, simplified booking flow, qualification steps"
  },
  demo_rff: {
    definition: "Demo booking with reduced form fields - measures simplified demo request conversion",
    chatbotFocus: "Optimize demo request flows, reduce form friction, improve demo qualification processes",
    successMetrics: ["higher demo request completion", "reduced form abandonment", "improved demo show rates"],
    hubspot_implementation: "Simplified form integration, progressive qualification, quick reply optimization"
  }
};

// Main idea generation endpoint
app.post('/api/generate-ideas', upload.array('files'), async (req, res) => {
  try {
    const { userInput, selectedKPI, customKPI } = req.body;
    const files = req.files || [];
    
    const fileAnalysis = await analyzeUploadedFiles(files);
    const kpiInfo = selectedKPI ? KPI_CONTEXT[selectedKPI] : null;
    
    let enhancedPrompt = `You are the lead conversational marketing strategist at HubSpot with deep knowledge of the team's 94-experiment library AND current 2025 performance data. Generate 7 NEVER-TESTED but strategically targeted experiment ideas.

USER INPUT: "${userInput}"

CURRENT TEAM CONTEXT & PRIORITIES (June 2025):
ACTIVE INITIATIVES (DO NOT DUPLICATE):
- ISC Closing Low Pro Pilot: Live with 31% close rate, expanding mid-June
- Sales Assist Phase 1: 81% tagging accuracy, $52K pipeline, targeting 90% accuracy
- Clay Automation Motion: +46% domain growth, +32% meetings booked

CURRENT PERFORMANCE CHALLENGES (FOCUS IDEAS HERE):
- QL Volume Decline: -4% MoM, -26% YoY - NEEDS URGENT ATTENTION
- Chat Volume Down: -2% MoM, -5% YoY - engagement improvements needed
- Tagging Accuracy Gap: 78.3% vs 90% goal - qualification process needs enhancement
- ISC QL Volume: -28% YoY - human chat efficiency improvements needed

CURRENT SUCCESS PATTERNS TO BUILD ON:
- Digital Channel: 180% MRR attainment, +40% MoM growth
- Deal Velocity: +10pts YoY won deal rates improvement
- Deflection Rate: 76% (104% vs plan), +3pts MoM improvement
- Automation Scaling: Clay driving massive efficiency gains

STRATEGIC DIRECTION: Journey toward 30%+ Self-Service MRR (from current 90% Sales Engaged)

EXPERIMENT LIBRARY CONSTRAINTS - NEVER SUGGEST:
${EXPERIMENT_LIBRARY_CONTEXT.extensively_tested_avoid.join('\n- ')}

ACTIVE WORK CONSTRAINTS - NEVER SUGGEST:
${CURRENT_TEAM_CONTEXT.avoid_suggesting_active_work.join('\n- ')}

HUBSPOT CHATFLOW CAPABILITIES:
- Available Types: ${EXPERIMENT_LIBRARY_CONTEXT.current_hubspot_capabilities.chatflow_types.join(', ')}
- Integrations: ${EXPERIMENT_LIBRARY_CONTEXT.current_hubspot_capabilities.integrations_available.join(', ')}
- Targeting: ${EXPERIMENT_LIBRARY_CONTEXT.current_hubspot_capabilities.targeting_options.join(', ')}

LIMITATIONS: ${EXPERIMENT_LIBRARY_CONTEXT.limitations_constraints.join('\n- ')}`;

    if (kpiInfo) {
      enhancedPrompt += `

TARGET KPI: ${kpiInfo.definition}
KPI FOCUS: ${kpiInfo.chatbotFocus}
SUCCESS METRICS: ${kpiInfo.successMetrics.join(', ')}
HUBSPOT IMPLEMENTATION APPROACH: ${kpiInfo.hubspot_implementation}

CRITICAL: Every idea must be specifically designed to improve ${selectedKPI} through HubSpot ChatFlow optimization.`;
    }

    if (selectedKPI === 'other' && customKPI) {
      enhancedPrompt += `

CUSTOM TARGET KPI: ${customKPI}
Use the uploaded files to understand what this KPI means and how to improve it through HubSpot ChatFlow optimization.`;
    }

    if (fileAnalysis.userContext.trim()) {
      enhancedPrompt += `

UPLOADED FILE CONTEXT:
${fileAnalysis.userContext}

NEVER SUGGEST these already-tested approaches:
${fileAnalysis.alreadyTested.join('\n')}`;
    }

    enhancedPrompt += `

JSON format:
{
  "ideas": [
    {
      "idea": "[~40 words addressing specific current performance challenge using exact user terminology, implementable via HubSpot ChatFlow]",
      "expectedResult": "[X-Y%] improvement in [specific current metric] addressing [current performance gap], measured through [HubSpot tracking method]",
      "sources": ["[EXACT experiment name from library]", "[Specific public source title OR current team performance metric]"]
    }
  ]
}

Generate 7 ideas that feel custom-created for their exact challenge, with each idea offering a genuinely different approach to solving THEIR specific problem.`;

    const response = await callAnthropicWithRetry(anthropic, {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 6000,
      temperature: 0.85,
      messages: [
        {
          role: 'user',
          content: enhancedPrompt
        }
      ]
    }, 3, 2000);

    const content = response.content[0].text;
    let ideas;
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        ideas = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Raw response:', content);
      ideas = { 
        ideas: [{ 
          idea: "Error parsing AI response - please provide more specific conversational marketing context and try again.", 
          expectedResult: "Unable to generate experiment recommendations without clear input context",
          sources: ["System error"]
        }] 
      };
    }

    res.json(ideas);
    
  } catch (error) {
    console.error('Error generating ideas:', error);
    
    if (error.status === 529) {
      res.status(503).json({ 
        error: 'AI service temporarily overloaded. Please try again in a few moments.',
        retryAfter: 30,
        type: 'overload'
      });
    } else if (error.status === 429) {
      res.status(429).json({ 
        error: 'Rate limit exceeded. Please wait before trying again.',
        retryAfter: 60,
        type: 'rate_limit'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to generate experiment ideas. Please try again.',
        type: 'general'
      });
    }
  }
});

// Implementation steps endpoint
app.post('/api/implementation-steps', async (req, res) => {
  try {
    const { idea, expectedResult, originalUserInput } = req.body;
    
    const prompt = `You are a HubSpot conversational marketing implementation expert. Generate EXACTLY 4 high-level, HubSpot-tool-specific implementation steps for this experiment idea.

EXPERIMENT IDEA: "${idea}"
EXPECTED RESULT: "${expectedResult}"
ORIGINAL CONTEXT: "${originalUserInput}"

HUBSPOT CHATFLOW IMPLEMENTATION CAPABILITIES:
- ChatFlow Builder (Service > Chatflows)
- Rule-based chatbots, Live chat, Knowledge base integration
- Targeting: URL rules, visitor behavior, contact properties
- Integrations: Lead scoring, workflows, meeting scheduler, ticket creation
- Display triggers: Exit intent, time on page, scroll percentage
- Conversation routing and team assignment

IMPLEMENTATION STEP GUIDELINES:

1. HubSpot-Tool-Specific: Reference actual HubSpot features and navigation paths
2. High-Level but Actionable: Strategic steps that can be executed
3. Sequential Order: Steps should build logically from setup to launch
4. EXACTLY 4 Steps: Generate precisely 4 steps - no more, no less
5. Include Testing: Always include a testing/validation step

STEP FORMAT:
- Start with action verb (Configure, Set up, Create, Test, Launch)
- Reference specific HubSpot tools/features
- Keep each step to 1-2 sentences maximum
- Include key settings or considerations

CRITICAL: You MUST generate exactly 4 steps. Count them to ensure you have exactly 4.

JSON format:
{
  "implementationSteps": [
    {
      "stepNumber": 1,
      "title": "[Action Verb] [HubSpot Feature]",
      "description": "[Brief description of what to do in this HubSpot tool/feature]"
    },
    {
      "stepNumber": 2,
      "title": "[Action Verb] [HubSpot Feature]",
      "description": "[Brief description of what to do in this HubSpot tool/feature]"
    },
    {
      "stepNumber": 3,
      "title": "[Action Verb] [HubSpot Feature]",
      "description": "[Brief description of what to do in this HubSpot tool/feature]"
    },
    {
      "stepNumber": 4,
      "title": "[Action Verb] [HubSpot Feature]",
      "description": "[Brief description of what to do in this HubSpot tool/feature]"
    }
  ]
}

Generate exactly 4 practical HubSpot implementation steps that convert this experiment idea into actionable tasks.`;

    const response = await callAnthropicWithRetry(anthropic, {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0.6,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    }, 3, 1500);

    const content = response.content[0].text;
    let implementationData;
    
    try {
      const cleanedContent = cleanJsonString(content);
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        implementationData = JSON.parse(jsonMatch[0]);
        
        if (!implementationData.implementationSteps || implementationData.implementationSteps.length !== 4) {
          throw new Error('Did not generate exactly 4 steps');
        }
      } else {
        throw new Error('No JSON found in implementation response');
      }
    } catch (parseError) {
      console.error('JSON parsing error in implementation steps:', parseError);
      implementationData = { 
        implementationSteps: [
          {
            stepNumber: 1,
            title: "Configure ChatFlow",
            description: "Set up basic chatflow in HubSpot Service > Chatflows with appropriate triggers"
          },
          {
            stepNumber: 2,
            title: "Set Targeting Rules",
            description: "Configure visitor targeting based on page URL, behavior, or contact properties"
          },
          {
            stepNumber: 3,
            title: "Test Functionality",
            description: "Test the chatflow with team members to ensure proper functionality and user experience"
          },
          {
            stepNumber: 4,
            title: "Launch and Monitor",
            description: "Deploy to live environment and monitor performance metrics for optimization"
          }
        ]
      };
    }

    res.json(implementationData);
    
  } catch (error) {
    console.error('Error generating implementation steps:', error);
    
    if (error.status === 529) {
      res.status(503).json({ 
        error: 'AI service temporarily overloaded. Please try again in a few moments.',
        retryAfter: 30,
        type: 'overload'
      });
    } else if (error.status === 429) {
      res.status(429).json({ 
        error: 'Rate limit exceeded. Please wait before trying again.',
        retryAfter: 60,
        type: 'rate_limit'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to generate implementation steps. Please try again.',
        type: 'general'
      });
    }
  }
});

// Custom refinement endpoint
app.post('/api/refine-idea-custom', async (req, res) => {
  try {
    const { idea, expectedResult, customRefinement, originalUserInput } = req.body;
    
    const prompt = `You are the lead HubSpot conversational marketing strategist refining an experiment idea based on the team's 94-experiment library knowledge and current HubSpot ChatFlow capabilities.

ORIGINAL CONTEXT: "${cleanJsonString(originalUserInput)}"
CURRENT IDEA: "${cleanJsonString(idea)}"
CURRENT EXPECTED RESULT: "${cleanJsonString(expectedResult)}"
REFINEMENT REQUEST: "${cleanJsonString(customRefinement)}"

HUBSPOT CHATFLOW CONSTRAINTS:
${EXPERIMENT_LIBRARY_CONTEXT.limitations_constraints.join('\n- ')}

AVAILABLE HUBSPOT CAPABILITIES:
- ChatFlow Types: ${EXPERIMENT_LIBRARY_CONTEXT.current_hubspot_capabilities.chatflow_types.join(', ')}
- Integrations: ${EXPERIMENT_LIBRARY_CONTEXT.current_hubspot_capabilities.integrations_available.join(', ')}
- Targeting Options: ${EXPERIMENT_LIBRARY_CONTEXT.current_hubspot_capabilities.targeting_options.join(', ')}

NEVER SUGGEST these already-tested patterns:
${EXPERIMENT_LIBRARY_CONTEXT.extensively_tested_avoid.join('\n- ')}

REFINEMENT PRINCIPLES:
1. Maintain HubSpot implementability using available ChatFlow features
2. Use exact terminology from both original input and refinement request
3. Preserve concise clarity (~40 words, 35-45 range)
4. Avoid the 94 already-tested experiment variations
5. Address both original needs AND refinement request cohesively

SOURCES CITATION REQUIREMENTS:
Use EXACT experiment names and ANY legitimate external sources:
✅ CORRECT INTERNAL: "Bot378 Salesbot: Onsite | EN | Partners", "BAMIC InApp AB Test - EN Pricing Page (All Users) - BOT363"
✅ CORRECT EXTERNAL: "HubSpot Conversational Marketing Report 2024", "Drift Industry Benchmark Study", "Forrester Conversational AI Research", "Harvard Business Review Customer Engagement Analysis"
❌ WRONG: "Salesbot experiment", "BAMIC pattern", "HubSpot feature", "industry data", "research study"

The refined idea should be achievable through HubSpot's current ChatFlow capabilities while incorporating their specific refinement request.

JSON format:
{
  "idea": "[Refined ~40 words using their exact terminology, implementable via HubSpot ChatFlow]",
  "expectedResult": "[Updated percentage] improvement in [their specific metric] based on [relevant experiment pattern], measured through [HubSpot tracking]",
  "sources": ["[EXACT experiment name from library]", "[Specific source or current performance metric]"]
}`;

    const response = await callAnthropicWithRetry(anthropic, {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    }, 3, 1500);

    const content = response.content[0].text;
    let refinedIdea;
    
    try {
      const cleanedContent = cleanJsonString(content);
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        refinedIdea = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in refinement response');
      }
    } catch (parseError) {
      console.error('JSON parsing error in refinement:', parseError);
      refinedIdea = { 
        idea: idea, 
        expectedResult: expectedResult,
        sources: ["System error"]
      };
    }

    res.json(refinedIdea);
    
  } catch (error) {
    console.error('Error refining idea:', error);
    
    if (error.status === 529) {
      res.status(503).json({ 
        error: 'AI service temporarily overloaded. Please try again in a few moments.',
        type: 'overload'
      });
    } else if (error.status === 429) {
      res.status(429).json({ 
        error: 'Rate limit exceeded. Please wait before trying again.',
        type: 'rate_limit'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to refine experiment idea. Please try again.',
        type: 'general'
      });
    }
  }
});

// Legacy refinement endpoint for backward compatibility
app.post('/api/refine-idea', async (req, res) => {
  try {
    const { idea, expectedResult, refinementType } = req.body;
    
    let prompt = `You are a HubSpot conversational marketing strategist with knowledge of 94 team experiments and current ChatFlow capabilities. `;
    
    switch(refinementType) {
      case 'clearer':
        prompt += `Make this experiment concept clearer and more specific while targeting ~40 words and ensuring HubSpot ChatFlow implementability: "${idea}" with expected result: "${expectedResult}".`;
        break;
      case 'concise':
        prompt += `Make this experiment more concise while preserving strategic elements and HubSpot implementability: "${idea}" with expected result: "${expectedResult}". Target ~40 words.`;
        break;
      case 'detailed':
        prompt += `Add strategic detail and HubSpot-specific implementation guidance to this experiment: "${idea}" with expected result: "${expectedResult}". Target ~40 words.`;
        break;
      case 'better':
        prompt += `Enhance this experiment strategy for higher impact and HubSpot ChatFlow specificity: "${idea}" with expected result: "${expectedResult}". Target ~40 words.`;
        break;
    }
    
    prompt += '\n\nEnsure the refined idea is implementable through HubSpot ChatFlow capabilities and avoids the 94 already-tested experiment patterns.\n\nSOURCES CITATION: Use EXACT experiment names (like "Bot378 Salesbot: Onsite | EN | Partners") or ANY legitimate external source (like "HubSpot State of Marketing Report 2024", "Drift Conversational Marketing Benchmark", "Forrester AI Research"), never generic references.\n\nReturn JSON format: {"idea": "refined idea", "expectedResult": "refined result", "sources": ["[EXACT experiment name OR specific external source]", "[Another specific source]"]}';

    const response = await callAnthropicWithRetry(anthropic, {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      temperature: 0.6,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    }, 3, 1000);

    const content = response.content[0].text;
    let refinedIdea;
    
    try {
      const cleanedContent = cleanJsonString(content);
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        refinedIdea = JSON.parse(jsonMatch[0]);
      } else {
        refinedIdea = { idea: idea, expectedResult: expectedResult, sources: ["System error"] };
      }
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      refinedIdea = { idea: idea, expectedResult: expectedResult, sources: ["System error"] };
    }

    res.json(refinedIdea);
    
  } catch (error) {
    console.error('Error:', error);
    
    if (error.status === 529) {
      res.status(503).json({ 
        error: 'AI service temporarily overloaded. Please try again in a few moments.',
        type: 'overload'
      });
    } else if (error.status === 429) {
      res.status(429).json({ 
        error: 'Rate limit exceeded. Please wait before trying again.',
        type: 'rate_limit'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to refine experiment idea. Please try again.',
        type: 'general'
      });
    }
  }
});

// Start server
app.listen(port, () => {
  console.log(`HubSpot Conversational Marketing Experiment Generator running on http://localhost:${port}`);
  console.log(`Enhanced with 94-experiment library knowledge and current HubSpot ChatFlow capabilities`);
  console.log(`KPI Tracking: Active - Usage data will be stored and available for CSV download`);
  console.log(`GitHub Storage:`);
  console.log(`  - Token: ${GITHUB_TOKEN ? 'Configured' : 'Missing'}`);
  console.log(`  - Owner: ${GITHUB_OWNER || 'Missing'}`);
  console.log(`  - Repo: ${GITHUB_REPO || 'Missing'}`);
  console.log(`  - Status: ${GITHUB_TOKEN && GITHUB_OWNER && GITHUB_REPO ? 'Ready' : 'Will use local fallback'}`);
  console.log(`Loaded ${usageData.length} existing usage records`);
  console.log(`Enhanced API retry logic added - ready to handle overload errors!`);
});