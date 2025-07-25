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

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Setup file upload handling
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

// Serve React build files
app.use(express.static(path.join(__dirname, '../frontend/build')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

// UPDATED: Real-time Team Context from 2025 Marketing-ISC Performance Readout
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

// Enhanced KPI Context with HubSpot-specific implementation guidance
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

// File processing function (unchanged)
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

// UPDATED: Enhanced idea generation - NOW GENERATES 7 IDEAS
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

STEP 1 - COMPREHENSIVE INPUT ANALYSIS:
Extract EVERY element from their input:
- Primary goals/objectives mentioned
- Specific metrics or KPIs referenced  
- Target audiences or segments specified
- Page types or contexts mentioned
- Constraints or requirements stated
- Current challenges or pain points
- Technology or tools referenced
- Timeline or urgency indicators

STEP 2 - DIRECT RESPONSE MAPPING:
Each idea MUST directly address specific parts of their input using their EXACT terminology and language.

IDEA GENERATION APPROACH:

1. HYPER-TARGETED TO INPUT: Every idea must directly address the specific problem, audience, and context mentioned in the user's input

2. NATURAL VARIETY: Ideas should be different approaches to the SAME core problem - not artificial variety across unrelated areas

3. INPUT-DRIVEN SOLUTIONS: Generate ideas that feel like they were created by someone who deeply understands their exact situation and challenges

4. CONTEXTUAL RELEVANCE: Use their specific terminology, constraints, stakeholders, and success metrics mentioned

5. PROBLEM-CENTRIC: All 7 ideas should attack their stated problem from different angles, not different problems entirely

DISTINCTIVENESS WITHIN CONTEXT:
- Different implementation approaches to the SAME challenge
- Different HubSpot tools that could solve THEIR specific problem  
- Different complexity levels for THEIR stated needs
- Different measurement approaches for THEIR success metrics
- Different audience segments within THEIR context

AVOID FORCED PATTERNS:
Do not artificially force ideas into predetermined categories (Salesbot, BAMIC, etc.) unless they directly address the user's specific input. Every idea should feel custom-built for their exact challenge.

UNIVERSAL REQUIREMENTS FOR ALL 7 IDEAS:

1. NEVER-TESTED BUT IMPLEMENTABLE: Build on proven patterns but explore untested angles that are achievable with current team bandwidth and technical capabilities

2. LOW-TO-MEDIUM COMPLEXITY FOCUS: Prioritize ideas that can be implemented without extensive development, training, or multi-team coordination

3. HUBSPOT-NATIVE SOLUTIONS: Each idea must be achievable using current HubSpot ChatFlow capabilities and standard integrations

4. HYPER-RELEVANT TARGETING: Feel custom-written for their exact situation using their specific terminology

5. QUICK-TO-MODERATE IMPLEMENTATION: Target ideas that can show results within 2-8 weeks, not months

6. CONVERSATIONAL MARKETING TEAM FRIENDLY: Consider ideas that align with team expertise in chat optimization, bot management, and conversation experience design

EXPECTED RESULTS CALIBRATION:
Base estimates on current team performance context:
- QL Volume Recovery: Target ideas that could help reverse -4% MoM, -26% YoY decline
- Chat Engagement: Ideas to reverse -2% MoM bot chat volume decline
- Tagging Accuracy: Improvements toward 90% goal (from current 78.3%)
- Digital Channel Optimization: Build on 180% MRR attainment success
- Deflection Rate: Maintain/improve current 76% performance
- Self-Service Progression: Ideas supporting journey to 30%+ self-service MRR

PRIORITY ALIGNMENT:
Every idea must directly address at least one current performance challenge:
1. QL volume decline reversal
2. Chat engagement improvements  
3. Qualification process enhancement
4. Digital channel optimization
5. Self-service journey progression

SOURCES CITATION REQUIREMENTS:
For the "sources" field, you MUST cite specific, traceable sources:

1. EXACT EXPERIMENT NAMES from the library (never generic references):
   ✅ CORRECT: "Bot378 Salesbot: Onsite | EN | Partners"
   ✅ CORRECT: "BAMIC InApp AB Test - EN Pricing Page (All Users) - BOT363"  
   ✅ CORRECT: "Bot406 CRM Catchall AM - Adding Demo RFF"
   ❌ WRONG: "Salesbot experiment", "BAMIC pattern", "Demo RFF success"

2. EXTERNAL SOURCES - Cite ANY legitimate external source you know about:
   ✅ CORRECT: "HubSpot State of Marketing Report 2024", "HubSpot Conversational Marketing Benchmark 2024", "HubSpot Customer Service Trends Report"
   ✅ CORRECT: "Drift Conversational Marketing Report 2024", "Intercom Customer Engagement Study 2024", "LiveChat Industry Benchmark"
   ✅ CORRECT: "Salesforce State of Connected Customer Report", "Zendesk CX Trends Report", "Gartner Customer Service Technology Study"
   ✅ CORRECT: "Forrester Conversational AI Research", "McKinsey Customer Journey Analysis", "Deloitte Digital Experience Study"
   ✅ CORRECT: "Harvard Business Review Customer Engagement Research", "MIT Technology Review AI Adoption Study"
   ✅ CORRECT: "Google Analytics Industry Benchmarks", "Facebook Business Performance Data", "LinkedIn Marketing Solutions Report"
   
   Use ANY specific, named external source - not limited to these examples. Include:
   - HubSpot's own reports, studies, and research
   - Industry benchmark reports (Drift, Intercom, Salesforce, Zendesk, etc.)
   - Research firms (Gartner, Forrester, McKinsey, Deloitte, PwC, etc.)
   - Academic studies (Harvard, MIT, Stanford, etc.)
   - Platform performance data (Google, Facebook, LinkedIn, etc.)
   - Any other legitimate, named external source
   
   ❌ WRONG: "Industry benchmark", "Public data", "Research study", "External report"

3. CURRENT TEAM PERFORMANCE DATA when referencing provided metrics:
   ✅ CORRECT: "Current deflection rate performance (76%, +3pts MoM)"
   ✅ CORRECT: "Digital channel success pattern (180% MRR attainment)"
   ❌ WRONG: "Team performance", "Current metrics"

FULL EXPERIMENT LIBRARY AVAILABLE FOR CITATION (90 unique experiments):
You have access to cite ANY of these exact experiment names as sources. Here are examples by category:

Demo RFF (5 total): "Bot406 CRM Catchall AM - Adding Demo RFF", "Bot362 Demo Paid LP - Replacing QR Demo with RFF", "Bot 376 Homepage - Adding QR Book a Demo with RFF", "BOT356 - Demo RFF - Replace actual Demo QL in Chat - FR CRM Signup", "BOT331: RFF & Demo QL within Chat"

Salesbot (17 total): "Bot378 Salesbot: Onsite | EN | Partners", "Bot397 Salesbot - Onsite | EN | Competitive pages", "Bot383 Salesbot - Marketing Catchall AM", "Bot 381 Adding Salesbot to Case Studies chatbot", "BOT 336 | Onsite | EN | Contact Sales | GAI | Salesbot", "Bot361 adding Gen Ai to Affiliate Marketing CRM Catchall", "Adding Salesbot to Website Themes", "Self-Service Bot vs SalesBot on InApp | EN | Academy | Generative AI"

BAMIC (15 total): "BAMIC InApp AB Test - EN Pricing Page (All Users) - BOT363", "Salesbot on InApp Pricing (1-10 EE) AB Test - BOT365", "Bot 407 | Onsite | EN | Contact Sales | GAI | Salesbot | BAMIC", "BOT388 - BAMIC New Module - EN InApp Pricing Pages", "BOT 325 - FR InApp pricing Pages - BAMIC", "BOT 310 BAM Experiment FR Pricing Page"

Self Service Bot (19 total): "Bot 313: Generative AI on Marketing Hub Product Homepage", "Bot 316: Generative AI Catchall on EN Product Pages", "Bot 320: Generative AI on CRM Paid LP (2.0)", "BOT373 - Generative AI on InApp DACH Help-in the Nav", "Generative AI BOT345 Onsite DACH HomePage", "Generative AI BOT355 Onsite Offer Demo Pages"

Quick Replies (6 total): "Experiment w/ QR on EN Knowledge Base Generative AI", "QR Optimization on InApp | EN | Academy | Generative AI", "QRs on FR Knowledge Base - Generative AI", "Quick Win Sprint Experiment"

Plus experiments in: Revamp, Net New, Sales Bot, Contact Us Bot, Mobile Targeting, Demo QL, Welcome Message, Chat Display Behavior, and more.

IMPORTANT: These are just examples - you can cite ANY of the 90 unique experiment names from the complete library.

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

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 6000,
      temperature: 0.85, // Balanced creativity with consistency
      messages: [
        {
          role: 'user',
          content: enhancedPrompt
        }
      ]
    });

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
    res.status(500).json({ error: 'Failed to generate experiment ideas' });
  }
});

