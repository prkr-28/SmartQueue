import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { socketClient } from '../services/socket';
import { UserDto } from '@smartqueue/shared';

interface AuthContextType {
  user: UserDto | null;
  token: string | null;
  isLoading: boolean;
  login: (data: { user: UserDto; accessToken: string }) => void;
  logout: () => Promise<void>;
  updateUser: (user: Partial<UserDto>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDto | null>(() => {
    const saved = localStorage.getItem('smartqueue_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('smartqueue_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('smartqueue_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.data);
          localStorage.setItem('smartqueue_user', JSON.stringify(res.data.data));

          // Connect socket and join user's room
          const socket = socketClient.connect();
          socketClient.joinPatient(res.data.data._id);
        } catch (err) {
          localStorage.removeItem('smartqueue_token');
          localStorage.removeItem('smartqueue_user');
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = (data: { user: UserDto; accessToken: string }) => {
    setUser(data.user);
    setToken(data.accessToken);
    localStorage.setItem('smartqueue_user', JSON.stringify(data.user));
    localStorage.setItem('smartqueue_token', data.accessToken);

    socketClient.connect();
    socketClient.joinPatient(data.user._id);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Ignore error during logout
    } finally {
      if (user) {
        socketClient.leavePatient(user._id);
      }
      setUser(null);
      setToken(null);
      localStorage.removeItem('smartqueue_user');
      localStorage.removeItem('smartqueue_token');
      window.location.href = '/login';
    }
  };

  const updateUser = (updated: Partial<UserDto>) => {
    if (user) {
      const newUser = { ...user, ...updated };
      setUser(newUser);
      localStorage.setItem('smartqueue_user', JSON.stringify(newUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
