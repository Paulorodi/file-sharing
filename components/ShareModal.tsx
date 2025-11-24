import React, { useState, useEffect, useRef } from 'react';
import { Peer, DataConnection } from 'peerjs';
import { useFileSystem } from '../context/FileSystemContext';
import { Icons } from './Icons';
import { FileItem, ChatMessage } from '../types';
import QRCode from 'qrcode';
import jsQR from 'jsqr';

// --- Types ---
interface ConnectedPeer {
  id: string;
  name: string;
  conn: DataConnection;
  unread: number;
}

interface TransferProgress {
  id: string;
  fileName: string;
  progress: number;
  status: 'sending' | 'receiving' | 'completed' | 'error';
  speed: string; 
  totalSize: number;
  transferred: number;
  peerId: string;
}

const ADMIN_CODE = "admin-39892909";

export const ShareModal: React.FC = () => {
  const { 
      setShareModalOpen, files, addReceivedFile, userProfile, addToHistory, 
      isShareModalMinimized, setShareModalMinimized,
      shareViewMode, selectedFileIds, toggleSelection, clearSelection,
      chatHistory, addChatMessage, deleteChatMessage, syncChatHistory,
      enableAdminMode
  } = useFileSystem();
  
  // --- State ---
  const [transferTab, setTransferTab] = useState<'dashboard' | 'scanner' | 'files'>('dashboard');
  
  // Peers & Chat
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [peers, setPeers] = useState<ConnectedPeer[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>('community');
  const [dmMessages, setDmMessages] = useState<Record<string, ChatMessage[]>>({});
  const [textInput, setTextInput] = useState('');

  // Transfers
  const [transfers, setTransfers] = useState<TransferProgress[]>([]);
  
  // Connection Status
  const [connectionStatus, setConnectionStatus] = useState('Offline');
  const [connectIdInput, setConnectIdInput] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const connectionsMap = useRef<Map<string, DataConnection>>(new Map());

  // Auto-Reconnect Logic
  const saveKnownPeer = (id: string, name: string) => {
      const known = JSON.parse(localStorage.getItem('neuro_known_peers') || '[]');
      if (!known.some((p: any) => p.id === id)) {
          known.push({ id, name, lastSeen: Date.now() });
          localStorage.setItem('neuro_known_peers', JSON.stringify(known));
      }
  };

  const connectToKnownPeers = () => {
      const known = JSON.parse(localStorage.getItem('neuro_known_peers') || '[]');
      known.forEach((p: any) => {
          if (p.id !== myPeerId && !connectionsMap.current.has(p.id)) {
              console.log("Auto-reconnecting to:", p.name);
              connectToPeer(p.id);
          }
      });
  };

  // Initialize Tab based on Selection
  useEffect(() => {
    if (shareViewMode === 'transfer' && selectedFileIds.size > 0) {
        setTransferTab('files');
    }
  }, [shareViewMode, selectedFileIds.size]);

  // Initialize PeerJS
  useEffect(() => {
    const initPeer = async () => {
      try {
        const PeerClass = (window as any).Peer || Peer;
        if (!PeerClass) { setConnectionStatus("PeerJS Missing"); return; }
        
        // Persistent Peer ID if possible (User ID), otherwise random
        // Using random for PeerJS cloud reliability, but could use userProfile.id if custom server
        const id = Math.random().toString(36).substring(2, 8).toUpperCase();
        const peer = new PeerClass(id, { debug: 1 });

        peer.on('open', (id: string) => {
          setMyPeerId(id);
          setConnectionStatus('Online');
          QRCode.toDataURL(JSON.stringify({id, name: userProfile.name})).then(setQrCodeUrl);
          
          // Try to auto-connect to previous peers after a short delay
          setTimeout(connectToKnownPeers, 1000);
        });

        peer.on('connection', handleNewConnection);
        peer.on('error', (err: any) => console.error("Peer Error", err));
        peerRef.current = peer;
      } catch (e) { console.error(e); }
    };

    initPeer();
    return () => {
      if (peerRef.current) peerRef.current.destroy();
      stopScanner();
    };
  }, []);

  // --- Logic ---
  const handleNewConnection = (conn: DataConnection) => {
      conn.on('open', () => {
          conn.send({ 
              type: 'handshake', 
              name: userProfile.name, 
              id: myPeerId,
              chatHistory: chatHistory 
          });
      });
      conn.on('data', (data: any) => handleIncomingData(conn, data));
      conn.on('close', () => removePeer(conn.peer));
      connectionsMap.current.set(conn.peer, conn);
  };

  const removePeer = (peerId: string) => {
      connectionsMap.current.delete(peerId);
      setPeers(prev => prev.filter(p => p.id !== peerId));
  };

  const handleIncomingData = (conn: DataConnection, data: any) => {
      const peerId = conn.peer;
      
      if (data.type === 'handshake') {
          const newPeer = { id: data.id || peerId, name: data.name || 'Unknown', conn, unread: 0 };
          setPeers(prev => prev.find(p => p.id === newPeer.id) ? prev : [...prev, newPeer]);
          
          // Save to known peers for next time
          saveKnownPeer(data.id || peerId, data.name || 'Unknown');

          // Sync Protocol
          if (data.chatHistory && Array.isArray(data.chatHistory)) {
              syncChatHistory(data.chatHistory);
          }
      } 
      else if (data.type === 'chat') {
          const msg: ChatMessage = {
              id: data.id,
              senderId: data.senderId,
              senderName: data.senderName,
              content: data.content,
              timestamp: data.timestamp,
              isCommunity: data.isCommunity
          };

          if (data.isCommunity) {
              addChatMessage(msg); 
          } else {
              setDmMessages(prev => ({ ...prev, [peerId]: [...(prev[peerId] || []), msg] }));
          }
      }
      else if (data.type === 'delete-message') {
          deleteChatMessage(data.messageId);
      }
      else if (data.type === 'file-transfer') {
          addReceivedFile(new Blob([data.file]), { name: data.meta.name, type: data.meta.type });
          setTransfers(prev => [...prev, { id: Date.now().toString(), fileName: data.meta.name, progress: 100, status: 'completed', speed: 'Done', totalSize: data.file.size, transferred: data.file.size, peerId }]);
      }
  };

  const connectToPeer = (id: string) => {
      if (!peerRef.current || !id || connectionsMap.current.has(id)) return;
      handleNewConnection(peerRef.current.connect(id));
  };

  const sendMessage = () => {
      if (!textInput.trim()) return;

      // --- ADMIN CHECK ---
      if (textInput === ADMIN_CODE) {
          enableAdminMode();
          alert("Admin Mode Activated");
          setTextInput('');
          return;
      }

      const timestamp = Date.now();
      const msgId = Math.random().toString(36).substring(2) + Date.now();
      
      const msg: ChatMessage = { 
          id: msgId, 
          senderId: myPeerId || 'me', 
          senderName: userProfile.name, 
          content: textInput, 
          timestamp,
          isCommunity: activeChatId === 'community'
      };

      if (activeChatId === 'community') {
          addChatMessage(msg); 
          peers.forEach(p => p.conn.send({ type: 'chat', ...msg }));
      } else {
          setDmMessages(prev => ({ ...prev, [activeChatId]: [...(prev[activeChatId] || []), msg] }));
          const target = peers.find(p => p.id === activeChatId);
          if(target) target.conn.send({ type: 'chat', ...msg });
      }
      setTextInput('');
  };

  const handleDeleteMessage = (msgId: string) => {
      if (!userProfile.isAdmin) return;
      if (confirm("Delete this message for everyone?")) {
          deleteChatMessage(msgId); 
          peers.forEach(p => p.conn.send({ type: 'delete-message', messageId: msgId }));
      }
  };

  const sendSelectedFiles = async () => {
      const targets = (shareViewMode === 'transfer' || activeChatId === 'community') ? peers : peers.filter(p => p.id === activeChatId);
      if (targets.length === 0) { alert("No devices connected!"); return; }
      
      for (const fileId of selectedFileIds) {
          const file = files.find(f => f.id === fileId);
          if (!file) continue;
          const blob = await (await fetch(file.url)).blob();
          targets.forEach(p => p.conn.send({ type: 'file-transfer', file: blob, meta: { name: file.name, type: file.mimeType }, senderName: userProfile.name }));
          setTransfers(prev => [...prev, { id: Date.now().toString(), fileName: file.name, progress: 100, status: 'completed', speed: 'Sent', totalSize: file.size, transferred: file.size, peerId: 'me' }]);
      }
      clearSelection();
      setTransferTab('dashboard');
  };

  const startScanner = async () => {
    setTransferTab('scanner');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if(videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); requestAnimationFrame(tickScanner); }
    } catch { setTransferTab('dashboard'); }
  };
  
  const stopScanner = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
    if(transferTab === 'scanner') setTransferTab('dashboard');
  };

  const tickScanner = () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            canvasRef.current.height = videoRef.current.videoHeight;
            canvasRef.current.width = videoRef.current.videoWidth;
            ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
            const code = jsQR(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height).data, canvasRef.current.width, canvasRef.current.height);
            if (code) { try { connectToPeer(JSON.parse(code.data).id); } catch { connectToPeer(code.data); } stopScanner(); }
        }
    }
    requestAnimationFrame(tickScanner);
  };

  if (isShareModalMinimized) return null;

  const messagesToRender = activeChatId === 'community' ? chatHistory : (dmMessages[activeChatId] || []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in">
        
        <div className="absolute top-4 right-4 z-50 flex items-center space-x-2">
             <button onClick={() => setShareModalMinimized(true)} className="p-2 bg-slate-800 text-slate-400 rounded-full"><Icons.Minimize size={20} /></button>
             {shareViewMode === 'transfer' && (
                 <button onClick={() => setShareModalOpen(false)} className="p-2 bg-slate-800 text-red-400 rounded-full"><Icons.Close size={20} /></button>
             )}
        </div>

        <div className="bg-slate-900 w-full h-full md:max-w-4xl md:h-[800px] md:rounded-2xl shadow-2xl flex flex-col overflow-hidden relative border border-slate-700">
            
            {shareViewMode === 'transfer' && (
                <div className="flex-1 flex flex-col">
                    <div className="p-6 bg-slate-950 border-b border-slate-800 flex flex-col items-center justify-center relative">
                         <div className="relative mb-2">
                             <div className={`w-16 h-16 rounded-full flex items-center justify-center ${peers.length > 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500 animate-pulse'}`}>
                                 <Icons.Radar size={32} className={peers.length > 0 ? '' : 'animate-spin-slow'} />
                             </div>
                             {peers.length > 0 && <div className="absolute -bottom-1 -right-1 bg-green-500 text-slate-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{peers.length}</div>}
                         </div>
                         <h2 className="text-lg font-bold text-white">{peers.length > 0 ? 'Connected' : 'Looking for devices...'}</h2>
                         <p className="text-xs text-slate-500 mb-4">{myPeerId}</p>

                         {transferTab === 'dashboard' && (
                             <div className="flex space-x-3 w-full max-w-xs">
                                 <button onClick={startScanner} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg flex items-center justify-center space-x-2 text-sm font-bold shadow-lg">
                                     <Icons.Scan size={16} /> <span>Scan</span>
                                 </button>
                                 <button onClick={() => setQrCodeUrl(prev => prev)} className="flex-1 bg-slate-800 text-white py-2 rounded-lg flex items-center justify-center space-x-2 text-sm font-bold border border-slate-700">
                                     <Icons.QrCode size={16} /> <span>My Code</span>
                                 </button>
                             </div>
                         )}
                         
                         {qrCodeUrl && peers.length === 0 && transferTab === 'dashboard' && (
                            <div className="mt-4 p-2 bg-white rounded-xl">
                                <img src={qrCodeUrl} className="w-24 h-24" alt="QR" />
                            </div>
                         )}
                    </div>

                    {transferTab === 'scanner' && (
                        <div className="flex-1 bg-black flex flex-col items-center justify-center relative">
                             <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                             <canvas ref={canvasRef} className="hidden" />
                             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-64 h-64 border-2 border-green-500 rounded-lg"></div>
                             </div>
                             <button onClick={stopScanner} className="absolute bottom-8 bg-slate-800 text-white px-6 py-2 rounded-full font-bold">Cancel</button>
                        </div>
                    )}

                    {transferTab === 'dashboard' && (
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                             <div className="grid grid-cols-2 gap-4">
                                 <button onClick={() => setTransferTab('files')} className="bg-slate-800 p-4 rounded-xl flex flex-col items-center justify-center hover:bg-slate-750 transition-colors border border-slate-700">
                                     <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-2"><Icons.Send size={24} /></div>
                                     <span className="text-sm font-bold text-slate-200">Send Files</span>
                                 </button>
                                 <div className="bg-slate-800 p-4 rounded-xl flex flex-col items-center justify-center border border-slate-700 opacity-60">
                                     <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-2"><Icons.Download size={24} /></div>
                                     <span className="text-sm font-bold text-slate-200">Ready to Receive</span>
                                 </div>
                             </div>

                             <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-800">
                                 <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Recent Activity</h3>
                                 {transfers.length === 0 ? (
                                     <p className="text-xs text-slate-500 text-center py-4">No transfers this session.</p>
                                 ) : (
                                     <div className="space-y-3">
                                         {transfers.slice().reverse().map((t, i) => (
                                             <div key={i} className="flex items-center space-x-3 bg-slate-900 p-2 rounded-lg">
                                                 <div className={`p-2 rounded-full ${t.status === 'completed' ? 'text-green-400 bg-green-900/20' : 'text-blue-400 bg-blue-900/20'}`}>
                                                     {t.status === 'completed' ? <Icons.Check size={14} /> : <Icons.Share size={14} />}
                                                 </div>
                                                 <div className="flex-1 min-w-0">
                                                     <p className="text-sm text-slate-200 truncate">{t.fileName}</p>
                                                     <p className="text-[10px] text-slate-500">{(t.totalSize/1024/1024).toFixed(1)} MB</p>
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                 )}
                             </div>
                        </div>
                    )}

                    {transferTab === 'files' && (
                         <div className="flex-1 flex flex-col">
                             <div className="p-4 border-b border-slate-800 flex items-center space-x-3">
                                 <button onClick={() => setTransferTab('dashboard')}><Icons.ChevronRight className="rotate-180 text-slate-400" /></button>
                                 <h3 className="font-bold text-white">Select Files</h3>
                             </div>
                             <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950">
                                 {files.map(f => (
                                     <div key={f.id} onClick={() => toggleSelection(f.id)} className={`p-2 border rounded-lg cursor-pointer ${selectedFileIds.has(f.id) ? 'border-blue-500 bg-blue-900/20' : 'border-slate-800 bg-slate-900'}`}>
                                         <div className="flex items-center space-x-2">
                                             <Icons.File className="text-slate-400" size={16} />
                                             <span className="text-xs text-slate-200 truncate flex-1">{f.name}</span>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                             {selectedFileIds.size > 0 && (
                                 <div className="p-4 bg-slate-900 border-t border-slate-800">
                                     <button onClick={sendSelectedFiles} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">Send {selectedFileIds.size} Files</button>
                                 </div>
                             )}
                         </div>
                    )}
                </div>
            )}

            {shareViewMode === 'chat' && (
                <div className="flex w-full h-full bg-slate-900">
                    <div className={`w-full md:w-80 border-r border-slate-800 flex flex-col bg-slate-950 ${activeChatId && window.innerWidth < 768 ? 'hidden' : 'flex'}`}>
                        <div className="p-4 h-16 border-b border-slate-800 flex items-center justify-between">
                            <h2 className="font-bold text-white text-lg">Chats</h2>
                            <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-slate-300 border border-slate-700 text-xl select-none">{userProfile.avatar}</div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <button onClick={() => setActiveChatId('community')} className={`w-full p-4 flex items-center space-x-3 hover:bg-slate-900 border-b border-slate-800/50 ${activeChatId === 'community' ? 'bg-slate-900' : ''}`}>
                                <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center"><Icons.Radar size={24} /></div>
                                <div className="flex-1 text-left"><p className="font-bold text-white">Community</p><p className="text-xs text-slate-500">Global Chat</p></div>
                            </button>
                            {peers.map(p => (
                                <button key={p.id} onClick={() => setActiveChatId(p.id)} className={`w-full p-4 flex items-center space-x-3 hover:bg-slate-900 border-b border-slate-800/50 ${activeChatId === p.id ? 'bg-slate-900' : ''}`}>
                                    <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold text-lg">{p.name.charAt(0)}</div>
                                    <div className="flex-1 text-left"><p className="font-bold text-white">{p.name}</p><p className="text-xs text-green-500">Online</p></div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={`flex-1 flex-col bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed ${(!activeChatId && window.innerWidth < 768) ? 'hidden' : 'flex'}`}>
                         <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center px-4">
                             <button onClick={() => setActiveChatId('')} className="md:hidden mr-3 text-slate-400"><Icons.ChevronRight className="rotate-180" /></button>
                             <div className="flex-1">
                                 <h3 className="font-bold text-white">{activeChatId === 'community' ? 'Community' : peers.find(p => p.id === activeChatId)?.name}</h3>
                             </div>
                         </div>
                         <div className="flex-1 overflow-y-auto p-4 space-y-3">
                             {messagesToRender.map(msg => (
                                 <div key={msg.id} className={`flex ${msg.senderId === myPeerId || msg.senderId === 'me' ? 'justify-end' : 'justify-start'}`}>
                                     {msg.isSystem ? <span className="bg-slate-800 text-slate-500 text-[10px] px-2 py-1 rounded-full">{msg.content}</span> : (
                                         <div className="relative group">
                                             <div className={`max-w-[80%] p-3 rounded-xl ${msg.senderId === myPeerId || msg.senderId === 'me' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none'}`}>
                                                 {activeChatId === 'community' && (msg.senderId !== myPeerId && msg.senderId !== 'me') && <p className="text-[10px] text-orange-400 font-bold mb-1">{msg.senderName}</p>}
                                                 <p className="text-sm">{msg.content}</p>
                                                 <p className="text-[10px] opacity-50 text-right mt-1">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                             </div>
                                             {userProfile.isAdmin && (
                                                 <button 
                                                    onClick={() => handleDeleteMessage(msg.id)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                    title="Delete Message"
                                                 >
                                                     <Icons.Trash size={12} />
                                                 </button>
                                             )}
                                         </div>
                                     )}
                                 </div>
                             ))}
                         </div>
                         <div className="p-3 bg-slate-900 border-t border-slate-800 flex space-x-2">
                             <input value={textInput} onChange={e => setTextInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Message..." className="flex-1 bg-slate-800 border border-slate-700 rounded-full px-4 text-white outline-none" />
                             <button onClick={sendMessage} className="p-3 bg-blue-600 rounded-full text-white"><Icons.Send size={18} /></button>
                         </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};