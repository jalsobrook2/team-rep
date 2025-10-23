import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const closeMenus = () => {
    setIsMenuOpen(false);
    setIsProfileDropdownOpen(false);
  };

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  // Don't show navbar on login/register pages
  if (!isAuthenticated && (location.pathname === '/login' || location.pathname === '/register')) {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo and Brand */}
        <div className="navbar-brand">
          <Link to="/dashboard" className="brand-link" onClick={closeMenus}>
            <span className="brand-icon">🛡️</span>
            <span className="brand-text">SafeGig</span>
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className={`mobile-menu-toggle ${isMenuOpen ? 'active' : ''}`}
          onClick={toggleMenu}
          aria-label="Toggle navigation menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Navigation Links */}
        {isAuthenticated && (
          <div className={`navbar-menu ${isMenuOpen ? 'active' : ''}`}>
            <div className="navbar-nav">
              <Link 
                to="/dashboard" 
                className={`nav-link ${isActiveRoute('/dashboard') ? 'active' : ''}`}
                onClick={closeMenus}
              >
                <span className="nav-icon">📊</span>
                Dashboard
              </Link>
              
              <Link 
                to="/jobs" 
                className={`nav-link ${isActiveRoute('/jobs') ? 'active' : ''}`}
                onClick={closeMenus}
              >
                <span className="nav-icon">💼</span>
                Jobs
              </Link>
              
              <Link 
                to="/workers" 
                className={`nav-link ${isActiveRoute('/workers') ? 'active' : ''}`}
                onClick={closeMenus}
              >
                <span className="nav-icon">👥</span>
                Workers
              </Link>
              
              <Link 
                to="/safety" 
                className={`nav-link ${isActiveRoute('/safety') ? 'active' : ''}`}
                onClick={closeMenus}
              >
                <span className="nav-icon">🛡️</span>
                Safety
              </Link>
            </div>

            {/* User Profile Section */}
            <div className="navbar-profile">
              {user && (
                <div className="profile-dropdown">
                  <button 
                    className="profile-button"
                    onClick={toggleProfileDropdown}
                    aria-label="User profile menu"
                  >
                    <div className="profile-avatar">
                      {user.firstName?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="profile-info">
                      <span className="profile-name">
                        {user.firstName} {user.lastName}
                      </span>
                      <span className="profile-role">
                        {user.role === 'both' ? 'Worker & Requester' : 
                         user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </div>
                    <span className="dropdown-arrow">▼</span>
                  </button>

                  {isProfileDropdownOpen && (
                    <div className="profile-dropdown-menu">
                      <div className="dropdown-header">
                        <div className="user-details">
                          <strong>{user.firstName} {user.lastName}</strong>
                          <small>{user.email}</small>
                          <div className="user-status">
                            {user.isVerified ? (
                              <span className="verified-badge">✅ Verified</span>
                            ) : (
                              <span className="unverified-badge">⚠️ Unverified</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="dropdown-divider"></div>
                      
                      <Link 
                        to="/profile" 
                        className="dropdown-item"
                        onClick={closeMenus}
                      >
                        <span className="item-icon">👤</span>
                        My Profile
                      </Link>
                      
                      <Link 
                        to="/settings" 
                        className="dropdown-item"
                        onClick={closeMenus}
                      >
                        <span className="item-icon">⚙️</span>
                        Settings
                      </Link>
                      
                      <Link 
                        to="/safety" 
                        className="dropdown-item"
                        onClick={closeMenus}
                      >
                        <span className="item-icon">🛡️</span>
                        Safety Center
                      </Link>
                      
                      <div className="dropdown-divider"></div>
                      
                      <button 
                        className="dropdown-item logout-item"
                        onClick={handleLogout}
                      >
                        <span className="item-icon">🚪</span>
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Auth Links for non-authenticated users */}
        {!isAuthenticated && (
          <div className="navbar-auth">
            <Link to="/login" className="auth-link login-link">
              Login
            </Link>
            <Link to="/register" className="auth-link register-link">
              Register
            </Link>
          </div>
        )}
      </div>

      {/* Overlay for mobile menu */}
      {(isMenuOpen || isProfileDropdownOpen) && (
        <div className="navbar-overlay" onClick={closeMenus}></div>
      )}
    </nav>
  );
};

export default Navbar;