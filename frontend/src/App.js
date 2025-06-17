import React, { useState, useEffect, useCallback } from 'react'
import { Zap, MessageCircle, Settings, ArrowLeft, Send, Copy, CheckCircle, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import './App.css';

function App() {
 
// Auth state
const [isAuthenticated, setIsAuthenticated] = useState(false);
const [authInput, setAuthInput] = useState('');
  
// App state
const [currentScreen, setCurrentScreen] = useState('input');
const [userInput, setUserInput] = useState('');
const [ideas, setIdeas] = useState([]);
const [isGenerating, setIsGenerating] = useState(false);
const [refinementInputs, setRefinementInputs] = useState({});
const [isRefining, setIsRefining] = useState({});
const [error, setError] = useState(null);
const [retryCount, setRetryCount] = useState(0);
const [copiedIdeas, setCopiedIdeas] = useState({});
const [selectedKPI, setSelectedKPI] = useState('');
const [uploadedFiles, setUploadedFiles] = useState([]);
const [customKPI, setCustomKPI] = useState('');

// Implementation steps and sorting state
const [implementationSteps, setImplementationSteps] = useState({});
const [loadingSteps, setLoadingSteps] = useState({});
const [sortOption, setSortOption] = useState('');
const [expandedSteps, setExpandedSteps] = useState({});

// KPI Tracking state - UPDATED FOR FORM-BASED TRACKING
const [userName, setUserName] = useState('');
const [sessionId, setSessionId] = useState(null);
const [sessionStarted, setSessionStarted] = useState(false);

// Simple auth check
const handleAuth = (e) => {
  e.preventDefault();
  if (authInput === 'testing-idea-gen-tool2025!') {
    setIsAuthenticated(true);
  } else {
    alert('Incorrect password');
  }
};

// FIXED: Create session and properly set state
const createSession = async () => {
  if (sessionStarted || !userName.trim()) return;
  
  const newSessionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  console.log('🔍 FRONTEND: Creating session with ID:', newSessionId);
  
  try {
    const response = await fetch('https://claude-web-app.onrender.com/api/start-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userName: userName.trim(),
        sessionId: newSessionId,
        timestamp: new Date().toISOString(),
        userInput: userInput,
        selectedKPI: selectedKPI,
        customKPI: customKPI
      })
    });
    
    if (response.ok) {
      console.log('✅ FRONTEND: Session created successfully, setting state');
      setSessionId(newSessionId);  // ← CRITICAL: This sets the state
      setSessionStarted(true);
      console.log('✅ FRONTEND: Session state updated, sessionId:', newSessionId);
    } else {
      console.error('❌ FRONTEND: Session creation failed:', response.status);
    }
  } catch (error) {
    console.error('❌ FRONTEND: Error creating session:', error);
  }
};
    
    setSessionId(newSessionId);
    setSessionStarted(true);
    console.log('✅ FRONTEND: Session created:', newSessionId);
  } catch (error) {
    console.error('❌ FRONTEND: Error creating session:', error);
  }
};

// FIXED: Form submission tracking function
const trackFormSubmission = async () => {
  console.log('🔍 FRONTEND: trackFormSubmission called');
  console.log('🔍 FRONTEND: sessionId:', sessionId);
  console.log('🔍 FRONTEND: userInput length:', userInput?.length);
  
  if (!sessionId) {
    console.log('❌ FRONTEND: Cannot track form submission - no sessionId');
    return;
  }
  
  try {
    const response = await fetch('https://claude-web-app.onrender.com/api/track-form-submission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        userInput: userInput,
        selectedKPI: selectedKPI,
        customKPI: customKPI
      })
    });
    
    if (response.ok) {
      console.log('✅ FRONTEND: Form submission tracked successfully');
    } else {
      console.log('❌ FRONTEND: Form submission tracking failed:', response.status);
    }
  } catch (error) {
    console.error('❌ FRONTEND: Error tracking form submission:', error);
  }
};

// End session with proper error handling
const endSession = useCallback(async () => {
  if (!sessionId) return;
  
  try {
    console.log('🔍 FRONTEND: Ending session:', sessionId);
    const response = await fetch('https://claude-web-app.onrender.com/api/end-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionId })
    });
    
    if (response.ok) {
      console.log('✅ FRONTEND: Session ended successfully');
    } else {
      console.log('❌ FRONTEND: Session end failed:', response.status);
    }
  } catch (error) {
    console.error('❌ FRONTEND: Error ending session:', error);
  }
}, [sessionId]);

// Download usage data function
const downloadUsageData = () => {
  window.open('https://claude-web-app.onrender.com/api/download-usage-data', '_blank');
};

// Session cleanup effect
useEffect(() => {
  const handleBeforeUnload = () => {
    if (sessionId) {
      // Use fetch with keepalive instead of sendBeacon
      fetch('https://claude-web-app.onrender.com/api/end-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
        keepalive: true
      }).catch(() => {}); // Ignore errors on page unload
    }
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    // Call endSession when component unmounts
    if (sessionId) {
      endSession();
    }
  };
}, [sessionId, endSession]);

