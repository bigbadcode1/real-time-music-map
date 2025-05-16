import { Redirect } from "expo-router";
import "../global.css"

const Home = () => {
    return <Redirect href ="/(onboarding)/welcome" />;
}

export default Home;