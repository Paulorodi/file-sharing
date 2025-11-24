
import React from 'react';
import { useFileSystem } from '../context/FileSystemContext';
import { Icons } from './Icons';

export const MobileBottomNav: React.FC = () => {
  const { 
    activeFilter, setActiveFilter, 
    setShareModalOpen, setShareModalMinimized, 
    currentFolderId, setCurrentFolderId,
    setShareViewMode, isShareModalOpen, shareViewMode
  } = useFileSystem();

  const handleOpenTransfer = () => {
      setShareModalOpen(true);
      setShareModalMinimized(false);
      setShareViewMode('transfer');
  };

  const handleOpenChat = () => {
      setShareModalOpen(true);
      setShareModalMinimized(false);
      setShareViewMode('chat');
  };

  const NavItem = ({ icon: Icon, label, isActive, onClick, isAction = false }: any) => (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full py-2 transition-all duration-200 ${
        isAction ? '-mt-6' : ''
      }`}
    >
      <div
        className={`flex items-center justify-center rounded-2xl transition-all duration-200 ${
          isAction
            ? 'w-14 h-14 bg-blue-600 shadow-lg shadow-blue-900/50 text-white mb-1'
            : isActive
            ? 'w-10 h-8 bg-slate-800 text-blue-400 mb-1'
            : 'w-10 h-8 text-slate-500 mb-1'
        }`}
      >
        <Icon size={isAction ? 24 : 20} />
      </div>
      <span
        className={`text-[10px] font-medium ${
          isActive ? 'text-blue-400' : 'text-slate-500'
        }`}
      >
        {label}
      </span>
    </button>
  );

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 h-16 z-40 flex items-center justify-around px-2 pb-safe">
      <NavItem
        icon={Icons.Layout}
        label="Home"
        isActive={activeFilter === 'dashboard' && !isShareModalOpen}
        onClick={() => {
          setShareModalOpen(false);
          setActiveFilter('dashboard');
          setCurrentFolderId(null);
        }}
      />
      <NavItem
        icon={Icons.Folder}
        label="Files"
        isActive={!isShareModalOpen && (activeFilter === 'all' || activeFilter === 'images' || activeFilter === 'videos' || !!currentFolderId)}
        onClick={() => {
          setShareModalOpen(false);
          setActiveFilter('all');
          setCurrentFolderId(null);
        }}
      />
      
      {/* Transfer Button */}
      <NavItem
        icon={Icons.Share}
        label="Share"
        isAction={true}
        isActive={isShareModalOpen && shareViewMode === 'transfer'}
        onClick={handleOpenTransfer}
      />

      <NavItem
        icon={Icons.History}
        label="History"
        isActive={!isShareModalOpen && activeFilter === 'history'}
        onClick={() => {
            setShareModalOpen(false);
            setActiveFilter('history');
            setCurrentFolderId(null);
        }}
      />
      
      {/* Chat Button */}
      <NavItem
        icon={Icons.Chat}
        label="Chat"
        isActive={isShareModalOpen && shareViewMode === 'chat'}
        onClick={handleOpenChat}
      />
    </div>
  );
};
