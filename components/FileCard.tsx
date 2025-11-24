import React, { useState } from 'react';
import { FileItem, FileType } from '../types';
import { Icons } from './Icons';
import { useFileSystem } from '../context/FileSystemContext';

interface FileCardProps {
  file: FileItem;
  onOpen: (file: FileItem) => void;
}

export const FileCard: React.FC<FileCardProps> = ({ file, onOpen }) => {
  const { deleteFile, restoreFile, permanentlyDeleteFile, selectedFileIds, toggleSelection } = useFileSystem();
  const [isHovered, setIsHovered] = useState(false);

  const isSelected = selectedFileIds.has(file.id);

  const handleCardClick = (e: React.MouseEvent) => {
    // If we are in selection mode (at least one selected), click toggles selection
    if (selectedFileIds.size > 0) {
      toggleSelection(file.id);
    } else {
      onOpen(file);
    }
  };

  const handleSelectionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSelection(file.id);
  };

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
      className={`group relative border rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer ${
        isSelected 
          ? 'bg-blue-900/30 border-blue-500 ring-1 ring-blue-500' 
          : 'bg-slate-800/40 border-slate-700/50 hover:border-slate-500 hover:shadow-purple-900/10'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Selection Checkbox */}
      <div 
        onClick={handleSelectionClick}
        className={`absolute top-2 right-2 z-10 w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
           isSelected 
             ? 'bg-blue-500 border-blue-500 scale-100' 
             : 'bg-black/40 border-white/50 hover:bg-black/60 scale-90 md:opacity-0 md:group-hover:opacity-100'
        }`}
      >
        {isSelected && <Icons.Check size={14} className="text-white" />}
      </div>

      {/* Thumbnail */}
      <div className="aspect-square w-full overflow-hidden relative">
        {renderThumbnail()}
        
        {/* Overlay Gradients */}
        <div className={`absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent transition-opacity duration-300 ${isSelected ? 'opacity-40' : 'opacity-0 group-hover:opacity-100'}`} />
        
        {/* Tag Badge */}
        {file.aiData?.tags && file.aiData.tags.length > 0 && !isSelected && (
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
            <h3 className={`text-sm font-medium truncate pr-2 ${isSelected ? 'text-blue-300' : 'text-slate-200'}`}>{file.name}</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {(file.size / 1024 / 1024).toFixed(2)} MB • {new Date(file.createdAt).toLocaleDateString()}
            </p>
          </div>
          
          {/* Action Menu (Visible on Hover and NOT Selected) */}
          {!isSelected && (
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
          )}
        </div>
      </div>
    </div>
  );
};