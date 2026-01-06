import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { authApi, AuthUser, addUserToMockDatabase } from '../utils/authApi';
import { fileSystemApi } from '../utils/fileSystemApi';
import { 
  sessionStorage,
  validatePasswordStrength,
  validateEmail
} from '../utils/auth';
import { setGlobalAuthToken } from '../utils/api';

interface AuthContextType {
  session: AuthUser | null;
  loading: boolean;
  signIn: (emailOrName: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<string>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // 初期化
  useEffect(() => {
    const init = async () => {
      await refreshSession();
      setLoading(false);
    };
    
    init();
  }, []);

  const refreshSession = async () => {
    try {
      const token = sessionStorage.getToken();
      const savedUser = sessionStorage.getUser();
      
      if (token && savedUser) {
        // トークンを設定
        setGlobalAuthToken(token);
        
        // セッションを検証
        const response = await authApi.verifySession(token);
        
        if (response.success && response.data) {
          setSession(response.data);
          sessionStorage.setUser(response.data);
        } else {
          // トークンが無効な場合はクリア
          sessionStorage.removeToken();
          sessionStorage.removeUser();
          setGlobalAuthToken(null);
          setSession(null);
        }
      }
    } catch (error) {
      console.error('セッション復元エラー:', error);
      sessionStorage.removeToken();
      sessionStorage.removeUser();
      setGlobalAuthToken(null);
      setSession(null);
    }
  };

  const signIn = async (emailOrName: string, password: string) => {
    try {
      const response = await authApi.signIn({ emailOrName, password });
      
      if (!response.success) {
        throw new Error(response.error || 'ログインに失敗しました');
      }
      
      const { user, token } = response.data!;
      
      // トークンとユーザー情報を保存
      if (token) {
        sessionStorage.setToken(token);
        setGlobalAuthToken(token);
      }
      sessionStorage.setUser(user);
      setSession(user);
      
      toast.success(`ようこそ、${user.name}さん`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ログインに失敗しました';
      toast.error(message);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      // 入力検証
      if (!validateEmail(email)) {
        throw new Error('有効なメールアドレスを入力してください');
      }
      
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        throw new Error(`パスワードが要件を満たしていません:\n${passwordValidation.errors.join('\n')}`);
      }
      
      if (name.trim().length < 2) {
        throw new Error('名前は2文字以上で入力してください');
      }
      
      const response = await authApi.signUp({ email, password, name });
      
      if (!response.success) {
        throw new Error(response.error || 'アカウント作成に失敗しました');
      }
      
      const { user, token } = response.data!;
      
      // FileSystemのモックストレージにユーザーを追加
      fileSystemApi.addUserToMockStorage({
        id: user.id,
        name: user.name,
        role: user.role,
        isActive: true
      });
      
      toast.success('アカウントが正常に作成されました');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'アカウント作成に失敗しました';
      toast.error(message);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await authApi.signOut();
      
      sessionStorage.removeToken();
      sessionStorage.removeUser();
      setGlobalAuthToken(null);
      setSession(null);
      
      toast.success('ログアウトしました');
    } catch (error) {
      toast.error('ログアウトに失敗しました');
      throw error;
    }
  };

  const resetPassword = async (email: string): Promise<string> => {
    try {
      const response = await authApi.resetPassword(email);
      
      if (!response.success) {
        throw new Error(response.error || 'パスワードのリセットに失敗しました');
      }
      
      const tempPassword = response.data?.tempPassword || '';
      
      if (tempPassword) {
        toast.success(`一時パスワードが生成されました: ${tempPassword}`, {
          duration: 10000
        });
      } else {
        toast.success('パスワードリセットのメールを送信しました');
      }
      
      return tempPassword;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'パスワードのリセットに失敗しました';
      toast.error(message);
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      // 新しいパスワードの強度チェック
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(`新しいパスワードが要件を満たしていません:\n${passwordValidation.errors.join('\n')}`);
      }
      
      const response = await authApi.changePassword(currentPassword, newPassword);
      
      if (!response.success) {
        throw new Error(response.error || 'パスワード変更に失敗しました');
      }
      
      toast.success('パスワードが正常に変更されました');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'パスワード変更に失敗しました';
      toast.error(message);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      session, 
      loading, 
      signIn, 
      signUp, 
      signOut, 
      resetPassword, 
      changePassword,
      refreshSession 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// FileSystemContextから使用される関数（互換性のため）
export const notifyUserChanges = () => {
  // 現在は何もしない（APIベースになったため）
};

export const addUserToStorage = (id: string, name: string, role: 'admin' | 'user') => {
  fileSystemApi.addUserToMockStorage({
    id,
    name,
    role,
    isActive: true
  });
};
