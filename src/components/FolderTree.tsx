import React, { useState, useEffect, useCallback } from 'react';
import { fileSystemApi } from '../utils/fileSystemApi';
import { Folder } from '../types';

interface FolderTreeNode extends Folder {
  children?: FolderTreeNode[];
  isExpanded?: boolean;
  isLoading?: boolean;
}

interface FolderTreeProps {
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
}

const FolderTreeItem: React.FC<{
  node: FolderTreeNode;
  level: number;
  selectedFolderId: string | null;
  onSelect: (folderId: string | null) => void;
  onToggle: (folderId: string) => void;
}> = ({ node, level, selectedFolderId, onSelect, onToggle }) => {
  const isSelected = selectedFolderId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center py-1.5 px-2 cursor-pointer rounded transition-colors ${isSelected ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
          }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(node.id)}
      >
        {/* 展開/折りたたみボタン */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(node.id);
          }}
          className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 mr-1"
        >
          {node.isLoading ? (
            <span className="animate-spin text-xs">⟳</span>
          ) : hasChildren || !node.isExpanded ? (
            <span className="text-xs">
              {node.isExpanded ? '▼' : '▶'}
            </span>
          ) : (
            <span className="text-xs text-transparent">▶</span>
          )}
        </button>

        {/* フォルダアイコン */}
        <span className="mr-2">
          {node.isExpanded ? '📂' : '📁'}
        </span>

        {/* フォルダ名 */}
        <span className="truncate text-sm">{node.name}</span>
      </div>

      {/* 子フォルダ */}
      {node.isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FolderTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FolderTree: React.FC<FolderTreeProps> = ({ selectedFolderId, onSelectFolder }) => {
  const [rootFolders, setRootFolders] = useState<FolderTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [childrenCache, setChildrenCache] = useState<Map<string, FolderTreeNode[]>>(new Map());

  // ルートフォルダを読み込み
  useEffect(() => {
    const loadRootFolders = async () => {
      setLoading(true);
      try {
        const response = await fileSystemApi.getFolders();
        if (response.success && response.data) {
          setRootFolders(response.data.map(f => ({
            ...f,
            isExpanded: false,
            children: []
          })));
        }
      } catch (error) {
        console.error('Failed to load root folders:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRootFolders();
  }, []);

  // 子フォルダを読み込む関数
  const loadChildFolders = useCallback(async (parentId: string): Promise<FolderTreeNode[]> => {
    // キャッシュをチェック
    if (childrenCache.has(parentId)) {
      return childrenCache.get(parentId)!;
    }

    try {
      // APIにparent_idパラメータを渡して直接子フォルダを取得
      const response = await fileSystemApi.getFolders(parentId);
      if (response.success && response.data) {
        const children = response.data
          .map(f => ({
            ...f,
            isExpanded: false,
            children: []
          }));

        // キャッシュに保存
        setChildrenCache(prev => new Map(prev).set(parentId, children));
        return children;
      }
    } catch (error) {
      console.error('Failed to load child folders:', error);
    }
    return [];
  }, [childrenCache]);

  // フォルダの展開/折りたたみを切り替え
  const handleToggle = useCallback(async (folderId: string) => {
    const isExpanded = expandedFolders.has(folderId);

    if (!isExpanded) {
      // 展開する場合、子フォルダを読み込む
      setExpandedFolders(prev => new Set(prev).add(folderId));

      // ルートフォルダを更新して子フォルダをセット
      const children = await loadChildFolders(folderId);

      setRootFolders(prev => updateNodeInTree(prev, folderId, {
        isExpanded: true,
        children
      }));
    } else {
      // 折りたたむ
      setExpandedFolders(prev => {
        const newSet = new Set(prev);
        newSet.delete(folderId);
        return newSet;
      });

      setRootFolders(prev => updateNodeInTree(prev, folderId, {
        isExpanded: false
      }));
    }
  }, [expandedFolders, loadChildFolders]);

  // ツリー内のノードを更新するヘルパー関数
  const updateNodeInTree = (
    nodes: FolderTreeNode[],
    targetId: string,
    updates: Partial<FolderTreeNode>
  ): FolderTreeNode[] => {
    return nodes.map(node => {
      if (node.id === targetId) {
        return { ...node, ...updates };
      }
      if (node.children) {
        return {
          ...node,
          children: updateNodeInTree(node.children, targetId, updates)
        };
      }
      return node;
    });
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="h-6 bg-gray-200 rounded w-2/3 ml-4"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2 ml-4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-3 border-b bg-gray-50">
        <h3 className="font-medium text-gray-700 text-sm">フォルダ</h3>
      </div>
      <div className="py-2 max-h-[400px] overflow-y-auto">
        {/* ルートへのリンク */}
        <div
          className={`flex items-center py-1.5 px-3 cursor-pointer rounded mx-2 transition-colors ${selectedFolderId === null ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
            }`}
          onClick={() => onSelectFolder(null)}
        >
          <span className="mr-2">🏠</span>
          <span className="text-sm">ルート</span>
        </div>

        {/* フォルダツリー */}
        {rootFolders.length > 0 ? (
          rootFolders.map((folder) => (
            <FolderTreeItem
              key={folder.id}
              node={folder}
              level={0}
              selectedFolderId={selectedFolderId}
              onSelect={onSelectFolder}
              onToggle={handleToggle}
            />
          ))
        ) : (
          <div className="text-center py-4 text-gray-500 text-sm">
            フォルダがありません
          </div>
        )}
      </div>
    </div>
  );
};

export default FolderTree;
