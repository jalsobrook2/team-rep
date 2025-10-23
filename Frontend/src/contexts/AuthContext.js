import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../services/api';

// Helper functions to keep API response parsing consistent
const extractResponseData = (response) => response?.data?.data ?? response?.data ?? {};

const extractErrorMessage = (error, fallbackMessage) => {
  const apiError = error?.response?.data?.error;

  if (!apiError) {
    return fallbackMessage;
  }

  if (typeof apiError === 'string') {
    return apiError;
  }

  if (typeof apiError === 'object' && apiError !== null) {
    return apiError.message || fallbackMessage;
  }

  return fallbackMessage;
};

// Auth Context
const AuthContext = createContext();

// Auth Actions
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_ERROR: 'LOGIN_ERROR',
  LOGOUT: 'LOGOUT',
  REGISTER_START: 'REGISTER_START',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_ERROR: 'REGISTER_ERROR',
  UPDATE_USER: 'UPDATE_USER',
  SET_LOADING: 'SET_LOADING'
};

// Initial state
const initialState = {
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: false,
  isLoading: true,
  error: null
};

// Auth Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
    case AUTH_ACTIONS.REGISTER_START:
      return {
        ...state,
        isLoading: true,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
    case AUTH_ACTIONS.REGISTER_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_ERROR:
    case AUTH_ACTIONS.REGISTER_ERROR:
      return {
        ...state,
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      };

    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
        error: null
      };

    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };

    default:
      return state;
  }
};

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      if (accessToken && refreshToken) {
        try {
          const profileResponse = await authAPI.getProfile();
          const profileData = extractResponseData(profileResponse);

          if (!profileData.user) {
            throw new Error('Missing user profile data');
          }

          dispatch({
            type: AUTH_ACTIONS.LOGIN_SUCCESS,
            payload: {
              user: profileData.user,
              accessToken,
              refreshToken
            }
          });
        } catch (error) {
          try {
            const refreshResponse = await authAPI.refreshToken(refreshToken);
            const refreshData = extractResponseData(refreshResponse);

            if (!refreshData.accessToken || !refreshData.refreshToken) {
              throw new Error('Invalid refresh token response');
            }

            localStorage.setItem('accessToken', refreshData.accessToken);
            localStorage.setItem('refreshToken', refreshData.refreshToken);

            const profileResponse = await authAPI.getProfile();
            const profileData = extractResponseData(profileResponse);

            if (!profileData.user) {
              throw new Error('Missing user profile data');
            }

            dispatch({
              type: AUTH_ACTIONS.LOGIN_SUCCESS,
              payload: {
                user: profileData.user,
                accessToken: refreshData.accessToken,
                refreshToken: refreshData.refreshToken
              }
            });
          } catch (refreshError) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            dispatch({ type: AUTH_ACTIONS.LOGOUT });
          }
        }
      } else {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (identifier, password) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });
    
    try {
      const response = await authAPI.login(identifier, password);
      const payload = extractResponseData(response);

      if (!payload.accessToken || !payload.refreshToken || !payload.user) {
        throw new Error('Invalid login response');
      }

      localStorage.setItem('accessToken', payload.accessToken);
      localStorage.setItem('refreshToken', payload.refreshToken);

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload
      });

      return { success: true, data: payload };
    } catch (error) {
      const errorMessage = extractErrorMessage(error, 'Login failed');

      dispatch({
        type: AUTH_ACTIONS.LOGIN_ERROR,
        payload: errorMessage
      });

      return { success: false, error: errorMessage };
    }
  };

  // Register function
  const register = async (userData) => {
    dispatch({ type: AUTH_ACTIONS.REGISTER_START });
    
    try {
      const response = await authAPI.register(userData);
      const payload = extractResponseData(response);

      if (!payload.accessToken || !payload.refreshToken || !payload.user) {
        throw new Error('Invalid registration response');
      }

      localStorage.setItem('accessToken', payload.accessToken);
      localStorage.setItem('refreshToken', payload.refreshToken);

      dispatch({
        type: AUTH_ACTIONS.REGISTER_SUCCESS,
        payload
      });

      return { success: true, data: payload };
    } catch (error) {
      const errorMessage = extractErrorMessage(error, 'Registration failed');

      dispatch({
        type: AUTH_ACTIONS.REGISTER_ERROR,
        payload: errorMessage
      });

      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Call logout API if user is authenticated
      if (state.isAuthenticated) {
        await authAPI.logout();
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Clear local storage and state regardless of API call result
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      const response = await authAPI.updateProfile(userData);
      const payload = extractResponseData(response);

      if (payload.user) {
        dispatch({
          type: AUTH_ACTIONS.UPDATE_USER,
          payload: payload.user
        });
      }

      return { success: true, data: payload };
    } catch (error) {
      const errorMessage = extractErrorMessage(error, 'Profile update failed');
      return { success: false, error: errorMessage };
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await authAPI.changePassword(currentPassword, newPassword);
      const payload = extractResponseData(response);
      return { success: true, data: payload };
    } catch (error) {
      const errorMessage = extractErrorMessage(error, 'Password change failed');
      return { success: false, error: errorMessage };
    }
  };

  // Context value
  const value = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    changePassword
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};