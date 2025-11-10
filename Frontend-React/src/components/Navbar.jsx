import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={{
      backgroundColor: '#1976d2',
      color: 'white',
      padding: '1rem 2rem',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Link 
          to="/" 
          style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: 'white',
            textDecoration: 'none'
          }}
        >
          FreelancePro
        </Link>

        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          {isAuthenticated ? (
            <>
              <Link 
                to="/dashboard" 
                style={{
                  color: 'white',
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
              >
                Dashboard
              </Link>
              <Link 
                to="/gigs" 
                style={{
                  color: 'white',
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
              >
                Browse Gigs
              </Link>
              <Link 
                to="/orders" 
                style={{
                  color: 'white',
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
              >
                Orders
              </Link>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <span style={{ fontSize: '0.875rem' }}>
                  👤 {user?.name}
                </span>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#d32f2f',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link 
                to="/login" 
                style={{
                  color: 'white',
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
              >
                Login
              </Link>
              <Link 
                to="/register" 
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'white',
                  color: '#1976d2',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  fontWeight: '500'
                }}
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
