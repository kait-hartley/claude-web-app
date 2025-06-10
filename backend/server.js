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

// Serve React app for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

// HubSpot Conversational Marketing Experiment Library Context (Based on 2024-2025 Data)

const EXPERIMENT_LIBRARY_CONTEXT = {
  tested_patterns: {
    'Demo RFF': {
      experiments: 3,
      description: 'Reducing demo request questions from 7 to 4, self-service completion',
      metrics: ['Demo CVR', 'Quick Reply Click'],
      impact_range: [37.78, 625, 145] // min, max, typical %
    },
    'Salesbot Deflection': {
      experiments: 29,
      description: 'GenAI integration, TOFU/BOFU implementations, affiliate marketing',
      metrics: ['Deflection Rate'],
      impact_range: [5.8, 35, 15] // % improvements observed
    },
    'Pass Rate Optimization': {
      experiments: 16,
      description: 'Conversation handoff quality, qualification improvements',
      metrics: ['Pass Rate', 'IQL Volume'],
      impact_range: [12, 85, 45]
    },
    'Engagement Rate': {
      experiments: 10,
      description: 'Quick replies, GenAI implementations, conversation flow',
      metrics: ['Engagement Rate', 'Value per Chat'],
      impact_range: [8, 120, 35]
    },
    'BAMIC (Book a Meeting in Chat)': {
      experiments: 3,
      description: 'Meeting booking optimization within chat interface',
      metrics: ['BAMIC CVR', 'Meeting QLs'],
      impact_range: [15, 45, 28]
    },
    'Multi-language Implementations': {
      experiments: 8,
      description: 'ES, FR, DE, JA localization experiments',
      metrics: ['Deflection Rate', 'Engagement Rate'],
      impact_range: [10, 75, 30]
    }
  },
  
  primary_metrics: [
    'Deflection Rate', 'Pass Rate', 'Engagement Rate', 'IQL Volume', 
    'Demo CVR', 'MRR', 'Meeting QLs', 'BAMIC CVR', 'Value per Chat',
    'Demo QL Volume', 'Free Trial QL Volume', 'CSAT'
  ],
  
  page_contexts: [
    'pricing pages', 'demo pages', 'product pages', 'knowledge base',
    'academy pages', 'affiliate marketing', 'catchall pages', 'homepage'
  ],
  
  hubspot_integrations: [
    'lead scoring', 'workflows', 'smart content', 'contact properties',
    'sequences', 'attribution reporting', 'conversation intelligence',
    'propensity scoring', 'ISC routing', 'meeting scheduling'
  ],
  
  successful_approaches: [
    'progressive qualification', 'contextual quick replies', 'GenAI self-service',
    'smart routing based on intent', 'mobile-first experiences',
    'integration-triggered workflows', 'behavioral personalization'
  ]
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
        
        // Extract experiment data specifically
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
      
      // Clean up uploaded file
      fs.unlinkSync(file.path);
      
    } catch (error) {
      console.error('Error processing file:', file.originalname, error);
    }
  }
  
  return analysis;
}

