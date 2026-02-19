// API Service for SafeGuard AI
const API_BASE_URL = 'https://safeguard-app-66.preview.emergentagent.com/api';

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async register(name: string, email: string, password: string) {
    return this.request<{ access_token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  }

  async login(email: string, password: string) {
    return this.request<{ access_token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe() {
    return this.request<any>('/auth/me');
  }

  // Settings
  async getSettings() {
    return this.request<any>('/settings');
  }

  async updateSettings(settings: any) {
    return this.request<any>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // Contacts
  async getContacts() {
    return this.request<any[]>('/contacts');
  }

  async createContact(contact: { name: string; phone: string; relationship: string; is_primary: boolean }) {
    return this.request<any>('/contacts', {
      method: 'POST',
      body: JSON.stringify(contact),
    });
  }

  async deleteContact(id: string) {
    return this.request<any>(`/contacts/${id}`, { method: 'DELETE' });
  }

  // SOS
  async triggerSOS(latitude: number, longitude: number, message?: string, trigger_source: string = 'manual') {
    return this.request<any>('/sos', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude, message, trigger_source }),
    });
  }

  async getSOSHistory() {
    return this.request<any[]>('/sos/history');
  }

  // Location
  async saveLocation(latitude: number, longitude: number, battery_level?: number, is_emergency: boolean = false) {
    return this.request<any>('/location', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude, battery_level, is_emergency }),
    });
  }

  // Going Out Mode
  async startGoingOutMode(data: {
    preset: string;
    voice_activation_enabled: boolean;
    shake_detection_enabled: boolean;
    auto_record_enabled: boolean;
    checkin_enabled: boolean;
    checkin_interval: number;
  }) {
    return this.request<any>('/going-out/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getActiveGoingOut() {
    return this.request<any | null>('/going-out/active');
  }

  async endGoingOut() {
    return this.request<any>('/going-out/end', { method: 'POST' });
  }

  async checkin(is_safe: boolean, latitude?: number, longitude?: number) {
    return this.request<any>('/going-out/checkin', {
      method: 'POST',
      body: JSON.stringify({ is_safe, latitude, longitude }),
    });
  }

  async missedCheckin() {
    return this.request<any>('/going-out/missed-checkin', { method: 'POST' });
  }

  // Journey Sharing
  async startJourney(preset?: string, duration_hours: number = 4, latitude?: number, longitude?: number) {
    return this.request<any>('/journey/start', {
      method: 'POST',
      body: JSON.stringify({ preset, duration_hours, latitude, longitude }),
    });
  }

  async getActiveJourney() {
    return this.request<any | null>('/journey/active');
  }

  async endJourney() {
    return this.request<any>('/journey/end', { method: 'POST' });
  }

  async updateJourneyLocation(latitude: number, longitude: number, battery_level?: number) {
    return this.request<any>('/journey/update-location', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude, battery_level }),
    });
  }

  // Fake Call Contacts
  async getFakeCallContacts() {
    return this.request<any[]>('/fake-call-contacts');
  }

  async createFakeCallContact(name: string, phone: string) {
    return this.request<any>('/fake-call-contacts', {
      method: 'POST',
      body: JSON.stringify({ name, phone }),
    });
  }

  async deleteFakeCallContact(id: string) {
    return this.request<any>(`/fake-call-contacts/${id}`, { method: 'DELETE' });
  }

  // Battery
  async updateBattery(level: number, is_charging: boolean, latitude?: number, longitude?: number) {
    return this.request<any>('/battery/update', {
      method: 'POST',
      body: JSON.stringify({ level, is_charging, latitude, longitude }),
    });
  }

  // Audio Analysis
  async analyzeAudio(audioUri: string) {
    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/webm',
      name: 'recording.webm',
    } as any);

    const response = await fetch(`${API_BASE_URL}/analyze-audio`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Audio analysis failed');
    }

    return response.json();
  }
}

export const api = new ApiService();
