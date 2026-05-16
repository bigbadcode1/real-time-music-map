import React, { useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  userCount: number;
  onPress: () => void;
};

const getSize = (count: number) => {
  return Math.min(24 + Math.log(count + 1) * 6, 35);
};

const getColors = (count: number): [string, string] => {
  if (count < 10) {
    return ['#3B82F6', '#22C55E'];
  }

  if (count < 40) {
    return ['#F59E0B', '#F97316'];
  }

  return ['#EF4444', '#F97316'];
};

export const Hotspot = memo(({ userCount, onPress }: Props) => {
  const glow = useRef(new Animated.Value(0.7)).current;
  const scale = useRef(new Animated.Value(1)).current;

  const size = getSize(userCount);
  const colors = getColors(userCount);

  useEffect(() => {
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.7,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );

    const scaleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 0.92,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );

    glowLoop.start();
    scaleLoop.start();

    return () => {
      glowLoop.stop();
      scaleLoop.stop();
    };
  }, []);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
    >
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        {/* Soft internal glow */}
        <Animated.View
          style={[
            styles.glow,
            {
              opacity: glow,
              borderRadius: size / 2,
            },
          ]}
        />

        {/* Main blob */}
        <Animated.View
          style={{
            width: size,
            height: size,
            transform: [{ scale }],
          }}
        >
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.blob,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
              },
            ]}
          >
            <Text style={styles.text}>
              {userCount}
            </Text>
          </LinearGradient>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  glow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  blob: {
    alignItems: 'center',
    justifyContent: 'center',

    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  text: {
    color: 'white',
    fontWeight: '700',
    fontSize: 12,
  },
});
