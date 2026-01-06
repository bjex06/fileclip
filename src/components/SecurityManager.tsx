import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { sessionStorage, verifyToken } from '../utils/auth';

// セッション管理とセキュリティ機能を提供するコンポーネント
const SecurityManager: React.FC = () => {
  const { session, refreshSession, signOut } = useAuth();
  const lastActivityRef = useRef<number>(Date.now());
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30分の非アクティブでタイムアウト
  const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5分ごとにセッションチェック

  // ユーザーアクティビティを記録
  const updateActivity = () => {
    lastActivityRef.current = Date.now();
    resetInactivityTimeout();
  };

  // 非アクティブタイムアウトをリセット
  const resetInactivityTimeout = () => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    if (session) {
      inactivityTimeoutRef.current = setTimeout(() => {
        handleInactivityTimeout();
      }, INACTIVITY_TIMEOUT);
    }
  };

  // 非アクティブタイムアウト処理
  const handleInactivityTimeout = async () => {
    console.log('セッションが非アクティブのためタイムアウトしました');
    await signOut();
  };

  // セッション有効性チェック
  const checkSessionValidity = () => {
    const token = sessionStorage.getToken();
    if (token) {
      const user = verifyToken(token);
      if (!user) {
        console.log('セッショントークンが無効になりました');
        signOut();
      }
    }
  };

  // ブラウザタブの可視性変更を監視
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      updateActivity();
      checkSessionValidity();
    }
  };

  // ページを離れる前の確認（未保存の変更がある場合など）
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    // 実際のアプリケーションでは、未保存の変更がある場合のみ確認
    // event.preventDefault();
    // event.returnValue = '';
  };

  useEffect(() => {
    if (session) {
      // アクティビティリスナーを設定
      const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      
      activityEvents.forEach(event => {
        document.addEventListener(event, updateActivity, { passive: true });
      });

      // ページ可視性変更リスナー
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // ページ離脱前リスナー
      window.addEventListener('beforeunload', handleBeforeUnload);

      // 定期的なセッションチェック
      sessionCheckIntervalRef.current = setInterval(checkSessionValidity, SESSION_CHECK_INTERVAL);

      // 初期タイムアウト設定
      resetInactivityTimeout();

      return () => {
        // クリーンアップ
        activityEvents.forEach(event => {
          document.removeEventListener(event, updateActivity);
        });

        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);

        if (sessionCheckIntervalRef.current) {
          clearInterval(sessionCheckIntervalRef.current);
        }

        if (inactivityTimeoutRef.current) {
          clearTimeout(inactivityTimeoutRef.current);
        }
      };
    }
  }, [session]);

  return null; // このコンポーネントはUIを持たない
};

export default SecurityManager;
