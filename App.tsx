import React from 'react';
import { FileSystemProvider, useFileSystem } from './context/FileSystemContext';
import { Sidebar } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MainContent } from './components/MainContent';
import { SearchBar } from './components/SearchBar';
import { ShareModal } from './components/ShareModal';
import { Icons } from './components/Icons';

const Layout = () => {
  const { isSidebarOpen, isShareModalOpen } = useFileSystem();
  
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Global Header */}
        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 flex-shrink-0 z-30">
           {/* Mobile Menu Spacer or Breadcrumbs */}
           <div className="flex items-center">
             <div className="hidden md:block">
               <span className="text-sm text-slate-500">Local Storage / </span>
               <span className="text-sm font-medium text-slate-300">My Files</span>
             </div>
           </div>

           <div className="flex-1 max-w-xl mx-4">
             <SearchBar />
           </div>

           <div className="flex items-center space-x-3">
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-teal-400 flex items-center justify-center text-xs font-bold text-white cursor-pointer shadow-lg shadow-blue-500/20">
               US
             </div>
           </div>
        </header>

        <MainContent />
        
        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>

      {isShareModalOpen && <ShareModal />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <FileSystemProvider>
      <Layout />
    </FileSystemProvider>
  );
};

export default App;