import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const tutorialSteps = [
  {
    title: 'Welcome to the TuneMe!',
    text: 'This is where you can see all the music hotspots around you.',
  },
  {
    title: 'See What\'s Trending',
    text: 'Explore the map to see where music is popular nearby. Hotspots indicate live listening activity!',
  },
  {
    title: 'Discover New Tracks',
    text: 'Tap on any hotspot to see what users are listening to right now. Get ready to find your next favorite song!',
  },
  {
    title: 'Hotspots Don\'t Update Instantly',
    text: 'Due to current limitations, hotspots only refresh when the update happens or you press the "Search Area" button.',
  },
    {
    title: 'How to Load More Hotspots',
    text: 'Move the map to a new area and tap the "Search Area" button to load hotspots within your current screen view.',
  },
];

interface TutorialModalProps {
  visible: boolean;
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ visible, onClose }) => {
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < tutorialSteps.length - 1) {
      setStep(prev => prev + 1);
    } else {
      setStep(0);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>{tutorialSteps[step].title}</Text>
          <Text style={styles.text}>{tutorialSteps[step].text}</Text>
          <TouchableOpacity style={styles.button} onPress={handleNext}>
            <Text style={styles.buttonText}>{step === tutorialSteps.length - 1 ? 'Got it!' : 'Next'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#000000',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 24,
    width: 150,

    
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    textAlign: "center",
    justifyContent: "center",
  },
});
