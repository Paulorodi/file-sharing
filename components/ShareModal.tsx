import React, { useState, useEffect, useRef } from 'react';
import { Peer, DataConnection } from 'peerjs';
import { useFileSystem } from '../context/FileSystemContext';
import { Icons } from './Icons';
import { FileItem } from '../types';
import QRCode from 'qrcode';
import jsQR from 'jsqr';

interface TransferProgress {
  fileName: string;
  progress: number;
  status: 'sending' | 'receiving' | 'completed' | 'error';
  speed: string; // e.g. "2.5 MB/s"
  totalSize: number;
  transferred: number;
}

export const ShareModal: React.FC = () => {
  const { setShareModalOpen, files, addReceivedFile, userProfile, addToHistory } = useFileSystem();
  const [mode, setMode] = useState<'send' | 'receive' | 'initial' | 'text'>('initial');
  const [peerId, setPeerId] = useState<string>('');
  const [connectId, setConnectId] = useState('');
  const [status, setStatus] = useState('Initializing...');
  const [connectedPeer, setConnectedPeer] = useState<string | null>(null);
  const [connectedPeerName, setConnectedPeerName] = useState<string>('Unknown Device');
  
  const [transfers, setTransfers] = useState<TransferProgress[]>([]);
  const [selectedFilesToShare, setSelectedFilesToShare] = useState<Set<string>>(new Set());
  
  // Text Sharing
  const [textToSend, setTextToSend] = useState('');
  const [receivedText, setReceivedText] = useState<string[]>([]);
  
  // QR State
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showScanner, setShowScanner] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Refs
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const lastProgressUpdate = useRef<number>(0);
  const lastBytesLoaded = useRef<number>(0);

  // Initialize Peer
  useEffect(() => {
    const initPeer = async () => {
      try {
        const PeerClass = (window as any).Peer || Peer;
        if (!PeerClass) {
          setStatus("Error: PeerJS library not loaded");
          return;
        }

        // Use a shorter ID for UX if possible, but PeerJS needs unique
        const id = Math.random().toString(36).substring(2, 8).toUpperCase();
        const peer = new PeerClass(id, { debug: 1 });

        peer.on('open', (id: string) => {
          setPeerId(id);
          setStatus('Ready to connect');
          QRCode.toDataURL(JSON.stringify({id, name: userProfile.name}))
            .then(url => setQrCodeUrl(url))
            .catch(err => console.error("QR Gen Error", err));
        });

        peer.on('connection', (conn: DataConnection) => {
          handleConnection(conn);
        });

        peer.on('error', (err: any) => {
          console.error("Peer error", err);
          setStatus(`Error: ${err.type}`);
        });

        peerRef.current = peer;
      } catch (e) {
        console.error("Failed to init peer", e);
        setStatus("Failed to initialize P2P");
      }
    };

    initPeer();

    return () => {
      if (peerRef.current) peerRef.current.destroy();
      stopScanner();
    };
  }, []);

  const handleConnection = (conn: DataConnection) => {
    connRef.current = conn;
    setConnectedPeer(conn.peer);
    
    // Handshake
    conn.on('open', () => {
        setStatus(`Connected!`);
        conn.send({ type: 'handshake', name: userProfile.name });
        if (mode === 'initial') setMode('receive');
    });

    conn.on('data', (data: any) => {
      handleIncomingData(data);
    });

    conn.on('close', () => {
      setConnectedPeer(null);
      setStatus('Connection closed');
      connRef.current = null;
    });
  };

  const handleIncomingData = (data: any) => {
    if (data.type === 'handshake') {
        setConnectedPeerName(data.name || 'Unknown Device');
        setStatus(`Connected to ${data.name}`);
    } else if (data.type === 'text') {
        setReceivedText(prev => [`${connectedPeerName}: ${data.content}`, ...prev]);
        setMode('text'); // Switch to text tab to show
    } else if (data.type === 'file-transfer') {
        // Simple direct blob receive for this demo
        const fileData = data.file;
        const meta = data.meta;
        
        addReceivedFile(new Blob([fileData]), { name: meta.name, type: meta.type });
        
        setTransfers(prev => [...prev, {
            fileName: meta.name,
            progress: 100,
            status: 'completed',
            speed: 'Done',
            totalSize: fileData.size || 0,
            transferred: fileData.size || 0
        }]);

        addToHistory({
            id: Date.now().toString(),
            fileName: meta.name,
            fileSize: fileData.size || 0,
            fileType: meta.type,
            timestamp: Date.now(),
            direction: 'received',
            peerName: connectedPeerName
        });
    }
  };

  const connectToPeer = (targetId: string) => {
    if (!peerRef.current || !targetId) return;
    setStatus(`Connecting to ${targetId}...`);
    
    const conn = peerRef.current.connect(targetId);
    conn.on('open', () => {
      handleConnection(conn);
      conn.send({ type: 'handshake', name: userProfile.name });
      setMode('send');
    });
  };

  const sendFile = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file || !connRef.current) return;

    setTransfers(prev => [...prev, { 
        fileName: file.name, 
        progress: 0, 
        status: 'sending',
        speed: 'Calculating...',
        totalSize: file.size,
        transferred: 0
    }]);

    const response = await fetch(file.url);
    const blob = await response.blob();
    const startTime = Date.now();

    // Simulate progress for the "send" side since PeerJS send is fire-and-forget for blobs mostly
    // In a real app we would chunk and track.
    
    connRef.current.send({
        type: 'file-transfer',
        file: blob,
        meta: { name: file.name, type: file.mimeType }
    });

    const duration = (Date.now() - startTime) / 1000;
    const speed = duration > 0 ? ((file.size / 1024 / 1024) / duration).toFixed(2) : 'Instant';

    setTransfers(prev => prev.map(t => 
        t.fileName === file.name ? { ...t, progress: 100, status: 'completed', speed: `${speed} MB/s` } : t
    ));

    addToHistory({
        id: Date.now().toString(),
        fileName: file.name,
        fileSize: file.size,
        fileType: file.mimeType,
        timestamp: Date.now(),
        direction: 'sent',
        peerName: connectedPeerName
    });
  };

  const sendText = () => {
    if (!connRef.current || !textToSend) return;
    connRef.current.send({ type: 'text', content: textToSend });
    setReceivedText(prev => [`You: ${textToSend}`, ...prev]);
    setTextToSend('');
  };

  const toggleFileSelection = (id: string) => {
    const newSet = new Set(selectedFilesToShare);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedFilesToShare(newSet);
  };

  const sendSelectedFiles = () => {
    selectedFilesToShare.forEach(id => sendFile(id));
    setSelectedFilesToShare(new Set());
  };

  // QR Logic
  const startScanner = async () => {
    try {
      setShowScanner(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        requestAnimationFrame(tickScanner);
      }
    } catch (err) {
      console.error("Camera error", err);
      setStatus("Error: Camera access denied");
      setShowScanner(false);
    }
  };

  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowScanner(false);
  };

  const tickScanner = () => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) return;
    
    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
        if (code) {
          try {
              // Try parsing as JSON first
              const data = JSON.parse(code.data);
              setConnectId(data.id);
              connectToPeer(data.id);
          } catch {
              setConnectId(code.data);
              connectToPeer(code.data);
          }
          stopScanner();
        }
      }
    }
    if (streamRef.current) requestAnimationFrame(tickScanner);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl h-[700px] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
        
        {/* Scanner Overlay */}
        {showScanner && (
            <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center">
                <div className="relative w-full max-w-sm aspect-square bg-slate-900 overflow-hidden rounded-xl border-2 border-green-500 shadow-2xl">
                    <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline></video>
                    <canvas ref={canvasRef} className="hidden"></canvas>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-48 h-48 border-2 border-white/50 rounded-lg relative">
                             {/* Scan Frame Corners */}
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500 -mt-1 -ml-1"></div>
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500 -mt-1 -mr-1"></div>
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500 -mb-1 -ml-1"></div>
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500 -mb-1 -mr-1"></div>
                        </div>
                    </div>
                </div>
                <p className="mt-4 text-white font-medium">Scanning for NeuroShare Devices...</p>
                <button onClick={stopScanner} className="mt-6 bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-full border border-slate-600 transition-colors">Cancel</button>
            </div>
        )}

        {/* Close Button */}
        <button onClick={() => setShareModalOpen(false)} className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-full z-10 transition-colors">
          <Icons.Close size={20} />
        </button>

        {/* Left Sidebar: Connection Status */}
        <div className="w-full md:w-80 bg-slate-950 p-6 border-r border-slate-800 flex flex-col">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-white flex items-center">
                    <Icons.Radar className={`mr-2 ${!connectedPeer ? 'text-green-400 animate-spin-slow' : 'text-blue-400'}`} size={24} />
                    Connection Hub
                </h2>
                <p className="text-xs text-slate-500 mt-1">{status}</p>
            </div>

            {!connectedPeer ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                    {/* Radar Animation */}
                    <div className="relative w-40 h-40 flex items-center justify-center">
                         <div className="absolute inset-0 border border-green-500/20 rounded-full animate-ping"></div>
                         <div className="absolute inset-4 border border-green-500/40 rounded-full"></div>
                         <div className="absolute inset-0 flex items-center justify-center">
                             {qrCodeUrl && <img src={qrCodeUrl} className="w-24 h-24 rounded-lg bg-white p-1" alt="QR" />}
                         </div>
                    </div>
                    
                    <div className="text-center">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Your Device ID</p>
                        <p className="text-xl font-mono text-green-400 font-bold">{peerId || '...'}</p>
                    </div>

                    <div className="w-full space-y-3">
                        <button onClick={startScanner} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg shadow-blue-900/20">
                            <Icons.Scan size={20} />
                            <span>Scan to Connect</span>
                        </button>
                        
                        <div className="relative">
                            <input 
                                type="text" 
                                value={connectId}
                                onChange={(e) => setConnectId(e.target.value.toUpperCase())}
                                placeholder="OR ENTER ID"
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-center text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none uppercase font-mono"
                            />
                            {connectId && (
                                <button onClick={() => connectToPeer(connectId)} className="absolute right-2 top-2 p-1 bg-green-500 rounded-lg text-white">
                                    <Icons.ChevronRight size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col">
                    <div className="bg-blue-500/10 border border-blue-500/30 p-6 rounded-2xl flex flex-col items-center text-center mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-2xl mb-3 shadow-lg">
                            👋
                        </div>
                        <h3 className="text-white font-bold text-lg">{connectedPeerName}</h3>
                        <p className="text-xs text-blue-300 font-mono mt-1">{connectedPeer}</p>
                        <span className="mt-3 px-3 py-1 bg-green-500/20 text-green-400 text-[10px] font-bold rounded-full border border-green-500/20 flex items-center">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span> Secure Connection
                        </span>
                    </div>
                    
                    <button 
                        onClick={() => { connRef.current?.close(); setConnectedPeer(null); setMode('initial'); }}
                        className="mt-auto w-full border border-red-500/30 text-red-400 hover:bg-red-500/10 py-3 rounded-xl text-sm font-medium transition-colors"
                    >
                        Disconnect Device
                    </button>
                </div>
            )}
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col bg-slate-900">
             {/* Tabs */}
            <div className="flex items-center px-6 pt-6 border-b border-slate-800">
                {['send', 'receive', 'text'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setMode(tab as any)}
                        className={`mr-6 pb-4 text-sm font-medium border-b-2 transition-colors capitalize ${
                            mode === tab ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        {tab === 'text' ? 'Chat & Clipboard' : `${tab} Files`}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-hidden p-6 bg-slate-900/50">
                {mode === 'send' && (
                    <div className="h-full flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-slate-300 text-sm">Select files from your library</h3>
                            {selectedFilesToShare.size > 0 && connectedPeer && (
                                <button onClick={sendSelectedFiles} className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-5 py-2 rounded-full font-bold shadow-lg shadow-blue-600/20 animate-in zoom-in">
                                    Send {selectedFilesToShare.size} Files 🚀
                                </button>
                            )}
                        </div>

                        {!connectedPeer && (
                             <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl text-yellow-200 text-sm mb-4 flex items-center">
                               <Icons.Wifi className="mr-2" size={16} />
                               Waiting for connection...
                             </div>
                        )}

                        <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 lg:grid-cols-3 gap-3 content-start">
                             {files.filter(f => !f.isDeleted).map(file => (
                                <div 
                                  key={file.id}
                                  onClick={() => toggleFileSelection(file.id)}
                                  className={`relative group border rounded-xl p-3 cursor-pointer transition-all ${
                                    selectedFilesToShare.has(file.id) 
                                      ? 'bg-blue-900/20 border-blue-500' 
                                      : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800'
                                  }`}
                                >
                                  <div className="flex items-center space-x-3">
                                     <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedFilesToShare.has(file.id) ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                       {file.type === 'image' && <Icons.Image size={20} />}
                                       {file.type === 'video' && <Icons.Video size={20} />}
                                       {file.type === 'audio' && <Icons.Music size={20} />}
                                       {file.type === 'document' && <Icons.File size={20} />}
                                     </div>
                                     <div className="flex-1 min-w-0">
                                       <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                                       <p className="text-[10px] text-slate-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                                     </div>
                                     <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                         selectedFilesToShare.has(file.id) ? 'bg-blue-500 border-blue-500' : 'border-slate-600'
                                     }`}>
                                         {selectedFilesToShare.has(file.id) && <Icons.Check size={12} className="text-white" />}
                                     </div>
                                  </div>
                                </div>
                              ))}
                        </div>
                    </div>
                )}

                {mode === 'receive' && (
                    <div className="h-full flex flex-col">
                         {transfers.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                    <Icons.History size={32} opacity={0.5} />
                                </div>
                                <p>No active transfers</p>
                            </div>
                         ) : (
                             <div className="space-y-3 overflow-y-auto">
                                 {transfers.map((t, i) => (
                                     <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center space-x-4">
                                         <div className={`p-3 rounded-full ${t.status === 'completed' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                             {t.status === 'completed' ? <Icons.Check size={20} /> : <Icons.Receive size={20} />}
                                         </div>
                                         <div className="flex-1">
                                             <div className="flex justify-between mb-2">
                                                 <span className="font-medium text-slate-200">{t.fileName}</span>
                                                 <span className="text-xs font-mono text-slate-400">{t.speed}</span>
                                             </div>
                                             <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                                                 <div className={`h-full transition-all duration-300 ${t.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`} style={{width: `${t.progress}%`}} />
                                             </div>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         )}
                    </div>
                )}

                {mode === 'text' && (
                    <div className="h-full flex flex-col">
                        <div className="flex-1 bg-slate-800/30 rounded-xl p-4 overflow-y-auto space-y-3 mb-4 border border-slate-800">
                            {receivedText.length === 0 && (
                                <div className="text-center text-slate-600 mt-10">
                                    <Icons.Copy className="mx-auto mb-2 opacity-50" size={32} />
                                    <p className="text-sm">Share text, links, or OTPs instantly.</p>
                                </div>
                            )}
                            {receivedText.map((msg, idx) => (
                                <div key={idx} className="bg-slate-800 p-3 rounded-lg border border-slate-700 text-sm text-slate-200 font-mono">
                                    {msg}
                                </div>
                            ))}
                        </div>
                        <div className="flex space-x-2">
                            <input 
                                value={textToSend}
                                onChange={(e) => setTextToSend(e.target.value)}
                                placeholder="Type or paste text to share..."
                                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                                onKeyDown={(e) => e.key === 'Enter' && sendText()}
                            />
                            <button onClick={sendText} className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transition-colors">
                                <Icons.Send size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};