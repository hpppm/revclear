"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiClient } from "@/app/lib/api/apiClient";
import { User } from "@/app/lib/types";
import logger from "@/app/lib/logger";

// HIPAA §164.312(a)(2)(iii): Automatic logoff after 15 minutes of inactivity
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    requiresOrganization: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
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
        if (token) {
            idleTimerRef.current = setTimeout(() => {
                logger.warn("Session timed out due to inactivity");
                performLogout();
                router.push("/login?reason=timeout");
            }, IDLE_TIMEOUT_MS);
        }
    }, [token]);

    useEffect(() => {
        if (!token) return;

        const activityEvents = ["mousedown", "keydown", "scroll", "touchstart"];
        activityEvents.forEach(event =>
            window.addEventListener(event, resetIdleTimer, { passive: true })
        );
        resetIdleTimer();

        return () => {
            if (idleTimerRef.current) {
                clearTimeout(idleTimerRef.current);
            }
            activityEvents.forEach(event =>
                window.removeEventListener(event, resetIdleTimer)
            );
        };
    }, [token, resetIdleTimer]);

    const checkAuth = async () => {
        // SECURITY RISK: localStorage is XSS-vulnerable. Any XSS exposes all tokens.
        // TODO: Switch to httpOnly cookies (requires backend changes)
        // Mitigation: Strict CSP (see next.config.ts)
        const storedToken = localStorage.getItem("token");
        if (storedToken) {
            setToken(storedToken);
            try {
                // Verify token and get user details
                const response = await apiClient.me.getProfile();
                const payload = response.data || {};
                const fetchedUser = payload.user ?? payload;
                const organization = payload.organization ?? fetchedUser.organization ?? null;
                const needsOrg = payload.requiresOrganization === true || !organization;

                setUser({ ...fetchedUser, organization });
                setRequiresOrganization(needsOrg);

                if (needsOrg && pathname !== "/dashboard") {
                    router.push("/dashboard");
                }
            } catch (error: any) {
                // Only log if it's not a 401 (unauthorized) error
                // 401 is expected when token is invalid/expired
                if (error?.response?.status !== 401) {
                    logger.error("Auth check failed");
                }
                // Clear invalid token
                clearSensitiveData();
            }
        }
        setIsLoading(false);
    };

    const login = (newToken: string, newUser: User | any) => {
        // SECURITY RISK: localStorage is XSS-vulnerable. See checkAuth for details.
        localStorage.setItem("token", newToken);
        setToken(newToken);
        const payload: any = newUser || {};
        const fetchedUser = payload.user ?? payload;
        const organization = payload.organization ?? fetchedUser.organization ?? null;
        const needsOrg = payload.requiresOrganization === true || !organization;
        setUser({ ...fetchedUser, organization });
        setRequiresOrganization(needsOrg);
        router.push(needsOrg ? "/dashboard" : "/dashboard");
    };

    // Clear all sensitive data from browser storage
    const clearSensitiveData = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("practitionerType");
        setToken(null);
        setUser(null);
        setRequiresOrganization(false);
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
            idleTimerRef.current = null;
        }
    };

    const performLogout = () => {
        clearSensitiveData();
    };

    const logout = () => {
        performLogout();
        router.push("/login");
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, requiresOrganization, login, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

// UI-only authorization checks (backend enforces actual authorization)
export function useAuthorization() {
    const { user } = useAuth();
    return {
        isAdmin: user?.role === 'admin',
        isClinician: user?.role === 'clinician',
        isBillingStaff: user?.role === 'billing_staff',
        canManageOrganization: user?.role === 'admin',
        canManageUsers: user?.role === 'admin',
    };
}
