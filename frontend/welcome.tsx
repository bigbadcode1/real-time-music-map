// todo: probably split into modules, too much in one file
import { router } from "expo-router";
import React, { useRef, useState, useEffect, useMemo } from "react";
import { Image, Text, View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Swiper from "react-native-swiper";
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, useAuthRequest, AuthRequestPromptOptions, ResponseType } from 'expo-auth-session'; // Added necessary imports
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomButton from "@/components/CustomButton";
import { onboarding } from "@/constants";
import spotifyLogo from "@/assets/images/spotify.png";
import { exchangeCodeForTokens } from "@/src/services/spotifyAuthService";
import { useAuth } from "@/src/context/AuthContext";


WebBrowser.maybeCompleteAuthSession();

const SCOPES = [
  'user-read-private', 'user-read-email', 'user-read-currently-playing',
  'user-read-playback-state', 'user-modify-playback-state', 'user-read-recently-played',
  'user-library-read', 'playlist-read-private', 'playlist-read-collaborative'
];

const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

const Onboarding = () => {
  const swiperRef = useRef<Swiper>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setIsLoggedIn } = useAuth();

  const isLastSlide = activeIndex === onboarding.length - 1;

  // const redirectUri = useMemo(() => makeRedirectUri(),[]);

  // temporary hardcoded
  const redirectUri = useMemo(() => 'exp://172.20.10.3:8081', []);

  // wrap into useeffect to only log once / when redirect url change but it shouldnt
  useEffect(() => {
    console.log("Using redirect URI: ", redirectUri);
  }, [redirectUri])

  const [request, response, promptAsync] = useAuthRequest(
    {
    responseType: ResponseType.Code, // We want the authorization code
    clientId: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID || "",
    scopes: SCOPES,
    usePKCE: false,
    redirectUri: redirectUri,
    },
    discovery
  )

  useEffect(() => {
    if(response) {
      console.log("Auth Response: ", response);
      if(response.type === 'error') {
        setError('authentication error');
        setIsLoading(false);
      } else if(response.type === 'cancel' || response.type === 'dismiss') {
        console.log('User cancelled login');
        setIsLoading(false);
      } else if(response.type === 'success') {
        const { code } = response.params;
        console.log('Authorization code received: ', code);

        exchangeCodeForTokens(code, redirectUri).then(async (exchangeResult) => {
          if(exchangeResult.success) {
            console.log("Token exchange successful");
            setIsLoggedIn(true);
            setError(null);
            router.replace("/(root)/(tabs)/mapScreen");
          } else {
            console.error("Token exchange failed: ", exchangeResult.error);
            setError(`Login failed: ${exchangeResult.error}`);
            setIsLoading(false);
          }
        }).catch(err => {
          console.log("Error during token exchange promise: ", err);
          setError(`An unexpected error ocurred during token exchange: ${err.message}`);
          setIsLoading(false);
        })
      }
    } 
  }, [response]);

  const handleSpotifyLogin = async () => {
    if(!request) {
      setError("Authentication request is not ready. Please wait a moment.");
      console.error("Auth Request object is null or undefined.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      console.log("Calling promptAsync...");
      await promptAsync();
      // The result is handled by the useEffect hook above when the response state changes.
      // we don't need to do anything else here after calling promptAsync.
      // we leave isLoading true, the useEffect will handle setting it false on error/cancel or navigating away on success.
    } catch (err: any) {
      console.error("Error calling promptAsync:", err);
      setError(`Failed to start login process: ${err.message}`);
      setIsLoading(false);
    }
  }

  const handleButtonPress = () => {
    if (isLastSlide) {
      handleSpotifyLogin();
    } else {
      swiperRef.current?.scrollBy(1);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 pt-40">
        <Swiper
          ref={swiperRef}
          loop={false}
          dot={
            <View className="w-[32px] h-[4px] mx-1 bg-[#E2E8F0] rounded-full" />
          }
          activeDot={
            <View className="w-[32px] h-[4px] mx-1 bg-[#1DB954] rounded-full" />
          }
          onIndexChanged={(index) => setActiveIndex(index)}
        >
          {onboarding.map((item) => (
            <View key={item.id} className="flex items-center justify-center px-5">
              <Image
                source={item.image}
                className="w-full h-[300px]"
                resizeMode="contain"
              />
              <View className="flex flex-row items-center justify-center w-full mt-10">
                <Text className="text-black text-3xl font-bold mx-10 text-center">
                  {item.title}
                </Text>
              </View>
              <Text className="text-md text-center text-[#858585] mx-10 mt-3">
                {item.description}
              </Text>
            </View>
          ))}
        </Swiper>
      </View>

      {error && (
         <View className="px-10 mb-2">
           <Text className="text-red-600 text-center">{error}</Text>
         </View>
      )}

      <View className="pb-5 px-10 w-full items-center">
        <CustomButton
            title={isLastSlide ? "Log in with Spotify" : "Next"}
            onPress={handleButtonPress}
            className="w-[75%] h-12 mt-10"
            disabled={isLoading || (isLastSlide && !request)}
            IconLeft={isLastSlide ? () => (
              <Image 
                  source={spotifyLogo} 
                  className="w-5 h-5 mr-2"
                  resizeMode="contain"
              />
              ) : undefined}
            textVariant="primary"
          />
      </View>

    </SafeAreaView>
  );
};

export default Onboarding;