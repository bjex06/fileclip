import React from 'react';

export type SortDirection = 'ASC' | 'DESC' | null;
export type SortColumn = 'name' | 'size' | 'type' | 'created_at';

interface SortableHeaderProps {
  label: string;
  column: SortColumn;
  currentSort: SortColumn | null;
  currentDirection: SortDirection;
  onSort: (column: SortColumn, direction: SortDirection) => void;
  className?: string;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({
  label,
  column,
  currentSort,
  currentDirection,
  onSort,
  className = ''
}) => {
  const isActive = currentSort === column;

  const handleClick = () => {
    if (!isActive) {
      // 新しいカラムをクリックした場合は降順から開始
      onSort(column, 'DESC');
    } else if (currentDirection === 'DESC') {
      // 降順から昇順へ
      onSort(column, 'ASC');
    } else {
      // 昇順からソート解除
      onSort(column, null);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900 ${className}`}
    >
      {label}
      <span className={`text-xs ${isActive ? 'text-blue-500' : 'text-gray-400'}`}>
        {isActive && currentDirection === 'DESC' && '▼'}
        {isActive && currentDirection === 'ASC' && '▲'}
        {!isActive && '⇅'}
      </span>
    </button>
  );
};

export default SortableHeader;
