export type Sensitivity = "low" | "medium" | "high";

export type ModeConfig = {
  id: string;
  label: string;
  icon: string;
  description: string;
  sensitivity: Sensitivity;
  backgroundTracking: boolean;
  emergencyTriggers: boolean;
  liveSharing: boolean;
};

export const GOING_OUT_MODES: ModeConfig[] = [
  {
    id: "walking_alone",
    label: "Walking Alone",
    icon: "🚶",
    description: "High sensitivity for solo walks, especially at night.",
    sensitivity: "high",
    backgroundTracking: true,
    emergencyTriggers: true,
    liveSharing: false,
  },
  {
    id: "night_out",
    label: "Night Out",
    icon: "🌃",
    description: "Very high safety for nights out, bars, and clubs.",
    sensitivity: "high",
    backgroundTracking: true,
    emergencyTriggers: true,
    liveSharing: true,
  },
  {
    id: "running",
    label: "Running / Jogging",
    icon: "🏃",
    description: "Balanced tracking for runs and jogs.",
    sensitivity: "medium",
    backgroundTracking: true,
    emergencyTriggers: true,
    liveSharing: false,
  },
  {
    id: "gym",
    label: "Gym / Workout",
    icon: "🏋️",
    description: "Lower sensitivity to avoid false triggers during workouts.",
    sensitivity: "low",
    backgroundTracking: false,
    emergencyTriggers: true,
    liveSharing: false,
  },
  {
    id: "public_transport",
    label: "Public Transport",
    icon: "🚌",
    description: "Tracks your route on buses, trains, and trams.",
    sensitivity: "medium",
    backgroundTracking: true,
    emergencyTriggers: true,
    liveSharing: false,
  },
  {
    id: "driving",
    label: "Driving",
    icon: "🚗",
    description: "Crash‑focused detection, reduced fall sensitivity.",
    sensitivity: "low",
    backgroundTracking: true,
    emergencyTriggers: true,
    liveSharing: false,
  },
  {
    id: "cycling",
    label: "Cycling",
    icon: "🚴",
    description: "Medium‑high sensitivity for cycling and e‑bikes.",
    sensitivity: "medium",
    backgroundTracking: true,
    emergencyTriggers: true,
    liveSharing: false,
  },
  {
    id: "hiking",
    label: "Hiking",
    icon: "🥾",
    description: "High safety for long hikes and trails.",
    sensitivity: "high",
    backgroundTracking: true,
    emergencyTriggers: true,
    liveSharing: true,
  },
  {
    id: "travel_abroad",
    label: "Travel Abroad",
    icon: "🛫",
    description: "Extra safety when travelling in unfamiliar places.",
    sensitivity: "medium",
    backgroundTracking: true,
    emergencyTriggers: true,
    liveSharing: true,
  },
  {
    id: "custom",
    label: "Custom Mode",
    icon: "🎛️",
    description: "Your own personalised safety configuration.",
    sensitivity: "medium",
    backgroundTracking: true,
    emergencyTriggers: true,
    liveSharing: false,
  },
  {
    id: "date",
    label: "Date",
    icon: "💜",
    description: "Discreet, high‑sensitivity safety for dates and meetups.",
    sensitivity: "high",
    backgroundTracking: true,
    emergencyTriggers: true,
    liveSharing: true,
  },
];
