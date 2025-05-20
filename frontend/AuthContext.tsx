// AuthContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { getValidAccessToken } from '@/src/services/spotifyAuthService';

type AuthContextType = {
    isLoggedIn: boolean;
    setIsLoggedIn: (value: boolean) => void;
    accessToken: string | null;
    setAccessToken: (token: string | null) => void;
    refreshToken: string | null;
    setRefreshToken: (token: string | null) => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [refreshToken, setRefreshToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check for valid tokens on app start
    useEffect(() => {
        const checkAuthStatus = async () => {
            console.log('[AuthContext] Starting auth check...');
            try {
                const token = await getValidAccessToken();
                console.log('[AuthContext] Token check result:', token ? 'Token found' : 'No token');
                
                if (token) {
                    console.log('[AuthContext] Setting logged in state to true');
                    setAccessToken(token);
                    setIsLoggedIn(true);
                } else {
                    console.log('[AuthContext] No valid token, setting logged out state');
                    setIsLoggedIn(false);
                    setAccessToken(null);
                    setRefreshToken(null);
                }
            } catch (error) {
                console.error('[AuthContext] Error checking auth status:', error);
                setIsLoggedIn(false);
            } finally {
                console.log('[AuthContext] Finished auth check, setting isLoading to false');
                setIsLoading(false);
            }
        };

        checkAuthStatus();
    }, []);

    // Add effect to log state changes
    useEffect(() => {
        console.log('[AuthContext] State updated:', {
            isLoggedIn,
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            isLoading
        });
    }, [isLoggedIn, accessToken, refreshToken, isLoading]);

    const value = {
        isLoggedIn,
        setIsLoggedIn,
        accessToken,
        setAccessToken,
        refreshToken,
        setRefreshToken,
        isLoading
    };

    return (
        <AuthContext.Provider value={value}>
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