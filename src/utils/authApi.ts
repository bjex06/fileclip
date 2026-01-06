// 認証API抽象化レイヤー

import { httpClient, getApiConfig, ApiResponse, setGlobalAuthToken } from './api';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  sessionStorage,
  loginAttempts,
  validatePasswordStrength,
  validateEmail
} from './auth';
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
}

export interface AuthResponse {
  user: AuthUser;
  token?: string;
  refreshToken?: string;
}

// モック用のユーザーデータベース
interface UserRecord {
  user: AuthUser;
  passwordHash: string;
  createdAt: string;
  lastLoginAt?: string;
  isActive: boolean;
}

let mockUserDatabase: Map<string, UserRecord> | null = null;

const initializeMockDatabase = async (): Promise<Map<string, UserRecord>> => {
  const database = new Map<string, UserRecord>();

  const adminPasswordHash = await hashPassword('Admin123!');
  database.set('admin@example.com', {
    user: {
      id: '1',
      email: 'admin@example.com',
      name: 'システム管理者',
      role: 'super_admin'
    },
    passwordHash: adminPasswordHash,
    createdAt: new Date().toISOString(),
    isActive: true
  });

  const testPasswordHash = await hashPassword('Test123!');
  database.set('test@example.com', {
    user: {
      id: '2',
      email: 'test@example.com',
      name: 'テストユーザー',
      role: 'user'
    },
    passwordHash: testPasswordHash,
    createdAt: new Date().toISOString(),
    isActive: true
  });

  return database;
};

// 認証APIクライアント
export class AuthApiClient {
  private config = getApiConfig();

  async ensureMockDatabase() {
    if (!mockUserDatabase) {
      mockUserDatabase = await initializeMockDatabase();
    }
    return mockUserDatabase;
  }

  // ログイン
  async signIn(credentials: AuthCredentials): Promise<ApiResponse<AuthResponse>> {
    switch (this.config.backend) {
      case 'supabase':
        return this.supabaseSignIn(credentials);
      case 'xserver':
        return this.xserverSignIn(credentials);
      default:
        return this.mockSignIn(credentials);
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
        return this.mockSignUp(data);
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
        return this.mockSignOut();
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
        return this.mockResetPassword(email);
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
        return this.mockChangePassword(currentPassword, newPassword);
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
        return this.mockVerifySession(token);
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
          role: user.user_metadata?.role || 'user'
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

  // === Mock実装 ===
  private async mockSignIn(credentials: AuthCredentials): Promise<ApiResponse<AuthResponse>> {
    console.log('MockSignIn attempt:', credentials.emailOrName);
    const database = await this.ensureMockDatabase();

    // アカウントロック状態をチェック
    if (loginAttempts.isLocked(credentials.emailOrName)) {
      const remainingTime = Math.ceil(loginAttempts.getRemainingLockTime(credentials.emailOrName) / (60 * 1000));
      return {
        success: false,
        error: `アカウントがロックされています。${remainingTime}分後に再試行してください。`
      };
    }

    // メールアドレスでの検索を試行
    let userRecord = database.get(credentials.emailOrName);

    // 見つからない場合は名前で検索
    if (!userRecord) {
      const foundEntry = Array.from(database.entries()).find(
        ([_, record]) => record.user.name === credentials.emailOrName && record.isActive
      );

      if (foundEntry) {
        userRecord = foundEntry[1];
      }
    }

    if (!userRecord || !userRecord.isActive) {
      loginAttempts.incrementAttempts(credentials.emailOrName);
      return {
        success: false,
        error: 'ユーザーが見つからないか、アカウントが無効です'
      };
    }

    // パスワード検証
    const isValidPassword = await verifyPassword(credentials.password, userRecord.passwordHash);
    if (!isValidPassword) {
      const attempts = loginAttempts.incrementAttempts(credentials.emailOrName);
      const remaining = Math.max(0, 5 - attempts);

      if (remaining === 0) {
        return {
          success: false,
          error: 'ログイン試行回数が上限に達しました。30分後に再試行してください。'
        };
      } else {
        return {
          success: false,
          error: `パスワードが正しくありません。残り試行回数: ${remaining}回`
        };
      }
    }

    // ログイン成功
    loginAttempts.resetAttempts(credentials.emailOrName);
    userRecord.lastLoginAt = new Date().toISOString();

    const token = generateToken(userRecord.user);

    return {
      success: true,
      data: {
        user: userRecord.user,
        token
      }
    };
  }

  private async mockSignUp(data: SignUpData): Promise<ApiResponse<AuthResponse>> {
    const database = await this.ensureMockDatabase();

    // 入力検証
    if (!validateEmail(data.email)) {
      return {
        success: false,
        error: '有効なメールアドレスを入力してください'
      };
    }

    const passwordValidation = validatePasswordStrength(data.password);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        error: `パスワードが要件を満たしていません:\n${passwordValidation.errors.join('\n')}`
      };
    }

    if (data.name.trim().length < 2) {
      return {
        success: false,
        error: '名前は2文字以上で入力してください'
      };
    }

    // 既存ユーザーチェック
    if (database.has(data.email)) {
      return {
        success: false,
        error: 'このメールアドレスは既に使用されています'
      };
    }

    // 名前の重複チェック
    const nameExists = Array.from(database.values()).some(
      record => record.user.name === data.name.trim()
    );

    if (nameExists) {
      return {
        success: false,
        error: 'この名前は既に使用されています'
      };
    }

    // パスワードハッシュ化
    const passwordHash = await hashPassword(data.password);

    // 新規ユーザー作成
    const newUser: AuthUser = {
      id: `user_${Date.now()}`,
      email: data.email.toLowerCase().trim(),
      name: data.name.trim(),
      role: 'user'
    };

    const userRecord: UserRecord = {
      user: newUser,
      passwordHash,
      createdAt: new Date().toISOString(),
      isActive: true
    };

    database.set(data.email.toLowerCase().trim(), userRecord);

    return {
      success: true,
      data: {
        user: newUser
      }
    };
  }

