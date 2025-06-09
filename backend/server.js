const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3002;

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.use(cors());
app.use(express.json());

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

// Enhanced idea generation with experiment library context
app.post('/api/generate-ideas', async (req, res) => {
  try {
    const { userInput } = req.body;
    
    const prompt = `You are the lead conversational marketing strategist at HubSpot with deep knowledge of the team's 116+ experiment library from 2024-2025. Generate 10 NEVER-TESTED but strategically related experiment ideas.

USER INPUT: "${userInput}"

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
- If they mention "enterprise prospects" - every idea should reference enterprise specifically
- If they mention "pricing pages" - ideas should be pricing-page focused
- If they mention specific metrics - ideas should target those exact metrics

STEP 3 - COMPREHENSIVE COVERAGE:
Ensure ideas collectively address ALL aspects of their input:
- Don't ignore any part of what they wrote
- If they mention multiple elements, distribute coverage across ideas
- Each idea should feel custom-written for their exact situation
- Ideas should reference different combinations of their input elements

EXPERIMENT LIBRARY CONTEXT:
Your team has extensively tested:
- Demo RFF optimization (3 experiments): 38-625% Demo CVR improvements
- Salesbot Deflection (29 experiments): 6-35% deflection rate improvements  
- Pass Rate optimization (16 experiments): 12-85% pass rate improvements
- Engagement Rate experiments (10 experiments): 8-120% engagement improvements
- BAMIC implementations (3 experiments): 15-45% meeting booking improvements
- Multi-language rollouts (8 experiments): 10-75% localized improvements
- GenAI integrations across TOFU/BOFU pages
- Quick Reply optimizations for knowledge base and academy
- Propensity scoring for ISC routing
- Progressive qualification workflows

STEP 4 - ADAPTIVE RESPONSE STRATEGY:

IF INPUT IS VAGUE (like "improve chat" or "boost conversions"):
- Extract implied context (industry: SaaS, audience: prospects, likely pages: pricing/demo)
- Generate ideas that educate them on specific strategic possibilities
- Use HubSpot-specific terminology to add context they didn't provide
- Each idea should reference different specific scenarios within their vague goal

IF INPUT IS MODERATELY SPECIFIC (mentions some context):
- Extract and amplify EVERY detail they provided
- Use their exact words multiple times across ideas
- Add complementary context that builds on what they mentioned
- Ensure each idea feels semi-custom to their stated situation

IF INPUT IS HIGHLY SPECIFIC (detailed context, constraints, metrics):
- Use EVERY element they provided in multiple ideas
- Reference their exact language, pages, audiences, metrics extensively
- Build variations that address different aspects of their specific situation
- Each idea should feel like a custom strategy written specifically for them

EXAMPLES OF HYPER-RELEVANT TARGETING:

If user says "improve demo bookings for enterprise prospects on pricing pages":
✅ GOOD: "Deploy lead scoring-triggered chat sequences that identify enterprise visitors on pricing pages and offer personalized demo booking with dedicated AE routing"
❌ BAD: "Use chatbots to help with demo scheduling" (ignores enterprise, pricing pages, personalization needs)

If user says "reduce support tickets while maintaining CSAT":
✅ GOOD: "Implement progressive GenAI deflection on knowledge base pages that escalates to live agents when satisfaction signals drop below threshold"
❌ BAD: "Add FAQ chatbot" (ignores CSAT requirement and deflection context)

If user says "multi-language chat for European prospects":
✅ GOOD: "Create localized chat workflows for DE/FR/ES markets with region-specific lead routing and culturally-adapted conversation flows"
❌ BAD: "Translate chat messages" (ignores routing, cultural adaptation, specific regions)

UNIVERSAL REQUIREMENTS FOR ALL IDEAS:

1. NEVER-TESTED IDEAS: Generate concepts that build on proven patterns but explore untested angles, combinations, or applications

2. HYPER-RELEVANT TARGETING: Each idea must feel like it was written by someone who deeply understands their exact situation and addresses specific elements from their input

3. CONCISE CONSISTENCY: Each idea should target ~40 words with natural variation (35-45 words) while staying focused and specific

4. DIRECT INPUT INTEGRATION: Use their exact words, reference their specific context, and make every idea feel custom-tailored to their request

6. COMPREHENSIVE COVERAGE: Collectively address every aspect of their input across the 10 ideas

VALIDATION CHECK FOR EACH IDEA:
Before finalizing each idea, verify:
- Does it use their exact terminology and context?
- Does it address specific elements from their input?
- Would they recognize this as directly relevant to their request?
- Does it feel custom-written for their exact situation?
- Have I ignored any part of what they asked for?

IDEA GENERATION APPROACH:
- Parse their input for EVERY detail and use those details extensively
- Generate ideas that reference specific combinations of their input elements
- Use their exact terminology and phrasing throughout
- Make each idea feel like a direct response to their specific situation
- Ensure no aspect of their input is ignored or overlooked
- Natural length variation targeting ~40 words (35-45 word range) while staying hyper-relevant

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
      "idea": "[~40 words directly addressing specific elements from their input, using their exact terminology and context, feeling custom-written for their situation]",
      "expectedResult": "[X-Y%] improvement in [specific metric they mentioned or implied] based on [related experiment pattern], requiring [key success factor relevant to their context]"
    }
  ]
}

Generate ideas that feel like they were created by someone who carefully analyzed every word of their input and created custom solutions for their exact needs.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 5000,
      temperature: 0.8,
      messages: [
        {
          role: 'user',
          content: prompt
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