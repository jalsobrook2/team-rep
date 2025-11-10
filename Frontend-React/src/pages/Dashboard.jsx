import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { gigAPI, orderAPI } from '../services/api';
import Navbar from '../components/Navbar';
import GigCard from '../components/GigCard';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myGigs, setMyGigs] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalGigs: 0,
    activeGigs: 0,
    totalOrders: 0,
    activeOrders: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch user's gigs
      const gigsResult = await gigAPI.getUserGigs();
      if (gigsResult.success) {
        setMyGigs(gigsResult.data.gigs || []);
        setStats(prev => ({
          ...prev,
          totalGigs: gigsResult.data.gigs?.length || 0,
          activeGigs: gigsResult.data.gigs?.filter(g => g.status === 'active').length || 0
        }));
      }

      // Fetch user's orders
      const ordersResult = await orderAPI.getUserOrders();
      if (ordersResult.success) {
        setMyOrders(ordersResult.data.orders || []);
        setStats(prev => ({
          ...prev,
          totalOrders: ordersResult.data.orders?.length || 0,
          activeOrders: ordersResult.data.orders?.filter(o => 
            !['completed', 'cancelled'].includes(o.status)
          ).length || 0
        }));
      }
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGig = async (gigId) => {
    if (!window.confirm('Are you sure you want to delete this gig?')) {
      return;
    }

    const result = await gigAPI.deleteGig(gigId);
    if (result.success) {
      setMyGigs(myGigs.filter(gig => gig._id !== gigId));
      setStats(prev => ({
        ...prev,
        totalGigs: prev.totalGigs - 1
      }));
    } else {
      alert(result.error);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: 'calc(100vh - 64px)',
          fontSize: '1.25rem'
        }}>
          Loading dashboard...
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem'
      }}>
        <div style={{
          marginBottom: '2rem'
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            marginBottom: '0.5rem',
            color: '#333'
          }}>
            Welcome back, {user?.name}! 👋
          </h1>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>
            Manage your gigs and orders from your dashboard
          </p>
        </div>

        {error && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#ffebee',
            color: '#c62828',
            borderRadius: '4px',
            marginBottom: '2rem'
          }}>
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            padding: '1.5rem',
            backgroundColor: '#e3f2fd',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '0.875rem', color: '#1565c0', marginBottom: '0.5rem' }}>
              Total Gigs
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1976d2' }}>
              {stats.totalGigs}
            </p>
          </div>

          <div style={{
            padding: '1.5rem',
            backgroundColor: '#e8f5e9',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '0.875rem', color: '#2e7d32', marginBottom: '0.5rem' }}>
              Active Gigs
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4caf50' }}>
              {stats.activeGigs}
            </p>
          </div>

          <div style={{
            padding: '1.5rem',
            backgroundColor: '#fff3e0',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '0.875rem', color: '#e65100', marginBottom: '0.5rem' }}>
              Total Orders
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff9800' }}>
              {stats.totalOrders}
            </p>
          </div>

          <div style={{
            padding: '1.5rem',
            backgroundColor: '#fce4ec',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '0.875rem', color: '#c2185b', marginBottom: '0.5rem' }}>
              Active Orders
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e91e63' }}>
              {stats.activeOrders}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <button
            onClick={() => navigate('/gigs/create')}
            style={{
              padding: '1rem',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '1rem'
            }}
          >
            ➕ Create New Gig
          </button>

          <button
            onClick={() => navigate('/gigs')}
            style={{
              padding: '1rem',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '1rem'
            }}
          >
            🔍 Browse Gigs
          </button>

          <button
            onClick={() => navigate('/orders')}
            style={{
              padding: '1rem',
              backgroundColor: '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '1rem'
            }}
          >
            📦 View All Orders
          </button>
        </div>

        {/* My Gigs Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            marginBottom: '1rem',
            color: '#333'
          }}>
            My Gigs ({myGigs.length})
          </h2>
          
          {myGigs.length === 0 ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
              color: '#666'
            }}>
              <p>You haven't created any gigs yet.</p>
              <button
                onClick={() => navigate('/gigs/create')}
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Create Your First Gig
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1rem'
            }}>
              {myGigs.slice(0, 3).map(gig => (
                <GigCard 
                  key={gig._id} 
                  gig={gig} 
                  showActions={true}
                  onDelete={handleDeleteGig}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders Section */}
        <div>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            marginBottom: '1rem',
            color: '#333'
          }}>
            Recent Orders ({myOrders.length})
          </h2>
          
          {myOrders.length === 0 ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
              color: '#666'
            }}>
              <p>No orders yet. Start by browsing available gigs!</p>
            </div>
          ) : (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              {myOrders.slice(0, 5).map(order => (
                <div 
                  key={order._id}
                  onClick={() => navigate(`/orders/${order._id}`)}
                  style={{
                    padding: '1rem',
                    borderBottom: '1px solid #e0e0e0',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                        {order.gig_id?.title || 'Order'}
                      </h4>
                      <p style={{ fontSize: '0.875rem', color: '#666' }}>
                        Status: <span style={{ 
                          fontWeight: '500',
                          color: order.status === 'completed' ? '#4caf50' : '#ff9800'
                        }}>
                          {order.status}
                        </span>
                      </p>
                    </div>
                    <span style={{ fontWeight: 'bold', color: '#1976d2' }}>
                      ${order.totalPrice}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Dashboard;
