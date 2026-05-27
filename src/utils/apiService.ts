import type { ResumeData } from '../types/resume';
import type { JobApplication } from '../types/tracker';

const API_BASE_URL = 'http://localhost:8080/api';

export interface SavedVersion {
  id: string;
  name: string;
  updatedAt: string;
  data: ResumeData;
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

  // Auth Methods
  async login(email: string, password: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Identifiants invalides');
    }
    localStorage.setItem('ats_backend_jwt', data.token);
    localStorage.setItem('ats_backend_email', data.email);
    return data;
  }

  async signup(email: string, password: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de l\'inscription');
    }
    localStorage.setItem('ats_backend_jwt', data.token);
    localStorage.setItem('ats_backend_email', data.email);
    return data;
  }

  logout() {
    localStorage.removeItem('ats_backend_jwt');
    localStorage.removeItem('ats_backend_email');
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
    if (!response.ok) throw new Error('Impossible de charger les versions');
    return response.json();
  }

  async saveVersion(versionName: string, resumeData: ResumeData): Promise<SavedVersion> {
    const response = await fetch(`${API_BASE_URL}/resumes/versions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ versionName, resumeData }),
    });
    if (!response.ok) throw new Error('Impossible de sauvegarder la version');
    return response.json();
  }

  async deleteVersion(id: string): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/resumes/versions/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return response.ok;
  }

  async syncVersions(localVersions: any[]): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/resumes/sync`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(localVersions),
    });
    return response.ok;
  }

  // Job Applications Cloud CRUD
  async fetchApplications(): Promise<JobApplication[]> {
    const response = await fetch(`${API_BASE_URL}/applications`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error('Impossible de charger les candidatures');
    return response.json();
  }

  async saveApplication(app: JobApplication): Promise<JobApplication> {
    const response = await fetch(`${API_BASE_URL}/applications`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(app),
    });
    if (!response.ok) throw new Error('Impossible d\'enregistrer la candidature');
    return response.json();
  }

  async deleteApplication(id: string): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/applications/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return response.ok;
  }

  async syncApplications(localApps: JobApplication[]): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/applications/sync`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(localApps),
    });
    return response.ok;
  }

  // Proxy LLM Service
  async proxyLlm(systemPrompt: string, userPrompt: string, provider = 'GEMINI'): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/llm/proxy`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ systemPrompt, userPrompt, provider }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'L\'appel de l\'assistant IA a échoué');
    }
    return data.response;
  }
}

export const apiService = new ApiService();
