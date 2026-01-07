import { GoogleOAuthProvider } from "@react-oauth/google";
import { createContext, useContext, type ReactNode } from "react";

interface GoogleAuthContextValue {
  isGoogleAuthAvailable: boolean;
}

const GoogleAuthContext = createContext<GoogleAuthContextValue>({ isGoogleAuthAvailable: false });

export function useGoogleAuth() {
  return useContext(GoogleAuthContext);
}

interface GoogleAuthProviderWrapperProps {
  children: ReactNode;
}

export function GoogleAuthProviderWrapper({ children }: GoogleAuthProviderWrapperProps) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  
  if (!clientId) {
    console.error("VITE_GOOGLE_CLIENT_ID is not set");
    return (
      <GoogleAuthContext.Provider value={{ isGoogleAuthAvailable: false }}>
        {children}
      </GoogleAuthContext.Provider>
    );
  }

  return (
    <GoogleAuthContext.Provider value={{ isGoogleAuthAvailable: true }}>
      <GoogleOAuthProvider clientId={clientId}>
        {children}
      </GoogleOAuthProvider>
    </GoogleAuthContext.Provider>
  );
}
