import React, { useRef, useState } from "react";
import { Image, Text, View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Swiper from "react-native-swiper";
import CustomButton from "@/components/CustomButton";
import { onboarding } from "@/constants";
import spotifyLogo from "@/assets/images/spotify.png";
import { useSpotifyAuth } from "@/src/hooks/useSpotifyAuth";

const Onboarding = () => {
  const swiperRef = useRef<Swiper>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { signInWithSpotify, isAuthRequestReady, isLoading, error } = useSpotifyAuth();

  const isLastSlide = activeIndex === onboarding.length - 1;

  const handleButtonPress = () => {
    if (isLastSlide) {
      signInWithSpotify();
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

      {/* todo: change to alert popup*/}
      {error && (
         <View className="px-10 mb-2">
           <Text className="text-red-600 text-center">Error: {error}</Text>
         </View>
      )}

      <View className="pb-5 px-10 w-full items-center">
        <CustomButton
            title={isLastSlide ? "Log in with Spotify" : "Next"}
            onPress={handleButtonPress}
            className="w-[75%] h-12 mt-10"
            disabled={isLoading || (isLastSlide && !isAuthRequestReady)}
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