import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import { FileSystemProvider } from './context/FileSystemContext';
import { AuthProvider } from './context/AuthContext';
import { PermissionProvider } from './context/PermissionContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import SecurityManager from './components/SecurityManager';
import { Toaster } from 'sonner';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SecurityManager />
        <PermissionProvider>
          <FileSystemProvider>
            {/* 通知システム - 最上位に配置して再レンダリングを防ぐ */}
            <Toaster
              position="top-right"
              expand={true}
              richColors
              duration={4000}
              toastOptions={{
                style: {
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  color: '#374151',
                },
              }}
            />

            <Routes>
              {/* パブリックルート（認証済みユーザーはダッシュボードにリダイレクト） */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />

              {/* プロテクトされたルート（認証が必要） */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* 設定ページ（管理者専用） */}
              <Route
                path="/settings"
                element={
                  <ProtectedRoute requireAdmin>
                    <Settings />
                  </ProtectedRoute>
                }
              />

              {/* 存在しないパスは自動的にダッシュボードにリダイレクト */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </FileSystemProvider>
        </PermissionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