// Show auth screen if not authenticated
if (!isAuthenticated) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fff7ed 0%, #eff6ff 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Lexend, sans-serif'
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        maxWidth: '400px',
        width: '100%'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#2d3748' }}>
          Access Required
        </h2>
        <form onSubmit={handleAuth}>
          <input
            type="password"
            placeholder="Enter password"
            value={authInput}
            onChange={(e) => setAuthInput(e.target.value)}
            style={{
              width: '100%',
              padding: '1rem',
              border: '2px solid #e2e8f0',
              borderRadius: '6px',
              marginBottom: '1rem',
              fontSize: '1rem',
              boxSizing: 'border-box'
            }}
          />
          <button type="submit" style={{
            width: '100%',
            padding: '1rem',
            background: '#ff7a59',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            cursor: 'pointer'
          }}>
            Access Tool
          </button>
        </form>
      </div>
    </div>
  );
}

const KPI_OPTIONS = [
  { value: 'engagement_rate', label: 'Engagement Rate' },
  { value: 'handoff_rate', label: 'Hand-off Rate' },
  { value: 'deflection_rate', label: 'Deflection Rate' },
  { value: 'chat_iql', label: 'Chat IQL' },
  { value: 'pass_rate', label: 'Pass Rate' },
  { value: 'isc_iqls', label: 'ISC IQLs' },
  { value: 'csat', label: 'CSAT' },
  { value: 'mrr', label: 'MRR' },
  { value: 'bamic', label: 'BAMIC' },
  { value: 'genai_ql', label: 'GenAI QL' },
  { value: 'demo_rff', label: 'Demo RFF' },
  { value: 'other', label: 'Other (specify below)' }
];

// Sort options for ideas
const SORT_OPTIONS = [
  { value: '', label: 'Default Order' },
  { value: 'impact_high', label: 'Highest Impact' },
  { value: 'complexity_simple', label: 'Easiest to Implement' },
  { value: 'quick_wins', label: 'Quick Wins (High Impact, Low Effort)' },
  { value: 'time_to_results', label: 'Fastest Time to Results' },
  { value: 'team_bandwidth', label: 'Lowest Team Bandwidth' },
  { value: 'proven_patterns', label: 'Most Proven Success Pattern' }
];

const styles = `
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes textBreathe {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.95;
        transform: scale(1.002);
      }
    }
    
    @keyframes pulseGlow {
      0%, 100% {
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08), 0 0 50px rgba(255, 122, 89, 0.25);
      }
      50% {
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08), 0 0 70px rgba(255, 122, 89, 0.4);
      }
    }
    
    .fade-in-up {
      animation: fadeInUp 0.4s ease-out;
    }
    
    .text-breathe {
      animation: textBreathe 6s ease-in-out infinite;
    }
    
    .pulse-glow {
      animation: pulseGlow 4s ease-in-out infinite;
    }
    
    .card-hover {
      transition: all 0.2s ease;
    }
    
    .card-hover:hover {
      box-shadow: 0 4px 12px rgba(255, 122, 89, 0.1);
    }

    @keyframes typingDots {
      0%, 60%, 100% {
        opacity: 0.3;
      }
      30% {
        opacity: 1;
      }
    }

    .typing-dots span:nth-child(1) {
      animation: typingDots 1.4s infinite;
      animation-delay: 0s;
    }

    .typing-dots span:nth-child(2) {
      animation: typingDots 1.4s infinite;
      animation-delay: 0.2s;
    }

    .typing-dots span:nth-child(3) {
      animation: typingDots 1.4s infinite;
      animation-delay: 0.4s;
    }

    .implementation-steps {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      margin-top: 1rem;
      overflow: hidden;
    }

    .step-item {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .step-item:last-child {
      border-bottom: none;
    }

    .step-number {
      background: #ff7a59;
      color: white;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 600;
      flex-shrink: 0;
    }
  `;

// Function to extract impact percentage from expectedResult
const extractImpactScore = (expectedResult) => {
  const match = expectedResult.match(/(\d+)-(\d+)%|\b(\d+)%/);
  if (match) {
    if (match[1] && match[2]) {
      return (parseInt(match[1]) + parseInt(match[2])) / 2;
    } else if (match[3]) {
      return parseInt(match[3]);
    }
  }
  return 50; // Default score if no percentage found
};

// Function to estimate complexity based on idea content
const estimateComplexity = (idea) => {
  const complexKeywords = ['integration', 'workflow', 'automation', 'api', 'advanced', 'multiple', 'complex'];
  const simpleKeywords = ['quick', 'simple', 'basic', 'single', 'direct', 'immediate'];
  
  let complexity = 5; // Default medium complexity
  
  complexKeywords.forEach(keyword => {
    if (idea.toLowerCase().includes(keyword)) complexity += 2;
  });
  
  simpleKeywords.forEach(keyword => {
    if (idea.toLowerCase().includes(keyword)) complexity -= 2;
  });
  
  return Math.max(1, Math.min(10, complexity)); // Keep between 1-10
};