javascript// KPI Context Definitions
const KPI_CONTEXT = {
  engagement_rate: {
    definition: "Bot Engagement divided by Page Views - measures how many visitors actually start interacting with the chatbot",
    chatbotFocus: "Improve conversation triggers, opening messages, and initial user experience to get more visitors engaging",
    successMetrics: ["higher click-through on bot prompts", "increased conversation starts", "reduced bounce rate on chat pages"]
  },
  deflection_rate: {
    definition: "Bot Handled chats divided by Bot engagements - measures bot's ability to resolve issues without human handoff", 
    chatbotFocus: "Enhance bot knowledge base, improve response accuracy, add better self-service flows",
    successMetrics: ["fewer ISC handoffs", "higher bot completion rates", "maintained or improved user satisfaction"]
  },
  handoff_rate: {
    definition: "ISC Handled Chats divided by Bot Engagements - measures when bot transfers to human agents",
    chatbotFocus: "Optimize handoff triggers, improve bot capability before transfer, reduce unnecessary escalations",
    successMetrics: ["more qualified handoffs", "reduced ISC workload", "better handoff context"]
  },
  chat_iql: {
    definition: "Inbound Qualified Leads via Chat - measures lead generation through chat interactions",
    chatbotFocus: "Improve lead qualification flows, optimize conversation paths to capture high-intent prospects",
    successMetrics: ["higher lead qualification rates", "better lead quality scores", "increased pipeline contribution"]
  },
  pass_rate: {
    definition: "IQLs divided by Handled Chats - measures quality of leads passed from chat to sales",
    chatbotFocus: "Enhance qualification criteria, improve ISC training, optimize handoff processes",
    successMetrics: ["higher sales acceptance rates", "improved lead-to-opportunity conversion", "reduced sales friction"]
  },
  isc_iqls: {
    definition: "Number of handled chats forwarded to sales by ISC - measures ISC efficiency in lead qualification",
    chatbotFocus: "Support ISC with better qualification tools, conversation intelligence, and routing optimization",
    successMetrics: ["more qualified leads passed", "improved ISC productivity", "better sales outcomes"]
  },
  csat: {
    definition: "Customer Satisfaction scores for chat interactions - measures user experience quality",
    chatbotFocus: "Improve conversation quality, response accuracy, and overall user experience in chat",
    successMetrics: ["higher satisfaction ratings", "reduced negative feedback", "improved user retention"]
  },
  mrr: {
    definition: "Monthly Recurring Revenue impact from chat interactions - measures revenue attribution",
    chatbotFocus: "Optimize conversion paths, improve upsell/cross-sell opportunities, enhance customer journey",
    successMetrics: ["increased revenue attribution", "higher conversion rates", "improved customer lifetime value"]
  },
  bamic: {
    definition: "Book a Meeting in Chat - measures meeting booking conversions through chat interface",
    chatbotFocus: "Streamline booking flows, reduce friction in scheduling, improve meeting qualification",
    successMetrics: ["higher meeting booking rates", "reduced booking abandonment", "improved meeting show rates"]
  },
  genai_ql: {
    definition: "AI-generated Qualified Leads based on propensity scoring without human involvement",
    chatbotFocus: "Enhance AI qualification algorithms, improve automated lead scoring, optimize self-service qualification",
    successMetrics: ["higher AI qualification accuracy", "reduced human involvement", "maintained lead quality"]
  },
  demo_rff: {
    definition: "Demo booking with reduced form fields - measures simplified demo request conversion",
    chatbotFocus: "Optimize demo request flows, reduce form friction, improve demo qualification processes",
    successMetrics: ["higher demo request completion", "reduced form abandonment", "improved demo show rates"]
  }
};

