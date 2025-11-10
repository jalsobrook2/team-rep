import React from 'react';

const ProgressBar = ({ status }) => {
  const getStatusInfo = () => {
    const statusMap = {
      'pending': { progress: 10, label: 'Pending', color: '#FFA726' },
      'accepted': { progress: 25, label: 'Accepted', color: '#42A5F5' },
      'in-progress': { progress: 50, label: 'In Progress', color: '#66BB6A' },
      'delivered': { progress: 80, label: 'Delivered', color: '#26C6DA' },
      'completed': { progress: 100, label: 'Completed', color: '#4CAF50' },
      'cancelled': { progress: 0, label: 'Cancelled', color: '#EF5350' },
      'disputed': { progress: 30, label: 'Disputed', color: '#FF7043' }
    };
    return statusMap[status] || { progress: 0, label: 'Unknown', color: '#9E9E9E' };
  };

  const { progress, label, color } = getStatusInfo();

  return (
    <div style={{ width: '100%' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginBottom: '8px',
        fontSize: '0.875rem',
        fontWeight: '500'
      }}>
        <span>{label}</span>
        <span>{progress}%</span>
      </div>
      <div style={{
        width: '100%',
        height: '24px',
        backgroundColor: '#e0e0e0',
        borderRadius: '12px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          backgroundColor: color,
          transition: 'width 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '0.75rem',
          fontWeight: 'bold'
        }}>
          {progress > 20 && `${progress}%`}
        </div>
      </div>
      <div style={{ 
        marginTop: '8px',
        fontSize: '0.75rem',
        color: '#666',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>Pending</span>
        <span>Accepted</span>
        <span>In Progress</span>
        <span>Delivered</span>
        <span>Completed</span>
      </div>
    </div>
  );
};

export default ProgressBar;
