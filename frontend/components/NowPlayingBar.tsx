// fix track names being cut (too long idk why)
import React from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';

interface NowPlayingBarProps {
  currentTrack: {
    isPlaying: boolean;
    track: {
      name: string;
      artist: string;
      album_name: string;
      image: string;
      duration: number;
      progress: number;
      uri: string;
    } | null;
  } | null;
}

export const NowPlayingBar: React.FC<NowPlayingBarProps> = ({ currentTrack }) => {
  const scrollAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (currentTrack?.track) {
      // Reset position
      scrollAnim.setValue(0);
      
      // Start scrolling animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(scrollAnim, {
            toValue: 1,
            duration: 8000,
            useNativeDriver: true,
          }),
          Animated.timing(scrollAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [currentTrack?.track]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image 
          source={currentTrack?.track?.image ? { uri: currentTrack.track.image } : undefined}
          style={styles.image}
        />
        <View style={styles.textContainer}>
          <Text style={styles.nowPlayingLabel}>Now Playing:</Text>
          <View style={styles.textWrapper}>
            <Animated.Text 
              style={[
                styles.text,
                {
                  transform: [{
                    translateX: scrollAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -300],
                    })
                  }]
                }
              ]} 
            >
              {currentTrack?.track 
                ? `${currentTrack.track.artist} - ${currentTrack.track.name}`
                : 'No track currently playing'}
            </Animated.Text>
          </View>
        </View>
      </View>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 55,
    left: 48,
    right: 48,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
    height: 60,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: 40,
    height: 40,
    marginRight: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  textWrapper: {
    height: 20,
    overflow: 'hidden',
  },
  nowPlayingLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 2,
    fontWeight: '500',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    lineHeight: 20,
    position: 'absolute',
    left: 0,
    right: 0,
  },
});