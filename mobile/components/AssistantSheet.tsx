import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

type Message = {
  id: string;
  text: string;
  sender: "user" | "assistant";
};

const SUGGESTIONS = [
  "What can you do for me?",
  "Help me set up safety modes",
  "How do SOS alerts work?",
  "Explain Going Out mode",
];

const AssistantSheet = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // -------------------------------
  // Backend POST request
  // -------------------------------
  const sendMessageToBackend = async (text: string) => {
    try {
     const response = await fetch("http://10.0.2.2:8000/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      return data.reply;
    } catch (error) {
      console.error("Assistant error:", error);
      return "Sorry, I couldn't reach the assistant.";
    }
  };

  // -------------------------------
  // Handle sending a message
  // -------------------------------
  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride ?? input;
    if (!textToSend.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: textToSend,
      sender: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    const reply = await sendMessageToBackend(textToSend);

    const assistantMessage: Message = {
      id: Date.now().toString() + "-bot",
      text: reply,
      sender: "assistant",
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsTyping(false);
  };

  // -------------------------------
  // Voice button placeholder
  // -------------------------------
  const handleVoicePress = () => {
    // Placeholder: later you can integrate expo-speech / expo-voice here
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString() + "-info",
        text: "Voice input coming soon. For now, type your message.",
        sender: "assistant",
      },
    ]);
  };

  // -------------------------------
  // Render message bubble
  // -------------------------------
  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageBubble,
        item.sender === "user" ? styles.userBubble : styles.assistantBubble,
      ]}
    >
      <Text style={styles.messageText}>{item.text}</Text>
    </View>
  );

  // -------------------------------
  // Render suggestion chip
  // -------------------------------
  const renderSuggestion = (text: string) => (
    <TouchableOpacity
      key={text}
      style={styles.suggestionChip}
      onPress={() => handleSend(text)}
    >
      <Text style={styles.suggestionText}>{text}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Floating orb (visual anchor) */}
      <View style={styles.orbContainer}>
        <View style={styles.orbGlow} />
        <View style={styles.orbCore} />
      </View>

      {/* Messages */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
      />

      {/* Typing indicator */}
      {isTyping && (
        <View style={styles.typingRow}>
          <ActivityIndicator size="small" color="#B9A6FF" />
          <Text style={styles.typingText}>Assistant is thinking…</Text>
        </View>
      )}

      {/* Suggestion chips */}
      <View style={styles.suggestionsRow}>
        {SUGGESTIONS.map(renderSuggestion)}
      </View>

      {/* Input Row */}
      <View style={styles.inputRow}>
        <TouchableOpacity style={styles.voiceButton} onPress={handleVoicePress}>
          <Text style={styles.voiceIcon}>🎤</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Ask something..."
          placeholderTextColor="#999"
          value={input}
          onChangeText={setInput}
        />

        <TouchableOpacity style={styles.sendButton} onPress={() => handleSend()}>
          <Text style={{ color: "white", fontWeight: "bold" }}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default AssistantSheet;

// -------------------------------
// Styles
// -------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050509",
  },
  messageBubble: {
    padding: 12,
    marginVertical: 6,
    maxWidth: "80%",
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: "#6A4DF5",
    alignSelf: "flex-end",
  },
  assistantBubble: {
    backgroundColor: "#151522",
    alignSelf: "flex-start",
  },
  messageText: {
    color: "white",
    fontSize: 16,
  },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  typingText: {
    color: "#B9A6FF",
    marginLeft: 8,
    fontSize: 13,
  },
  suggestionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: "#1E1E2A",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  suggestionText: {
    color: "#D6D6FF",
    fontSize: 12,
  },
  inputRow: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#222238",
    backgroundColor: "#090912",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#151522",
    color: "white",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  sendButton: {
    backgroundColor: "#6A4DF5",
    paddingHorizontal: 18,
    justifyContent: "center",
    borderRadius: 12,
    height: 40,
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "#151522",
    alignItems: "center",
    justifyContent: "center",
  },
  voiceIcon: {
    fontSize: 18,
    color: "#D6D6FF",
  },
  orbContainer: {
    position: "absolute",
    right: 20,
    bottom: 90,
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  orbGlow: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(106, 77, 245, 0.35)",
  },
  orbCore: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#6A4DF5",
  },
});