// NEW: Implementation Steps API endpoint
app.post('/api/implementation-steps', async (req, res) => {
  try {
    const { idea, expectedResult, originalUserInput } = req.body;
    
    const prompt = `You are a HubSpot conversational marketing implementation expert. Generate exactly 4 high-level, HubSpot-tool-specific implementation steps for this experiment idea.

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
4. Maximum 4 Steps: Keep it focused and achievable - no more than 4 steps total
5. Include Testing: Always include a testing/validation step

STEP FORMAT:
- Start with action verb (Configure, Set up, Create, Test, Launch)
- Reference specific HubSpot tools/features
- Keep each step to 1-2 sentences maximum
- Include key settings or considerations

JSON format:
{
  "implementationSteps": [
    {
      "stepNumber": 1,
      "title": "[Action Verb] [HubSpot Feature]",
      "description": "[Brief description of what to do in this HubSpot tool/feature]"
    }
  ]
}

Generate practical HubSpot implementation steps that convert this experiment idea into actionable tasks.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0.6,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.content[0].text;
    let implementationData;
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        implementationData = JSON.parse(jsonMatch[0]);
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
            description: "Set up basic chatflow in HubSpot Service > Chatflows"
          }
        ]
      };
    }

    res.json(implementationData);
  } catch (error) {
    console.error('Error generating implementation steps:', error);
    res.status(500).json({ error: 'Failed to generate implementation steps' });
  }
});

// Enhanced refinement with HubSpot capabilities context
app.post('/api/refine-idea-custom', async (req, res) => {
  try {
    const { idea, expectedResult, customRefinement, originalUserInput } = req.body;
    
    const prompt = `You are the lead HubSpot conversational marketing strategist refining an experiment idea based on the team's 94-experiment library knowledge and current HubSpot ChatFlow capabilities.

ORIGINAL CONTEXT: "${originalUserInput}"
CURRENT IDEA: "${idea}"
CURRENT EXPECTED RESULT: "${expectedResult}"
REFINEMENT REQUEST: "${customRefinement}"

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

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.content[0].text;
    let refinedIdea;
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
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
    res.status(500).json({ error: 'Failed to refine experiment idea' });
  }
});

// Keep original refinement endpoint for backward compatibility
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

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      temperature: 0.6,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.content[0].text;
    let refinedIdea;
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
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
    res.status(500).json({ error: 'Failed to refine experiment idea' });
  }
});

app.listen(port, () => {
  console.log(`HubSpot Conversational Marketing Experiment Generator running on http://localhost:${port}`);
  console.log(`Enhanced with 94-experiment library knowledge and current HubSpot ChatFlow capabilities`);
});