// 認証関連のユーティリティ関数

import { User } from '../types';

// パスワードハッシュ化（簡易版 - 実際の本番環境ではbcryptなどを使用）
export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'file-manager-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// パスワード検証
export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  const inputHash = await hashPassword(password);
  return inputHash === hashedPassword;
};

// JWTトークン生成（簡易版）
export const generateToken = (user: { id: string; email: string; role: User['role']; name?: string }): string => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));

  // Unicode文字（日本語など）を扱うために、一度UTF-8バイトシーケンスとしてエンコードしてからbtoaする
  const payloadObj = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    exp: Date.now() + (24 * 60 * 60 * 1000) // 24時間後に期限切れ
  };

  const payloadStr = JSON.stringify(payloadObj);
  const payloadEncoded = btoa(encodeURIComponent(payloadStr).replace(/%([0-9A-F]{2})/g,
    function toSolidBytes(match, p1) {
      return String.fromCharCode(parseInt(p1, 16));
    }));

  const signature = btoa(`${header}.${payloadEncoded}.secret`); // 実際の環境では適切な秘密鍵を使用

  return `${header}.${payloadEncoded}.${signature}`;
};

// トークン検証
export const verifyToken = (token: string): { id: string; email: string; name: string; role: User['role'] } | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Unicode文字のデコード処理
    const payloadEncoded = parts[1];
    const payloadStr = decodeURIComponent(atob(payloadEncoded).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const payload = JSON.parse(payloadStr);

    // 期限チェック
    // PHPは秒単位、JavaScriptはミリ秒単位でexpを生成するため、
    // 桁数で判断して適切に比較する（秒: 10桁、ミリ秒: 13桁）
    const now = Date.now();
    const expMs = payload.exp < 10000000000000 ? payload.exp * 1000 : payload.exp;
    if (expMs < now) {
      return null;
    }

    return {
      id: payload.id,
      email: payload.email,
      name: payload.name || '',
      role: payload.role
    };
  } catch {
    return null;
  }
};

// セッションストレージ管理
export const sessionStorage = {
  setToken: (token: string) => {
    localStorage.setItem('auth_token', token);
  },

  getToken: (): string | null => {
    return localStorage.getItem('auth_token');
  },

  removeToken: () => {
    localStorage.removeItem('auth_token');
  },

  setUser: (user: User) => {
    localStorage.setItem('current_user', JSON.stringify(user));
  },

  getUser: (): User | null => {
    const userData = localStorage.getItem('current_user');
    return userData ? JSON.parse(userData) : null;
  },

  removeUser: () => {
    localStorage.removeItem('current_user');
  }
};

// ログイン試行管理
export const loginAttempts = {
  getAttempts: (identifier: string): number => {
    const attempts = localStorage.getItem(`login_attempts_${identifier}`);
    return attempts ? parseInt(attempts) : 0;
  },

  incrementAttempts: (identifier: string): number => {
    const current = loginAttempts.getAttempts(identifier);
    const newCount = current + 1;
    localStorage.setItem(`login_attempts_${identifier}`, newCount.toString());
    localStorage.setItem(`login_attempts_time_${identifier}`, Date.now().toString());
    return newCount;
  },

  resetAttempts: (identifier: string) => {
    localStorage.removeItem(`login_attempts_${identifier}`);
    localStorage.removeItem(`login_attempts_time_${identifier}`);
  },

  isLocked: (identifier: string): boolean => {
    const attempts = loginAttempts.getAttempts(identifier);
    const lastAttemptTime = localStorage.getItem(`login_attempts_time_${identifier}`);

    if (attempts >= 5 && lastAttemptTime) {
      const lockoutTime = 30 * 60 * 1000; // 30分のロックアウト
      return Date.now() - parseInt(lastAttemptTime) < lockoutTime;
    }

    return false;
  },

  getRemainingLockTime: (identifier: string): number => {
    const lastAttemptTime = localStorage.getItem(`login_attempts_time_${identifier}`);
    if (!lastAttemptTime) return 0;

    const lockoutTime = 30 * 60 * 1000;
    const elapsed = Date.now() - parseInt(lastAttemptTime);
    return Math.max(0, lockoutTime - elapsed);
  }
};

// パスワード強度チェック
export const validatePasswordStrength = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('パスワードは8文字以上である必要があります');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('大文字を含む必要があります');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('小文字を含む必要があります');
  }

  if (!/\d/.test(password)) {
    errors.push('数字を含む必要があります');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('特殊文字を含む必要があります');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// メールアドレス検証
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
