import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  PanResponder,
  Animated,
  ScrollView,
} from "react-native";
import { sendToAssistant } from "../utils/api";

// --- NEW: Define a type for our chat history ---
type ChatMessage = {
  id: string;
  text: string;
  type: 'user' | 'ai';
};

export const FloatingAssistant: React.FC = () => {
  // --- STATE ---
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  
  // --- CHANGE 1: Use an array for history instead of a single string ---
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const scrollViewRef = useRef<ScrollView>(null);
  const pan = useRef(new Animated.ValueXY({ x: 20, y: 500 })).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5,
      onPanResponderGrant: () => {
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  const handleSend = async () => {
    if (!message.trim()) return;
    
    // 1. You need to pull your real location here
    // If you have a location hook or state, use those variables.
    const currentLat = 51.5074; // Replace with your actual location state
    const currentLng = -0.1278; // Replace with your actual location state

    const userMessageText = message.trim();
    const currentUserId = "user@email.com"; // Your actual user email

    const userMsg: ChatMessage = { id: Date.now().toString(), text: userMessageText, type: 'user' };
    
    setChatHistory(prev => [...prev, userMsg]);
    setMessage("");
    setLoading(true);

    try {
      // CHANGE: Add the lat and lng here so sendToAssistant can use them!
      const res = await sendToAssistant(userMessageText, currentUserId, currentLat, currentLng); 
      
      const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), text: res, type: 'ai' };
      setChatHistory(prev => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = { id: 'err', text: "Connection error.", type: 'ai' };
      setChatHistory(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Animated.View
        style={[styles.bubbleContainer, { transform: [{ translateX: pan.x }, { translateY: pan.y }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity activeOpacity={0.8} onPress={() => setVisible(true)} style={styles.bubble}>
          <Animated.View style={[styles.glow, { opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.6] }), transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] }) }] }]} />
          <View style={styles.innerOrb}><View style={styles.coreLight} /></View>
        </TouchableOpacity>
      </Animated.View>

      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.panelContainer}>
            <View style={styles.panel}>
              <View style={styles.header}>
                <View style={styles.headerIndicator} />
                <View style={styles.headerTextRow}>
                  <Text style={styles.title}>SafeGuard AI</Text>
                  <TouchableOpacity onPress={() => setVisible(false)}><Text style={styles.closeText}>Minimize</Text></TouchableOpacity>
                </View>
              </View>

              {/* CHANGE 3: The ScrollView now maps through the chatHistory array */}
              <ScrollView 
                ref={scrollViewRef}
                style={styles.body} 
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              >
                <Text style={styles.helperText}>Awareness is survival. I'm listening.</Text>

                {chatHistory.map((item) => (
                  <View 
                    key={item.id} 
                    style={[
                      styles.chatBubble, 
                      item.type === 'user' ? styles.userBubble : styles.aiBubble
                    ]}
                  >
                    <Text style={item.type === 'user' ? styles.userText : styles.replyText}>
                      {item.text}
                    </Text>
                  </View>
                ))}

                {loading && (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#7C3AED" />
                    <Text style={styles.loadingText}>Analyzing surroundings...</Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Describe your situation..."
                  placeholderTextColor="#6B7280"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.sendButton, !message.trim() && { opacity: 0.5 }]}
                  onPress={handleSend}
                  disabled={!message.trim() || loading}
                >
                  <Text style={styles.sendText}>Send</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
};

// --- CHANGE 4: Added some new styles for user vs AI bubbles ---
const styles = StyleSheet.create({
  bubbleContainer: { position: "absolute", zIndex: 1000 },
  bubble: { width: 70, height: 70, justifyContent: "center", alignItems: "center" },
  glow: { position: "absolute", width: 60, height: 60, borderRadius: 30, backgroundColor: "#7C3AED" },
  innerOrb: { width: 50, height: 50, borderRadius: 25, backgroundColor: "rgba(139, 92, 246, 0.15)", borderWidth: 1.5, borderColor: "rgba(167, 139, 250, 0.4)", justifyContent: "center", alignItems: "center" },
  coreLight: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#A78BFA" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  panelContainer: { width: "100%" },
  panel: { backgroundColor: "#050814", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, height: 500, borderWidth: 1, borderColor: "#1F2937" },
  header: { alignItems: "center", marginBottom: 15 },
  headerIndicator: { width: 40, height: 4, backgroundColor: "#374151", borderRadius: 2, marginBottom: 15 },
  headerTextRow: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  title: { color: "#F9FAFB", fontSize: 20, fontWeight: "800" },
  closeText: { color: "#9CA3AF", fontWeight: "600" },
  body: { flex: 1, marginBottom: 15 },
  helperText: { color: "#9CA3AF", fontSize: 13, fontStyle: "italic", marginBottom: 15 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  loadingText: { color: "#7C3AED", fontWeight: "500" },
  
  // New Bubble Styles
  chatBubble: { padding: 12, borderRadius: 16, marginBottom: 10, maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#7C3AED' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#0B1020', borderWidth: 1, borderColor: '#1F2937' },
  userText: { color: '#fff', fontSize: 15 },
  replyText: { color: "#E5E7EB", lineHeight: 20, fontSize: 15 },
  
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: Platform.OS === 'ios' ? 20 : 0 },
  input: { flex: 1, backgroundColor: "#020617", borderRadius: 14, padding: 12, color: "#F9FAFB", borderWidth: 1, borderColor: "#1F2937", maxHeight: 100 },
  sendButton: { backgroundColor: "#7C3AED", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20 },
  sendText: { color: "#F9FAFB", fontWeight: "700" },
});