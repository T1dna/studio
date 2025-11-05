
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Auth,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  getAuth,
} from 'firebase/auth';
import { doc, setDoc, getFirestore } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

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
  const { auth, firestore, isUserLoading: firebaseLoading, user: firebaseUser } = useFirebase();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isProcessingLogin, setIsProcessingLogin] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!firebaseLoading && firebaseUser) {
      const email = firebaseUser.email || '';
      const role = userRoles[email] || 'Accountant';
      const username = Object.keys(emailMapping).find(key => emailMapping[key] === email) || 'user';
      setAppUser({ uid: firebaseUser.uid, email, role, username });
    } else if (!firebaseLoading && !firebaseUser) {
      setAppUser(null);
    }
  }, [firebaseUser, firebaseLoading]);

  const login = async (username: string, password_raw: string): Promise<boolean> => {
    if (!auth || !firestore) return false;
    setIsProcessingLogin(true);

    const email = emailMapping[username.toLowerCase()];
    if (!email) {
      setIsProcessingLogin(false);
      return false;
    }
    
    try {
      await signInWithEmailAndPassword(auth, email, password_raw);
      // Auth state change is handled by the useEffect hook
      setIsProcessingLogin(false);
      return true;
    } catch (error: any) {
      // If user not found, create a new one.
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password_raw);
          const newUser = userCredential.user;
          const role = userRoles[email];

          if (role === 'Developer') {
            // This is the critical fix: Create the role document in Firestore for developers
            const roleDocRef = doc(firestore, 'roles_developer', newUser.uid);
            setDocumentNonBlocking(roleDocRef, { uid: newUser.uid, role: 'Developer' }, {});
          }

          setIsProcessingLogin(false);
          return true;
        } catch (createError) {
          console.error("Firebase create user error:", createError);
          setIsProcessingLogin(false);
          return false;
        }
      }
      console.error("Firebase login error:", error);
      setIsProcessingLogin(false);
      return false;
    }
  };

  const logout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      setAppUser(null);
      router.push('/login');
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
    } catch (error) {
      console.error("Logout failed:", error);
      toast({ variant: 'destructive', title: 'Logout Failed', description: 'Could not log you out. Please try again.' });
    }
  };

  const loading = firebaseLoading || isProcessingLogin;

  return (
    <AuthContext.Provider value={{ user: appUser, login, logout, loading }}>
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
