import { Stack } from 'expo-router';

const Layout = () => {
  
  return (
    <Stack>
      <Stack.Screen name="mapScreen" options={{ headerShown: false }} />
    </Stack>
  );
}

export default Layout;