import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, StyleSheet } from 'react-native';
import { getHotspotColor, getHotspotSize } from '@/constants/hotspots';
import { Hotspot } from '@/types/map';

interface CustomHotspotMarkerProps {
  hotspot: Hotspot;
  zoomLevel: number;
}

const CustomHotspotMarker: React.FC<CustomHotspotMarkerProps> = ({ hotspot, zoomLevel }) => {
  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const pulseAnim3 = useRef(new Animated.Value(1)).current;
  
  const baseColor = getHotspotColor(hotspot.listeners);
  
  const largeSize = getHotspotSize(hotspot.listeners, 30, zoomLevel);
  const mediumSize = getHotspotSize(hotspot.listeners, 20, zoomLevel);
  const smallSize = getHotspotSize(hotspot.listeners, 10, zoomLevel);
  
  useEffect(() => {
    const pulse1 = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim1, {
        toValue: 1.2,
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      }),
      Animated.timing(pulseAnim1, {
        toValue: 1,
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      })
    ]));

    const pulse2 = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim2, {
        toValue: 1.2,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      }),
      Animated.timing(pulseAnim2, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      })
    ]));

    const pulse3 = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim3, {
        toValue: 1.2,
        duration: 800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      }),
      Animated.timing(pulseAnim3, {
        toValue: 1,
        duration: 800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      })
    ]));

    pulse1.start();
    pulse2.start();
    pulse3.start();

    return () => {
      pulse1.stop();
      pulse2.stop();
      pulse3.stop();
    };
  }, []);

  return (
    <View style={[styles.container, { width: largeSize * 2, height: largeSize * 2 }]}>
      <Animated.View style={[
        styles.circle, 
        { 
          width: largeSize, 
          height: largeSize, 
          borderRadius: largeSize / 2,
          backgroundColor: baseColor,
          opacity: 0.3,
          transform: [{ scale: pulseAnim1 }]
        }
      ]} />
      <Animated.View style={[
        styles.circle, 
        { 
          width: mediumSize, 
          height: mediumSize, 
          borderRadius: mediumSize / 2,
          backgroundColor: baseColor,
          opacity: 0.6,
          transform: [{ scale: pulseAnim2 }]
        }
      ]} />
      <Animated.View style={[
        styles.circle, 
        { 
          width: smallSize, 
          height: smallSize, 
          borderRadius: smallSize / 2,
          backgroundColor: baseColor,
          opacity: 0.9,
          transform: [{ scale: pulseAnim3 }]
        }
      ]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  circle: {
    position: 'absolute',
  },
});

export default CustomHotspotMarker;