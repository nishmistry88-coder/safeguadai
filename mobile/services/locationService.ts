import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { api } from './api';

const LOCATION_TASK_NAME = 'safeguard-background-location';

// Define the background location task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }
  
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const location = locations[0];
    
    if (location) {
      try {
        // Update journey location if active
        await api.updateJourneyLocation(
          location.coords.latitude,
          location.coords.longitude
        );
      } catch (e) {
        console.error('Failed to update location:', e);
      }
    }
  }
});

class LocationService {
  private subscription: Location.LocationSubscription | null = null;

  async requestPermissions(): Promise<boolean> {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    
    if (foregroundStatus !== 'granted') {
      return false;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    return backgroundStatus === 'granted';
  }

  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        return null;
      }

      return await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  }

  async startBackgroundTracking(): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return false;
      }

      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      
      if (!isTaskRegistered) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 60000, // Every 60 seconds
          distanceInterval: 50, // Or every 50 meters
          foregroundService: {
            notificationTitle: 'SafeGuard AI',
            notificationBody: 'Tracking your location for safety',
            notificationColor: '#8b5cf6',
          },
          pausesUpdatesAutomatically: false,
          activityType: Location.ActivityType.Other,
        });
      }

      return true;
    } catch (error) {
      console.error('Error starting background tracking:', error);
      return false;
    }
  }

  async stopBackgroundTracking(): Promise<void> {
    try {
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (isTaskRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
    } catch (error) {
      console.error('Error stopping background tracking:', error);
    }
  }

  startForegroundTracking(
    callback: (location: Location.LocationObject) => void,
    interval: number = 10000
  ): void {
    this.stopForegroundTracking();
    
    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: interval,
        distanceInterval: 10,
      },
      callback
    ).then((subscription) => {
      this.subscription = subscription;
    });
  }

  stopForegroundTracking(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }
}

export const locationService = new LocationService();