// Function to sort ideas
const getSortedIdeas = (ideas, sortOption) => {
  if (!sortOption) return ideas;
  
  const sortedIdeas = [...ideas];
  
  switch (sortOption) {
    case 'impact_high':
      return sortedIdeas.sort((a, b) => extractImpactScore(b.expectedResult) - extractImpactScore(a.expectedResult));
    
    case 'complexity_simple':
      return sortedIdeas.sort((a, b) => estimateComplexity(a.idea) - estimateComplexity(b.idea));
    
    case 'quick_wins':
      // High impact, low complexity
      return sortedIdeas.sort((a, b) => {
        const aScore = extractImpactScore(a.expectedResult) - estimateComplexity(a.idea);
        const bScore = extractImpactScore(b.expectedResult) - estimateComplexity(b.idea);
        return bScore - aScore;
      });
    
    case 'time_to_results':
      // Ideas with faster implementation and quicker results
      return sortedIdeas.sort((a, b) => {
        const aTimeScore = getTimeToResults(a.idea, a.expectedResult);
        const bTimeScore = getTimeToResults(b.idea, b.expectedResult);
        return aTimeScore - bTimeScore;
      });
    
    case 'team_bandwidth':
      // Lowest team resource requirements
      return sortedIdeas.sort((a, b) => {
        const aTeamEffort = getTeamBandwidthScore(a.idea);
        const bTeamEffort = getTeamBandwidthScore(b.idea);
        return aTeamEffort - bTeamEffort;
      });
    
    case 'proven_patterns':
      // Ideas based on most successful experiment patterns
      return sortedIdeas.sort((a, b) => {
        const aProvenScore = getProvenPatternScore(a.sources);
        const bProvenScore = getProvenPatternScore(b.sources);
        return bProvenScore - aProvenScore;
      });
    
    default:
      return sortedIdeas;
  }
};

// Helper function to estimate time to results
const getTimeToResults = (idea, expectedResult) => {
  const quickKeywords = ['quick', 'immediate', 'instant', 'simple', 'basic', 'toggle', 'enable'];
  const slowKeywords = ['complex', 'integration', 'advanced', 'multiple', 'workflow', 'training'];
  
  let timeScore = 5; // Default medium time
  
  quickKeywords.forEach(keyword => {
    if (idea.toLowerCase().includes(keyword) || expectedResult.toLowerCase().includes(keyword)) {
      timeScore -= 2;
    }
  });
  
  slowKeywords.forEach(keyword => {
    if (idea.toLowerCase().includes(keyword) || expectedResult.toLowerCase().includes(keyword)) {
      timeScore += 2;
    }
  });
  
  return Math.max(1, Math.min(10, timeScore));
};

// Helper function to estimate team bandwidth requirements
const getTeamBandwidthScore = (idea) => {
  const lowEffortKeywords = ['automated', 'self-service', 'template', 'existing', 'simple'];
  const highEffortKeywords = ['training', 'custom', 'new process', 'coordination', 'multiple teams'];
  
  let bandwidthScore = 5; // Default medium bandwidth
  
  lowEffortKeywords.forEach(keyword => {
    if (idea.toLowerCase().includes(keyword)) bandwidthScore -= 2;
  });
  
  highEffortKeywords.forEach(keyword => {
    if (idea.toLowerCase().includes(keyword)) bandwidthScore += 2;
  });
  
  return Math.max(1, Math.min(10, bandwidthScore));
};

// Helper function to score based on proven patterns
const getProvenPatternScore = (sources) => {
  if (!sources || !Array.isArray(sources)) return 0;
  
  let provenScore = 0;
  sources.forEach(source => {
    if (source.includes('Bot378') || source.includes('5700%')) provenScore += 10; // Highest performers
    else if (source.includes('Bot406') || source.includes('Bot362')) provenScore += 8; // Demo RFF successes
    else if (source.includes('Salesbot') || source.includes('BAMIC')) provenScore += 6; // Proven patterns
    else if (source.includes('Quick Replies')) provenScore += 5; // Consistent performers
    else provenScore += 3; // General patterns
  });
  
  return provenScore;
};

