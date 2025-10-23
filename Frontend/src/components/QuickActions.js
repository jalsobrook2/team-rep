import React from 'react';
import { Link } from 'react-router-dom';

const QuickActions = ({ userRole }) => {
  return (
    <div className="quick-actions">
      <h3>🚀 Quick Actions</h3>
      <div className="action-buttons">
        {(userRole === 'requester' || userRole === 'both') && (
          <Link to="/jobs/create" className="action-button primary">
            <span className="button-icon">➕</span>
            Post a Job
          </Link>
        )}
        
        {(userRole === 'worker' || userRole === 'both') && (
          <Link to="/jobs" className="action-button secondary">
            <span className="button-icon">🔍</span>
            Find Work
          </Link>
        )}
        
        <Link to="/profile" className="action-button tertiary">
          <span className="button-icon">👤</span>
          Update Profile
        </Link>
        
        <Link to="/safety" className="action-button safety">
          <span className="button-icon">🛡️</span>
          Safety Center
        </Link>
      </div>
    </div>
  );
};

export default QuickActions;