import { SafeAreaView } from "react-native-safe-area-context";
import {Text} from 'react-native'
import { Redirect } from "expo-router";
import MapScreen from "./(root)/(tabs)/mapScreen";
import "../global.css"

const Home = () => {
    return <Redirect href ="/(onboarding)/welcome" />;
    // return (
    //     <SafeAreaView style={{flex:1}}>
    //         <MapScreen/>
    //     </SafeAreaView>
    // )

}

export default Home;