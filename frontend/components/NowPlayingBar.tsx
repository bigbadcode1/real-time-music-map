import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Image, StyleSheet, Animated, Easing } from 'react-native';

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
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const [textWidth, setTextWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Determine if a track is truly "active" to be displayed and potentially animated
  // This variable correctly checks for currentTrack being non-null, isPlaying being true,
  // AND currentTrack.track being non-null.
  const isActiveTrackPlaying = currentTrack?.isPlaying && currentTrack?.track;

  // The text to display
  // Use isActiveTrackPlaying for the condition
  const displayedText = isActiveTrackPlaying
    ? `${currentTrack!.track!.artist} - ${currentTrack!.track!.name}` // Use ! for non-null assertion here
    : 'No track currently playing';

  // State to track the last text content that was used to measure width
  const lastMeasuredTextContent = useRef('');

  // Calculate shouldAnimate at the top level so it's accessible everywhere
  // It depends on isActiveTrackPlaying, textWidth, and containerWidth
  const shouldAnimate =
    isActiveTrackPlaying &&
    textWidth > 0 &&
    containerWidth > 0 &&
    textWidth > containerWidth;

  // Effect to manage the animation
  useEffect(() => {
    // Stop any existing animation
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }
    scrollAnim.setValue(0); // Reset animation value to start

    if (shouldAnimate) { // Use the already calculated shouldAnimate
      const distanceToScroll = textWidth + 35; // text width + gap for seamless loop
      const scrollSpeed = 30; // pixels per second. Adjust for faster/slower.
      const scrollDuration = (distanceToScroll / scrollSpeed) * 1000;

      animationRef.current = Animated.loop(
        Animated.timing(scrollAnim, {
          toValue: 1,
          duration: scrollDuration,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      animationRef.current.start();
    }
  }, [isActiveTrackPlaying, textWidth, containerWidth, shouldAnimate, scrollAnim]); // Add shouldAnimate to dependencies

  // This effect handles resetting textWidth when displayedText changes,
  // forcing a re-measurement in the next render cycle.
  useEffect(() => {
    if (lastMeasuredTextContent.current !== displayedText) {
      setTextWidth(0); // Reset textWidth to 0 to force re-measurement
      lastMeasuredTextContent.current = displayedText;
    }
  }, [displayedText]);


  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image
          // Only show image if a track is actively playing and image exists
          source={isActiveTrackPlaying && currentTrack!.track!.image ? { uri: currentTrack!.track!.image } : undefined}
          style={styles.image}
        />
        <View
          style={styles.textContainer}
          onLayout={(event) => {
            if (event.nativeEvent.layout.width !== containerWidth) {
              setContainerWidth(event.nativeEvent.layout.width);
            }
          }}
        >
          <Text style={styles.nowPlayingLabel}>Now Playing:</Text>
          <View style={styles.textWrapper}>
            <Animated.Text
              key={displayedText} // Crucial for forcing re-measurement when text content changes
              onLayout={(event) => {
                if (event.nativeEvent.layout.width !== textWidth) {
                  setTextWidth(event.nativeEvent.layout.width);
                }
              }}
              style={[
                styles.text,
                {
                  transform: [
                    {
                      // Only apply translateX if animation is needed
                      translateX:
                        shouldAnimate
                          ? scrollAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, -(textWidth + 35)], // scrolls textWidth + gap
                            })
                          : 0, // No translation if not animating
                    },
                  ],
                  // Always use absolute positioning within textWrapper for consistent layout
                  position: 'absolute',
                  left: 0,
                  width: textWidth > 0 ? textWidth : 'auto', // Use actual textWidth
                },
              ]}
              numberOfLines={1}
            >
              {displayedText}
            </Animated.Text>

            {/* Duplicate text for seamless looping, only if animation is needed */}
            {shouldAnimate && ( // Use the calculated shouldAnimate here
              <Animated.Text
                key={`${displayedText}-duplicate`} // Unique key for the duplicate
                style={[
                  styles.text,
                  {
                    transform: [
                      {
                        translateX: scrollAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [textWidth + 35, 0], // starts textWidth + gap pixels to the right
                        }),
                      },
                    ],
                    position: 'absolute',
                    left: 0,
                    width: textWidth > 0 ? textWidth : 'auto', // Use actual textWidth
                  },
                ]}
                numberOfLines={1}
              >
                {displayedText}
              </Animated.Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
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
    flexDirection: 'row',
    position: 'relative',
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
  },
});