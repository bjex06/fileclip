import React, { useEffect, useRef, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  divider?: boolean;
  danger?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // メニュー位置を計算（クリック位置のすぐ近くに表示）
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 8;

      let adjustedX = x;
      let adjustedY = y;

      // 右端を超える場合、クリック位置の左側に表示
      if (x + rect.width > viewportWidth - padding) {
        adjustedX = Math.max(padding, x - rect.width);
      }

      // 下端を超える場合、クリック位置の上側に表示
      if (y + rect.height > viewportHeight - padding) {
        adjustedY = Math.max(padding, y - rect.height);
      }

      setPosition({ x: adjustedX, y: adjustedY });
      setIsVisible(true);
    }
  }, [x, y]);

  const menuContent = (
    <div
      ref={menuRef}
      className={`fixed z-[9999] bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200/60 py-2 min-w-[160px] transition-opacity duration-100 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        pointerEvents: 'auto'
      }}
    >
      {items.map((item, index) => {
        if (item.divider) {
          return <div key={index} className="border-t border-gray-100 my-1 mx-2" />;
        }

        return (
          <button
            key={index}
            onClick={() => {
              if (!item.disabled) {
                item.onClick();
                onClose();
              }
            }}
            disabled={item.disabled}
            className={`w-full px-3 py-2 text-left flex items-center gap-2.5 transition-all duration-100 ${
              item.disabled
                ? 'text-gray-400 cursor-not-allowed opacity-50'
                : item.danger
                ? 'text-red-600 hover:bg-red-50'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {item.icon && (
              <span className={`w-4 h-4 flex items-center justify-center ${
                item.danger ? 'text-red-500' : 'text-gray-500'
              }`}>
                {item.icon}
              </span>
            )}
            <span className="text-sm">{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  // Portalを使用してbody直下にレンダリング
  return createPortal(menuContent, document.body);
};

export default ContextMenu;
