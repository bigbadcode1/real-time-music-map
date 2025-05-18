import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AuthProvider } from '@/src/context/AuthContext';
import 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    FontAwesome: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf')
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <Stack>
      <Stack.Screen name="(onboarding)/welcome" options={{ headerShown: false }} />
         <Stack.Screen name="(root)/(tabs)/mapScreen" options={{ headerShown: false }} />
         <Stack.Screen name="(root)/(tabs)/friends" options={{ title: 'Friends' }} />
         <Stack.Screen name="(root)/(tabs)/saved" options={{ title: 'Saved' }} />
         <Stack.Screen name="(root)/(tabs)/profile" options={{ title: 'Profile' }} />
      </Stack>
    </AuthProvider>
  );
}