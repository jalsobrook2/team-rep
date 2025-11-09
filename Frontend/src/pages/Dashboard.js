import React, { useState, useEffect } from 'react';
import CreateGigForm from '../components/CreateGigForm';
import OrderProgressTracker from '../components/OrderProgressTracker';
import { gigsAPI, ordersAPI } from '../services/api';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateGig, setShowCreateGig] = useState(false);
  const [userGigs, setUserGigs] = useState([]);
  const [userOrders, setUserOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalGigs: 0,
    activeGigs: 0,
    totalOrders: 0,
    completedOrders: 0,
    earnings: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, [activeTab]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load user's gigs
      const gigsResponse = await gigsAPI.getUserGigs();
      if (gigsResponse.data.success) {
        setUserGigs(gigsResponse.data.data);
        updateStats(gigsResponse.data.data, userOrders);
      }

      // Load user's orders
      const ordersResponse = await ordersAPI.getUserOrders();
      if (ordersResponse.data.success) {
        setUserOrders(ordersResponse.data.data);
        updateStats(userGigs, ordersResponse.data.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (gigs, orders) => {
    const activeGigs = gigs.filter(gig => gig.status === 'active').length;
    const completedOrders = orders.filter(order => order.status === 'completed').length;
    const earnings = orders
      .filter(order => order.status === 'completed' && order.userRole === 'seller')
      .reduce((sum, order) => sum + order.totalPrice, 0);

    setStats({
      totalGigs: gigs.length,
      activeGigs,
      totalOrders: orders.length,
      completedOrders,
      earnings
    });
  };

  const handleCreateGigSuccess = (newGig) => {
    setUserGigs(prev => [newGig, ...prev]);
    setShowCreateGig(false);
    setStats(prev => ({
      ...prev,
      totalGigs: prev.totalGigs + 1,
      activeGigs: prev.activeGigs + 1
    }));
  };

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-2 text-gray-600">Manage your gigs and orders</p>
            </div>
            <button
              onClick={() => setShowCreateGig(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
            >
              Create New Gig
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Gigs</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalGigs}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Gigs</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.activeGigs}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Orders</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Earnings</p>
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.earnings)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { key: 'overview', label: 'Overview' },
                { key: 'gigs', label: 'My Gigs' },
                { key: 'orders', label: 'Orders' },
                { key: 'earnings', label: 'Earnings' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
                
                {/* Recent Orders */}
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-4">Recent Orders</h4>
                  {userOrders.slice(0, 3).map((order) => (
                    <div key={order._id} className="border border-gray-200 rounded-lg p-4 mb-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-medium text-gray-900">{order.gig_id?.title || 'Unknown Gig'}</h5>
                          <p className="text-sm text-gray-500">
                            {order.userRole === 'buyer' ? 'Ordered from' : 'Order from'}: {
                              order.userRole === 'buyer' 
                                ? order.seller_id?.name 
                                : order.buyer_id?.name
                            }
                          </p>
                          <p className="text-sm text-gray-500">Created: {formatDate(order.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{formatCurrency(order.totalPrice)}</p>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            order.status === 'completed' ? 'bg-green-100 text-green-800' :
                            order.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      <OrderProgressTracker order={order} className="mt-4" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'gigs' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">My Gigs</h3>
                  <button
                    onClick={() => setShowCreateGig(true)}
                    className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
                  >
                    Create New Gig
                  </button>
                </div>

                {userGigs.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userGigs.map((gig) => (
                      <div key={gig._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h4 className="font-medium text-gray-900 mb-2">{gig.title}</h4>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-3">{gig.description}</p>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">{formatCurrency(gig.price)}</span>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            gig.status === 'active' ? 'bg-green-100 text-green-800' :
                            gig.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {gig.status.charAt(0).toUpperCase() + gig.status.slice(1)}
                          </span>
                        </div>
                        <div className="mt-3 text-sm text-gray-500">
                          <p>Orders: {gig.totalOrders || 0}</p>
                          <p>Created: {formatDate(gig.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No gigs yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating your first gig.</p>
                    <div className="mt-6">
                      <button
                        onClick={() => setShowCreateGig(true)}
                        className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
                      >
                        Create Your First Gig
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-6">All Orders</h3>
                {userOrders.length > 0 ? (
                  <div className="space-y-4">
                    {userOrders.map((order) => (
                      <div key={order._id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-medium text-gray-900">{order.gig_id?.title || 'Unknown Gig'}</h4>
                            <p className="text-sm text-gray-500">
                              {order.userRole === 'buyer' ? 'Ordered from' : 'Order from'}: {
                                order.userRole === 'buyer' 
                                  ? order.seller_id?.name 
                                  : order.buyer_id?.name
                              }
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">{formatCurrency(order.totalPrice)}</p>
                            <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                          </div>
                        </div>
                        <OrderProgressTracker order={order} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No orders yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Orders will appear here when you buy or sell gigs.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'earnings' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-6">Earnings Overview</h3>
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary-600">{formatCurrency(stats.earnings)}</p>
                      <p className="text-sm text-gray-500">Total Earnings</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-600">{stats.completedOrders}</p>
                      <p className="text-sm text-gray-500">Completed Orders</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-blue-600">
                        {stats.completedOrders > 0 ? formatCurrency(stats.earnings / stats.completedOrders) : '$0.00'}
                      </p>
                      <p className="text-sm text-gray-500">Avg. Order Value</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Gig Modal */}
      {showCreateGig && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <CreateGigForm
              onSuccess={handleCreateGigSuccess}
              onCancel={() => setShowCreateGig(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;