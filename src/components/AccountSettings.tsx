import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Eye, EyeOff, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { validatePasswordStrength } from '../utils/auth';
import { UserRole, isAdmin, getRoleLabel } from '../types';

interface AccountSettingsProps {
  onClose: () => void;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({ onClose }) => {
  const { session, changePassword, signOut } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({ isValid: false, errors: [] as string[] });

  React.useEffect(() => {
    if (newPassword) {
      setPasswordValidation(validatePasswordStrength(newPassword));
    } else {
      setPasswordValidation({ isValid: false, errors: [] });
    }
  }, [newPassword]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordValidation.isValid) {
      toast.error('新しいパスワードが要件を満たしていません');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('新しいパスワードが一致しません');
      return;
    }
    
    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      // エラーはAuthContext内で処理済み
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      onClose();
    } catch (error) {
      // エラーはAuthContext内で処理済み
    }
  };

  if (!session) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">アカウント設定</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        {/* ユーザー情報表示 */}
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <User className="mr-2" size={20} />
            ユーザー情報
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">名前</label>
              <p className="mt-1 text-sm text-gray-900 bg-white p-2 rounded border">
                {session.name}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
              <p className="mt-1 text-sm text-gray-900 bg-white p-2 rounded border">
                {session.email}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">ユーザーID</label>
              <p className="mt-1 text-sm text-gray-900 bg-white p-2 rounded border">
                {session.id}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">権限</label>
              <p className="mt-1 text-sm text-gray-900 bg-white p-2 rounded border">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  isAdmin(session.role as UserRole)
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {getRoleLabel(session.role as UserRole)}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* パスワード変更 */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Lock className="mr-2" size={20} />
            パスワード変更
          </h3>
          
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                現在のパスワード
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="現在のパスワードを入力"
                  required
                  disabled={isChangingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isChangingPassword}
                >
                  {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                新しいパスワード
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="新しいパスワードを入力"
                  required
                  disabled={isChangingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isChangingPassword}
                >
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              
              {newPassword && (
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
                新しいパスワード（確認）
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="新しいパスワードを再入力"
                  required
                  disabled={isChangingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isChangingPassword}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <div className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle size={16} className="mr-1" />
                  パスワードが一致しません
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isChangingPassword || !passwordValidation.isValid || newPassword !== confirmPassword || !currentPassword}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="mr-2" size={20} />
              {isChangingPassword ? 'パスワード変更中...' : 'パスワードを変更'}
            </button>
          </form>
        </div>

        {/* セキュリティ情報 */}
        <div className="mb-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-blue-800">セキュリティのヒント</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 定期的にパスワードを変更してください</li>
            <li>• 他のサービスと同じパスワードを使用しないでください</li>
            <li>• 不審なアクティビティを発見した場合は、すぐにパスワードを変更してください</li>
            <li>• ログイン試行が5回失敗すると、30分間アカウントがロックされます</li>
          </ul>
        </div>

        {/* アクション */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            ログアウト
          </button>
          
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
