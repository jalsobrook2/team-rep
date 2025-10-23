import React from 'react';

const SafetyAlert = ({ alerts }) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="safety-alert">
      <div className="alert-header">
        <span className="alert-icon">⚠️</span>
        <h3>Safety Reminder</h3>
      </div>
      <div className="alert-content">
        {alerts.slice(0, 1).map((alert, index) => (
          <p key={index}>{alert}</p>
        ))}
      </div>
    </div>
  );
};

export default SafetyAlert;