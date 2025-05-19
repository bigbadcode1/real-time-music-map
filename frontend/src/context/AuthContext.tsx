// todo: comments
import React, { createContext, useState, useContext, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthContextType = {
    isLoggedIn: boolean;
    isLoading: boolean;
    setIsLoggedIn: (value: boolean) => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider( {children}: { children: React.ReactNode}) {
    
    // placeholders for development, keep it true to skip onboarding while auth is not implemented yet
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(true);

    // Check for existing tokens on mount
    useEffect(() => {
      const checkLoginStatus = async () => {
        try {
          const tokensString = await AsyncStorage.getItem('spotifyTokens');
          
          if (tokensString) {
            const tokens = JSON.parse(tokensString);
            // Check if token exists - we'll handle expiration in the actual API calls
            if (tokens.access_token) {
              setIsLoggedIn(true);
            }
          }
        } catch (error) {
          console.error('Error checking login status:', error);
        } finally {
          setIsLoading(false);
        }
      };
      checkLoginStatus();
    }, []);

    const logout = async () => {
        try {
            await AsyncStorage.removeItem('spotifyTokens');
            setIsLoggedIn(false);
        } catch (error) {
            console.log('Error during logout: ', error);
        }
    }

    const value = { isLoggedIn, isLoading, setIsLoggedIn, logout };

    if (isLoading) {
        return null;
      }
    
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