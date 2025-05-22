import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';

export type MapMode = 'discover' | 'analyze';


interface CustomBottomNavigationBarProps {
  currentMode: MapMode;
  onToggleMode: () => void;
}


export const CustomBottomNavigationBar: React.FC<CustomBottomNavigationBarProps> = React.memo(({ currentMode, onToggleMode }) => {
  const expoRouter = useRouter();

  return (
    <View style={styles.navBarContainer}>
      <TouchableOpacity
        onPress={onToggleMode}
        style={[
          styles.modeButton,
          currentMode === 'discover' ? styles.modeButtonActiveDiscover : styles.modeButtonActiveAnalyze,
        ]}
      >
        <FontAwesome
          name={currentMode === 'discover' ? 'search' : 'map-pin'}
          size={16}
          color={currentMode === 'discover' ? 'white' : 'black'}
          style={styles.iconSpacing}
        />
        <Text style={[styles.modeButtonText, { color: currentMode === 'discover' ? 'white' : 'black' }]}>
          {currentMode === 'discover' ? 'Analyze' : 'Discover'}
        </Text>
      </TouchableOpacity>

      <View style={styles.navButtonsGroup}>
        <TouchableOpacity onPress={() => expoRouter.push('/friends')} style={styles.navButton}>
          <FontAwesome name="users" size={24} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => expoRouter.push('/saved')} style={styles.navButton}>
          <FontAwesome name="bookmark" size={24} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => expoRouter.push('/profile')} style={styles.navButton}>
          <FontAwesome name="user" size={24} color="#333" />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  navBarContainer: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    right: 20,
    height: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    height: 40,
    minWidth: 110,
  },
  modeButtonActiveDiscover: {
    backgroundColor: '#000000',
  },
  modeButtonActiveAnalyze: {
    backgroundColor: '#e0e0e0',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  iconSpacing: {
    marginRight: 8,
  },
  navButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    flex: 1,
    marginLeft: 15,
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
});