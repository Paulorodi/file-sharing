import React from 'react';
import { FileItem, FileType } from '../types';
import { Icons } from './Icons';
import { useFileSystem } from '../context/FileSystemContext';

interface FilePreviewProps {
  file: FileItem | null;
  onClose: () => void;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ file, onClose }) => {
  if (!file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 w-full max-w-5xl h-[85vh] rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-2xl border border-slate-800">
        
        {/* Left: Media Content */}
        <div className="flex-1 bg-black/50 relative flex items-center justify-center p-6">
          <button onClick={onClose} className="absolute top-4 left-4 p-2 bg-black/50 hover:bg-slate-800 text-white rounded-full backdrop-blur-md transition-colors">
            <Icons.Close size={20} />
          </button>

          {file.type === FileType.IMAGE && (
            <img src={file.url} alt={file.name} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
          )}
          {file.type === FileType.VIDEO && (
            <video src={file.url} controls className="max-w-full max-h-full rounded-lg shadow-lg" />
          )}
          {file.type === FileType.AUDIO && (
            <div className="bg-slate-800 p-8 rounded-2xl flex flex-col items-center">
              <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Icons.Music size={48} className="text-white" />
              </div>
              <audio src={file.url} controls className="w-64" />
            </div>
          )}
        </div>

        {/* Right: Info Panel */}
        <div className="w-full md:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-lg font-bold text-white break-words">{file.name}</h2>
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-xs uppercase font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded">{file.type}</span>
              <span className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Metadata Section (Was AI) */}
            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Icons.File className="text-purple-400" size={18} />
                  <h3 className="font-semibold text-slate-200">File Details</h3>
                </div>
              </div>

              {file.aiData ? (
                <div className="space-y-4 animate-in slide-in-from-bottom-2">
                  <div>
                    <p className="text-sm text-slate-300 italic leading-relaxed">"{file.aiData.description}"</p>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Type Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {file.aiData.tags.map(tag => (
                        <span key={tag} className="text-xs bg-slate-700/50 text-slate-300 border border-slate-600/50 px-2 py-1 rounded-md">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {file.aiData.categorySuggestion && (
                    <div className="bg-purple-900/20 border border-purple-500/20 p-3 rounded-lg">
                      <span className="text-xs text-purple-400 block mb-1">Category</span>
                      <span className="font-medium text-purple-200">{file.aiData.categorySuggestion}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                   <p className="text-sm text-slate-500">Local details available.</p>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div>
               <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">File Information</h4>
               <div className="space-y-3 text-sm">
                 <div className="flex justify-between">
                   <span className="text-slate-400">Created</span>
                   <span className="text-slate-200">{new Date(file.createdAt).toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-slate-400">Type</span>
                   <span className="text-slate-200">{file.mimeType}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-slate-400">Location</span>
                   <span className="text-slate-200">Local Storage</span>
                 </div>
               </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};