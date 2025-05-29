import { TouchableOpacity, ActivityIndicator, View, Text } from "react-native";
import { StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useState, useEffect } from "react";

interface HotspotSearchButtonProps {
  isLoadingHotspots?: boolean;
  onPress?: () => void;
  lastUpdateTime?: number;
  cooldownMs?: number;
}

export function HotspotSearchButton({ 
  isLoadingHotspots = false, 
  onPress = () => {}, 
  lastUpdateTime = 0,
  cooldownMs = 3000
}: HotspotSearchButtonProps) {
  const [countdown, setCountdown] = useState(0);
  const [isOnCooldown, setIsOnCooldown] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      if (!lastUpdateTime) {
        setCountdown(0);
        setIsOnCooldown(false);
        return;
      }

      const timeSinceLastUpdate = Date.now() - lastUpdateTime;
      const remainingCooldown = cooldownMs - timeSinceLastUpdate;

      if (remainingCooldown > 0) {
        setCountdown(Math.ceil(remainingCooldown / 1000)); // Convert to seconds
        setIsOnCooldown(true);
      } else {
        setCountdown(0);
        setIsOnCooldown(false);
      }
    };

    // Update immediately
    updateCountdown();

    // Update every second while on cooldown
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [lastUpdateTime, cooldownMs]);

  const getButtonText = () => {
    if (isLoadingHotspots) return "Searching...";
    if (isOnCooldown && countdown > 0) return `Wait ${countdown}s`;
    return "Search Area";
  };

const getIcon = () => {
    if (isLoadingHotspots) {
      return <ActivityIndicator size="small" color="#333" />;
    }
    if (isOnCooldown) {
      return <MaterialIcons name="schedule" size={20} color="#666" />;
    }
    return <MaterialIcons name="search" size={20} color="#333" />;
  }

  const isDisabled = isLoadingHotspots || isOnCooldown;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.refreshHotspotsButton, 
          isDisabled && styles.buttonDisabled
        ]}
        onPress={onPress}
        disabled={isDisabled}
      >
        <View style={styles.buttonContent}>
          {getIcon()}
          <Text style={[
            styles.buttonText,
            isOnCooldown && styles.cooldownText
          ]}>
            {getButtonText()}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: 650,
    left: 0,
    right: 0,
  },
  refreshHotspotsButton: {
    width: 170,
    height: 50,
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
    fontWeight: "300",
    color: "#333",
  },
  cooldownText: {
    color: "#666",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});