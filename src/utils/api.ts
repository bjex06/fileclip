// API設定とアダプター

export type BackendType = 'supabase' | 'xserver';

export interface ApiConfig {
  backend: BackendType;
  baseUrl?: string;
  apiKey?: string;
  credentials?: {
    supabaseUrl?: string;
    supabaseKey?: string;
    xserverEndpoint?: string;
    apiToken?: string;
  };
}

// 環境変数から設定を読み取り
export const getApiConfig = (): ApiConfig => {
  const backend = (import.meta.env.VITE_BACKEND_TYPE as BackendType) || 'xserver';

  return {
    backend,
    baseUrl: import.meta.env.VITE_API_BASE_URL,
    apiKey: import.meta.env.VITE_API_KEY,
    credentials: {
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      xserverEndpoint: import.meta.env.VITE_XSERVER_ENDPOINT,
      apiToken: import.meta.env.VITE_XSERVER_TOKEN,
    }
  };
};

// 共通のAPIレスポンス型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status?: number;
}

// HTTPクライアントの抽象化
export class HttpClient {
  private config: ApiConfig;
  private authToken: string | null = null;

  constructor(config: ApiConfig) {
    this.config = config;
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    switch (this.config.backend) {
      case 'supabase':
        if (this.config.credentials?.supabaseKey) {
          headers['apikey'] = this.config.credentials.supabaseKey;
          if (!this.authToken) {
            headers['Authorization'] = `Bearer ${this.config.credentials.supabaseKey}`;
          } else {
            headers['Authorization'] = `Bearer ${this.authToken}`;
          }
        }
        break;

      case 'xserver':
        // Xserver: Use X-Auth-Token and X-FileClip-Auth to bypass WAF/Anti-Bot blocking
        if (this.authToken) {
          const tokenValue = `Bearer ${this.authToken}`;
          headers['X-Auth-Token'] = tokenValue;
          headers['X-FileClip-Auth'] = tokenValue;
        }
        // Static API Token (if configured, distinct from user session)
        if (this.config.credentials?.apiToken) {
          headers['X-API-Token'] = this.config.credentials.apiToken;
        }
        break;

      default:
        // Default: Standard Authorization header
        if (this.authToken) {
          headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        break;
    }

    return headers;
  }

  private getBaseUrl(): string {
    switch (this.config.backend) {
      case 'supabase':
        return this.config.credentials?.supabaseUrl || '';
      case 'xserver':
        return this.config.credentials?.xserverEndpoint || '';
      default:
        return this.config.baseUrl || '';
    }
  }

  getConfig(): ApiConfig {
    return this.config;
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.getBaseUrl()}${endpoint}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || 'Request failed',
          status: response.status
        };
      }

      return {
        success: true,
        data: this.transformResponse(data),
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  async post<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.getBaseUrl()}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(this.transformRequest(body)),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || 'Request failed'
        };
      }

      return {
        success: true,
        data: this.transformResponse(data),
        message: data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  async postFormData<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    try {
      const headers: Record<string, string> = {};

      // 認証トークンを追加
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      if (this.config.backend === 'xserver' && this.config.credentials?.apiToken) {
        headers['X-API-Token'] = this.config.credentials.apiToken;
      }

      const response = await fetch(`${this.getBaseUrl()}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || 'Request failed'
        };
      }

      return {
        success: true,
        data: this.transformResponse(data),
        message: data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  async put<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.getBaseUrl()}${endpoint}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(this.transformRequest(body)),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || 'Request failed'
        };
      }

      return {
        success: true,
        data: this.transformResponse(data),
        message: data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  async delete<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    try {
      const options: RequestInit = {
        method: 'DELETE',
        headers: this.getHeaders(),
      };

      if (body) {
        options.body = JSON.stringify(this.transformRequest(body));
      }

      const response = await fetch(`${this.getBaseUrl()}${endpoint}`, options);

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || 'Request failed'
        };
      }

      return {
        success: true,
        data: this.transformResponse(data),
        message: data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  // ダウンロード用（Blobを返す）
  async downloadFile(endpoint: string): Promise<{ success: boolean; blob?: Blob; filename?: string; error?: string }> {
    try {
      const response = await fetch(`${this.getBaseUrl()}${endpoint}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Download failed' }));
        return {
          success: false,
          error: errorData.error || 'Download failed'
        };
      }

      // Content-Dispositionからファイル名を取得
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'download';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''));
        }
      }

      const blob = await response.blob();

      return {
        success: true,
        blob,
        filename
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download error'
      };
    }
  }

  // レスポンスデータの変換（バックエンド固有の形式を統一）
  private transformResponse(data: any): any {
    switch (this.config.backend) {
      case 'supabase':
        if (Array.isArray(data)) {
          return data;
        }
        return data;
      case 'xserver':
        // Xserverのレスポンス形式: { status: 'success', data: ... }
        if (data.status === 'success' && data.data !== undefined) {
          return data.data;
        }
        return data;
      default:
        return data;
    }
  }

  // リクエストデータの変換（バックエンド固有の形式に変換）
  private transformRequest(data: any): any {
    switch (this.config.backend) {
      case 'supabase':
        return data;
      case 'xserver':
        return data;
      default:
        return data;
    }
  }
}

// グローバルHTTPクライアントインスタンス
export const httpClient = new HttpClient(getApiConfig());

// トークン設定用のヘルパー関数
export const setGlobalAuthToken = (token: string | null) => {
  httpClient.setAuthToken(token);
};
