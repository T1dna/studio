
"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Auth,
  User,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';

type Role = 'Developer' | 'Admin' | 'Accountant';

interface AppUser {
  uid: string;
  email: string | null;
  role: Role;
  username: string;
}

interface AuthContextType {
  user: AppUser | null;
  login: (username: string, password_raw: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user data for roles - in a real app, this would come from custom claims or Firestore
const userRoles: Record<string, Role> = {
  'developer@test.com': 'Developer',
  'admin@test.com': 'Admin',
  'accountant@test.com': 'Accountant',
};

const emailMapping: Record<string, string> = {
    'developer': 'developer@test.com',
    'admin': 'admin@test.com',
    'accountant': 'accountant@test.com',
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { auth, isUserLoading, user: firebaseUser } = useFirebase();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => {
    if (!isUserLoading && firebaseUser) {
      const email = firebaseUser.email || '';
      const role = userRoles[email] || 'Accountant';
      const username = Object.keys(emailMapping).find(key => emailMapping[key] === email) || 'user';
      setAppUser({ uid: firebaseUser.uid, email, role, username });
    } else if (!isUserLoading && !firebaseUser) {
      setAppUser(null);
    }
  }, [firebaseUser, isUserLoading]);

  const login = async (username: string, password_raw: string): Promise<boolean> => {
    const email = emailMapping[username.toLowerCase()];
    if (!email) {
      return false;
    }
    
    try {
      await signInWithEmailAndPassword(auth as Auth, email, password_raw);
      // Auth state change is handled by the useEffect hook
      return true;
    } catch (error) {
      console.error("Firebase login error:", error);
      // In a real app, you might want to create the user if they don't exist
      // For this app, we'll assume the users are pre-created in Firebase Auth
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth as Auth);
      setAppUser(null);
      router.push('/login');
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
    } catch (error) {
      console.error("Logout failed:", error);
      toast({ variant: 'destructive', title: 'Logout Failed', description: 'Could not log you out. Please try again.' });
    }
  };

  return (
    <AuthContext.Provider value={{ user: appUser, login, logout, loading: isUserLoading }}>
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
