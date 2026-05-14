import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LOCATION_TASK_NAME = "background-location-task";

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("BG Task Error:", error);
    return;
  }

  if (data) {
    const { locations } = data;
    const location = locations[0];

    if (location) {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) return;

        // 🔥 SEND TO BACKEND
        // Update this URL to your specific location update endpoint
        await fetch("https://safeguadai.onrender.com/location/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
            accuracy: location.coords.accuracy,
          }),
        });

        console.log("📍 Location pushed to MongoDB:", location.coords.latitude, location.coords.longitude);
      } catch (err) {
        console.error("Failed to push BG location:", err);
      }
    }
  }
});