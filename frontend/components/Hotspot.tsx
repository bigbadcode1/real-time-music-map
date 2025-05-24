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


const COLORS = {
  darkRed: '#860101',
  red: '#EA191A',
  darkOrange: '#FE7F37',
  orange: '#FE993E',
  yellow: '#F4F355',
  blue: '#8BF3FB',
  transparentBlue: '#8BF3FB00',
};

// Dynamic size calculation based on user count
const getDynamicSize = (userCount: number): number => {
  const baseSize = 45;
  const maxSize = 120;
  const scaleFactor = Math.log(userCount + 1) * 12;
  return Math.min(baseSize + scaleFactor, maxSize);
};

// Enhanced Snapchat-style color calculation
const getDynamicColors = (userCount: number): [string, string, ...string[]] => {
  if (userCount <= 5) {
    // Small: Blue-Green gradient
    return [
      'rgba(59, 130, 246, 0.8)',   // Blue
      'rgba(16, 185, 129, 0.8)',   // Green
      'rgba(59, 130, 246, 0.4)',   // Light blue
    ];
  } else if (userCount <= 15) {
    // Medium: Blue-Yellow gradient
    return [
      'rgba(59, 130, 246, 0.8)',   // Blue
      'rgba(251, 191, 36, 0.8)',   // Yellow
      'rgba(147, 197, 253, 0.4)',  // Light blue
    ];
  } else if (userCount <= 50) {
    // Large: Orange-Yellow-Blue gradient
    return [
      'rgba(251, 146, 60, 0.9)',   // Orange
      'rgba(251, 191, 36, 0.8)',   // Yellow
      'rgba(59, 130, 246, 0.6)',   // Blue
      'rgba(251, 146, 60, 0.3)',   // Light orange
    ];
  } else {
    // Very Large: Red-Orange-Yellow gradient (Snapchat style)
    return [
      'rgba(220, 38, 38, 0.95)',   // Dark red
      'rgba(239, 68, 68, 0.9)',    // Red
      'rgba(251, 146, 60, 0.8)',   // Orange
      'rgba(251, 191, 36, 0.7)',   // Yellow
      'rgba(252, 211, 77, 0.4)',   // Light yellow
    ];
  }
};

// Get ring colors for outer glow effect
const getRingColors = (userCount: number): [string, string] => {
  if (userCount <= 5) {
    return ['rgba(59, 130, 246, 0.3)', 'rgba(16, 185, 129, 0.1)'];
  } else if (userCount <= 15) {
    return ['rgba(59, 130, 246, 0.3)', 'rgba(251, 191, 36, 0.1)'];
  } else if (userCount <= 50) {
    return ['rgba(251, 146, 60, 0.4)', 'rgba(251, 191, 36, 0.1)'];
  } else {
    return ['rgba(220, 38, 38, 0.5)', 'rgba(251, 146, 60, 0.1)'];
  }
};

// Dynamic animation intensity
const getAnimationIntensity = (userCount: number): {
  pulseStrength: number;
  breatheSpeed: number;
  particleCount: number;
  waveCount: number;
} => {
  const intensity = Math.min(userCount / 100, 1);
  
  return {
    pulseStrength: 0.1 + (intensity * 0.3),
    breatheSpeed: 2000 - (intensity * 1000), // Faster for more users
    particleCount: Math.min(Math.floor(userCount / 5), 12),
    waveCount: Math.min(Math.floor(userCount / 10), 3),
  };
};

