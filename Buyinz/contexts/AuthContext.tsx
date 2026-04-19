import React, { createContext, useState, useContext } from 'react';
import type { AccountType } from '@/lib/supabase';

export type User = {
  id?: string;
  /** Defaults to shopper when omitted (e.g. older in-memory sessions). */
  account_type?: AccountType;
  display_name: string;
  username: string;
  location: string;
  bio?: string;
  avatar_url?: string;
  email?: string;
};

type AuthContextType = {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
