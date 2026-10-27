import type { ResumeData } from '../types/resume';
import type { JobApplication } from '../types/tracker';

const getDefaultApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    if (window.location.pathname.startsWith('/resume-builder')) {
      return '/resume-builder/api';
    }
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return '/api';
    }
  }
  return 'http://localhost:8080/api';
};

const API_BASE_URL = import.meta.env.VITE_API_URL || getDefaultApiBaseUrl();

export interface SavedVersion {
  id: string;
  name: string;
  updatedAt: string;
  data: ResumeData;
  isLocked?: boolean;
}

class ApiService {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('ats_backend_jwt');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  // Fast connection check
  async checkHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 1500); // 1.5s timeout for fast response

      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(id);
      return response.status === 200;
    } catch (e) {
      return false;
    }
  }

  private async parseJsonSafe(response: Response): Promise<any> {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { error: text };
    }
  }

  private handleAuthFailure(response: Response) {
    if (response.status === 401 || response.status === 403) {
      this.logout();
    }
  }

  // Auth Methods
  async login(email: string, password: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await this.parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(data.error || `Identifiants invalides (HTTP ${response.status})`);
    }
    localStorage.setItem('ats_backend_jwt', data.token);
    localStorage.setItem('ats_backend_email', data.email);
    window.dispatchEvent(new Event('ats_auth_changed'));
    return data;
  }

  async signup(email: string, password: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await this.parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(data.error || `Erreur lors de l'inscription (HTTP ${response.status})`);
    }
    localStorage.setItem('ats_backend_jwt', data.token);
    localStorage.setItem('ats_backend_email', data.email);
    window.dispatchEvent(new Event('ats_auth_changed'));
    return data;
  }

  logout() {
    localStorage.removeItem('ats_backend_jwt');
    localStorage.removeItem('ats_backend_email');
    window.dispatchEvent(new Event('ats_auth_changed'));
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('ats_backend_jwt');
  }

  getEmail(): string {
    return localStorage.getItem('ats_backend_email') || '';
  }

  // Resume Versions Cloud CRUD
  async fetchVersions(): Promise<SavedVersion[]> {
    const response = await fetch(`${API_BASE_URL}/resumes/versions`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      this.handleAuthFailure(response);
      throw new Error('Impossible de charger les versions');
    }
    return response.json();
  }

  async saveVersion(versionName: string, resumeData: ResumeData, isLocked?: boolean): Promise<SavedVersion> {
    const response = await fetch(`${API_BASE_URL}/resumes/versions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ versionName, resumeData, isLocked }),
    });
    if (!response.ok) {
      this.handleAuthFailure(response);
      throw new Error('Impossible de sauvegarder la version');
    }
    return response.json();
  }

  async deleteVersion(id: string): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/resumes/versions/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!response.ok) this.handleAuthFailure(response);
    return response.ok;
  }

  async syncVersions(localVersions: any[]): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/resumes/sync`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(localVersions),
    });
    if (!response.ok) this.handleAuthFailure(response);
    return response.ok;
  }

  // Job Applications Cloud CRUD
  async fetchApplications(): Promise<JobApplication[]> {
    const response = await fetch(`${API_BASE_URL}/applications`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      this.handleAuthFailure(response);
      throw new Error('Impossible de charger les candidatures');
    }
    return response.json();
  }

  async saveApplication(app: JobApplication): Promise<JobApplication> {
    const response = await fetch(`${API_BASE_URL}/applications`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(app),
    });
    if (!response.ok) {
      this.handleAuthFailure(response);
      throw new Error('Impossible d\'enregistrer la candidature');
    }
    return response.json();
  }

  async deleteApplication(id: string): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/applications/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!response.ok) this.handleAuthFailure(response);
    return response.ok;
  }

  async syncApplications(localApps: JobApplication[]): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/applications/sync`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(localApps),
    });
    if (!response.ok) this.handleAuthFailure(response);
    return response.ok;
  }

  // Save Personal API Key to Backend Vault
  async saveApiKey(apiKey: string, provider = 'GEMINI'): Promise<boolean> {
    if (!apiKey.trim()) return false;
    const response = await fetch(`${API_BASE_URL}/llm/apikey`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ apiKey: apiKey.trim(), provider }),
    });
    return response.ok;
  }

  // Proxy LLM Service
  async proxyLlm(systemPrompt: string, userPrompt: string, provider = 'GEMINI'): Promise<string> {
    const localApiKey = localStorage.getItem('gemini_api_key') || undefined;
    const response = await fetch(`${API_BASE_URL}/llm/proxy`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ systemPrompt, userPrompt, provider, apiKey: localApiKey }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'L\'appel de l\'assistant IA a échoué');
    }
    return data.response;
  }
}

export const apiService = new ApiService();
