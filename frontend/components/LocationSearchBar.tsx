import React from 'react';
import { View, TextInput, StyleSheet, Keyboard, TouchableWithoutFeedback, Platform, KeyboardAvoidingView } from 'react-native';


interface LocationSearchBarProps {
  onSearch?: (query: string) => void; // todo
}


export const LocationSearchBar: React.FC<LocationSearchBarProps> = ({ onSearch }) => {
  const [query, setQuery] = React.useState('');
  const [isKeyboardVisible, setKeyboardVisible] = React.useState(false);

  React.useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      setQuery('');
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleSearch = () => {
    if (onSearch) {
      onSearch(query);
    }
    Keyboard.dismiss();
    console.log("Search query:", query);
  };

  const handlePressOutside = () => {
    if (isKeyboardVisible) {
      Keyboard.dismiss();
    }
  };



  const keyboardVerticalOffset = Platform.OS === 'ios' ? 40 : 0;

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingContainer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <TouchableWithoutFeedback onPress={handlePressOutside}>

        <View style={styles.overlay}>
          <View style={styles.searchContainer}>
            <View style={styles.searchBarWrapper}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search location..."
                placeholderTextColor="#555"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
  },
  overlay: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  searchContainer: {
    marginBottom: 150, 
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 25,
    width: '70%',
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    textAlign: 'center',
  },
});