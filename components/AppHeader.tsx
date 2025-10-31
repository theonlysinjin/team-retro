import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";

export default function AppHeader() {
  const router = useRouter();

  const handleLogoPress = () => {
    router.push("/");
  };

  if (Platform.OS !== "web") return null;

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={handleLogoPress} style={styles.logoButton}>
        <Text style={styles.logo}>Team Retro</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  logoButton: {
    cursor: "pointer",
  },
  logo: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    fontFamily: Platform.OS === "web" ? "'Righteous', sans-serif" : undefined,
    letterSpacing: 0.5,
  },
});
