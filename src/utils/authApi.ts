// 認証API抽象化レイヤー

import { httpClient, getApiConfig, ApiResponse, setGlobalAuthToken } from './api';
import { UserRole } from '../types';

export interface AuthCredentials {
  emailOrName: string;
  password: string;
}

export interface SignUpData {
  email: string;
  password: string;
  name: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  branchId?: string;
  departmentId?: string;
  isActive: boolean;
}

export interface AuthResponse {
  user: AuthUser;
  token?: string;
  refreshToken?: string;
}

// 認証APIクライアント
export class AuthApiClient {
  private config = getApiConfig();

  // ログイン
  async signIn(credentials: AuthCredentials): Promise<ApiResponse<AuthResponse>> {
    switch (this.config.backend) {
      case 'supabase':
        return this.supabaseSignIn(credentials);
      case 'xserver':
        return this.xserverSignIn(credentials);
      default:
        return { success: false, error: 'Not implemented' };
    }
  }

  // サインアップ
  async signUp(data: SignUpData): Promise<ApiResponse<AuthResponse>> {
    switch (this.config.backend) {
      case 'supabase':
        return this.supabaseSignUp(data);
      case 'xserver':
        return this.xserverSignUp(data);
      default:
        return { success: false, error: 'Not implemented' };
    }
  }

  // ログアウト
  async signOut(): Promise<ApiResponse<void>> {
    switch (this.config.backend) {
      case 'supabase':
        return this.supabaseSignOut();
      case 'xserver':
        return this.xserverSignOut();
      default:
        return { success: false, error: 'Not implemented' };
    }
  }

  // パスワードリセット
  async resetPassword(email: string): Promise<ApiResponse<{ tempPassword?: string }>> {
    switch (this.config.backend) {
      case 'supabase':
        return this.supabaseResetPassword(email);
      case 'xserver':
        return this.xserverResetPassword(email);
      default:
        return { success: false, error: 'Not implemented' };
    }
  }

  // パスワード変更
  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    switch (this.config.backend) {
      case 'supabase':
        return this.supabaseChangePassword(currentPassword, newPassword);
      case 'xserver':
        return this.xserverChangePassword(currentPassword, newPassword);
      default:
        return { success: false, error: 'Not implemented' };
    }
  }

  // セッション確認
  async verifySession(token: string): Promise<ApiResponse<AuthUser>> {
    switch (this.config.backend) {
      case 'supabase':
        return this.supabaseVerifySession(token);
      case 'xserver':
        return this.xserverVerifySession(token);
      default:
        return { success: false, error: 'Not implemented' };
    }
  }

  // === Supabase実装 ===
  private async supabaseSignIn(credentials: AuthCredentials): Promise<ApiResponse<AuthResponse>> {
    const response = await httpClient.post<any>('/auth/v1/token?grant_type=password', {
      email: credentials.emailOrName,
      password: credentials.password
    });

    if (!response.success) {
      return response as ApiResponse<AuthResponse>;
    }

    const { access_token, refresh_token, user } = response.data;

    setGlobalAuthToken(access_token);

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email,
          role: user.user_metadata?.role || 'user',
          isActive: true
        },
        token: access_token,
        refreshToken: refresh_token
      }
    };
  }

  private async supabaseSignUp(data: SignUpData): Promise<ApiResponse<AuthResponse>> {
    return httpClient.post('/auth/v1/signup', {
      email: data.email,
      password: data.password,
      data: {
        name: data.name,
        role: 'user'
      }
    });
  }

  private async supabaseSignOut(): Promise<ApiResponse<void>> {
    setGlobalAuthToken(null);
    return httpClient.post('/auth/v1/logout', {});
  }

  private async supabaseResetPassword(email: string): Promise<ApiResponse<{ tempPassword?: string }>> {
    return httpClient.post('/auth/v1/recover', { email });
  }

  private async supabaseChangePassword(_currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    return httpClient.put('/auth/v1/user', {
      password: newPassword
    });
  }

  private async supabaseVerifySession(token: string): Promise<ApiResponse<AuthUser>> {
    setGlobalAuthToken(token);
    return httpClient.get('/auth/v1/user');
  }

  // === Xserver実装 ===
  private async xserverSignIn(credentials: AuthCredentials): Promise<ApiResponse<AuthResponse>> {
    const response = await httpClient.post<any>('/api/auth/login.php', {
      email_or_name: credentials.emailOrName,
      password: credentials.password
    });

    if (response.success && response.data) {
      setGlobalAuthToken(response.data.token);
    }

    return response;
  }

  private async xserverSignUp(data: SignUpData): Promise<ApiResponse<AuthResponse>> {
    const response = await httpClient.post<any>('/api/auth/register.php', {
      email: data.email,
      password: data.password,
      name: data.name
    });

    if (response.success && response.data?.token) {
      setGlobalAuthToken(response.data.token);
    }

    return response;
  }

  private async xserverSignOut(): Promise<ApiResponse<void>> {
    const response = await httpClient.post<void>('/api/auth/logout.php', {});
    setGlobalAuthToken(null);
    return response;
  }

  private async xserverResetPassword(email: string): Promise<ApiResponse<{ tempPassword?: string }>> {
    return httpClient.post('/api/auth/reset-password.php', { email });
  }

  private async xserverChangePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    return httpClient.post('/api/auth/change-password.php', {
      current_password: currentPassword,
      new_password: newPassword
    });
  }

  private async xserverVerifySession(token: string): Promise<ApiResponse<AuthUser>> {
    setGlobalAuthToken(token);
    return httpClient.get('/api/auth/verify.php');
  }
}

// グローバル認証APIクライアント
export const authApi = new AuthApiClient();
