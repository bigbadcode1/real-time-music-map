import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface MapControlsProps {
  onCenterMap: () => void;
  onShowAllMarkers: () => void;
}

const MapControls: React.FC<MapControlsProps> = ({ onCenterMap, onShowAllMarkers }) => {
  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={onCenterMap}
      >
        <MaterialIcons name="my-location" size={24} color="black" />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, { bottom: 160 }]}
        onPress={onShowAllMarkers}
      >
        <MaterialIcons name="map" size={24} color="black" />
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export default MapControls;