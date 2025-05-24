import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'; // Import Alert and ActivityIndicator
import { useAuth } from '@/src/context/AuthContext';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react'; // Import useState

export default function ProfileScreen() {
    const { logout, isLoggedIn, getValidAccessToken, accessToken, userId } = useAuth(); // Destructure getValidAccessToken, accessToken, userId
    const router = useRouter();
    const [isRefreshing, setIsRefreshing] = useState(false); // New state for loading indicator

    const handleLogout = async () => {
        try {
            await logout();
            router.replace('/(onboarding)/welcome'); // Redirect to welcome screen
        } catch (error) {
            console.error('Error logging out:', error);
            Alert.alert('Logout Error', 'Failed to log out. Please try again.');
        }
    };

    const handleRefreshToken = async () => {
        if (!isLoggedIn) {
            Alert.alert('Not Logged In', 'You must be logged in to refresh your token.');
            return;
        }

        setIsRefreshing(true); // Start loading
        try {
            console.log("[ProfileScreen] Attempting to manually refresh token...");
            const newAccessToken = await getValidAccessToken(); // This will trigger refresh if needed
            if (newAccessToken) {
                console.log("[ProfileScreen] Token refresh successful. New access token:", newAccessToken);
                Alert.alert('Success', 'Spotify access token refreshed successfully!');
            } else {
                console.warn("[ProfileScreen] Token refresh failed or no valid token obtained.");
                Alert.alert('Refresh Failed', 'Failed to refresh Spotify access token. You might need to log in again.');
            }
        } catch (error) {
            console.error("[ProfileScreen] Error during manual token refresh:", error);
            Alert.alert('Error', `An unexpected error occurred during token refresh: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsRefreshing(false); // Stop loading
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-1 p-4">
                <Text className="text-2xl font-bold mb-6">Profile</Text>
                
                <View className="space-y-4">
                    {/* Account Status */}
                    <View className="bg-gray-100 p-4 rounded-lg">
                        <Text className="text-gray-600">Account Status</Text>
                        <Text className="text-lg font-semibold">
                            {isLoggedIn ? 'Logged In' : 'Not Logged In'}
                        </Text>
                    </View>

                    {/* Display User ID and Access Token (for debugging) */}
                    {isLoggedIn && (
                        <>
                            <View className="bg-gray-100 p-4 rounded-lg">
                                <Text className="text-gray-600">Spotify User ID</Text>
                                <Text className="text-md font-semibold" selectable={true}>{userId || 'N/A'}</Text>
                            </View>
                            <View className="bg-gray-100 p-4 rounded-lg">
                                <Text className="text-gray-600">Current Access Token (first 20 chars)</Text>
                                <Text className="text-md font-semibold" selectable={true}>
                                    {accessToken ? `${accessToken.substring(0, 20)}...` : 'N/A'}
                                </Text>
                                <Text className="text-xs text-gray-500 mt-1">This token might expire soon.</Text>
                            </View>
                        </>
                    )}

                    {/* Refresh Token Button */}
                    {isLoggedIn && ( // Only show if logged in
                        <TouchableOpacity
                            onPress={handleRefreshToken}
                            className="bg-blue-500 p-4 rounded-lg flex-row justify-center items-center"
                            disabled={isRefreshing} // Disable while refreshing
                        >
                            {isRefreshing ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text className="text-white text-center font-semibold">
                                    Refresh Spotify Token
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}

                    {/* Logout Button */}
                    <TouchableOpacity
                        onPress={handleLogout}
                        className="bg-red-500 p-4 rounded-lg"
                    >
                        <Text className="text-white text-center font-semibold">
                            Logout
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}