import { createContext, useContext, type ReactNode } from 'react';

type MembershipAuthContextValue = {
  webViewKey: number;
  endSession: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
};

const MembershipAuthContext = createContext<MembershipAuthContextValue | null>(null);

export function MembershipAuthProvider({
  children,
  webViewKey,
  endSession,
  authError,
  clearAuthError,
}: {
  children: ReactNode;
  webViewKey: number;
  endSession: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}) {
  return (
    <MembershipAuthContext.Provider value={{ webViewKey, endSession, authError, clearAuthError }}>
      {children}
    </MembershipAuthContext.Provider>
  );
}

export function useMembershipAuth() {
  const context = useContext(MembershipAuthContext);

  if (!context) {
    throw new Error('useMembershipAuth must be used within MembershipAuthProvider');
  }

  return context;
}
