import React from "react";
import { View, StyleSheet } from "react-native";
import colors from "../../theme/colors";

export default function GridBackground({ children }) {
  return (
    <View style={styles.container}>
      <View style={styles.grid} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    backgroundSize: 20,
    backgroundImage: `
      linear-gradient(${colors.gridLine} 1px, transparent 1px),
      linear-gradient(90deg, ${colors.gridLine} 1px, transparent 1px)
    `,
  },
});