import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';

export default function ProfileScreen() {
    const { logout, isLoggedIn, getValidAccessToken, accessToken, userId } = useAuth();
    const router = useRouter();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleLogout = async () => {
        try {
            await logout();
            router.replace('/(onboarding)/welcome');
        } catch (error) {
            console.error('Error logging out:', error);
            Alert.alert('Logout Error', 'Failed to log out. Please try again.');
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