// Enhanced idea generation with KPI and file context
app.post('/api/generate-ideas', upload.array('files'), async (req, res) => {
  try {
    const { userInput, selectedKPI, customKPI } = req.body;
    const files = req.files || [];
    
    // Analyze uploaded files
    const fileAnalysis = await analyzeUploadedFiles(files);
    
    // Get KPI-specific context
    const kpiInfo = selectedKPI ? KPI_CONTEXT[selectedKPI] : null;
    
    let enhancedPrompt = `You are the lead conversational marketing strategist at HubSpot with deep knowledge of the team's 116+ experiment library from 2024-2025. Generate 10 NEVER-TESTED but strategically related experiment ideas.

USER INPUT: "${userInput}"`;

    // Add KPI-specific context if selected
    if (kpiInfo) {
      enhancedPrompt += `

TARGET KPI: ${kpiInfo.definition}
KPI FOCUS: ${kpiInfo.chatbotFocus}
SUCCESS METRICS: ${kpiInfo.successMetrics.join(', ')}

CRITICAL: Every idea must be specifically designed to improve ${selectedKPI} through chatbot/conversation interface optimization.`;
    }

    // Handle custom KPI
    if (selectedKPI === 'other' && customKPI) {
      enhancedPrompt += `

CUSTOM TARGET KPI: ${customKPI}
Use the uploaded files to understand what this KPI means and how to improve it through chatbot optimization.`;
    }

    // Add file analysis context if files were uploaded
    if (fileAnalysis.userContext.trim()) {
      enhancedPrompt += `

UPLOADED FILE CONTEXT:
${fileAnalysis.userContext}

NEVER SUGGEST these already-tested approaches:
${fileAnalysis.alreadyTested.join('\n')}

Use the uploaded context to make ideas highly specific to the user's situation and avoid previously tested approaches.`;
    }

    enhancedPrompt += `

STEP 1 - COMPREHENSIVE INPUT ANALYSIS:
Systematically extract EVERY element from their input:
- Primary goals/objectives mentioned
- Specific metrics or KPIs referenced  
- Target audiences or segments specified
- Page types or contexts mentioned
- Constraints or requirements stated
- Current challenges or pain points
- Technology or tools referenced
- Timeline or urgency indicators
- Geographic or language elements
- Company size or industry context

STEP 2 - DIRECT RESPONSE MAPPING:
Each idea MUST directly address specific parts of their input:
- Use their EXACT terminology and language
- Reference their specific page types, audiences, metrics
- Address their stated constraints or requirements
- Build on their mentioned challenges or goals

ALL IDEAS MUST BE CHATBOT/CONVERSATION SPECIFIC:
- Focus on chat flows, bot responses, conversation logic
- NOT website changes, mobile apps, or email campaigns
- Specifically about improving chat/bot interactions
- Implementable through conversational interfaces

UNIVERSAL REQUIREMENTS FOR ALL IDEAS:

1. NEVER-TESTED IDEAS: Generate concepts that build on proven patterns but explore untested angles, combinations, or applications

2. HYPER-RELEVANT TARGETING: Each idea must feel like it was written by someone who deeply understands their exact situation and addresses specific elements from their input

3. CONCISE CONSISTENCY: Each idea should target ~40 words with natural variation (35-45 words) while staying focused and specific

4. CHATBOT-ONLY FOCUS: All ideas must be implementable through chat/bot interfaces, not other channels

5. COMPREHENSIVE COVERAGE: Collectively address every aspect of their input across the 10 ideas

EXPECTED RESULTS CALIBRATION:
Base estimates on actual experiment library data:
- Deflection improvements: 6-35% (avg 15%)
- Demo/Meeting conversions: 15-625% (highly variable by approach)
- Pass rate improvements: 12-85% (avg 45%)  
- Engagement lifts: 8-120% (avg 35%)
- IQL volume increases: 10-65% (avg 25%)

Include primary success factor and measurement approach for each expected result.

JSON format:
{
  "ideas": [
    {
      "idea": "[~40 words directly addressing specific elements from their input, using their exact terminology and context, feeling custom-written for their situation, focusing on chatbot implementation]",
      "expectedResult": "[X-Y%] improvement in [specific metric they mentioned or implied] based on [related experiment pattern], requiring [key success factor relevant to their context]"
    }
  ]
}

Generate ideas that feel like they were created by someone who carefully analyzed every word of their input and created custom chatbot solutions for their exact needs.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 5000,
      temperature: 0.8,
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
          expectedResult: "Unable to generate experiment recommendations without clear input context" 
        }] 
      };
    }

    res.json(ideas);
  } catch (error) {
    console.error('Error generating ideas:', error);
    res.status(500).json({ error: 'Failed to generate experiment ideas' });
  }
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
          expectedResult: "Unable to generate experiment recommendations without clear input context" 
        }] 
      };
    }

    res.json(ideas);
  } catch (error) {
    console.error('Error generating ideas:', error);
    res.status(500).json({ error: 'Failed to generate experiment ideas' });
  }
});

// Enhanced dynamic refinement with experiment context
app.post('/api/refine-idea-custom', async (req, res) => {
  try {
    const { idea, expectedResult, customRefinement, originalUserInput } = req.body;
    
    const prompt = `You are the lead HubSpot conversational marketing strategist refining an experiment idea based on the team's 116+ experiment library knowledge.

ORIGINAL CONTEXT: "${originalUserInput}"
CURRENT IDEA: "${idea}"
CURRENT EXPECTED RESULT: "${expectedResult}"
REFINEMENT REQUEST: "${customRefinement}"

STEP 1 - ANALYZE ORIGINAL INPUT ELEMENTS:
Systematically identify what they originally asked for:
- Their specific goals, metrics, audiences, pages, constraints
- Their exact terminology and language
- Their stated challenges or requirements

STEP 2 - PARSE REFINEMENT REQUEST:
Understand exactly what they want changed:
- Are they adding new requirements or constraints?
- Are they changing the target audience or context?
- Are they requesting different metrics or approaches?
- Are they asking for more/less specificity?

STEP 3 - INTEGRATE BOTH CONTEXTS:
Create refined idea that:
- Maintains relevance to original input using their exact words
- Incorporates their refinement request precisely
- Uses their terminology from both original and refinement requests
- Addresses their specific situation comprehensively

EXPERIMENT LIBRARY CONTEXT:
- 29 Salesbot Deflection experiments (6-35% improvements)
- 16 Pass Rate experiments (12-85% improvements)
- 10 Engagement Rate experiments (8-120% improvements)
- Proven GenAI, Progressive Qualification, Smart Routing patterns
- Multi-language, BAMIC, Demo RFF successful implementations

REFINEMENT PRINCIPLES:

1. MAINTAIN HYPER-RELEVANCE: Keep all references to their original specific context while integrating their refinement request

2. USE EXACT TERMINOLOGY: Reference their specific words, pages, audiences, metrics from both original input and refinement request

3. PRESERVE CONCISE CLARITY: Refined idea should target ~40 words (35-45 range) with maximum relevance to their combined requests

4. NEVER-TESTED FOCUS: Ensure refinement doesn't create something already tested in library

5. COMPREHENSIVE INTEGRATION: Address both their original needs AND their refinement request in a cohesive way

DYNAMIC REFINEMENT HANDLING:

IF requesting MORE SPECIFIC: Add precise details while using their exact context and terminology
IF requesting DIFFERENT AUDIENCE: Reframe completely for new segment while maintaining their original goals/pages/metrics  
IF requesting ADDITIONAL FEATURES: Integrate new functionality seamlessly with their original specific context
IF requesting SIMPLER: Focus on core concept while maintaining their specific audience/page/metric references
IF requesting METRIC CHANGES: Adjust to requested metric while preserving their original context and constraints

The refined idea should feel like it was written by someone who deeply understands both their original situation AND their specific refinement needs.

JSON format:
{
  "idea": "[Refined ~40 words using their exact terminology from both original input and refinement request, addressing their specific combined context]",
  "expectedResult": "[Updated percentage range] improvement in [their specific metric] based on [relevant experiment library pattern], requiring [success factor relevant to their combined context]"
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
      console.error('Raw refinement response:', content);
      refinedIdea = { 
        idea: idea, 
        expectedResult: expectedResult
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
    
    let prompt = `You are a HubSpot conversational marketing strategist with knowledge of 116+ team experiments. `;
    
    switch(refinementType) {
      case 'clearer':
        prompt += `Make this experiment concept clearer and more specific while targeting ~40 words: "${idea}" with expected result: "${expectedResult}". Keep strategic focus and high relevance.`;
        break;
      case 'concise':
        prompt += `Make this experiment more concise while preserving strategic elements and specificity: "${idea}" with expected result: "${expectedResult}". Target ~40 words (35-45 range) with high clarity.`;
        break;
      case 'detailed':
        prompt += `Add strategic detail and specificity to this experiment concept: "${idea}" with expected result: "${expectedResult}". Include precise HubSpot tool integration, targeting ~40 words.`;
        break;
      case 'better':
        prompt += `Enhance this experiment strategy for higher impact and specificity: "${idea}" with expected result: "${expectedResult}". Base improvements on experiment library patterns, targeting ~40 words.`;
        break;
    }
    
    prompt += '\n\nEnsure the refined idea remains never-tested but builds on proven experiment patterns. Focus on concise clarity and high specificity (~40 words, 35-45 range).\n\nReturn JSON format: {"idea": "refined idea", "expectedResult": "refined result"}';

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
      refinedIdea = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      refinedIdea = { idea: idea, expectedResult: expectedResult };
    }

    res.json(refinedIdea);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to refine experiment idea' });
  }
});

app.listen(port, () => {
  console.log(`HubSpot Conversational Marketing Experiment Generator running on http://localhost:${port}`);
  console.log(`Powered by experiment library with 116+ proven patterns`);
});
