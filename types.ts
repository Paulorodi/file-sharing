export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  OTHER = 'other',
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string; // Emoji or URL
}

export interface AIAnalysisData {
  tags: string[];
  description: string;
  peopleCount?: number;
  dominantColors?: string[];
  categorySuggestion?: string;
  isProcessed: boolean;
}

export interface FileItem {
  id: string;
  name: string;
  type: FileType;
  mimeType: string;
  size: number;
  url: string; // Blob URL
  createdAt: number;
  folderId: string | null; // null means root
  isDeleted: boolean;
  aiData?: AIAnalysisData;
}

export interface Folder {
  id: string;
  name: string;
  icon?: string;
}

export interface TransferHistoryItem {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  timestamp: number;
  direction: 'sent' | 'received';
  peerName: string;
}

export type ViewMode = 'grid' | 'list';
export type SortOption = 'name' | 'date' | 'size' | 'type';

export interface FileSystemContextType {
  userProfile: UserProfile;
  updateUserProfile: (name: string, avatar: string) => void;
  
  files: FileItem[];
  folders: Folder[];
  currentFolderId: string | null;
  searchQuery: string;
  viewMode: ViewMode;
  sortOption: SortOption;
  isSidebarOpen: boolean;
  activeFilter: 'dashboard' | 'all' | 'images' | 'videos' | 'audio' | 'history';
  
  // Upload State
  isUploading: boolean;
  uploadProgress: number; 
  uploadStatus: string;   

  // Share State
  isShareModalOpen: boolean;
  setShareModalOpen: (isOpen: boolean) => void;
  addReceivedFile: (fileBlob: Blob, meta: { name: string, type: string }) => void;
  transferHistory: TransferHistoryItem[];
  addToHistory: (item: TransferHistoryItem) => void;

  // Actions
  addFiles: (files: FileList) => Promise<void>;
  deleteFile: (fileId: string) => void;
  restoreFile: (fileId: string) => void;
  permanentlyDeleteFile: (fileId: string) => void;
  createFolder: (name: string) => void;
  moveToFolder: (fileId: string, folderId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setCurrentFolderId: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setSortOption: (option: SortOption) => void;
  setActiveFilter: (filter: any) => void;
  toggleSidebar: () => void;
  analyzeFileWithAI: (fileId: string) => Promise<void>;
  analyzeAllFiles: () => Promise<void>;
}