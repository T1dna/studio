"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

type Role = 'Developer' | 'Admin' | 'Accountant';

interface User {
  username: string;
  role: Role;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password_raw: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user data - in a real app, this would come from a database
const users: Record<string, { password_hash: string; role: Role }> = {
  developer: { password_hash: 'admin123', role: 'Developer' },
  admin: { password_hash: 'admin123', role: 'Admin' },
  accountant: { password_hash: 'admin123', role: 'Accountant' },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('gems-user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('gems-user');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password_raw: string): Promise<boolean> => {
    const foundUser = users[username.toLowerCase()];
    // NOTE: In a real app, you would hash the password and compare it with a stored hash.
    // For this MVP, we are doing a simple string comparison.
    if (foundUser && foundUser.password_hash === password_raw) {
      const userData = { username: username.toLowerCase(), role: foundUser.role };
      setUser(userData);
      localStorage.setItem('gems-user', JSON.stringify(userData));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('gems-user');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
