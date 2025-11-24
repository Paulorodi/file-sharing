import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { FileItem, Folder, FileSystemContextType, FileType, SortOption, ViewMode, AIAnalysisData, UserProfile, TransferHistoryItem, ShareViewMode, ChatMessage } from '../types';
import { analyzeImageContent } from '../services/geminiService';
import { v4 as uuidv4 } from 'uuid';

// Helper for ID generation
const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36).substring(2, 5);

const FileSystemContext = createContext<FileSystemContextType | undefined>(undefined);

export const FileSystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // User Profile - Persistent Identity
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('neuro_user');
    if (saved) return JSON.parse(saved);

    const joinedAt = Date.now();
    const id = generateId();
    // Sequential-style name based on timestamp
    const name = `User ${joinedAt.toString().slice(-4)}`;
    
    const newProfile = {
      id,
      name,
      avatar: '👤',
      isAdmin: false,
      joinedAt
    };
    localStorage.setItem('neuro_user', JSON.stringify(newProfile));
    return newProfile;
  });

  const updateUserProfile = (name: string, avatar: string) => {
    const newProfile = { ...userProfile, name, avatar };
    setUserProfile(newProfile);
    localStorage.setItem('neuro_user', JSON.stringify(newProfile));
  };

  const enableAdminMode = useCallback(() => {
      const newProfile = { 
          ...userProfile, 
          isAdmin: true, 
          name: `Admin (${userProfile.name.replace('User ', '')})`, 
          avatar: '🛡️' 
      };
      setUserProfile(newProfile);
      localStorage.setItem('neuro_user', JSON.stringify(newProfile));
  }, [userProfile]);

  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([
    { id: 'documents', name: 'Documents' },
    { id: 'work', name: 'Work' },
    { id: 'personal', name: 'Personal' }
  ]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortOption, setSortOption] = useState<SortOption>('date');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Selection State
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  // Default to dashboard view
  const [activeFilter, setActiveFilter] = useState<'dashboard' | 'all' | 'images' | 'videos' | 'audio' | 'history'>('dashboard');
  
  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');

  // Share State
  const [isShareModalOpen, setShareModalOpen] = useState(false);
  const [isShareModalMinimized, setShareModalMinimized] = useState(false);
  const [shareViewMode, setShareViewMode] = useState<ShareViewMode>('transfer');
  const [transferHistory, setTransferHistory] = useState<TransferHistoryItem[]>([]);

  // Global Chat History Persistence
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
      try {
          const saved = localStorage.getItem('neuro_chat_history');
          return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
  });

  // Persist chat on change
  useEffect(() => {
      localStorage.setItem('neuro_chat_history', JSON.stringify(chatHistory));
  }, [chatHistory]);

  const addChatMessage = useCallback((msg: ChatMessage) => {
      setChatHistory(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
      });
  }, []);

  const deleteChatMessage = useCallback((msgId: string) => {
      setChatHistory(prev => prev.filter(msg => msg.id !== msgId));
  }, []);

  const syncChatHistory = useCallback((remoteMessages: ChatMessage[]) => {
      setChatHistory(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMessages = remoteMessages.filter(m => !existingIds.has(m.id));
          if (newMessages.length === 0) return prev;
          
          const combined = [...prev, ...newMessages].sort((a, b) => a.timestamp - b.timestamp);
          return combined;
      });
  }, []);

  // Keep track of created URLs for cleanup to prevent memory leaks
  const objectUrlsRef = useRef<Set<string>>(new Set());

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Revoke all URLs when the provider unmounts (app close/refresh)
      objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const detectFileType = (mime: string): FileType => {
    if (mime.startsWith('image/')) return FileType.IMAGE;
    if (mime.startsWith('video/')) return FileType.VIDEO;
    if (mime.startsWith('audio/')) return FileType.AUDIO;
    if (mime.includes('pdf') || mime.includes('text') || mime.includes('document')) return FileType.DOCUMENT;
    return FileType.OTHER;
  };

  const addReceivedFile = useCallback((fileBlob: Blob, meta: { name: string, type: string }) => {
    const url = URL.createObjectURL(fileBlob);
    objectUrlsRef.current.add(url);
    
    const newFile: FileItem = {
      id: generateId(),
      name: meta.name,
      type: detectFileType(meta.type),
      mimeType: meta.type,
      size: fileBlob.size,
      url: url,
      createdAt: Date.now(),
      folderId: null, // Received files go to root initially
      isDeleted: false,
      aiData: undefined
    };
    
    setFiles(prev => [newFile, ...prev]);
  }, []);

  const addToHistory = useCallback((item: TransferHistoryItem) => {
    setTransferHistory(prev => [item, ...prev]);
  }, []);

  // Selection Logic
  const toggleSelection = useCallback((id: string) => {
    setSelectedFileIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFileIds(new Set());
  }, []);

  const addFiles = useCallback(async (fileList: FileList) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    const allFiles = Array.from(fileList);
    const totalFiles = allFiles.length;
    const CHUNK_SIZE = 50; 
    
    let localFolders = [...folders];
    let foldersChanged = false;
    let newFilesAccumulator: FileItem[] = [];

    const processBatch = async (startIndex: number) => {
        const endIndex = Math.min(startIndex + CHUNK_SIZE, totalFiles);
        const chunk = allFiles.slice(startIndex, endIndex);

        const chunkItems = chunk.map(file => {
            let targetFolderId = currentFolderId;

            if (targetFolderId === null && file.webkitRelativePath) {
                const pathParts = file.webkitRelativePath.split('/');
                if (pathParts.length > 1) {
                    const rootFolderName = pathParts[0];
                    let folder = localFolders.find(f => f.name === rootFolderName);
                    if (!folder) {
                        folder = { id: generateId(), name: rootFolderName };
                        localFolders.push(folder);
                        foldersChanged = true;
                    }
                    targetFolderId = folder.id;
                }
            }

            const url = URL.createObjectURL(file);
            objectUrlsRef.current.add(url);

            return {
                id: generateId(),
                name: file.name,
                type: detectFileType(file.type),
                mimeType: file.type,
                size: file.size,
                url: url,
                createdAt: Date.now(),
                folderId: targetFolderId,
                isDeleted: false,
                aiData: undefined
            };
        });

        newFilesAccumulator.push(...chunkItems);
        
        const processed = endIndex;
        const percent = Math.round((processed / totalFiles) * 100);
        setUploadProgress(percent);
        setUploadStatus(`${processed} / ${totalFiles}`);

        await new Promise(resolve => setTimeout(resolve, 0));

        if (endIndex < totalFiles) {
            await processBatch(endIndex);
        }
    };

    try {
        await processBatch(0);
        if (foldersChanged) {
            setFolders(localFolders);
        }
        setFiles(prev => [...prev, ...newFilesAccumulator]);
    } catch (error) {
        console.error("Upload error:", error);
    } finally {
        setIsUploading(false);
        setUploadStatus('Complete');
        setTimeout(() => {
            setUploadStatus('');
            setUploadProgress(0);
        }, 3000);
    }

  }, [currentFolderId, folders]);

  const deleteFile = (fileId: string) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, isDeleted: true } : f));
    if (selectedFileIds.has(fileId)) {
        toggleSelection(fileId);
    }
  };

  const restoreFile = (fileId: string) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, isDeleted: false } : f));
  };

  const permanentlyDeleteFile = (fileId: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file) {
        URL.revokeObjectURL(file.url);
        objectUrlsRef.current.delete(file.url);
      }
      return prev.filter(f => f.id !== fileId);
    });
    if (selectedFileIds.has(fileId)) {
        toggleSelection(fileId);
    }
  };

  const createFolder = (name: string) => {
    setFolders(prev => [...prev, { id: generateId(), name }]);
  };

  const moveToFolder = (fileId: string, folderId: string | null) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, folderId } : f));
  };

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

  const analyzeFileWithAI = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file || file.type !== FileType.IMAGE) return;

    try {
      const data = await analyzeImageContent(file.url, file.mimeType);
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, aiData: data } : f));
    } catch (e) {
      console.error("Analysis failed", e);
    }
  };

  const analyzeAllFiles = async () => {
    const imagesToAnalyze = files.filter(f => f.type === FileType.IMAGE && !f.aiData && !f.isDeleted);
    for (const file of imagesToAnalyze) {
      await analyzeFileWithAI(file.id);
    }
  };

  return (
    <FileSystemContext.Provider value={{
      userProfile, updateUserProfile, enableAdminMode,
      files, folders, currentFolderId, searchQuery, viewMode, sortOption, isSidebarOpen, activeFilter,
      isUploading, uploadProgress, uploadStatus,
      isShareModalOpen, setShareModalOpen, addReceivedFile, transferHistory, addToHistory,
      isShareModalMinimized, setShareModalMinimized,
      shareViewMode, setShareViewMode,
      selectedFileIds, toggleSelection, clearSelection,
      chatHistory, addChatMessage, deleteChatMessage, syncChatHistory,
      addFiles, deleteFile, restoreFile, permanentlyDeleteFile, createFolder, moveToFolder,
      setSearchQuery, setCurrentFolderId, setViewMode, setSortOption, setActiveFilter, toggleSidebar,
      analyzeFileWithAI, analyzeAllFiles
    }}>
      {children}
    </FileSystemContext.Provider>
  );
};

export const useFileSystem = () => {
  const context = useContext(FileSystemContext);
  if (!context) throw new Error("useFileSystem must be used within a FileSystemProvider");
  return context;
};