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

  // Clear all sensitive data from browser storage
  const clearSensitiveData = useCallback(() => {
    // Legacy cleanup - remove any tokens from localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("practitionerType");
      // Clear tab-specific user identity
      sessionStorage.removeItem("userId");
    }
    setUser(null);
    setIsAuthenticated(false);
    setRequiresOrganization(false);
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const performLogout = useCallback(async () => {
    try {
      // Call backend to clear httpOnly cookies
      await apiClient.auth.signout();
    } catch {
      // Even if API call fails, clear local state
    }
    clearSensitiveData();
  }, [clearSensitiveData]);

  const checkAuth = useCallback(async () => {
    // SECURITY: Authentication now uses httpOnly cookies (not localStorage)
    // The cookie is sent automatically with credentials: true
    // We verify auth by calling /me endpoint - if it succeeds, we're authenticated
    try {
      const response = await apiClient.me.getProfile();
      const payload = response.data || {};
      const fetchedUser = payload.user ?? payload;
      const organization =
        payload.organization ?? fetchedUser.organization ?? null;
      const needsOrg = payload.requiresOrganization === true || !organization;

      // SECURITY: Detect cross-tab cookie collision.
      // Cookies are shared across all tabs on the same domain. If a second user
      // logs in on another tab, their token overwrites this tab's cookie. We
      // catch this by storing the expected user ID in sessionStorage (tab-specific)
      // and comparing it against what the /me endpoint returns.
      if (typeof window !== "undefined") {
        const storedUserId = sessionStorage.getItem("userId");
        const returnedUserId = fetchedUser.id as string | undefined;
        if (storedUserId && returnedUserId && storedUserId !== returnedUserId) {
          // Cookie was overwritten by a different user logging in on another tab.
          // Call full signout to clear the httpOnly cookie server-side — without
          // this, the next checkAuth (triggered by the /login pathname change)
          // would still get 200 from /me and immediately re-authenticate as the
          // wrong user, creating a sign-in loop.
          await performLogout();
          router.push("/login");
          return;
        }
        if (returnedUserId) {
          sessionStorage.setItem("userId", returnedUserId);
        }
      }

      setUser({ ...fetchedUser, organization });
      setIsAuthenticated(true);
      setRequiresOrganization(needsOrg);

      if (needsOrg && pathname !== "/dashboard") {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      // 401 means not authenticated - this is expected for logged out users
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status !== 401) {
        logger.error("Auth check failed");
      }
      // Clear state - httpOnly cookie will be cleared by backend on logout
      clearSensitiveData();
    }
  }, [pathname, router, clearSensitiveData, performLogout]);

  useEffect(() => {
    void (async () => {
      await checkAuth();
      setIsLoading(false);
    })();
  }, [checkAuth]);

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
  }, [isAuthenticated, performLogout, router]);

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

  const login = useCallback((newUser: User | Record<string, unknown>) => {
    // SECURITY: Token is now stored in httpOnly cookie by backend
    // We just update local state with user info
    const payload = (newUser || {}) as Record<string, unknown>;
    const fetchedUser = (payload.user ?? payload) as Record<string, unknown>;
    const organization =
      payload.organization ?? fetchedUser.organization ?? null;
    const needsOrg = payload.requiresOrganization === true || !organization;
    // Pick only the fields defined on User to avoid storing unexpected API fields
    // in React state. Unknown fields (e.g. npi/tax_id no longer on the User type)
    // are intentionally dropped here.
    const safeUser: User = {
      id: fetchedUser.id as string,
      email: fetchedUser.email as string,
      name: (fetchedUser.full_name ?? fetchedUser.name ?? "") as string,
      full_name: fetchedUser.full_name as string | undefined,
      role: fetchedUser.role as string | undefined,
      phone: fetchedUser.phone as string | undefined,
      cognito_id: fetchedUser.cognito_id as string | undefined,
      practitionerType: fetchedUser.practitionerType as string | undefined,
      licenseId: fetchedUser.licenseId as string | undefined,
      created_at: fetchedUser.created_at as string | undefined,
      license_state: fetchedUser.license_state as string | undefined,
      clinic_name: fetchedUser.clinic_name as string | undefined,
      clinic_address_street: fetchedUser.clinic_address_street as string | undefined,
      clinic_address_city: fetchedUser.clinic_address_city as string | undefined,
      clinic_address_state: fetchedUser.clinic_address_state as string | undefined,
      clinic_address_zip: fetchedUser.clinic_address_zip as string | undefined,
      clinic_phone: fetchedUser.clinic_phone as string | undefined,
      taxonomy_code: fetchedUser.taxonomy_code as string | undefined,
      clinic_npi: fetchedUser.clinic_npi as string | undefined,
      provider_role: fetchedUser.provider_role as User["provider_role"],
      organization_id: fetchedUser.organization_id as string | null | undefined,
      organization: organization as User["organization"],
      memberships: fetchedUser.memberships as User["memberships"],
    };
    setUser(safeUser);
    setIsAuthenticated(true);
    setRequiresOrganization(needsOrg as boolean);

    // Clean up legacy localStorage token if present
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("practitionerType");
      // Track this user as the owner of this tab so cross-tab cookie
      // collisions can be detected in checkAuth.
      if (safeUser.id) {
        sessionStorage.setItem("userId", safeUser.id);
      }
    }

    router.push("/dashboard");
  }, [router]);

  const logout = useCallback(async () => {
    await performLogout();
    router.push("/login");
  }, [performLogout, router]);

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
