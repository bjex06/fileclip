import React from 'react';
import { BreadcrumbItem } from '../types';

interface BreadcrumbProps {
  path: BreadcrumbItem[];
  onNavigate: (folderId: string | null) => void;
  loading?: boolean;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ path, onNavigate, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-400">
        <div className="animate-pulse flex items-center space-x-2">
          <div className="h-4 w-16 bg-gray-200 rounded"></div>
          <span>/</span>
          <div className="h-4 w-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (path.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-1 text-sm overflow-x-auto py-2">
      {path.map((item, index) => {
        const isLast = index === path.length - 1;

        return (
          <React.Fragment key={item.id || 'root'}>
            {index > 0 && (
              <span className="text-gray-400 mx-1">/</span>
            )}
            {isLast ? (
              <span className="font-medium text-gray-800 truncate max-w-[200px]">
                {item.name}
              </span>
            ) : (
              <button
                onClick={() => onNavigate(item.id)}
                className="text-blue-600 hover:text-blue-800 hover:underline truncate max-w-[150px] transition-colors"
                title={item.name}
              >
                {item.name}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
