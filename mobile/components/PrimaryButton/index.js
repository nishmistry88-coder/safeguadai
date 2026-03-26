import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import colors from "../../theme/colors";
import shadows from "../../theme/shadows";

export default function PrimaryButton({ title, onPress }) {
  return (
    <TouchableOpacity style={[styles.button, shadows.glow]} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.violet,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 40,
    marginBottom: 60
  },
  text: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "600",
  },
});