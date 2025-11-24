
import React, { useState, useRef, useEffect } from 'react';
import { useFileSystem } from '../context/FileSystemContext';
import { FileCard } from './FileCard';
import { FilePreview } from './FilePreview';
import { Icons } from './Icons';
import { FileItem } from '../types';

export const MainContent: React.FC = () => {
  const { 
    files, searchQuery, activeFilter, currentFolderId, 
    addFiles, toggleSidebar, folders, userProfile,
    isUploading, uploadProgress, uploadStatus, 
    setShareModalOpen, transferHistory, setActiveFilter,
    setShareModalMinimized, setShareViewMode,
    selectedFileIds, clearSelection, deleteFile
  } = useFileSystem();
  
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [visibleCount, setVisibleCount] = useState(50);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleOpenTransfer = () => {
      setShareModalOpen(true);
      setShareModalMinimized(false);
      setShareViewMode('transfer');
  };

  const handleShareSelected = () => {
    setShareModalOpen(true);
    setShareModalMinimized(false);
    setShareViewMode('transfer');
  };

  const handleDeleteSelected = () => {
    if (confirm(`Delete ${selectedFileIds.size} files?`)) {
      selectedFileIds.forEach(id => deleteFile(id));
      clearSelection();
    }
  };

  // Filter Logic
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeFilter === 'dashboard') return true; 
    if (activeFilter === 'history') return false; 

    if (currentFolderId) return file.folderId === currentFolderId && matchesSearch;

    switch (activeFilter) {
      case 'images': return file.type === 'image' && matchesSearch;
      case 'videos': return file.type === 'video' && matchesSearch;
      case 'audio': return file.type === 'audio' && matchesSearch;
      case 'all': default: return !file.isDeleted && matchesSearch;
    }
  });

  // Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisibleCount(p => p + 50);
      }, { rootMargin: '100px' }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [filteredFiles.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) addFiles(e.target.files);
    e.target.value = '';
  };

  const folderName = currentFolderId ? folders.find(f => f.id === currentFolderId)?.name : 
                     activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1);

  // --- DASHBOARD VIEW ---
  if (activeFilter === 'dashboard') {
      const recentFiles = files.filter(f => !f.isDeleted).sort((a,b) => b.createdAt - a.createdAt).slice(0, 8);

      return (
        <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto p-6 scroll-smooth pb-24 relative">
           {/* Header */}
           <div className="flex justify-between items-center mb-8">
               <div>
                   <h1 className="text-2xl font-bold text-white">Welcome, {userProfile.name}</h1>
                   <p className="text-slate-400 text-sm mt-1">Ready to share files today?</p>
               </div>
               <button onClick={toggleSidebar} className="hidden lg:block text-slate-400"><Icons.Layout /></button>
           </div>

           {/* Quick Actions */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
               {/* Send Card */}
               <div onClick={handleOpenTransfer} className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 cursor-pointer hover:shadow-2xl hover:shadow-blue-500/20 transition-all transform hover:-translate-y-1 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
                       <Icons.Send size={80} />
                   </div>
                   <div className="relative z-10">
                       <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                           <Icons.Send className="text-white" size={24} />
                       </div>
                       <h2 className="text-xl font-bold text-white">Send Files</h2>
                       <p className="text-blue-100 text-sm mt-1 opacity-80">Transfer to another device</p>
                   </div>
               </div>

               {/* Receive Card */}
               <div onClick={handleOpenTransfer} className="bg-gradient-to-br from-green-600 to-emerald-800 rounded-2xl p-6 cursor-pointer hover:shadow-2xl hover:shadow-green-500/20 transition-all transform hover:-translate-y-1 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
                       <Icons.Download size={80} />
                   </div>
                   <div className="relative z-10">
                       <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                           <Icons.Download className="text-white" size={24} />
                       </div>
                       <h2 className="text-xl font-bold text-white">Receive</h2>
                       <p className="text-green-100 text-sm mt-1 opacity-80">Ready to accept files</p>
                   </div>
               </div>

                {/* Storage Stats */}
               <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                   <h3 className="text-slate-200 font-semibold mb-4 flex items-center">
                       <Icons.Folder className="mr-2 text-purple-400" size={18} /> Storage
                   </h3>
                   <div className="space-y-4">
                       <div>
                           <div className="flex justify-between text-xs text-slate-400 mb-1">
                               <span>Images</span>
                               <span>{files.filter(f => f.type === 'image').length} Files</span>
                           </div>
                           <div className="w-full bg-slate-800 h-2 rounded-full"><div className="bg-purple-500 h-full rounded-full" style={{width: '45%'}}></div></div>
                       </div>
                       <div>
                           <div className="flex justify-between text-xs text-slate-400 mb-1">
                               <span>Videos</span>
                               <span>{files.filter(f => f.type === 'video').length} Files</span>
                           </div>
                           <div className="w-full bg-slate-800 h-2 rounded-full"><div className="bg-pink-500 h-full rounded-full" style={{width: '30%'}}></div></div>
                       </div>
                   </div>
               </div>
           </div>

           {/* Recent Files */}
           <div className="mb-8">
               <div className="flex justify-between items-center mb-4">
                   <h3 className="text-lg font-bold text-slate-200">Recently Added</h3>
                   <button onClick={() => setActiveFilter('all')} className="text-blue-400 text-sm hover:underline">View All</button>
               </div>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   {recentFiles.map(file => (
                       <FileCard key={file.id} file={file} onOpen={setSelectedFile} />
                   ))}
                   {recentFiles.length === 0 && (
                       <div className="col-span-4 py-8 text-center text-slate-500 bg-slate-900/50 rounded-xl border-dashed border border-slate-800">
                           No files yet. Start by uploading!
                       </div>
                   )}
               </div>
           </div>

           {/* Hidden Inputs for Upload */}
           <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
           
           {/* Floating Action Bar for Selection in Grid View */}
           {selectedFileIds.size > 0 && (
               <div className="fixed bottom-20 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-96 bg-slate-800 border border-slate-700 p-3 rounded-2xl shadow-2xl flex items-center justify-between z-50 animate-in slide-in-from-bottom-6">
                   <div className="flex items-center px-2">
                       <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full mr-2">{selectedFileIds.size}</span>
                       <span className="text-sm font-medium text-slate-200">Selected</span>
                   </div>
                   <div className="flex space-x-2">
                       <button onClick={clearSelection} className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors" title="Cancel">
                           <Icons.Close size={18} />
                       </button>
                       <button onClick={handleDeleteSelected} className="flex items-center px-3 py-2 bg-slate-700 hover:bg-red-500/20 text-slate-300 hover:text-red-400 rounded-xl transition-colors text-xs font-bold">
                           <Icons.Trash size={16} className="mr-1" /> Delete
                       </button>
                       <button onClick={handleShareSelected} className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors text-xs font-bold shadow-lg shadow-blue-900/20">
                           <Icons.Share size={16} className="mr-1" /> Share
                       </button>
                   </div>
               </div>
           )}

           {isUploading && (
             <div className="fixed bottom-24 right-6 z-50 bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-2xl w-80 animate-in slide-in-from-bottom-5">
               <div className="flex justify-between mb-2 text-sm text-slate-200"><span>Uploading...</span><span>{uploadStatus}</span></div>
               <div className="w-full bg-slate-700 h-2 rounded-full"><div className="bg-blue-500 h-full transition-all" style={{ width: `${uploadProgress}%` }} /></div>
             </div>
           )}
           {selectedFile && <FilePreview file={selectedFile} onClose={() => setSelectedFile(null)} />}
        </div>
      );
  }

  // --- HISTORY VIEW ---
  if (activeFilter === 'history') {
      return (
          <div className="flex-1 bg-slate-950 p-6 overflow-y-auto pb-24">
              <h2 className="text-2xl font-bold text-white mb-6">Transfer History</h2>
              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                  {transferHistory.length === 0 ? (
                      <div className="p-10 text-center text-slate-500">No transfers yet.</div>
                  ) : (
                      <div className="overflow-x-auto">
                          <table className="w-full text-left">
                              <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                                  <tr>
                                      <th className="px-6 py-4">File Name</th>
                                      <th className="px-6 py-4">Direction</th>
                                      <th className="px-6 py-4">Peer</th>
                                      <th className="px-6 py-4">Size</th>
                                      <th className="px-6 py-4">Time</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800 text-sm text-slate-300">
                                  {transferHistory.map(item => (
                                      <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                                          <td className="px-6 py-4 font-medium max-w-[150px] truncate">{item.fileName}</td>
                                          <td className="px-6 py-4">
                                              {item.direction === 'sent' ? (
                                                  <span className="flex items-center text-blue-400"><Icons.Send size={14} className="mr-2"/> Sent</span>
                                              ) : (
                                                  <span className="flex items-center text-green-400"><Icons.Download size={14} className="mr-2"/> Received</span>
                                              )}
                                          </td>
                                          <td className="px-6 py-4">{item.peerName}</td>
                                          <td className="px-6 py-4">{(item.fileSize / 1024 / 1024).toFixed(2)} MB</td>
                                          <td className="px-6 py-4 text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  )}
              </div>
          </div>
      )
  }

  // --- FILE MANAGER VIEW (Default) ---
  const displayedFiles = filteredFiles.slice(0, visibleCount);
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative">
      <div className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center space-x-4">
          <button onClick={toggleSidebar} className="text-slate-400 lg:hidden"><Icons.Layout size={20} /></button>
          <h2 className="text-lg font-semibold text-slate-200">{folderName}</h2>
          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full">{filteredFiles.length} items</span>
        </div>
        <div className="flex items-center space-x-3">
             <button onClick={() => fileInputRef.current?.click()} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors shadow-lg">
                <Icons.Upload size={18} /><span className="text-sm font-medium">Add Files</span>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scroll-smooth pb-24">
        {displayedFiles.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
            <Icons.Folder size={64} className="mb-4 text-slate-700" />
            <p>No files found in this category.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {displayedFiles.map(file => <FileCard key={file.id} file={file} onOpen={setSelectedFile} />)}
            </div>
            {displayedFiles.length < filteredFiles.length && <div ref={loadMoreRef} className="h-20" />}
            <div className="h-20"></div>
          </>
        )}
      </div>
      
       {/* Floating Action Bar for Selection in Grid View */}
       {selectedFileIds.size > 0 && (
           <div className="fixed bottom-20 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-96 bg-slate-800 border border-slate-700 p-3 rounded-2xl shadow-2xl flex items-center justify-between z-50 animate-in slide-in-from-bottom-6">
               <div className="flex items-center px-2">
                   <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full mr-2">{selectedFileIds.size}</span>
                   <span className="text-sm font-medium text-slate-200">Selected</span>
               </div>
               <div className="flex space-x-2">
                   <button onClick={clearSelection} className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors" title="Cancel">
                       <Icons.Close size={18} />
                   </button>
                   <button onClick={handleDeleteSelected} className="flex items-center px-3 py-2 bg-slate-700 hover:bg-red-500/20 text-slate-300 hover:text-red-400 rounded-xl transition-colors text-xs font-bold">
                       <Icons.Trash size={16} className="mr-1" /> Delete
                   </button>
                   <button onClick={handleShareSelected} className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors text-xs font-bold shadow-lg shadow-blue-900/20">
                       <Icons.Share size={16} className="mr-1" /> Share
                   </button>
               </div>
           </div>
       )}

      {selectedFile && <FilePreview file={selectedFile} onClose={() => setSelectedFile(null)} />}
    </div>
  );
};
