import { GoogleOAuthProvider } from "@react-oauth/google";
import type { ReactNode } from "react";

interface GoogleAuthProviderWrapperProps {
  children: ReactNode;
}

export function GoogleAuthProviderWrapper({ children }: GoogleAuthProviderWrapperProps) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  
  if (!clientId) {
    console.error("VITE_GOOGLE_CLIENT_ID is not set");
    return <>{children}</>;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {children}
    </GoogleOAuthProvider>
  );
}
