
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
  isAdmin?: boolean; // Admin privilege
  joinedAt?: number; // For persistent identity
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

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  isSystem?: boolean;
  isCommunity: boolean; // True for global chat, false for DM
}

export type ViewMode = 'grid' | 'list';
export type SortOption = 'name' | 'date' | 'size' | 'type';

// Strict Separation Mode
export type ShareViewMode = 'transfer' | 'chat';

export interface FileSystemContextType {
  userProfile: UserProfile;
  updateUserProfile: (name: string, avatar: string) => void;
  enableAdminMode: () => void;
  
  files: FileItem[];
  folders: Folder[];
  currentFolderId: string | null;
  searchQuery: string;
  viewMode: ViewMode;
  sortOption: SortOption;
  isSidebarOpen: boolean;
  activeFilter: 'dashboard' | 'all' | 'images' | 'videos' | 'audio' | 'history';
  
  // Selection State
  selectedFileIds: Set<string>;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  
  // Upload State
  isUploading: boolean;
  uploadProgress: number; 
  uploadStatus: string;   

  // Share State
  isShareModalOpen: boolean;
  isShareModalMinimized: boolean;
  shareViewMode: ShareViewMode; 
  setShareViewMode: (mode: ShareViewMode) => void;
  
  setShareModalOpen: (isOpen: boolean) => void;
  setShareModalMinimized: (isMinimized: boolean) => void;
  addReceivedFile: (fileBlob: Blob, meta: { name: string, type: string }) => void;
  transferHistory: TransferHistoryItem[];
  addToHistory: (item: TransferHistoryItem) => void;
  
  // Global Chat State
  chatHistory: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;
  deleteChatMessage: (msgId: string) => void;
  syncChatHistory: (remoteParams: ChatMessage[]) => void;
  
  // Auto Connect & Presence
  autoConnectId?: string | null;
  onlineUsers: Set<string>; // Set of User IDs currently online in cloud

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
