import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { jobsAPI, workersAPI, safetyAPI } from '../services/api';
import DashboardCard from '../components/DashboardCard';
import QuickActions from '../components/QuickActions';
import SafetyAlert from '../components/SafetyAlert';
import RecentActivity from '../components/RecentActivity';
import JobSummary from '../components/JobSummary';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    jobs: [],
    workers: [],
    safetyAlerts: [],
    recentActivity: [],
    stats: {
      totalJobs: 0,
      activeJobs: 0,
      completedJobs: 0,
      totalEarnings: 0,
      safetyRating: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch data based on user role
      const promises = [];

      if (user.role === 'requester' || user.role === 'both') {
        promises.push(jobsAPI.getAll({ ownerId: user.id, limit: 5 }));
      }

      if (user.role === 'worker' || user.role === 'both') {
        promises.push(workersAPI.getAll({ limit: 5 }));
      }

      promises.push(safetyAPI.getSafetyTips());

      const results = await Promise.allSettled(promises);
      
      // Process results
      let jobs = [];
      let workers = [];
      let safetyAlerts = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const data = result.value.data;
          if (index === 0 && (user.role === 'requester' || user.role === 'both')) {
            jobs = data.jobs || [];
          } else if (index === 1 && (user.role === 'worker' || user.role === 'both')) {
            workers = data.workers || [];
          } else {
            safetyAlerts = data.tips || [];
          }
        }
      });

      // Calculate stats
      const stats = calculateStats(jobs, user);

      setDashboardData({
        jobs,
        workers,
        safetyAlerts,
        recentActivity: generateRecentActivity(jobs),
        stats
      });

    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (jobs, user) => {
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter(job => 
      job.status === 'open' || job.status === 'assigned' || job.status === 'in_progress'
    ).length;
    const completedJobs = jobs.filter(job => job.status === 'completed').length;
    const totalEarnings = jobs
      .filter(job => job.status === 'completed')
      .reduce((sum, job) => sum + parseFloat(job.offer || 0), 0);

    return {
      totalJobs,
      activeJobs,
      completedJobs,
      totalEarnings,
      safetyRating: user.safetyRating || 0
    };
  };

  const generateRecentActivity = (jobs) => {
    return jobs
      .slice(0, 5)
      .map(job => ({
        id: job.id,
        type: 'job',
        action: `Job "${job.title}" ${job.status}`,
        timestamp: job.updatedAt,
        icon: '💼'
      }));
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-message">
          <h3>⚠️ {error}</h3>
          <button onClick={fetchDashboardData} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="greeting-section">
          <h1>{getGreeting()}, {user.firstName}!</h1>
          <p className="welcome-message">
            Welcome to your SafeGig dashboard. Here's what's happening with your gigs.
          </p>
        </div>
        <div className="user-status">
          <div className="verification-badge">
            {user.isVerified ? (
              <span className="verified">✅ Verified</span>
            ) : (
              <span className="unverified">⚠️ Unverified</span>
            )}
          </div>
          <div className="safety-rating">
            ⭐ {dashboardData.stats.safetyRating?.toFixed?.(1) ?? '0.0'} Safety Rating
          </div>
        </div>
      </div>

      {/* Safety Alerts */}
      {dashboardData.safetyAlerts.length > 0 && (
        <SafetyAlert alerts={dashboardData.safetyAlerts} />
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <DashboardCard
          title="Total Jobs"
          value={dashboardData.stats.totalJobs}
          icon="💼"
          color="blue"
        />
        <DashboardCard
          title="Active Jobs"
          value={dashboardData.stats.activeJobs}
          icon="🔄"
          color="orange"
        />
        <DashboardCard
          title="Completed Jobs"
          value={dashboardData.stats.completedJobs}
          icon="✅"
          color="green"
        />
        <DashboardCard
          title="Total Earnings"
          value={`$${dashboardData.stats.totalEarnings.toFixed(2)}`}
          icon="💰"
          color="purple"
        />
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Quick Actions */}
        <div className="dashboard-section">
          <QuickActions userRole={user.role} />
        </div>

        {/* Job Summary */}
        {(user.role === 'requester' || user.role === 'both') && (
          <div className="dashboard-section">
            <JobSummary jobs={dashboardData.jobs} />
          </div>
        )}

        {/* Recent Activity */}
        <div className="dashboard-section">
          <RecentActivity activities={dashboardData.recentActivity} />
        </div>

        {/* Safety Section */}
        <div className="dashboard-section safety-section">
          <h3>🛡️ Safety Center</h3>
          <div className="safety-features">
            <div className="safety-feature">
              <span className="feature-icon">📍</span>
              <div className="feature-info">
                <h4>Location Sharing</h4>
                <p>Share your location during active jobs</p>
                <button className="feature-toggle">Enable</button>
              </div>
            </div>
            <div className="safety-feature">
              <span className="feature-icon">🚨</span>
              <div className="feature-info">
                <h4>Emergency Contact</h4>
                <p>Quick access to emergency services</p>
                <button className="feature-button">Setup</button>
              </div>
            </div>
            <div className="safety-feature">
              <span className="feature-icon">📋</span>
              <div className="feature-info">
                <h4>Background Check</h4>
                <p>Verify your identity for trust</p>
                <button className="feature-button">
                  {user.verificationLevel === 'background' ? 'Verified' : 'Start'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;