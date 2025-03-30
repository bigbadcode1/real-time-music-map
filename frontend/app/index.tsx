import { SafeAreaView } from "react-native-safe-area-context";
import MapScreen from "./mapScreen";

const Home = () => {
    return (
        <SafeAreaView style={{flex: 1}}>
            <MapScreen/>
        </SafeAreaView>
    )
}

export default Home;