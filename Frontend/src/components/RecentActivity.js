import React from 'react';

const RecentActivity = ({ activities }) => {
  return (
    <div className="recent-activity">
      <h3>📋 Recent Activity</h3>
      {activities.length === 0 ? (
        <p className="no-activity">No recent activity</p>
      ) : (
        <div className="activity-list">
          {activities.map((activity, index) => (
            <div key={activity.id || index} className="activity-item">
              <span className="activity-icon">{activity.icon}</span>
              <div className="activity-details">
                <p>{activity.action}</p>
                <small>{new Date(activity.timestamp).toLocaleDateString()}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentActivity;