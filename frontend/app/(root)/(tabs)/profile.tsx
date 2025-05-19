// dev functions, to delete later

import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
    const { logout, isLoggedIn } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await logout();
            router.replace('/'); // Redirect to welcome screen
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-1 p-4">
                <Text className="text-2xl font-bold mb-6">Profile</Text>
                
                <View className="space-y-4">
                    {/* Add more profile information here */}
                    <View className="bg-gray-100 p-4 rounded-lg">
                        <Text className="text-gray-600">Account Status</Text>
                        <Text className="text-lg font-semibold">
                            {isLoggedIn ? 'Logged In' : 'Not Logged In'}
                        </Text>
                    </View>

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