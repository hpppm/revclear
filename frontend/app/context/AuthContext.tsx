"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiClient } from "@/app/lib/api/apiClient";
import { Organization, User } from "@/app/lib/types";
import logger from "@/app/lib/logger";

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

type AuthPayload = Partial<User> & {
    user?: User;
    organization?: Organization | null;
    requiresOrganization?: boolean;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [requiresOrganization, setRequiresOrganization] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    const checkAuth = useCallback(async () => {
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
            } catch (error: unknown) {
                // Only log if it's not a 401 (unauthorized) error
                // 401 is expected when token is invalid/expired
                const status = typeof error === "object" && error !== null && "response" in error
                    ? (error as { response?: { status?: number } }).response?.status
                    : undefined;
                if (status !== 401) {
                    logger.error("Auth check failed:", error);
                }
                // Clear invalid token
                localStorage.removeItem("token");
                setToken(null);
                setUser(null);
                setRequiresOrganization(false);
            }
        }
        setIsLoading(false);
    }, [pathname, router]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void checkAuth();
    }, [checkAuth]);

    const login = (newToken: string, newUser: User | AuthPayload) => {
        localStorage.setItem("token", newToken);
        setToken(newToken);
        const payload: AuthPayload = newUser || {};
        const fetchedUser = payload.user ?? payload;
        const organization = payload.organization ?? fetchedUser.organization ?? null;
        const needsOrg = payload.requiresOrganization === true || !organization;
        setUser({ ...fetchedUser, organization });
        setRequiresOrganization(needsOrg);
        router.push(needsOrg ? "/dashboard" : "/dashboard");
    };

    const logout = () => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
        setRequiresOrganization(false);
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
