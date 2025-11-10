import React from 'react';
import { useNavigate } from 'react-router-dom';

const GigCard = ({ gig, onDelete, showActions = false }) => {
  const navigate = useNavigate();

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const formatCategory = (category) => {
    return category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleOrder = () => {
    navigate(`/orders/new?gigId=${gig._id}`);
  };

  return (
    <div style={{
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '16px',
      backgroundColor: '#fff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: '#333' }}>
          {gig.title}
        </h3>
        <span style={{
          backgroundColor: gig.status === 'active' ? '#4CAF50' : '#FFA726',
          color: 'white',
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '0.75rem',
          fontWeight: 'bold'
        }}>
          {gig.status.toUpperCase()}
        </span>
      </div>

      <p style={{ color: '#666', marginBottom: '12px', lineHeight: '1.5' }}>
        {gig.description.length > 150 
          ? `${gig.description.substring(0, 150)}...` 
          : gig.description}
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{
          backgroundColor: '#e3f2fd',
          color: '#1976d2',
          padding: '4px 12px',
          borderRadius: '4px',
          fontSize: '0.875rem',
          fontWeight: '500'
        }}>
          {formatCategory(gig.category)}
        </span>
        <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#2e7d32' }}>
          {formatPrice(gig.price)}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', color: '#999', marginBottom: '12px' }}>
        <span>⭐ {gig.rating || 0} ({gig.totalOrders || 0} orders)</span>
        <span>🚚 {gig.deliveryTime} days delivery</span>
      </div>

      {gig.user_id && (
        <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '16px' }}>
          <strong>Seller:</strong> {gig.user_id.name || 'Unknown'}
          {gig.user_id.skills && (
            <span style={{ marginLeft: '8px', color: '#999' }}>
              • {gig.user_id.skills}
            </span>
          )}
        </div>
      )}

      {showActions && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button
            onClick={() => navigate(`/gigs/edit/${gig._id}`)}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Edit
          </button>
          <button
            onClick={() => onDelete && onDelete(gig._id)}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#d32f2f',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Delete
          </button>
        </div>
      )}

      {!showActions && (
        <button
          onClick={handleOrder}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '1rem'
          }}
        >
          Order Now
        </button>
      )}
    </div>
  );
};

export default GigCard;
