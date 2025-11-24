import React, { useState } from 'react';
import { FileItem, FileType } from '../types';
import { Icons } from './Icons';
import { useFileSystem } from '../context/FileSystemContext';

interface FileCardProps {
  file: FileItem;
  onOpen: (file: FileItem) => void;
}

export const FileCard: React.FC<FileCardProps> = ({ file, onOpen }) => {
  const { deleteFile, restoreFile, permanentlyDeleteFile } = useFileSystem();
  const [isHovered, setIsHovered] = useState(false);

  const renderThumbnail = () => {
    if (file.type === FileType.IMAGE) {
      return <img src={file.url} alt={file.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />;
    }
    if (file.type === FileType.VIDEO) {
      return (
        <div className="w-full h-full bg-slate-800 flex items-center justify-center relative overflow-hidden">
          <video src={file.url} className="w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full">
              <Icons.Video className="text-white" size={24} />
            </div>
          </div>
        </div>
      );
    }
    if (file.type === FileType.AUDIO) {
      return (
        <div className="w-full h-full bg-gradient-to-br from-pink-500/20 to-orange-500/20 flex items-center justify-center">
          <Icons.Music className="text-orange-400" size={40} />
        </div>
      );
    }
    return (
      <div className="w-full h-full bg-slate-800 flex items-center justify-center">
        <Icons.File className="text-slate-500" size={40} />
      </div>
    );
  };

  return (
    <div 
      className="group relative bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden hover:border-slate-500 transition-all duration-300 hover:shadow-xl hover:shadow-purple-900/10 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onOpen(file)}
    >
      {/* Thumbnail */}
      <div className="aspect-square w-full overflow-hidden relative">
        {renderThumbnail()}
        
        {/* Overlay Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Tag Badge */}
        {file.aiData?.tags && file.aiData.tags.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
             <span className="bg-purple-500/80 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded-full font-medium shadow-sm">
               {file.aiData.categorySuggestion || 'Local'}
             </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-slate-200 truncate pr-2">{file.name}</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {(file.size / 1024 / 1024).toFixed(2)} MB • {new Date(file.createdAt).toLocaleDateString()}
            </p>
          </div>
          
          {/* Action Menu (Visible on Hover) */}
          <div className={`flex items-center space-x-1 ${isHovered ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
             {file.isDeleted ? (
               <>
                 <button onClick={(e) => { e.stopPropagation(); restoreFile(file.id); }} className="p-1.5 hover:bg-green-500/20 text-green-400 rounded-lg">
                   <Icons.Refresh size={14} />
                 </button>
                 <button onClick={(e) => { e.stopPropagation(); permanentlyDeleteFile(file.id); }} className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg">
                   <Icons.Trash size={14} />
                 </button>
               </>
             ) : (
                <button onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }} className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-red-400 rounded-lg">
                  <Icons.Trash size={14} />
                </button>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};