import React from 'react';

const DashboardCard = ({ title, value, icon, color }) => {
  return (
    <div className={`dashboard-card ${color}`}>
      <div className="card-icon">{icon}</div>
      <div className="card-content">
        <h3>{title}</h3>
        <div className="card-value">{value}</div>
      </div>
    </div>
  );
};

export default DashboardCard;