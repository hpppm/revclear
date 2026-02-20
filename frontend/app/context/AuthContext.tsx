"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiClient } from "@/app/lib/api/apiClient";
import { User } from "@/app/lib/types";
import logger from "@/app/lib/logger";

// HIPAA §164.312(a)(2)(iii): Automatic logoff after 15 minutes of inactivity
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

// SECURITY: Session marker key - ensures users must re-authenticate per browser session.
// sessionStorage is cleared when the browser/tab is closed, so even if the httpOnly cookie
// persists (which is correct), the user must explicitly login again after closing the browser.
const SESSION_MARKER_KEY = "revclear_session_active";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requiresOrganization: boolean;
  login: (user: User) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresOrganization, setRequiresOrganization] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  // HIPAA: Automatic session timeout on inactivity
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    // Only set timer if user is authenticated
    if (isAuthenticated) {
      idleTimerRef.current = setTimeout(() => {
        logger.warn("Session timed out due to inactivity");
        performLogout();
        router.push("/login?reason=timeout");
      }, IDLE_TIMEOUT_MS);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const activityEvents = ["mousedown", "keydown", "scroll", "touchstart"];
    activityEvents.forEach((event) =>
      window.addEventListener(event, resetIdleTimer, { passive: true }),
    );
    resetIdleTimer();

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      activityEvents.forEach((event) =>
        window.removeEventListener(event, resetIdleTimer),
      );
    };
  }, [isAuthenticated, resetIdleTimer]);

  const checkAuth = async () => {
    // SECURITY: Authentication now uses httpOnly cookies (not localStorage)
    // The cookie is sent automatically with credentials: true
    // We verify auth by calling /me endpoint - if it succeeds, we're authenticated

    // HIPAA: Check browser session marker. If absent, the user closed their browser
    // since last login and must re-authenticate, even if the httpOnly cookie persists.
    if (typeof window !== "undefined") {
      const hasActiveSession = sessionStorage.getItem(SESSION_MARKER_KEY);
      if (!hasActiveSession) {
        // No active session marker - require login
        clearSensitiveData();
        setIsLoading(false);
        return;
      }
    }

    try {
      const response = await apiClient.me.getProfile();
      const payload = response.data || {};
      const fetchedUser = payload.user ?? payload;
      const organization =
        payload.organization ?? fetchedUser.organization ?? null;
      const needsOrg = payload.requiresOrganization === true || !organization;

      setUser({ ...fetchedUser, organization });
      setIsAuthenticated(true);
      setRequiresOrganization(needsOrg);

      if (needsOrg && pathname !== "/dashboard") {
        router.push("/dashboard");
      }
    } catch (error: any) {
      // 401 means not authenticated - this is expected for logged out users
      if (error?.response?.status !== 401) {
        logger.error("Auth check failed");
      }
      // Clear state - httpOnly cookie will be cleared by backend on logout
      clearSensitiveData();
    }
    setIsLoading(false);
  };

  const login = (newUser: User | any) => {
    // SECURITY: Token is now stored in httpOnly cookie by backend
    // We just update local state with user info
    const payload: any = newUser || {};
    const fetchedUser = payload.user ?? payload;
    const organization =
      payload.organization ?? fetchedUser.organization ?? null;
    const needsOrg = payload.requiresOrganization === true || !organization;
    setUser({ ...fetchedUser, organization });
    setIsAuthenticated(true);
    setRequiresOrganization(needsOrg);

    // SECURITY: Set browser session marker so checkAuth knows this session is active
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SESSION_MARKER_KEY, "true");
      // Clean up legacy localStorage token if present
      localStorage.removeItem("token");
      localStorage.removeItem("practitionerType");
    }

    router.push("/dashboard");
  };

  // Clear all sensitive data from browser storage
  const clearSensitiveData = () => {
    if (typeof window !== "undefined") {
      // Remove session marker so next browser open requires login
      sessionStorage.removeItem(SESSION_MARKER_KEY);
      // Legacy cleanup - remove any tokens from localStorage
      localStorage.removeItem("token");
      localStorage.removeItem("practitionerType");
    }
    setUser(null);
    setIsAuthenticated(false);
    setRequiresOrganization(false);
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  };

  const performLogout = async () => {
    try {
      // Call backend to clear httpOnly cookies
      await apiClient.auth.signout();
    } catch (error) {
      // Even if API call fails, clear local state
    }
    clearSensitiveData();
  };

  const logout = async () => {
    await performLogout();
    router.push("/login");
  };

  // Backward compatibility: expose token as null (it's now in httpOnly cookie)
  const token = isAuthenticated ? "httpOnly" : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        requiresOrganization,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  // Backward compatibility: provide token property
  return {
    ...context,
    token: context.isAuthenticated ? "httpOnly" : null,
  };
}

// UI-only authorization checks (backend enforces actual authorization)
export function useAuthorization() {
  const { user } = useAuth();
  return {
    isAdmin: user?.role === "admin",
    isClinician: user?.role === "clinician",
    isBillingStaff: user?.role === "billing_staff",
    canManageOrganization: user?.role === "admin",
    canManageUsers: user?.role === "admin",
  };
}