// Function to fetch implementation steps
const fetchImplementationSteps = async (ideaId) => {
  const idea = ideas.find(idea => idea.id === ideaId);
  if (!idea || implementationSteps[ideaId]) return;

  setLoadingSteps(prev => ({ ...prev, [ideaId]: true }));

  try {
    const response = await fetch('https://claude-web-app.onrender.com/api/implementation-steps', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idea: idea.idea,
        expectedResult: idea.expectedResult,
        originalUserInput: userInput
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    const stepsData = await response.json();
    
    setImplementationSteps(prev => ({
      ...prev,
      [ideaId]: stepsData.implementationSteps || []
    }));
    
  } catch (error) {
    console.error('Error fetching implementation steps:', error);
    setImplementationSteps(prev => ({
      ...prev,
      [ideaId]: [
        {
          stepNumber: 1,
          title: "Configure ChatFlow",
          description: "Set up basic chatflow in HubSpot Service > Chatflows"
        }
      ]
    }));
  } finally {
    setLoadingSteps(prev => ({ ...prev, [ideaId]: false }));
  }
};

// FIXED: Generate ideas function with proper form submission tracking
const handleGenerateIdeas = async (isRetry = false) => {
  if (!userInput.trim()) return;
  
  // Create session if not exists
  if (!sessionStarted && userName.trim()) {
    await createSession();
  }
  
  setIsGenerating(true);
  setError(null);
  
  try {
    const formData = new FormData();
    formData.append('userInput', userInput);
    formData.append('selectedKPI', selectedKPI);
    formData.append('customKPI', customKPI);
    
    uploadedFiles.forEach((file, index) => {
      formData.append('files', file);
    });
    
    // FIXED: Added the missing fetch call
    const response = await fetch('https://claude-web-app.onrender.com/api/generate-ideas', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    const formattedIdeas = data.ideas.map((idea, index) => ({
      id: index + 1,
      ...idea
    }));
    
    setIdeas(formattedIdeas);
    setCurrentScreen('output');
    setRetryCount(0);
    
    // FIXED: Track form submission AFTER successful idea generation
console.log('🔍 FRONTEND: About to check sessionId for tracking');
console.log('🔍 FRONTEND: sessionId value:', sessionId);
console.log('🔍 FRONTEND: sessionId type:', typeof sessionId);

if (sessionId) {
  console.log('🔍 FRONTEND: Calling trackFormSubmission now...');
  try {
    await trackFormSubmission();
    console.log('🔍 FRONTEND: trackFormSubmission completed');
  } catch (error) {
    console.error('❌ FRONTEND: trackFormSubmission failed:', error);
  }
} else {
  console.log('❌ FRONTEND: No sessionId - cannot track form submission');
}

// Clear states when generating new ideas
setRefinementInputs({});
setIsRefining({});
setCopiedIdeas({});
setImplementationSteps({});
setLoadingSteps({});
setExpandedSteps({});
setSortOption('');
    
  } catch (error) {
    console.error('Error generating ideas:', error);
    
    let errorMessage = 'Failed to generate ideas. Please try again.';
    let canRetry = true;
    
    if (error.message.includes('Failed to fetch')) {
      errorMessage = 'Network connection error. Check your internet connection and make sure your backend server is running.';
    } else if (error.message.includes('Server error: 500')) {
      errorMessage = 'Server error occurred. This might be due to API rate limits or service issues.';
    } else if (error.message.includes('Server error: 429')) {
      errorMessage = 'Too many requests. Please wait a moment before trying again.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request timed out. The AI service might be busy.';
    } else if (retryCount >= 3) {
      errorMessage = 'Multiple attempts failed. Please check your input and try again later.';
      canRetry = false;
    }
    
    setError({ message: errorMessage, canRetry });
    
    if (canRetry && retryCount < 3) {
      setRetryCount(prev => prev + 1);
    }
    
  } finally {
    setIsGenerating(false);
  }
};

const handleRefinementInputChange = (ideaId, value) => {
  setRefinementInputs(prev => ({
    ...prev,
    [ideaId]: value
  }));
};

const refineIdeaWithCustomInput = async (ideaId) => {
  const ideaToRefine = ideas.find(idea => idea.id === ideaId);
  const customInput = refinementInputs[ideaId];
  
  if (!ideaToRefine || !customInput?.trim()) return;

  setIsRefining(prev => ({ ...prev, [ideaId]: true }));
  setError(null);

  try {
    const response = await fetch('https://claude-web-app.onrender.com/api/refine-idea-custom', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idea: ideaToRefine.idea,
        expectedResult: ideaToRefine.expectedResult,
        customRefinement: customInput,
        originalUserInput: userInput
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    const refinedData = await response.json();
    
    if (refinedData.error) {
      throw new Error(refinedData.error);
    }
    
    setIdeas(prevIdeas => 
      prevIdeas.map(idea => 
        idea.id === ideaId 
          ? { ...idea, ...refinedData }
          : idea
      )
    );
    
    // Clear the input and any cached implementation steps for this idea
    setRefinementInputs(prev => ({
      ...prev,
      [ideaId]: ''
    }));
    
    // Clear implementation steps since idea changed
    setImplementationSteps(prev => {
      const newSteps = { ...prev };
      delete newSteps[ideaId];
      return newSteps;
    });
    
  } catch (error) {
    console.error('Error refining idea:', error);
    
    let errorMessage = 'Failed to refine idea. Please try again.';
    
    if (error.message.includes('Failed to fetch')) {
      errorMessage = 'Network connection error. Check your connection.';
    } else if (error.message.includes('Server error: 500')) {
      errorMessage = 'Server error occurred while refining. Please try again.';
    } else if (error.message.includes('Server error: 429')) {
      errorMessage = 'Too many requests. Please wait a moment.';
    }
    
    setError({ message: errorMessage, canRetry: true });
    
  } finally {
    setIsRefining(prev => ({ ...prev, [ideaId]: false }));
  }
};

const copyIdeaToClipboard = async (ideaId) => {
  const idea = ideas.find(idea => idea.id === ideaId);
  if (!idea) return;
  
  const textToCopy = idea.idea;
  
  try {
    await navigator.clipboard.writeText(textToCopy);
    setCopiedIdeas(prev => ({ ...prev, [ideaId]: true }));
    
    setTimeout(() => {
      setCopiedIdeas(prev => ({ ...prev, [ideaId]: false }));
    }, 2000);
    
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    const textArea = document.createElement('textarea');
    textArea.value = textToCopy;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    setCopiedIdeas(prev => ({ ...prev, [ideaId]: true }));
    setTimeout(() => {
      setCopiedIdeas(prev => ({ ...prev, [ideaId]: false }));
    }, 2000);
  }
};

const resetToInput = () => {
  // End current session if active
  if (sessionId) {
    endSession();
  }
  
  setCurrentScreen('input');
  setUserInput('');
  setIdeas([]);
  setRefinementInputs({});
  setIsRefining({});
  setError(null);
  setRetryCount(0);
  setCopiedIdeas({});
  setSelectedKPI('');
  setUploadedFiles([]);
  setCustomKPI('');
  setImplementationSteps({});
  setLoadingSteps({});
  setExpandedSteps({});
  setSortOption('');
  
  // Reset tracking state
  setSessionId(null);
  setSessionStarted(false);
  setUserName('');
};

const editPrompt = () => {
  // Don't end session when editing, just switch screens
  setCurrentScreen('input');
};

const handleRetry = () => {
  handleGenerateIdeas(true);
};

// Toggle implementation steps expansion
const toggleImplementationSteps = (ideaId) => {
  if (!expandedSteps[ideaId]) {
    fetchImplementationSteps(ideaId);
  }
  setExpandedSteps(prev => ({
    ...prev,
    [ideaId]: !prev[ideaId]
  }));
};

if (currentScreen === 'input') {
  return (
    <>
      <style>{styles}</style>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #fff7ed 0%, #eff6ff 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        fontFamily: 'Lexend, sans-serif'
      }}>
        <div className="fade-in-up pulse-glow" style={{
          background: 'white',
          borderRadius: '8px',
          padding: '2.5rem',
          maxWidth: '42rem',
          width: '100%'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{
              backgroundColor: '#ff7a59',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto',
              boxShadow: '0 4px 12px rgba(255, 122, 89, 0.3)',
            }}>
              <MessageCircle size={28} color="white" />
            </div>
            <h1 className="text-breathe" style={{
              fontSize: '2rem',
              fontWeight: '600',
              color: '#2d3748',
              marginBottom: '0.75rem',
              fontFamily: 'Lexend, sans-serif'
            }}>
              Conversational Marketing Experiment Idea Generator
            </h1>
            <p className="text-breathe" style={{
              color: '#64748b',
              fontSize: '1.125rem',
              fontFamily: 'Lexend, sans-serif',
              animationDelay: '1s'
            }}>
              {ideas.length > 0 ? 'Edit your prompt to generate fresh experiment ideas' : 'Get 7 strategic ideas for your HubSpot chat experiences'}
            </p>
          </div>
          
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '1rem',
                fontWeight: '600',
                color: '#2d3748',
                marginBottom: '0.5rem',
                fontFamily: 'Lexend, sans-serif'
              }}>
                Full Name
              </label>
              <input
                type="text"
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  color: '#2d3748',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'Lexend, sans-serif',
                  backgroundColor: 'white',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#ff7a59';
                  e.target.style.boxShadow = '0 0 0 2px rgba(255, 122, 89, 0.08)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <div style={{
                fontSize: '0.75rem',
                color: '#64748b',
                marginTop: '0.5rem',
                fontFamily: 'Lexend, sans-serif'
              }}>
                This helps us track usage patterns and improve the tool
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '1rem',
                fontWeight: '600',
                color: '#2d3748',
                marginBottom: '0.5rem',
                fontFamily: 'Lexend, sans-serif'
              }}>
                Which KPI would you like to improve?
              </label>
              <select 
                value={selectedKPI} 
                onChange={(e) => setSelectedKPI(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  color: '#2d3748',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'Lexend, sans-serif',
                  backgroundColor: 'white',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#ff7a59';
                  e.target.style.boxShadow = '0 0 0 2px rgba(255, 122, 89, 0.08)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="">Select a KPI (optional)</option>
                {KPI_OPTIONS.map(kpi => (
                  <option key={kpi.value} value={kpi.value}>
                    {kpi.label}
                  </option>
                ))}
              </select>
              {selectedKPI === 'other' && (
                <div style={{ marginTop: '0.75rem' }}>
                  <input
                    type="text"
                    placeholder="Enter your custom KPI (e.g., Sign-Ups CVR, Total QL Volume, Demo QLs, etc.)"
                    value={customKPI}
                    onChange={(e) => setCustomKPI(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      color: '#2d3748',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'Lexend, sans-serif',
                      backgroundColor: 'white',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#ff7a59';
                      e.target.style.boxShadow = '0 0 0 2px rgba(255, 122, 89, 0.08)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '1rem',
                fontWeight: '600',
                color: '#2d3748',
                marginBottom: '0.5rem',
                fontFamily: 'Lexend, sans-serif'
              }}>
                Upload experiment docs/sheets (optional)
              </label>
              <div style={{
                width: '100%',
                padding: '1rem',
                border: '2px dashed #cbd5e0',
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative'
              }}
              onMouseOver={(e) => {
                e.target.style.borderColor = '#ff7a59';
                e.target.style.backgroundColor = '#fff8f6';
              }}
              onMouseOut={(e) => {
                e.target.style.borderColor = '#cbd5e0';
                e.target.style.backgroundColor = '#f8fafc';
              }}
              >
                <input 
                  type="file" 
                  multiple 
                  accept=".xlsx,.xls,.csv,.pdf,.docx,.txt"
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    setUploadedFiles(prev => [...prev, ...files]);
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer'
                  }}
                />
                <div style={{
                  color: '#64748b',
                  fontSize: '0.875rem',
                  fontFamily: 'Lexend, sans-serif',
                  fontWeight: '500'
                }}>
                  Click to upload files or drag & drop
                  <br />
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Supports: Excel, CSV, PDF, Word, Text files
                  </span>
                </div>
              </div>
              {uploadedFiles.length > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  {uploadedFiles.map((file, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#f8fafc',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '4px',
                      marginBottom: '0.5rem',
                      border: '1px solid #e2e8f0'
                    }}>
                      <span style={{
                        fontSize: '0.875rem',
                        color: '#475569',
                        fontFamily: 'Lexend, sans-serif'
                      }}>
                        {file.name}
                      </span>
                      <button
                        onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#dc2626',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontFamily: 'Lexend, sans-serif',
                          padding: '0.25rem 0.5rem'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '1rem',
                fontWeight: '600',
                color: '#2d3748',
                marginBottom: '0.5rem',
                fontFamily: 'Lexend, sans-serif'
              }}>
                What would you like ideas for?
              </label>
            </div>

            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Try something like: Our ISC team is spending too much time on low-value conversations while good prospects aren't getting the attention they need. We need better ways to help chat identify and route high-intent visitors to the right people faster."
              style={{
                width: '100%',
                padding: '1.25rem',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '1rem',
                color: '#64748b',
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'Lexend, sans-serif',
                lineHeight: '1.5',
                transition: 'all 0.3s ease'
              }}
              rows="4"
              onFocus={(e) => {
                e.target.style.borderColor = '#ff7a59';
                e.target.style.boxShadow = '0 0 0 2px rgba(255, 122, 89, 0.08)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          
          {error && (
            <div className="fade-in-up" style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem'
              }}>
                <AlertCircle size={20} color="#dc2626" />
                <span style={{
                  color: '#dc2626',
                  fontWeight: '600',
                  fontFamily: 'Lexend, sans-serif'
                }}>
                  Error
                </span>
              </div>
              <p style={{
                color: '#7f1d1d',
                fontSize: '0.875rem',
                fontFamily: 'Lexend, sans-serif',
                margin: 0,
                marginBottom: error.canRetry ? '1rem' : 0
              }}>
                {error.message}
              </p>
              {error.canRetry && (
                <button
                  onClick={handleRetry}
                  style={{
                    backgroundColor: '#dc2626',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    fontFamily: 'Lexend, sans-serif',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Retry {retryCount > 0 && `(Attempt ${retryCount + 1})`}
                </button>
              )}
            </div>
          )}
          
          <button
            onClick={() => handleGenerateIdeas(false)}
            disabled={!userInput.trim() || isGenerating}
            style={{
              width: '100%',
              backgroundColor: isGenerating || !userInput.trim() ? '#cbd5e0' : '#ff7a59',
              color: 'white',
              fontWeight: '600',
              padding: '1.25rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              cursor: isGenerating || !userInput.trim() ? 'not-allowed' : 'pointer',
              fontSize: '1.125rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              transition: 'all 0.2s ease',
              fontFamily: 'Lexend, sans-serif'
            }}
            onMouseOver={(e) => {
              if (!isGenerating && userInput.trim()) {
                e.target.style.backgroundColor = '#ff5722';
              }
            }}
            onMouseOut={(e) => {
              if (!isGenerating && userInput.trim()) {
                e.target.style.backgroundColor = '#ff7a59';
              }
            }}
          >
            {isGenerating ? (
              <>
                <span className="typing-dots" style={{ 
                  fontSize: '22px',
                  letterSpacing: '4px'
                }}>
                  <span>•</span>
                  <span>•</span>
                  <span>•</span>
                </span>
                Generating 7 Ideas...
              </>
            ) : (
              <>
                <Zap size={22} />
                {ideas.length > 0 ? 'Generate New Ideas' : 'Get 7 Strategic Ideas'}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

const sortedIdeas = getSortedIdeas(ideas, sortOption);

return (
  <>
    <style>{styles}</style>
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fff7ed 0%, #eff6ff 100%)',
      padding: '1rem',
      fontFamily: 'Lexend, sans-serif'
    }}>
      <div className="fade-in-up" style={{
        maxWidth: '64rem',
        margin: '0 auto',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        padding: '2rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: '600',
            color: '#2d3748',
            fontFamily: 'Lexend, sans-serif'
          }}>
            Your 7 Strategic Ideas
          </h1>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div
              onClick={editPrompt}
              style={{
                backgroundColor: '#64748b',
                color: 'white',
                padding: '0.875rem 1.5rem',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'Lexend, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '1rem'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#475569';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#64748b';
                e.target.style.transform = 'translateY(0px)';
              }}
            >
              <Settings size={18} />
              Edit Prompt
            </div>
            <div
              onClick={resetToInput}
              style={{
                backgroundColor: '#ff7a59',
                color: 'white',
                padding: '0.875rem 1.5rem',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'Lexend, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '1rem'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#ff5722';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#ff7a59';
                e.target.style.transform = 'translateY(0px)';
              }}
            >
              <ArrowLeft size={18} />
              New Prompt
            </div>
          </div>
        </div>

        {/* Simplified Sort Controls */}
        <div className="fade-in-up" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <div style={{
            color: '#64748b',
            fontSize: '0.875rem',
            fontFamily: 'Lexend, sans-serif'
          }}>
            {ideas.length} strategic ideas generated
          </div>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: '#2d3748',
              outline: 'none',
              fontFamily: 'Lexend, sans-serif',
              backgroundColor: 'white',
              cursor: 'pointer',
              minWidth: '200px'
            }}
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Show original prompt */}
        <div className="fade-in-up" style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.75rem'
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#64748b'
            }}></div>
            <span style={{
              color: '#64748b',
              fontWeight: '600',
              fontSize: '0.875rem',
              fontFamily: 'Lexend, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Original Prompt
            </span>
          </div>
          <p style={{
            color: '#475569',
            fontSize: '1rem',
            margin: 0,
            fontFamily: 'Lexend, sans-serif',
            lineHeight: '1.5',
            fontStyle: 'italic'
          }}>
            "{userInput}"
          </p>
        </div>
        
        {error && (
          <div className="fade-in-up" style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={20} color="#dc2626" />
              <span style={{
                color: '#dc2626',
                fontWeight: '600',
                fontFamily: 'Lexend, sans-serif'
              }}>
                {error.message}
              </span>
            </div>
          </div>
        )}
        
        <div>
          {sortedIdeas.map((idea, index) => {
            const impactScore = extractImpactScore(idea.expectedResult);
            const complexityScore = estimateComplexity(idea.idea);
            
            return (
              <div key={idea.id} className="fade-in-up card-hover" style={{
                border: '1px solid #e1e8ed',
                borderRadius: '6px',
                padding: '1.25rem',
                backgroundColor: 'white',
                marginBottom: '1.25rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                animationDelay: `${index * 0.05}s`
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{
                      backgroundColor: '#ff7a59',
                      color: 'white',
                      fontWeight: '700',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontFamily: 'Lexend, sans-serif',
                      minWidth: '2rem',
                      textAlign: 'center',
                      transition: 'all 0.3s ease'
                    }}>
                      {idea.id}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{
                        color: '#2d3748',
                        lineHeight: '1.6',
                        margin: 0,
                        fontSize: '1.125rem',
                        fontFamily: 'Lexend, sans-serif',
                        fontWeight: '500',
                        marginBottom: '0.75rem'
                      }}>
                        {idea.idea}
                      </p>
                      
                      {/* Simplified Impact & Complexity Indicators */}
                      <div style={{
                        display: 'flex',
                        gap: '0.75rem',
                        marginBottom: '0.75rem'
                      }}>
                        <span style={{
                          fontSize: '0.75rem',
                          color: '#64748b',
                          fontFamily: 'Lexend, sans-serif',
                          backgroundColor: '#f1f5f9',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem'
                        }}>
                          Impact: {impactScore}%
                        </span>
                        <span style={{
                          fontSize: '0.75rem',
                          color: '#64748b',
                          fontFamily: 'Lexend, sans-serif',
                          backgroundColor: '#f1f5f9',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem'
                        }}>
                          Complexity: {complexityScore}/10
                        </span>
                      </div>

                      <button
                        onClick={() => copyIdeaToClipboard(idea.id)}
                        style={{
                          backgroundColor: 'transparent',
                          color: copiedIdeas[idea.id] ? '#22c55e' : '#64748b',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          border: `1px solid ${copiedIdeas[idea.id] ? '#22c55e' : '#cbd5e0'}`,
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: '400',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          transition: 'all 0.3s ease',
                          fontFamily: 'Lexend, sans-serif'
                        }}
                        onMouseOver={(e) => {
                          if (!copiedIdeas[idea.id]) {
                            e.target.style.backgroundColor = '#f8fafc';
                            e.target.style.borderColor = '#94a3b8';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!copiedIdeas[idea.id]) {
                            e.target.style.backgroundColor = 'transparent';
                            e.target.style.borderColor = '#cbd5e0';
                          }
                        }}
                      >
                        {copiedIdeas[idea.id] ? (
                          <>
                            <CheckCircle size={12} />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div style={{
                    borderLeft: '3px solid #ff7a59',
                    paddingLeft: '1rem',
                    backgroundColor: '#fff8f6',
                    padding: '0.75rem 1rem',
                    borderRadius: '4px',
                    marginLeft: '3rem',
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.25rem'
                    }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#ff7a59'
                      }}></div>
                      <span style={{
                        color: '#ff7a59',
                        fontWeight: '600',
                        fontSize: '0.8rem',
                        fontFamily: 'Lexend, sans-serif',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Expected Impact
                      </span>
                    </div>
                    <p style={{
                      color: '#7c2d12',
                      fontSize: '0.875rem',
                      margin: 0,
                      fontFamily: 'Lexend, sans-serif',
                      lineHeight: '1.4',
                      marginBottom: idea.sources ? '0.5rem' : 0
                    }}>
                      {idea.expectedResult}
                    </p>
                    {/* Simplified Source citations */}
                    {idea.sources && idea.sources.length > 0 && (
                      <div style={{ 
                        marginTop: '0.5rem',
                        fontSize: '0.7rem',
                        color: '#94a3b8',
                        fontFamily: 'Lexend, sans-serif'
                      }}>
                        Based on: {idea.sources.join(' • ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Implementation Steps Section */}
                <div style={{
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '1rem',
                  marginTop: '1rem'
                }}>
                  <div 
                    onClick={() => toggleImplementationSteps(idea.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      marginBottom: expandedSteps[idea.id] ? '1rem' : 0,
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {expandedSteps[idea.id] ? 
                      <ChevronDown size={16} color="#ff7a59" /> : 
                      <ChevronRight size={16} color="#ff7a59" />
                    }
                    <span style={{
                      color: '#64748b',
                      fontSize: '0.875rem',
                      fontFamily: 'Lexend, sans-serif',
                      fontWeight: '500'
                    }}>
                      Implementation Steps
                    </span>
                    {loadingSteps[idea.id] && (
                      <span className="typing-dots" style={{ 
                        fontSize: '12px',
                        letterSpacing: '2px',
                        marginLeft: '0.5rem'
                      }}>
                        <span>•</span>
                        <span>•</span>
                        <span>•</span>
                      </span>
                    )}
                  </div>

                  {expandedSteps[idea.id] && implementationSteps[idea.id] && (
                    <div className="implementation-steps fade-in-up">
                      {implementationSteps[idea.id].map((step, stepIndex) => (
                        <div key={stepIndex} className="step-item">
                          <div className="step-number">
                            {step.stepNumber}
                          </div>
                          <div>
                            <div style={{
                              fontWeight: '600',
                              color: '#2d3748',
                              fontSize: '0.875rem',
                              fontFamily: 'Lexend, sans-serif',
                              marginBottom: '0.25rem'
                            }}>
                              {step.title}
                            </div>
                            <div style={{
                              color: '#64748b',
                              fontSize: '0.8rem',
                              fontFamily: 'Lexend, sans-serif',
                              lineHeight: '1.4'
                            }}>
                              {step.description}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Refinement Section */}
                <div style={{
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '1rem',
                  marginTop: '1rem'
                }}>
                  <details style={{ marginBottom: 0 }}>
                    <summary style={{
                      color: '#64748b',
                      fontSize: '0.875rem',
                      fontFamily: 'Lexend, sans-serif',
                      fontWeight: '500',
                      cursor: 'pointer',
                      listStyle: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.3s ease'
                    }}>
                      <span style={{
                        color: '#ff7a59',
                        fontSize: '0.75rem',
                        transition: 'all 0.3s ease'
                      }}>▶</span>
                      Refine this idea
                    </summary>
                    <div style={{ marginTop: '1rem' }}>
                      <div style={{
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'flex-end'
                      }}>
                        <div style={{ flex: 1 }}>
                          <input
                            type="text"
                            placeholder="e.g., make it more specific to SaaS companies, add personalization, focus on mobile users..."
                            value={refinementInputs[idea.id] || ''}
                            onChange={(e) => handleRefinementInputChange(idea.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (refinementInputs[idea.id]?.trim() && !isRefining[idea.id]) {
                                  refineIdeaWithCustomInput(idea.id);
                                }
                              }
                            }}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '1px solid #cbd5e0',
                              borderRadius: '6px',
                              fontSize: '0.875rem',
                              color: '#2d3748',
                              outline: 'none',
                              fontFamily: 'Lexend, sans-serif',
                              boxSizing: 'border-box',
                              transition: 'all 0.3s ease'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#ff7a59';
                              e.target.style.boxShadow = '0 0 0 2px rgba(255, 122, 89, 0.08)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#cbd5e0';
                              e.target.style.boxShadow = 'none';
                            }}
                          />
                        </div>
                        <button
                          onClick={() => refineIdeaWithCustomInput(idea.id)}
                          disabled={!refinementInputs[idea.id]?.trim() || isRefining[idea.id]}
                          style={{
                            backgroundColor: (!refinementInputs[idea.id]?.trim() || isRefining[idea.id]) ? '#cbd5e0' : '#ff7a59',
                            color: 'white',
                            padding: '0.75rem 1rem',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: (!refinementInputs[idea.id]?.trim() || isRefining[idea.id]) ? 'not-allowed' : 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.3s ease',
                            fontFamily: 'Lexend, sans-serif'
                          }}
                          onMouseOver={(e) => {
                            if (refinementInputs[idea.id]?.trim() && !isRefining[idea.id]) {
                              e.target.style.backgroundColor = '#ff5722';
                            }
                          }}
                          onMouseOut={(e) => {
                            if (refinementInputs[idea.id]?.trim() && !isRefining[idea.id]) {
                              e.target.style.backgroundColor = '#ff7a59';
                            }
                          }}
                        >
                          {isRefining[idea.id] ? (
                            <>
                              <span className="typing-dots" style={{ 
                                fontSize: '16px',
                                letterSpacing: '2px'
                              }}>
                                <span>•</span>
                                <span>•</span>
                                <span>•</span>
                              </span>
                              Refining...
                            </>
                          ) : (
                            <>
                              <Send size={16} />
                              Refine
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            );
          })}
        </div>

        {/* Download Usage Data Button - At the very bottom in gray */}
        <div className="fade-in-up" style={{
          borderTop: '1px solid #f1f5f9',
          paddingTop: '2rem',
          marginTop: '2rem',
          textAlign: 'center'
        }}>
          <button
            onClick={downloadUsageData}
            style={{
              backgroundColor: '#6b7280',
              color: 'white',
              padding: '0.75rem 1.25rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              fontFamily: 'Lexend, sans-serif',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              opacity: 0.8
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#4b5563';
              e.target.style.opacity = '1';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#6b7280';
              e.target.style.opacity = '0.8';
              e.target.style.transform = 'translateY(0px)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download All Usage Data (CSV)
          </button>
          <div style={{
            fontSize: '0.75rem',
            color: '#9ca3af',
            marginTop: '0.5rem',
            fontFamily: 'Lexend, sans-serif'
          }}>
            Exports usage data from all team members for analysis
          </div>
        </div>
      </div>
    </div>
  </>
);
}

export default App;