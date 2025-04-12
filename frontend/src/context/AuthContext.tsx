// todo: comments
import React, { createContext, useState, useContext, useEffect } from 'react'

type AuthContextType = {
    isLoggedIn: boolean;
    setIsLoggedIn: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider( {children}: { children: React.ReactNode}) {
    // placeholders for development, keep it true to skip onboarding while auth is not implemented yet
    const [isLoggedIn, setIsLoggedIn] = useState(false);


    const value = { isLoggedIn, setIsLoggedIn };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if(context == undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    } 
    return context;
}