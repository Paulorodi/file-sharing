
import React, { useState } from 'react';
import { useFileSystem } from '../context/FileSystemContext';
import { Icons } from './Icons';

export const Sidebar: React.FC = () => {
  const { 
    folders, currentFolderId, setCurrentFolderId, 
    activeFilter, setActiveFilter, isSidebarOpen,
    createFolder, setShareModalOpen, userProfile, updateUserProfile,
    setShareModalMinimized, setShareViewMode
  } = useFileSystem();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(userProfile.name);

  // On mobile, we hide the sidebar completely in favor of the BottomNav
  if (!isSidebarOpen) return null;

  const handleCreateFolder = () => {
    const name = prompt("Enter folder name:");
    if (name) createFolder(name);
  };

  const handleSaveProfile = () => {
    updateUserProfile(editName, userProfile.avatar);
    setIsEditingProfile(false);
  };

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

  const NavItem = ({ icon: Icon, label, active, onClick, count, colorClass }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors duration-200 ${
        active 
          ? 'bg-blue-600 text-white shadow-md' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <Icon size={18} className={colorClass} />
      <span className="flex-1 text-left font-medium text-sm">{label}</span>
      {count !== undefined && <span className="text-xs opacity-60">{count}</span>}
    </button>
  );

  return (
    <div className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 flex-col h-full flex-shrink-0">
      
      {/* Brand */}
      <div className="p-6 flex items-center space-x-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-400 rounded-lg flex items-center justify-center">
          <Icons.Share className="text-white" size={20} />
        </div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-green-400">
          NeuroShare
        </h1>
      </div>

      {/* User Profile Card */}
      <div className="px-4 mb-4">
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
          <div className="flex items-center space-x-3">
            <div className="text-2xl bg-slate-700 rounded-full w-10 h-10 flex items-center justify-center select-none">
              {userProfile.avatar}
            </div>
            <div className="flex-1 min-w-0">
              {isEditingProfile ? (
                 <input 
                   value={editName}
                   onChange={(e) => setEditName(e.target.value)}
                   onBlur={handleSaveProfile}
                   onKeyDown={(e) => e.key === 'Enter' && handleSaveProfile()}
                   autoFocus
                   className="w-full bg-slate-900 border border-blue-500 rounded px-1 py-0.5 text-xs text-white outline-none"
                 />
              ) : (
                <div className="flex items-center justify-between group">
                  <p className="text-sm font-semibold text-slate-200 truncate">{userProfile.name}</p>
                  <button onClick={() => setIsEditingProfile(true)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-400">
                    <Icons.Edit size={12} />
                  </button>
                </div>
              )}
              <p className="text-[10px] text-green-400 flex items-center">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                Online
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-6">
        
        {/* Main Hub */}
        <div className="space-y-1">
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Transfer Hub</p>
          <NavItem 
            icon={Icons.Layout} 
            label="Dashboard" 
            active={activeFilter === 'dashboard'} 
            onClick={() => { setActiveFilter('dashboard'); setCurrentFolderId(null); }} 
          />
           <NavItem 
            icon={Icons.Share} 
            label="Connect & Share" 
            colorClass="text-green-400"
            onClick={handleOpenTransfer} 
          />
           <NavItem 
            icon={Icons.Chat} 
            label="Community Chat" 
            colorClass="text-blue-400"
            onClick={handleOpenChat} 
          />
          <NavItem 
            icon={Icons.History} 
            label="Transfer History" 
            active={activeFilter === 'history'} 
            onClick={() => { setActiveFilter('history'); setCurrentFolderId(null); }} 
          />
        </div>

        {/* File Manager */}
        <div className="space-y-1">
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">My Files</p>
          <NavItem 
            icon={Icons.Home} 
            label="All Files" 
            active={activeFilter === 'all' && !currentFolderId} 
            onClick={() => { setActiveFilter('all'); setCurrentFolderId(null); }} 
          />
          <NavItem 
            icon={Icons.Image} 
            label="Images" 
            active={activeFilter === 'images'} 
            onClick={() => { setActiveFilter('images'); setCurrentFolderId(null); }} 
          />
          <NavItem 
            icon={Icons.Video} 
            label="Videos" 
            active={activeFilter === 'videos'} 
            onClick={() => { setActiveFilter('videos'); setCurrentFolderId(null); }} 
          />
           <NavItem 
              icon={Icons.Folder} 
              label="Folders" 
              onClick={() => { setActiveFilter('all'); }} 
            />
        </div>

      </div>

      <div className="p-4 border-t border-slate-800">
        <button onClick={handleCreateFolder} className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-xs font-medium transition-colors">
           <Icons.Plus size={14} />
           <span>New Folder</span>
        </button>
      </div>
    </div>
  );
};
