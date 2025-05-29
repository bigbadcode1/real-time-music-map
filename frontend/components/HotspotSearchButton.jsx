import { TouchableOpacity, ActivityIndicator, View, Text } from "react-native";
import { StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

export function HotspotSearchButton({ isLoadingHotspots = false, onPress = () => {} }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.refreshHotspotsButton, isLoadingHotspots && styles.buttonDisabled]}
        onPress={onPress}
        disabled={isLoadingHotspots}
      >
        {/* Wrap Text + Icon in a Row */}
        <View style={styles.buttonContent}>
          <Text style={styles.buttonText}>Search Area</Text>
          {isLoadingHotspots ? (
            <ActivityIndicator size="small" color="#333" style={styles.icon} />
          ) : (
            <MaterialIcons name="search" size={20} color="#333" style={styles.icon} />
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    position: "absolute",
    top: 150,
    left: 0,
    right: 0,
  },
  refreshHotspotsButton: {
    width: 150,
    height: 52,
    backgroundColor: "rgba(255, 255, 255, 1.00)",
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  buttonContent: {
    flexDirection: "row", 
    alignItems: "center", 
    gap: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  icon: {
    marginLeft: 4, // Optional: fine-tune spacing
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});