  private async mockSignOut(): Promise<ApiResponse<void>> {
    return { success: true };
  }

  private async mockResetPassword(email: string): Promise<ApiResponse<{ tempPassword?: string }>> {
    const database = await this.ensureMockDatabase();
    const userRecord = database.get(email.toLowerCase().trim());

    if (!userRecord || !userRecord.isActive) {
      return {
        success: false,
        error: 'ユーザーが見つかりません'
      };
    }

    // 一時パスワード生成
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let tempPassword = '';
    tempPassword += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    tempPassword += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    tempPassword += '0123456789'[Math.floor(Math.random() * 10)];
    tempPassword += '!@#$%^&*'[Math.floor(Math.random() * 8)];
    for (let i = 0; i < 4; i++) {
      tempPassword += chars[Math.floor(Math.random() * chars.length)];
    }
    tempPassword = tempPassword.split('').sort(() => Math.random() - 0.5).join('');

    // パスワードハッシュを更新
    const newPasswordHash = await hashPassword(tempPassword);
    userRecord.passwordHash = newPasswordHash;

    return {
      success: true,
      data: { tempPassword }
    };
  }

  private async mockChangePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    const user = sessionStorage.getUser();
    if (!user) {
      return {
        success: false,
        error: 'ログインしていません'
      };
    }

    const database = await this.ensureMockDatabase();
    const userRecord = database.get(user.email);

    if (!userRecord) {
      return {
        success: false,
        error: 'ユーザー情報が見つかりません'
      };
    }

    // 現在のパスワード検証
    const isCurrentPasswordValid = await verifyPassword(currentPassword, userRecord.passwordHash);
    if (!isCurrentPasswordValid) {
      return {
        success: false,
        error: '現在のパスワードが正しくありません'
      };
    }

    // 新しいパスワードの強度チェック
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        error: `新しいパスワードが要件を満たしていません:\n${passwordValidation.errors.join('\n')}`
      };
    }

    // 同じパスワードかチェック
    const isSamePassword = await verifyPassword(newPassword, userRecord.passwordHash);
    if (isSamePassword) {
      return {
        success: false,
        error: '新しいパスワードは現在のパスワードと異なる必要があります'
      };
    }

    // パスワード更新
    const newPasswordHash = await hashPassword(newPassword);
    userRecord.passwordHash = newPasswordHash;

    return { success: true };
  }

  private async mockVerifySession(token: string): Promise<ApiResponse<AuthUser>> {
    const user = verifyToken(token);
    if (user) {
      return {
        success: true,
        data: user
      };
    }
    return {
      success: false,
      error: 'Invalid token'
    };
  }
}

// グローバル認証APIクライアント
export const authApi = new AuthApiClient();

// モックユーザーデータベースにユーザーを追加する関数（外部から呼び出し用）
export const addUserToMockDatabase = async (id: string, name: string, role: UserRole, email?: string) => {
  if (!mockUserDatabase) {
    mockUserDatabase = await initializeMockDatabase();
  }

  const userEmail = email || `${id}@example.com`;
  const passwordHash = await hashPassword('Default123!');

  mockUserDatabase.set(userEmail, {
    user: {
      id,
      email: userEmail,
      name,
      role
    },
    passwordHash,
    createdAt: new Date().toISOString(),
    isActive: true
  });
};
