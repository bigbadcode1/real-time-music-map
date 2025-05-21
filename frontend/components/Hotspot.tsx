import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { HotspotSize, HotspotActivity, HotspotData } from '../types/dataTypes';


type HotspotProps = {
  size: HotspotSize;
  activity: HotspotActivity;
  userCount: number;
  songCount: number;
  dominantGenre?: string;
  coordinate: HotspotData['coordinate'];
  onPress: () => void;
};


const getSizeValue = (size: HotspotSize): number => {
  switch (size) {
    case 'small': return 60;
    case 'medium': return 80;
    case 'large': return 100;
    case 'xlarge': return 120;
    default: return 80;
  }
};


const getActivityColors = (activity: HotspotActivity): [string, string, ...string[]] => {
  switch (activity) {
    case 'low': return ['rgba(29, 185, 84, 0.7)', 'rgba(29, 185, 84, 0.3)'];
    case 'medium': return ['rgba(65, 105, 225, 0.7)', 'rgba(65, 105, 225, 0.3)'];
    case 'high': return ['rgba(255, 99, 71, 0.7)', 'rgba(255, 99, 71, 0.3)'];
    case 'trending': return ['rgba(255, 215, 0, 0.7)', 'rgba(255, 215, 0, 0.3)'];
    default: return ['rgba(128, 128, 128, 0.7)', 'rgba(128, 128, 128, 0.3)'];
  }
};


const getPulseStrength = (activity: HotspotActivity): number => {
  switch (activity) {
    case 'low': return 0.15;
    case 'medium': return 0.25;
    case 'high': return 0.35;
    case 'trending': return 0.45;
    default: return 0.2;
  }
};


export const Hotspot: React.FC<HotspotProps> = React.memo(({
  size,
  activity,
  userCount,
  onPress,
}) => {
  const pulseAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const hotspotSize = getSizeValue(size);
  const pulseStrength = getPulseStrength(activity);
  const gradientColors = getActivityColors(activity);

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1 + pulseStrength,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    const rotationAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 12000,
        useNativeDriver: true,
      })
    );

    pulseAnimation.start();
    rotationAnimation.start();

    return () => {
      pulseAnimation.stop();
      rotationAnimation.stop();
    };
  }, [pulseAnim, rotateAnim, pulseStrength]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.hotspotContainer, { width: hotspotSize, height: hotspotSize }]}
    >
      <Animated.View
        style={[
          styles.pulseRing,
          {
            width: hotspotSize,
            height: hotspotSize,
            borderRadius: hotspotSize / 2,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          style={[styles.gradient, { borderRadius: hotspotSize / 2 }]}
        />
      </Animated.View>

      <View style={[styles.contentContainer, { width: hotspotSize * 0.75, height: hotspotSize * 0.75, borderRadius: (hotspotSize * 0.75) / 2 }]}>
        <Animated.View
          style={[
            styles.particlesContainer,
            { transform: [{ rotate: spin }] }
          ]}
        >
          {activity === 'trending' && Array(8).fill(0).map((_, i) => (
            <View
              key={`particle-${i}`}
              style={[
                styles.particle,
                {
                  top: '50%',
                  left: '50%',
                  marginLeft: -2,
                  marginTop: -2,
                  transform: [
                    { translateX: hotspotSize * 0.28 * Math.cos(Math.PI * 2 * i / 8) },
                    { translateY: hotspotSize * 0.28 * Math.sin(Math.PI * 2 * i / 8) },
                  ],
                  backgroundColor: i % 2 === 0 ? gradientColors[0] : 'white',
                }
              ]}
            />
          ))}
        </Animated.View>

        <Text style={styles.countText}>{userCount}</Text>
        <Text style={styles.labelText}>listeners</Text>
      </View>
    </TouchableOpacity>
  );
});


export const BlurredHotspot: React.FC<HotspotProps> = (props) => {
  return (
    <BlurView intensity={20} tint="light" style={styles.blurContainer}>
      <Hotspot {...props} />
    </BlurView>
  );
};

const styles = StyleSheet.create({
  hotspotContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  countText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  labelText: {
    fontSize: 10,
    color: '#555',
    marginTop: 1,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  blurContainer: {
    overflow: 'hidden',
    borderRadius: 150,
  },
  particlesContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});