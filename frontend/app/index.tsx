import { Redirect } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { ActivityIndicator, View } from "react-native";
import "../global.css";

const Home = () => {
    const { isLoggedIn, isLoading } = useAuth();
    if (isLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#1DB954" />
        </View>
      );
    }
    if (isLoggedIn) {
        console.log('[Home] User is logged in, redirecting to map');
        return <Redirect href="/(root)/(tabs)/mapScreen" />;
    } else {
        console.log('[Home] User is not logged in, redirecting to welcome');
        return <Redirect href="/(onboarding)/welcome" />;
    }
  };

export default Home;