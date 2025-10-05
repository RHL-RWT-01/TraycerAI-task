import { useState } from 'react';
import { Activity, FileText, Home, List, Search, ArrowRight } from './components/Icons';
import './App.css';
import HealthCheck from './components/HealthCheck';
import CreatePlan from './components/CreatePlan';
import ListPlans from './components/ListPlans';
import ViewPlan from './components/ViewPlan';

type ViewType = 'dashboard' | 'health' | 'create-plan' | 'list-plans' | 'view-plan';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['api-testing']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'health':
        return <HealthCheck />;
      case 'create-plan':
        return <CreatePlan />;
      case 'list-plans':
        return <ListPlans />;
      case 'view-plan':
        return <ViewPlan />;
      default:
        return null;
    }
  };

  return (
    <div className="vscode-extension">
      <div className="extension-header">
        <h3 className="extension-title">
          <FileText size={16} />
          TraycerAI
        </h3>
        <span className="extension-subtitle">Planning Layer API</span>
      </div>

      <div className="extension-content">
        {/* API Testing Section */}
        <div className="section">
          <div
            className="section-header"
            onClick={() => toggleSection('api-testing')}
          >
            <ArrowRight
              size={12}
              className={`section-icon ${expandedSections.has('api-testing') ? 'expanded' : ''}`}
            />
            <span className="section-title">API Testing</span>
          </div>

          {expandedSections.has('api-testing') && (
            <div className="section-content">
              <div
                className={`tree-item ${currentView === 'dashboard' ? 'active' : ''}`}
                onClick={() => setCurrentView('dashboard')}
              >
                <Home size={14} />
                <span>Overview</span>
              </div>

              <div
                className={`tree-item ${currentView === 'health' ? 'active' : ''}`}
                onClick={() => setCurrentView('health')}
              >
                <Activity size={14} />
                <span>Health Check</span>
              </div>
            </div>
          )}
        </div>

        {/* Plans Section */}
        <div className="section">
          <div
            className="section-header"
            onClick={() => toggleSection('plans')}
          >
            <ArrowRight
              size={12}
              className={`section-icon ${expandedSections.has('plans') ? 'expanded' : ''}`}
            />
            <span className="section-title">Plans</span>
          </div>

          {expandedSections.has('plans') && (
            <div className="section-content">
              <div
                className={`tree-item ${currentView === 'create-plan' ? 'active' : ''}`}
                onClick={() => setCurrentView('create-plan')}
              >
                <FileText size={14} />
                <span>Create Plan</span>
              </div>

              <div
                className={`tree-item ${currentView === 'list-plans' ? 'active' : ''}`}
                onClick={() => setCurrentView('list-plans')}
              >
                <List size={14} />
                <span>List Plans</span>
              </div>

              <div
                className={`tree-item ${currentView === 'view-plan' ? 'active' : ''}`}
                onClick={() => setCurrentView('view-plan')}
              >
                <Search size={14} />
                <span>View Plan</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="view-container">{renderCurrentView()}</div>
    </div>
  );
}

export default App;
