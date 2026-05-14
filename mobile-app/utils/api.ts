const BASE_URL = "https://safeguadai.onrender.com";

// 1. Current Text Assistant Logic
export async function sendToAssistant(
  message: string, 
  userId: string, // Remove the "default_user" default
  lat?: number, 
  lng?: number
) {
  try {
    const response = await fetch(`${BASE_URL}/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message, 
        user_id: userId, // This is now your actual email/ID
        latitude: lat, 
        longitude: lng 
      }),
    });

    if (!response.ok) {
      return "I'm having trouble reaching my sensors. Stay alert.";
    }

    const data = await response.json();
    return data.reply;
  } catch (error) {
    return "I'm here with you. Stay aware of your surroundings.";
  }
}

// 2. Audio Threat Analysis logic for Gemini + Claude
export async function analyzeSafetyAudio(audioUri: string) {
  try {
    const formData = new FormData();
    // @ts-ignore
    formData.append('file', {
      uri: audioUri,
      type: 'audio/mp3',
      name: 'sos_audio.mp3',
    });

    const response = await fetch(`${BASE_URL}/analyze-audio`, {
      method: "POST",
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });

    // 🛡️ FIX: Handle backend errors for audio
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Audio API Error (${response.status}):`, errorText);
      return { is_threat: false, error: "Server error" };
    }

    return await response.json();
  } catch (error) {
    console.error("Audio Analysis Error:", error);
    return { is_threat: false, error: "Network failed" };
  }
}