export const Hotspot: React.FC<HotspotProps> = React.memo(({
  size,
  activity,
  userCount,
  onPress,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const waveAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const particleAnims = useRef(
    Array(12).fill(0).map(() => ({
      scale: new Animated.Value(0.5 + Math.random() * 0.5),
      opacity: new Animated.Value(0.3 + Math.random() * 0.7),
    }))
  ).current;

  const hotspotSize = getDynamicSize(userCount);
  const gradientColors = getDynamicColors(userCount);
  const ringColors = getRingColors(userCount);
  const animationConfig = getAnimationIntensity(userCount);

  useEffect(() => {
    // Main pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1 + animationConfig.pulseStrength,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );

    // Breathing effect for the inner circle
    const breatheAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1.1,
          duration: animationConfig.breatheSpeed,
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: animationConfig.breatheSpeed,
          useNativeDriver: true,
        }),
      ])
    );

    // Rotation for particles
    const rotationAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000 + Math.random() * 4000, // Randomized speed
        useNativeDriver: true,
      })
    );

    // Wave animations with staggered timing
    const waveAnimations = waveAnims.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 400), // Stagger the waves
          Animated.timing(anim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ])
      )
    );

    // Individual particle animations
    const particleAnimations = particleAnims.map((particle, index) => {
      const baseDelay = (index * 200) % 2000;
      return Animated.loop(
        Animated.sequence([
          Animated.delay(baseDelay),
          Animated.parallel([
            Animated.timing(particle.scale, {
              toValue: 0.8 + Math.random() * 0.4,
              duration: 1500 + Math.random() * 1000,
              useNativeDriver: true,
            }),
            Animated.timing(particle.opacity, {
              toValue: 0.2 + Math.random() * 0.6,
              duration: 1500 + Math.random() * 1000,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(particle.scale, {
              toValue: 0.3 + Math.random() * 0.4,
              duration: 1500 + Math.random() * 1000,
              useNativeDriver: true,
            }),
            Animated.timing(particle.opacity, {
              toValue: 0.1 + Math.random() * 0.3,
              duration: 1500 + Math.random() * 1000,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    });

    // Start all animations
    pulseAnimation.start();
    breatheAnimation.start();
    rotationAnimation.start();
    waveAnimations.forEach(anim => anim.start());
    particleAnimations.forEach(anim => anim.start());

    return () => {
      pulseAnimation.stop();
      breatheAnimation.stop();
      rotationAnimation.stop();
      waveAnimations.forEach(anim => anim.stop());
      particleAnimations.forEach(anim => anim.stop());
    };
  }, [userCount, animationConfig]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.hotspotContainer, { width: hotspotSize * 1.5, height: hotspotSize * 1.5 }]}
    >
      {/* Outer wave rings */}
      {waveAnims.slice(0, animationConfig.waveCount).map((anim, index) => {
        const scale = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 2.5 + index * 0.5],
        });
        const opacity = anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.6, 0.3, 0],
        });
        
        return (
          <Animated.View
            key={`wave-${index}`}
            style={[
              styles.waveRing,
              {
                width: hotspotSize,
                height: hotspotSize,
                borderRadius: hotspotSize / 2,
                borderColor: ringColors[0],
                transform: [{ scale }],
                opacity,
              },
            ]}
          />
        );
      })}

      {/* Main pulsing ring */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            width: hotspotSize * 1.2,
            height: hotspotSize * 1.2,
            borderRadius: (hotspotSize * 1.2) / 2,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={ringColors}
          style={[styles.gradient, { borderRadius: (hotspotSize * 1.2) / 2 }]}
        />
      </Animated.View>

      {/* Main hotspot body */}
      <Animated.View
        style={[
          styles.contentContainer,
          {
            width: hotspotSize,
            height: hotspotSize,
            borderRadius: hotspotSize / 2,
            transform: [{ scale: breatheAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, { borderRadius: hotspotSize / 2 }]}
        />

        {/* Animated particles */}
        {userCount > 10 && (
          <Animated.View
            style={[
              styles.particlesContainer,
              { transform: [{ rotate: spin }] }
            ]}
          >
            {particleAnims.slice(0, animationConfig.particleCount).map((particle, i) => (
              <Animated.View
                key={`particle-${i}`}
                style={[
                  styles.particle,
                  {
                    top: '50%',
                    left: '50%',
                    marginLeft: -1.5,
                    marginTop: -1.5,
                    transform: [
                      { translateX: (hotspotSize * 0.35) * Math.cos(Math.PI * 2 * i / animationConfig.particleCount) },
                      { translateY: (hotspotSize * 0.35) * Math.sin(Math.PI * 2 * i / animationConfig.particleCount) },
                      { scale: particle.scale },
                    ],
                    opacity: particle.opacity,
                    backgroundColor: gradientColors[Math.floor(i / 3) % gradientColors.length],
                  }
                ]}
              />
            ))}
          </Animated.View>
        )}

        {/* User count text */}
        <Text style={[
          styles.countText,
          { 
            fontSize: Math.max(10, hotspotSize * 0.18),
            textShadowColor: 'rgba(0, 0, 0, 0.5)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }
        ]}>
          {userCount}
        </Text>

        {/* Inner glow effect for high activity */}
        {userCount > 50 && (
          <View style={[
            styles.innerGlow,
            {
              width: hotspotSize * 0.3,
              height: hotspotSize * 0.3,
              borderRadius: (hotspotSize * 0.3) / 2,
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
            }
          ]} />
        )}
      </Animated.View>
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
          width: dynamicSize * 1.5,
          height: dynamicSize * 1.5,
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
  waveRing: {
    position: 'absolute',
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  countText: {
    fontWeight: '800',
    color: '#FFFFFF',
    zIndex: 10,
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
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  innerGlow: {
    position: 'absolute',
    zIndex: 5,
  },
});