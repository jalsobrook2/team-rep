import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { orderAPI, gigAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import ProgressBar from '../components/ProgressBar';

const Orders = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create order form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [gigs, setGigs] = useState([]);
  const [formData, setFormData] = useState({
    gig_id: '',
    requirements: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Message form
  const [newMessage, setNewMessage] = useState('');
  const [messageLoading, setMessageLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchOrderDetails(id);
    } else {
      fetchOrders();
    }

    // Check if we need to show create form
    const gigId = searchParams.get('gigId');
    if (gigId) {
      setShowCreateForm(true);
      setFormData(prev => ({ ...prev, gig_id: gigId }));
      fetchGigs();
    }
  }, [id, searchParams]);

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    const result = await orderAPI.getUserOrders();
    
    if (result.success) {
      setOrders(result.data.orders || []);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const fetchOrderDetails = async (orderId) => {
    setLoading(true);
    setError('');
    const result = await orderAPI.getOrderById(orderId);
    
    if (result.success) {
      setSelectedOrder(result.data.order);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const fetchGigs = async () => {
    const result = await gigAPI.getAllGigs();
    if (result.success) {
      setGigs(result.data.gigs || []);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    const selectedGig = gigs.find(g => g._id === formData.gig_id);
    if (!selectedGig) {
      setFormError('Please select a gig');
      setFormLoading(false);
      return;
    }

    const orderData = {
      gig_id: formData.gig_id,
      requirements: formData.requirements,
      seller_id: selectedGig.user_id._id || selectedGig.user_id,
      totalPrice: selectedGig.price
    };

    const result = await orderAPI.createOrder(orderData);
    
    if (result.success) {
      navigate('/orders');
      fetchOrders();
      setShowCreateForm(false);
    } else {
      setFormError(result.error);
    }

    setFormLoading(false);
  };

  const handleStatusUpdate = async (orderId, action) => {
    let result;
    switch (action) {
      case 'accept':
        result = await orderAPI.acceptOrder(orderId);
        break;
      case 'start':
        result = await orderAPI.startWork(orderId);
        break;
      case 'deliver':
        result = await orderAPI.deliverOrder(orderId);
        break;
      case 'complete':
        result = await orderAPI.completeOrder(orderId);
        break;
      case 'cancel':
        const reason = prompt('Please provide a reason for cancellation:');
        if (!reason) return;
        result = await orderAPI.cancelOrder(orderId, reason);
        break;
      default:
        return;
    }

    if (result.success) {
      if (selectedOrder) {
        fetchOrderDetails(orderId);
      } else {
        fetchOrders();
      }
    } else {
      alert(result.error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setMessageLoading(true);
    const result = await orderAPI.addMessage(selectedOrder._id, newMessage);
    
    if (result.success) {
      setNewMessage('');
      fetchOrderDetails(selectedOrder._id);
    } else {
      alert(result.error);
    }

    setMessageLoading(false);
  };

  const getActionButtons = (order) => {
    const isBuyer = order.buyer_id._id === user._id || order.buyer_id === user._id;
    const isSeller = order.seller_id._id === user._id || order.seller_id === user._id;
    
    const buttons = [];

    if (isSeller && order.status === 'pending') {
      buttons.push(
        <button
          key="accept"
          onClick={() => handleStatusUpdate(order._id, 'accept')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Accept Order
        </button>
      );
    }

    if (isSeller && order.status === 'accepted') {
      buttons.push(
        <button
          key="start"
          onClick={() => handleStatusUpdate(order._id, 'start')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Start Work
        </button>
      );
    }

    if (isSeller && order.status === 'in-progress') {
      buttons.push(
        <button
          key="deliver"
          onClick={() => handleStatusUpdate(order._id, 'deliver')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#ff9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Deliver Order
        </button>
      );
    }

    if (isBuyer && order.status === 'delivered') {
      buttons.push(
        <button
          key="complete"
          onClick={() => handleStatusUpdate(order._id, 'complete')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Mark Complete
        </button>
      );
    }

    if (!['completed', 'cancelled'].includes(order.status)) {
      buttons.push(
        <button
          key="cancel"
          onClick={() => handleStatusUpdate(order._id, 'cancel')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Cancel Order
        </button>
      );
    }

    return buttons;
  };

  // Render order details view
  if (selectedOrder) {
    const isBuyer = selectedOrder.buyer_id._id === user._id || selectedOrder.buyer_id === user._id;
    
    return (
      <>
        <Navbar />
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '2rem'
        }}>
          <button
            onClick={() => {
              setSelectedOrder(null);
              navigate('/orders');
            }}
            style={{
              marginBottom: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ← Back to Orders
          </button>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            padding: '2rem'
          }}>
            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                marginBottom: '0.5rem',
                color: '#333'
              }}>
                {selectedOrder.gig_id?.title || 'Order Details'}
              </h1>
              <p style={{ color: '#666' }}>
                Order ID: {selectedOrder._id}
              </p>
            </div>

            {/* Progress Bar */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', fontWeight: '500' }}>Order Progress</h3>
              <ProgressBar status={selectedOrder.status} />
            </div>

            {/* Order Info */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              <div style={{
                padding: '1rem',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px'
              }}>
                <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                  Status
                </p>
                <p style={{ fontWeight: '500', fontSize: '1.1rem' }}>
                  {selectedOrder.status.toUpperCase()}
                </p>
              </div>

              <div style={{
                padding: '1rem',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px'
              }}>
                <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                  Total Price
                </p>
                <p style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#2e7d32' }}>
                  ${selectedOrder.totalPrice}
                </p>
              </div>

              <div style={{
                padding: '1rem',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px'
              }}>
                <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                  Expected Delivery
                </p>
                <p style={{ fontWeight: '500', fontSize: '1.1rem' }}>
                  {new Date(selectedOrder.expectedDeliveryDate).toLocaleDateString()}
                </p>
              </div>

              <div style={{
                padding: '1rem',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px'
              }}>
                <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                  {isBuyer ? 'Seller' : 'Buyer'}
                </p>
                <p style={{ fontWeight: '500', fontSize: '1.1rem' }}>
                  {isBuyer 
                    ? selectedOrder.seller_id?.name || 'Unknown'
                    : selectedOrder.buyer_id?.name || 'Unknown'
                  }
                </p>
              </div>
            </div>

            {/* Requirements */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '0.5rem', fontWeight: '500' }}>Requirements</h3>
              <p style={{
                padding: '1rem',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                lineHeight: '1.6'
              }}>
                {selectedOrder.requirements}
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '2rem',
              flexWrap: 'wrap'
            }}>
              {getActionButtons(selectedOrder)}
            </div>

            {/* Messages */}
            <div>
              <h3 style={{ marginBottom: '1rem', fontWeight: '500' }}>Messages</h3>
              
              <div style={{
                maxHeight: '400px',
                overflowY: 'auto',
                marginBottom: '1rem',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                padding: '1rem'
              }}>
                {selectedOrder.messages && selectedOrder.messages.length > 0 ? (
                  selectedOrder.messages.map((msg, index) => (
                    <div
                      key={index}
                      style={{
                        marginBottom: '1rem',
                        padding: '0.75rem',
                        backgroundColor: msg.isFromSeller ? '#e3f2fd' : '#f5f5f5',
                        borderRadius: '4px'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '0.25rem',
                        fontSize: '0.875rem',
                        color: '#666'
                      }}>
                        <strong>
                          {msg.isFromSeller ? 'Seller' : 'Buyer'}
                        </strong>
                        <span>
                          {new Date(msg.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p>{msg.message}</p>
                    </div>
                  ))
                ) : (
                  <p style={{ textAlign: 'center', color: '#666' }}>No messages yet</p>
                )}
              </div>

              {/* Send Message Form */}
              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                />
                <button
                  type="submit"
                  disabled={messageLoading || !newMessage.trim()}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: messageLoading ? '#ccc' : '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: messageLoading ? 'not-allowed' : 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Render create order form
  if (showCreateForm) {
    return (
      <>
        <Navbar />
        <div style={{
          maxWidth: '800px',
          margin: '2rem auto',
          padding: '2rem',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            marginBottom: '1.5rem',
            color: '#333'
          }}>
            Place Order
          </h1>

          {formError && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#ffebee',
              color: '#c62828',
              borderRadius: '4px',
              marginBottom: '1rem'
            }}>
              {formError}
            </div>
          )}

          <form onSubmit={handleCreateOrder}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: '#333'
              }}>
                Select Gig *
              </label>
              <select
                value={formData.gig_id}
                onChange={(e) => setFormData({ ...formData, gig_id: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              >
                <option value="">Select a gig</option>
                {gigs.map(gig => (
                  <option key={gig._id} value={gig._id}>
                    {gig.title} - ${gig.price}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: '#333'
              }}>
                Requirements *
              </label>
              <textarea
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                required
                rows={6}
                maxLength={2000}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
                placeholder="Describe your requirements in detail..."
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="submit"
                disabled={formLoading}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: formLoading ? '#ccc' : '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: formLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {formLoading ? 'Placing Order...' : 'Place Order'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  navigate('/gigs');
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </>
    );
  }

  // Render orders list
  return (
    <>
      <Navbar />
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          marginBottom: '0.5rem',
          color: '#333'
        }}>
          My Orders
        </h1>
        <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '2rem' }}>
          Track and manage your orders
        </p>

        {error && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#ffebee',
            color: '#c62828',
            borderRadius: '4px',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', fontSize: '1.1rem', color: '#666' }}>
            Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            color: '#666'
          }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
              You don't have any orders yet.
            </p>
            <button
              onClick={() => navigate('/gigs')}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Browse Gigs
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gap: '1rem'
          }}>
            {orders.map(order => {
              const isBuyer = order.buyer_id._id === user._id || order.buyer_id === user._id;
              
              return (
                <div
                  key={order._id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    padding: '1.5rem',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onClick={() => navigate(`/orders/${order._id}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        marginBottom: '0.5rem',
                        color: '#333'
                      }}>
                        {order.gig_id?.title || 'Order'}
                      </h3>
                      <p style={{ fontSize: '0.875rem', color: '#666' }}>
                        {isBuyer ? 'Seller' : 'Buyer'}: {
                          isBuyer 
                            ? order.seller_id?.name || 'Unknown'
                            : order.buyer_id?.name || 'Unknown'
                        }
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: '#2e7d32',
                        marginBottom: '0.25rem'
                      }}>
                        ${order.totalPrice}
                      </p>
                      <span style={{
                        padding: '4px 12px',
                        backgroundColor: order.status === 'completed' ? '#4caf50' : '#ff9800',
                        color: 'white',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}>
                        {order.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <ProgressBar status={order.status} />
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.875rem',
                    color: '#666'
                  }}>
                    <span>Created: {new Date(order.createdAt).toLocaleDateString()}</span>
                    <span>Due: {new Date(order.expectedDeliveryDate).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default Orders;
