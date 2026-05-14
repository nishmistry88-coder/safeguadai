import { View, Text, StyleSheet } from "react-native";

export default function ContactsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Emergency Contacts</Text>
      <Text style={styles.subtitle}>
        In Phase 2, this will list and manage your trusted contacts.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050814",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: { color: "#F9FAFB", fontSize: 22, fontWeight: "700" },
  subtitle: {
    color: "#9CA3AF",
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
});
