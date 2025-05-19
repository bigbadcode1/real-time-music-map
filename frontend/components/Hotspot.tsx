import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

export type HotspotSize = 'small' | 'medium' | 'large' | 'xlarge';
export type HotspotActivity = 'low' | 'medium' | 'high' | 'trending';

// PLACEHOLDERS

type HotspotProps = {
  size: HotspotSize;
  activity: HotspotActivity;
  userCount: number;
  songCount: number;
  dominantGenre?: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  onPress: () => void;
};

export const Hotspot: React.FC<HotspotProps> = ({
  size,
  activity,
  userCount,
  songCount,
  dominantGenre,
  coordinate,
  onPress,
}) => {
  const pulseAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const getSizeValue = () => {
    switch (size) {
      case 'small': return 60;
      case 'medium': return 80;
      case 'large': return 100;
      case 'xlarge': return 120;
    }
  };

  const getActivityColors = (): [string, string, ...string[]] => {
    switch (activity) {
      case 'low': return ['rgba(29, 185, 84, 0.7)', 'rgba(29, 185, 84, 0.3)']; // Spotify green
      case 'medium': return ['rgba(65, 105, 225, 0.7)', 'rgba(65, 105, 225, 0.3)']; // Blue
      case 'high': return ['rgba(255, 99, 71, 0.7)', 'rgba(255, 99, 71, 0.3)']; // Reddish
      case 'trending': return ['rgba(255, 215, 0, 0.7)', 'rgba(255, 215, 0, 0.3)']; // Gold
    }
  };

  const getPulseStrength = () => {
    switch (activity) {
      case 'low': return 0.15;
      case 'medium': return 0.25;
      case 'high': return 0.35;
      case 'trending': return 0.45;
    }
  };

  const hotspotSize = getSizeValue();
  const pulseStrength = getPulseStrength();
  const gradientColors = getActivityColors();

  useEffect(() => {
    Animated.loop(
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
    ).start();

    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 12000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

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
          }
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          style={[styles.gradient, { borderRadius: hotspotSize / 2 }]}
        />
      </Animated.View>

      <View style={[styles.contentContainer, { width: hotspotSize * 0.75, height: hotspotSize * 0.75 }]}>
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
                  top: hotspotSize * 0.3 * Math.sin(Math.PI * 2 * i / 8),
                  left: hotspotSize * 0.3 * Math.cos(Math.PI * 2 * i / 8),
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
};

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
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  countText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  labelText: {
    fontSize: 10,
    color: '#666',
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
    borderRadius: 100,
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