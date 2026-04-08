import { GoogleOAuthProvider, useGoogleLogin as useGoogleLoginOAuth } from "@react-oauth/google";
import type { CodeClientConfig } from "@react-oauth/google";
import { createContext, useContext, useCallback, type ReactNode } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";

declare module "@react-oauth/google" {
  interface CodeClientConfig {
    access_type?: "online" | "offline";
  }
}

interface GoogleAuthContextValue {
  isGoogleAuthAvailable: boolean;
  promptDriveAuth: () => void;
}

const GoogleAuthContext = createContext<GoogleAuthContextValue>({
  isGoogleAuthAvailable: false,
  promptDriveAuth: () => {},
});

export function useGoogleAuth() {
  return useContext(GoogleAuthContext);
}

export function useDriveAuth() {
  const { isGoogleAuthAvailable, promptDriveAuth } = useContext(GoogleAuthContext);
  return { promptDriveAuth, isGoogleAuthAvailable };
}

function DriveAuthProvider({ children }: { children: ReactNode }) {
  const authorize = useGoogleLoginOAuth({
    flow: "auth-code",
    scope: "https://www.googleapis.com/auth/drive.file openid email profile",
    prompt: "consent",
    access_type: "offline",
    onSuccess: async (codeResponse) => {
      try {
        await apiRequest("POST", "/api/auth/google-code", {
          code: codeResponse.code,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/session"] });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/drive-status"] });
        queryClient.invalidateQueries({ queryKey: ["/api/drive/search"] });
      } catch (error) {
        console.error("Failed to exchange Drive auth code:", error);
      }
    },
    onError: (error) => {
      console.error("Drive auth error:", error);
    },
  });

  const promptDriveAuth = useCallback(() => {
    authorize();
  }, [authorize]);

  return (
    <GoogleAuthContext.Provider value={{ isGoogleAuthAvailable: true, promptDriveAuth }}>
      {children}
    </GoogleAuthContext.Provider>
  );
}

interface GoogleAuthProviderWrapperProps {
  children: ReactNode;
}

export function GoogleAuthProviderWrapper({ children }: GoogleAuthProviderWrapperProps) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  
  if (!clientId) {
    console.error("VITE_GOOGLE_CLIENT_ID is not set");
    return (
      <GoogleAuthContext.Provider value={{ isGoogleAuthAvailable: false, promptDriveAuth: () => {} }}>
        {children}
      </GoogleAuthContext.Provider>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <DriveAuthProvider>
        {children}
      </DriveAuthProvider>
    </GoogleOAuthProvider>
  );
}
