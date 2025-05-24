import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { HotspotSize, HotspotActivity, BasicHotspotData } from '../types/dataTypes';

type HotspotProps = {
  size: HotspotSize;
  activity: HotspotActivity;
  userCount: number;
  songCount?: number;
  dominantGenre?: string;
  coordinate: BasicHotspotData['coordinate'];
  onPress: () => void;
};

// Dynamic size calculation based on user count
const getDynamicSize = (userCount: number): number => {
  // Base size starts at 50, grows logarithmically to prevent massive hotspots
  const baseSize = 50;
  const maxSize = 140;
  const scaleFactor = Math.log(userCount + 1) * 15;
  return Math.min(baseSize + scaleFactor, maxSize);
};

// Dynamic color calculation based on user count
const getDynamicColors = (userCount: number): [string, string, ...string[]] => {
  // Define color thresholds and corresponding colors
  const maxUsers = 100; // Adjust this based on your expected max users
  const normalizedCount = Math.min(userCount / maxUsers, 1);
  
  // Color interpolation from blue-green (low) to yellow-red (high)
  let r, g, b;
  
  if (normalizedCount < 0.5) {
    // Transition from blue-green to yellow
    const factor = normalizedCount * 2; // 0 to 1
    r = Math.round(29 + (255 - 29) * factor); // 29 to 255
    g = Math.round(185 + (215 - 185) * factor); // 185 to 215
    b = Math.round(84 * (1 - factor)); // 84 to 0
  } else {
    // Transition from yellow to red
    const factor = (normalizedCount - 0.5) * 2; // 0 to 1
    r = 255; // Stay at 255
    g = Math.round(215 * (1 - factor * 0.7)); // 215 to ~65
    b = Math.round(71 * factor); // 0 to 71
  }
  
  const primaryColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
  const secondaryColor = `rgba(${r}, ${g}, ${b}, 0.3)`;
  
  return [primaryColor, secondaryColor];
};

// Dynamic pulse strength based on user count
const getDynamicPulseStrength = (userCount: number): number => {
  const baseStrength = 0.15;
  const maxStrength = 0.5;
  const normalizedCount = Math.min(userCount / 50, 1);
  return baseStrength + (maxStrength - baseStrength) * normalizedCount;
};

// Get activity modifier for pulse (additional effect)
const getActivityPulseModifier = (activity: HotspotActivity): number => {
  switch (activity) {
    case 'low': return 0;
    case 'medium': return 0.05;
    case 'high': return 0.1;
    case 'trending': return 0.15;
    default: return 0;
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

  // Use dynamic calculations instead of static ones
  const hotspotSize = getDynamicSize(userCount);
  const basePulseStrength = getDynamicPulseStrength(userCount);
  const activityModifier = getActivityPulseModifier(activity);
  const pulseStrength = basePulseStrength + activityModifier;
  const gradientColors = getDynamicColors(userCount);

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

      <View style={[
        styles.contentContainer, 
        { 
          // Make the circle a little smaller by using 0.65 instead of 0.75
          width: hotspotSize * 0.65, 
          height: hotspotSize * 0.65, 
          borderRadius: (hotspotSize * 0.65) / 2,
          // Apply the primary color from the gradient to the hotspot
          backgroundColor: gradientColors[0], 
        }
      ]}>
        <Animated.View
          style={[
            styles.particlesContainer,
            { transform: [{ rotate: spin }] }
          ]}
        >
          {(activity === 'trending' || userCount > 50) && Array(8).fill(0).map((_, i) => (
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
                  // Use the primary gradient color for particles
                  backgroundColor: gradientColors[0], 
                }
              ]}
            />
          ))}
        </Animated.View>

        <Text style={[
          styles.countText, 
          { fontSize: Math.max(12, hotspotSize * 0.15) }
        ]}>
          {userCount}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

export const BlurredHotspot: React.FC<HotspotProps> = (props) => {
  const dynamicSize = getDynamicSize(props.userCount);
  
  return (
    <BlurView 
      intensity={20} 
      tint="light" 
      style={[
        styles.blurContainer, 
        { 
          borderRadius: dynamicSize / 2,
          width: dynamicSize,
          height: dynamicSize 
        }
      ]}
    >
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
    // Removed specific background color and shadow to ensure the gradient color applies
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  countText: {
    fontWeight: 'bold',
    color: '#FFF', // Changed text color to white for better contrast on colored background
  },
  labelText: {
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