import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Mail, X, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { validatePasswordStrength, validateEmail } from '../utils/auth';
import Logo from '../components/Logo';

// パスワードリセットモーダルコンポーネント
interface PasswordResetModalProps {
  onClose: () => void;
  onSubmit: (email: string) => void;
}

const PasswordResetModal: React.FC<PasswordResetModalProps> = ({ onClose, onSubmit }) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      toast.error('有効なメールアドレスを入力してください');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(email);
      onClose();
    } catch (error) {
      // エラーはonSubmit内で処理済み
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 animate-fadeIn">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">パスワードのリセット</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSubmitting}
          >
            <X size={24} />
          </button>
        </div>

        <p className="text-gray-600 mb-4">
          アカウントに関連付けられたメールアドレスを入力してください。一時パスワードが生成されます。
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="example@domain.com"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50"
              disabled={isSubmitting}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? '送信中...' : '送信'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// サインアップモーダルコンポーネント
interface SignUpModalProps {
  onClose: () => void;
  onSubmit: (email: string, password: string, name: string) => void;
}

const SignUpModal: React.FC<SignUpModalProps> = ({ onClose, onSubmit }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({ isValid: false, errors: [] as string[] });

  useEffect(() => {
    if (password) {
      setPasswordValidation(validatePasswordStrength(password));
    } else {
      setPasswordValidation({ isValid: false, errors: [] });
    }
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // バリデーション
    if (!validateEmail(email)) {
      toast.error('有効なメールアドレスを入力してください');
      return;
    }

    if (!passwordValidation.isValid) {
      toast.error('パスワードが要件を満たしていません');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('パスワードが一致しません');
      return;
    }

    if (name.trim().length < 2) {
      toast.error('名前は2文字以上で入力してください');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(email, password, name);
      onClose();
    } catch (error) {
      // エラーはonSubmit内で処理済み
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 animate-fadeIn max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">新規アカウント作成</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSubmitting}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="example@domain.com"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              名前
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="田中太郎"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              パスワード
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                required
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={isSubmitting}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {password && (
              <div className="mt-2 text-sm">
                <div className="space-y-1">
                  {passwordValidation.errors.map((error, index) => (
                    <div key={index} className="flex items-center text-red-600">
                      <AlertCircle size={16} className="mr-1" />
                      {error}
                    </div>
                  ))}
                  {passwordValidation.isValid && (
                    <div className="flex items-center text-green-600">
                      <CheckCircle size={16} className="mr-1" />
                      パスワードは要件を満たしています
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              パスワード確認
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                required
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={isSubmitting}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <div className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle size={16} className="mr-1" />
                パスワードが一致しません
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50"
              disabled={isSubmitting}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || !passwordValidation.isValid || password !== confirmPassword}
            >
              {isSubmitting ? 'アカウント作成中...' : 'アカウント作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);

  const navigate = useNavigate();
  const { signIn, signUp, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signIn(email, password);
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      // エラーはAuthContext内で処理済み
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (email: string) => {
    await resetPassword(email);
  };

  const handleSignUp = async (email: string, password: string, name: string) => {
    await signUp(email, password, name);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 relative">
      {/* 背景装飾 - 控えめなグレーのアクセントのみ残すか、完全に削除 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gray-200/50 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gray-200/50 rounded-full blur-3xl" />
      </div>

      <div className="bg-white rounded-lg shadow-md w-full max-w-md p-8 relative z-10 border-t-4 border-[#FFB85F]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            {/* Logoコンポーネントまたは直接SVGを使用。ここでは既存のLogoコンポーネントを使用しつつ、デザインを合わせる */}
            <div className="p-2 rounded-lg bg-white ring-1 ring-gray-100 shadow-sm">
              <Logo size="xl" showText={false} />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-[#4A90E2]">File</span>
            <span className="text-[#FFB85F] ml-1">CLIP</span>
          </h1>
          <p className="text-xs text-gray-500 mt-2 font-medium tracking-wide">
            SECURE FILE SHARING
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレスまたはユーザー名
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent transition-shadow"
                placeholder="メールアドレスまたはユーザー名"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              パスワード
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent transition-shadow"
                placeholder="••••••••"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                disabled={loading}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <div className="text-right mt-1">
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="text-xs text-[#4A90E2] hover:text-blue-700 hover:underline"
                disabled={loading}
              >
                パスワードをお忘れですか？
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 px-4 bg-[#4A90E2] text-white rounded-md font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-sm ${loading ? 'opacity-75 cursor-not-allowed' : ''
              }`}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <div className="mt-6 text-center pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-600">
            アカウントをお持ちでない方は{' '}
            <button
              type="button"
              onClick={() => setShowSignUpModal(true)}
              className="text-[#FFB85F] hover:text-orange-500 hover:underline font-medium transition-colors"
              disabled={loading}
            >
              こちらから登録
            </button>
          </p>
        </div>

        {/* デモアカウント情報 */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider flex items-center">
            <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            デモアカウント
          </h3>
          <div className="text-xs text-gray-600 space-y-2">
            <div className="flex items-center justify-between border-b border-gray-200 pb-1">
              <span className="font-medium text-gray-700">管理者</span>
              <code className="bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-600 font-mono">admin@example.com / Admin123!</code>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="font-medium text-gray-700">ユーザー</span>
              <code className="bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-600 font-mono">test@example.com / Test123!</code>
            </div>
          </div>
        </div>
      </div>

      {/* パスワードリセットモーダル */}
      {showResetModal && (
        <PasswordResetModal
          onClose={() => setShowResetModal(false)}
          onSubmit={handleResetPassword}
        />
      )}

      {/* サインアップモーダル */}
      {showSignUpModal && (
        <SignUpModal
          onClose={() => setShowSignUpModal(false)}
          onSubmit={handleSignUp}
        />
      )}
    </div>
  );
};

export default Login;
