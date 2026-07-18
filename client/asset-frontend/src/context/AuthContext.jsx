import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { startAuthentication } from '@simplewebauthn/browser';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const res = await api.get('/auth/profile');
        if (res.data && res.data.success) {
          setUser(res.data.user);
        }
      }
    } catch (err) {
      console.error('Failed to restore auth session:', err.message);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Standard Login
  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.require2FA) {
        return { require2FA: true, userId: res.data.userId };
      }
      if (res.data.accessToken) {
        localStorage.setItem('token', res.data.accessToken);
        setUser(res.data.user);
      }
      return { success: true };
    } catch (err) {
      throw err.response?.data?.message || 'Login failed';
    }
  };

  // Login with 2FA
  const loginWith2FA = async (userId, token) => {
    try {
      const res = await api.post('/auth/2fa/login', { userId, token });
      if (res.data.accessToken) {
        localStorage.setItem('token', res.data.accessToken);
        setUser(res.data.user);
      }
      return { success: true };
    } catch (err) {
      throw err.response?.data?.message || '2FA Authentication failed';
    }
  };

  // Login with Passkey (WebAuthn)
  const loginWithPasskey = async () => {
    try {
      // 1. Fetch authentication options
      const optionsRes = await api.get('/auth/passkey/login-options');
      const options = optionsRes.data;

      // 2. Authenticate using browser credentials API
      const credential = await startAuthentication(options);

      // 3. Verify assertion with backend
      const verifyRes = await api.post('/auth/passkey/login-verify', credential);
      
      if (verifyRes.data.accessToken) {
        localStorage.setItem('token', verifyRes.data.accessToken);
        setUser(verifyRes.data.user);
        return { success: true };
      }
      throw new Error('Verification failed');
    } catch (err) {
      console.error('Passkey authentication error:', err);
      throw err.response?.data?.message || err.message || 'Passkey login failed';
    }
  };

  // Google OAuth Login Integration
  const loginWithGoogle = (token) => {
    localStorage.setItem('token', token);
    checkAuth();
  };

  // Register
  const register = async (fullName, email, password, department, branch) => {
    try {
      const res = await api.post('/auth/register', {
        fullName,
        email,
        password,
        department,
        branch,
      });
      return res.data;
    } catch (err) {
      throw err.response?.data?.message || 'Registration failed';
    }
  };

  // Update Profile
  const updateProfile = async (data) => {
    try {
      const res = await api.put('/auth/profile', data);
      if (res.data.success) {
        setUser(prevUser => ({
          ...prevUser,
          ...res.data.user,
        }));
      }
      return res.data;
    } catch (err) {
      throw err.response?.data?.message || 'Profile update failed';
    }
  };

  // Logout
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout API call failed:', err);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWith2FA,
        loginWithPasskey,
        loginWithGoogle,
        register,
        updateProfile,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
