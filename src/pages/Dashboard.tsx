import React from 'react';
import FileManager from '../components/FileManager';
import { useAuth } from '../context/AuthContext';

const Dashboard: React.FC = () => {
  const { session } = useAuth();
  
  if (!session) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gray-100">
      <FileManager />
    </div>
  );
};

export default Dashboard;