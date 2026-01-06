import { useState, useCallback, DragEvent } from 'react';

export interface DragItem {
  type: 'file' | 'folder';
  id: string;
  name: string;
}

export interface DropTarget {
  type: 'folder';
  id: string | null; // null = ルートフォルダ
  name: string;
}

export interface UseDragAndDropReturn {
  draggedItem: DragItem | null;
  dropTarget: DropTarget | null;
  isDragging: boolean;
  isOver: boolean;

  // ドラッグ開始
  handleDragStart: (e: DragEvent, item: DragItem) => void;
  // ドラッグ終了
  handleDragEnd: () => void;
  // ドロップターゲットに入った
  handleDragEnter: (e: DragEvent, target: DropTarget) => void;
  // ドロップターゲットから出た
  handleDragLeave: (e: DragEvent) => void;
  // ドロップターゲット上を移動中
  handleDragOver: (e: DragEvent) => void;
  // ドロップ
  handleDrop: (e: DragEvent, target: DropTarget) => void;

  // ドロップコールバック設定
  onDrop: (callback: (item: DragItem, target: DropTarget) => void) => void;
}

export function useDragAndDrop(): UseDragAndDropReturn {
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const [dropCallback, setDropCallback] = useState<((item: DragItem, target: DropTarget) => void) | null>(null);

  const handleDragStart = useCallback((e: DragEvent, item: DragItem) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify(item));

    // ドラッグ画像をカスタマイズ（オプション）
    const dragImage = document.createElement('div');
    dragImage.className = 'bg-blue-500 text-white px-3 py-1 rounded shadow';
    dragImage.textContent = item.name;
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);

    // 次のフレームで削除
    requestAnimationFrame(() => {
      document.body.removeChild(dragImage);
    });

    setDraggedItem(item);
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDropTarget(null);
    setIsDragging(false);
    setIsOver(false);
  }, []);

  const handleDragEnter = useCallback((e: DragEvent, target: DropTarget) => {
    e.preventDefault();
    e.stopPropagation();

    // 自分自身にはドロップできない
    if (draggedItem && draggedItem.type === 'folder' && draggedItem.id === target.id) {
      return;
    }

    setDropTarget(target);
    setIsOver(true);
  }, [draggedItem]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 子要素への移動は無視
    const relatedTarget = e.relatedTarget as Node | null;
    if (relatedTarget && (e.currentTarget as Element).contains(relatedTarget)) {
      return;
    }

    setIsOver(false);
    setDropTarget(null);
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: DragEvent, target: DropTarget) => {
    e.preventDefault();
    e.stopPropagation();

    const data = e.dataTransfer.getData('application/json');
    if (!data) return;

    try {
      const item = JSON.parse(data) as DragItem;

      // 自分自身にはドロップできない
      if (item.type === 'folder' && item.id === target.id) {
        return;
      }

      // コールバックを実行
      if (dropCallback) {
        dropCallback(item, target);
      }
    } catch (error) {
      console.error('Failed to parse drag data:', error);
    }

    setDraggedItem(null);
    setDropTarget(null);
    setIsDragging(false);
    setIsOver(false);
  }, [dropCallback]);

  const onDrop = useCallback((callback: (item: DragItem, target: DropTarget) => void) => {
    setDropCallback(() => callback);
  }, []);

  return {
    draggedItem,
    dropTarget,
    isDragging,
    isOver,
    handleDragStart,
    handleDragEnd,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    onDrop
  };
}

export default useDragAndDrop;
