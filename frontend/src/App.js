import React, { useState, useEffect } from 'react';
import { Lightbulb, TrendingUp, Users, Target, BarChart3, Zap, Clock, User, Calendar, Activity } from 'lucide-react';
import './App.css';

const KPI_OPTIONS = [
  { value: 'engagement_rate', label: 'Engagement Rate', icon: Users },
  { value: 'deflection_rate', label: 'Deflection Rate', icon: TrendingUp },
  { value: 'csat', label: 'CSAT Score', icon: Target },
  { value: 'handoff_rate', label: 'Handoff Rate', icon: BarChart3 },
  { value: 'bamic', label: 'BAMIC', icon: Zap },
  { value: 'genai_ql', label: 'GenAI QL', icon: Activity },
  { value: 'mrr', label: 'MRR', icon: TrendingUp },
  { value: 'custom', label: 'Custom KPI', icon: Target }
];

function App() {
  const [formData, setFormData] = useState({
    userName: '',
    selectedKPI: '',
    customKPI: '',
    promptText: ''
  });
  const [generatedIdea, setGeneratedIdea] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics');
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.promptText.trim()) {
      alert('Please enter a prompt to generate ideas.');
      return;
    }

    setIsLoading(true);
    setGeneratedIdea('');

    try {
      const response = await fetch('/api/generate-idea', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.success) {
        setGeneratedIdea(data.idea);
        fetchAnalytics(); // Refresh analytics after generating idea
      } else {
        alert(data.error || 'Failed to generate idea. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedKPIOption = KPI_OPTIONS.find(option => option.value === formData.selectedKPI);

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <Lightbulb className="logo-icon" />
            <h1>HubSpot Idea Generator</h1>
          </div>
          <button 
            className="analytics-toggle"
            onClick={() => setShowAnalytics(!showAnalytics)}
          >
            <BarChart3 size={20} />
            Analytics
          </button>
        </div>
      </header>

      <main className="main-content">
        {showAnalytics && analytics && (
          <div className="analytics-panel">
            <h2>Usage Analytics</h2>
            <div className="analytics-grid">
              <div className="analytics-card">
                <Users className="analytics-icon" />
                <div>
                  <h3>{analytics.totalSessions}</h3>
                  <p>Total Sessions</p>
                </div>
              </div>
              <div className="analytics-card">
                <User className="analytics-icon" />
                <div>
                  <h3>{analytics.uniqueUsers}</h3>
                  <p>Unique Users</p>
                </div>
              </div>
              <div className="analytics-card">
                <Clock className="analytics-icon" />
                <div>
                  <h3>{Math.round(analytics.averageSessionDuration)}s</h3>
                  <p>Avg Session</p>
                </div>
              </div>
            </div>
            
            <div className="analytics-section">
              <h3>Top KPIs</h3>
              <div className="kpi-list">
                {analytics.topKPIs.map(({ kpi, count }) => (
                  <div key={kpi} className="kpi-item">
                    <span className="kpi-name">{kpi}</span>
                    <span className="kpi-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="form-container">
          <form onSubmit={handleSubmit} className="idea-form">
            <div className="form-group">
              <label htmlFor="userName">Your Name</label>
              <input
                type="text"
                id="userName"
                name="userName"
                value={formData.userName}
                onChange={handleInputChange}
                placeholder="Enter your name"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="selectedKPI">Select KPI to Improve</label>
              <div className="kpi-grid">
                {KPI_OPTIONS.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`kpi-option ${formData.selectedKPI === option.value ? 'selected' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, selectedKPI: option.value }))}
                    >
                      <IconComponent size={20} />
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {formData.selectedKPI === 'custom' && (
              <div className="form-group">
                <label htmlFor="customKPI">Custom KPI</label>
                <input
                  type="text"
                  id="customKPI"
                  name="customKPI"
                  value={formData.customKPI}
                  onChange={handleInputChange}
                  placeholder="Enter your custom KPI"
                  className="form-input"
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="promptText">Describe Your Goal or Challenge</label>
              <textarea
                id="promptText"
                name="promptText"
                value={formData.promptText}
                onChange={handleInputChange}
                placeholder="Describe what you want to achieve or the challenge you're facing..."
                className="form-textarea"
                rows="4"
                required
              />
            </div>

            <button 
              type="submit" 
              className="generate-button"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="spinner"></div>
                  Generating Ideas...
                </>
              ) : (
                <>
                  <Lightbulb size={20} />
                  Generate Experiment Ideas
                </>
              )}
            </button>
          </form>

          {generatedIdea && (
            <div className="results-container">
              <h2>Generated Experiment Idea</h2>
              <div className="idea-content">
                <pre>{generatedIdea}</pre>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        <p>HubSpot Conversational Marketing Experiment Idea Generator</p>
      </footer>
    </div>
  );
}

export default App;