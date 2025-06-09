import React, { useState } from 'react';
import { Zap, Settings, ArrowLeft, Send, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import './App.css';

function App() {
  const [currentScreen, setCurrentScreen] = useState('input');
  const [userInput, setUserInput] = useState('');
  const [ideas, setIdeas] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [refinementInputs, setRefinementInputs] = useState({});
  const [isRefining, setIsRefining] = useState({});
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [copiedIdeas, setCopiedIdeas] = useState({});

  // Add CSS animations as a style tag
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
  `;

  const handleGenerateIdeas = async (isRetry = false) => {
    if (!userInput.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch('https://claude-web-app.onrender.com/api/generate-ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userInput }),
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
      
      // Clear any existing refinement inputs when generating new ideas
      setRefinementInputs({});
      setIsRefining({});
      setCopiedIdeas({});
      
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
      
      // Clear the input after successful refinement
      setRefinementInputs(prev => ({
        ...prev,
        [ideaId]: ''
      }));
      
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
    
    const textToCopy = `IDEA: ${idea.idea}\n\nEXPECTED RESULT: ${idea.expectedResult}`;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedIdeas(prev => ({ ...prev, [ideaId]: true }));
      
      // Clear the copied state after 2 seconds
      setTimeout(() => {
        setCopiedIdeas(prev => ({ ...prev, [ideaId]: false }));
      }, 2000);
      
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback for older browsers
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
    setCurrentScreen('input');
    setUserInput('');
    setIdeas([]);
    setRefinementInputs({});
    setIsRefining({});
    setError(null);
    setRetryCount(0);
    setCopiedIdeas({});
  };

  const editPrompt = () => {
    setCurrentScreen('input');
    // Keep the original input so user can edit it
    // Don't reset ideas, error, etc. - they'll be replaced when new ideas generate
  };

  const handleRetry = () => {
    handleGenerateIdeas(true);
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
                margin: '0 auto 1rem auto'
              }}>
                <Settings size={28} color="white" />
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
                {ideas.length > 0 ? 'Edit your prompt to generate fresh experiment ideas' : 'Get inspired with fresh ideas for your HubSpot chat experiences'}
              </p>
            </div>
            
            <div style={{ marginBottom: '2rem' }}>
              <label style={{
                display: 'block',
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#2d3748',
                marginBottom: '0.75rem',
                fontFamily: 'Lexend, sans-serif'
              }}>
                What would you like ideas for?
              </label>
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (userInput.trim() && !isGenerating) {
                      handleGenerateIdeas(false);
                    }
                  }
                }}
                placeholder="What would you like to improve? e.g., increase chat conversions, boost bot deflection, improve demo bookings..."
                style={{
                  width: '100%',
                  padding: '1.25rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  color: '#2d3748',
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
                  <Settings size={22} style={{ animation: 'spin 1s linear infinite' }} />
                  Generating New Ideas...
                </>
              ) : (
                <>
                  <Zap size={22} />
                  {ideas.length > 0 ? 'Generate New Ideas' : 'Get Inspired'}
                </>
              )}
            </button>
          </div>
        </div>
      </>
    );
  }

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
              Your Ideas
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
            {ideas.map((idea, index) => (
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
                        fontWeight: '500'
                      }}>
                        {idea.idea}
                      </p>
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
                          marginTop: '0.75rem',
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
                      lineHeight: '1.4'
                    }}>
                      {idea.expectedResult}
                    </p>
                  </div>
                </div>
                
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
                              <Settings size={16} style={{ animation: 'spin 1s linear infinite' }} />
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
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
