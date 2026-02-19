import { Accelerometer, AccelerometerMeasurement } from 'expo-sensors';
import * as Haptics from 'expo-haptics';

type ShakeCallback = () => void;

class ShakeService {
  private subscription: { remove: () => void } | null = null;
  private lastShake: number = 0;
  private shakeThreshold: number = 2.5; // Acceleration threshold
  private shakeTimeout: number = 1000; // Minimum time between shakes (ms)
  private callback: ShakeCallback | null = null;

  start(onShake: ShakeCallback): void {
    this.callback = onShake;
    this.stop(); // Clean up any existing subscription

    Accelerometer.setUpdateInterval(100); // Check every 100ms

    this.subscription = Accelerometer.addListener((data: AccelerometerMeasurement) => {
      this.handleAccelerometerData(data);
    });
  }

  stop(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    this.callback = null;
  }

  private handleAccelerometerData(data: AccelerometerMeasurement): void {
    const { x, y, z } = data;
    
    // Calculate total acceleration magnitude
    const acceleration = Math.sqrt(x * x + y * y + z * z);
    
    // Check if acceleration exceeds threshold
    if (acceleration > this.shakeThreshold) {
      const now = Date.now();
      
      // Debounce - only trigger if enough time has passed since last shake
      if (now - this.lastShake > this.shakeTimeout) {
        this.lastShake = now;
        this.triggerShake();
      }
    }
  }

  private async triggerShake(): Promise<void> {
    // Provide haptic feedback
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
    // Call the callback
    if (this.callback) {
      this.callback();
    }
  }

  setThreshold(threshold: number): void {
    this.shakeThreshold = threshold;
  }
}

export const shakeService = new ShakeService();
