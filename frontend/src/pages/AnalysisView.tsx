import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Loader2, Clock, BookOpen, MessageSquare, Play, 
  ExternalLink, ChevronRight, Share2, Download, X, Sparkles, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import ChatComponent from '../components/ChatComponent';
import type { VideoData } from '../types';

const API_BASE_URL = 'http://localhost:8000/api';

type Status = 'searching' | 'processing' | 'generating' | 'ready' | 'failed';

const getEmbedUrl = (url: string) => {
  if (!url) return '';
  const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  const videoId = videoIdMatch ? videoIdMatch[1] : '';
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
};

const AnalysisView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const prompt = location.state?.prompt;
  
  const [status, setStatus] = useState<Status>('searching');
  const [progress, setProgress] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'notes' | 'video'>('video');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  const displayProgressRef = useRef(0);
  useEffect(() => {
    displayProgressRef.current = displayProgress;
  }, [displayProgress]);

  const loadingMessages = [
    "Initializing agent...",
    "Traversing the web...",
    "Finding best video...",
    "Evaluating sources...",
    "Selecting lecture...",
    "Verifying video quality...",
    "Preparing lecture context...",
    "Still searching...",
    "Looking for the perfect match...",
    "Almost done..."
  ];

  // Loading messages rotation
  useEffect(() => {
    if (!videoData?.video_url && status !== 'failed') {
      const interval = setInterval(() => {
        setLoadingMessageIndex(prev => {
          if (displayProgressRef.current >= 90) {
            return loadingMessages.length - 1; // "Almost done..."
          }
          if (prev < loadingMessages.length - 2) {
            return prev + 1;
          }
          // Loop back to a middle message to keep it feeling active
          return 2; 
        });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [videoData?.video_url, status, loadingMessages.length]);

  // Smooth progress animation and drift
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayProgress(prev => {
        if (prev < progress) {
          // Catch up to backend progress
          const diff = progress - prev;
          const step = Math.max(diff * 0.1, 0.2);
          return Math.min(prev + step, progress);
        } else if (prev < 99 && status !== 'ready' && status !== 'failed') {
          // Slow drift when waiting for backend
          // The drift speed decreases slightly as we get closer to 100
          const increment = Math.max(0.01, (100 - prev) / 1500);
          return prev + increment;
        }
        return prev;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [progress, status]);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Redirect if no prompt
  useEffect(() => {
    if (!prompt) {
      navigate('/');
    }
  }, [prompt, navigate]);

  // Step 1: Initiate search
  useEffect(() => {
    const initiateSearch = async () => {
      if (!prompt || videoData) return;
      
      try {
        const token = localStorage.getItem('ll_token');
        const response = await fetch(`${API_BASE_URL}/search-video`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({ prompt }),
        });
        
        if (!response.ok) throw new Error('Failed to initiate search');
        
        const data = await response.json();
        setTaskId(data.task_id);
      } catch (err: any) {
        setError(err.message);
        setStatus('failed');
      }
    };

    initiateSearch();
  }, [prompt, videoData]);

  // Step 2: Poll for status
  useEffect(() => {
    let interval: number;
    
    if (taskId && status !== 'ready' && status !== 'failed') {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/task-status/${taskId}`);
          if (!response.ok) throw new Error('Failed to fetch status');
          
          const data = await response.json();
          
          // Map backend stages to frontend status
          if (data.stage === 'searching_video') setStatus('searching');
          else if (data.stage === 'processing_video') setStatus('processing');
          else if (data.stage === 'generating_notes') setStatus('generating');
          
          setProgress(data.progress || 0);

          // Update video data if available (even partially)
          if (data.result) {
            setVideoData(prev => ({
              ...prev,
              ...data.result
            } as VideoData));
          }
          
          if (data.status === 'completed') {
            setVideoData(data.result);
            setStatus('ready');
            setTaskId(null);
            clearInterval(interval);
          } else if (data.status === 'failed') {
            setError(data.message || 'Processing failed');
            setStatus('failed');
            setTaskId(null);
            clearInterval(interval);
          }
        } catch (err: any) {
          setError(err.message);
          setStatus('failed');
          clearInterval(interval);
        }
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [taskId, status]);

  const handleSeek = (seconds: number) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds, true] }),
        '*'
      );
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
        '*'
      );
    }
    setActiveTab('video');
    if (window.innerWidth < 768) setIsChatOpen(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (status === 'failed') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-black text-center space-y-6">
        <div className="bg-white p-3 rounded-full">
          <AlertCircle className="w-8 h-8 text-black" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white tracking-tight">Something went wrong</h2>
          <p className="text-neutral-500 text-sm max-w-xs mx-auto">{error}</p>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="bg-white text-black px-6 py-3 rounded-xl font-bold transition-all hover:bg-neutral-200"
        >
          Try Another Prompt
        </button>
      </div>
    );
  }

  // Initial loading state: only show full-screen loader during video search
  if (!videoData?.video_url) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-black">
        <div className="max-w-md w-full space-y-10">
          <div className="space-y-3 text-center">
            <h1 className="text-xl font-bold text-white italic tracking-tight">"{prompt}"</h1>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-600">Preparing Lecture</p>
          </div>

          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border border-white bg-white/5">
                <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
              </div>
              <div className="flex-1 h-[1px] bg-neutral-900 relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${displayProgress}%` }}
                  transition={{ type: "tween", duration: 0.1, ease: "linear" }}
                  className="absolute inset-0 bg-white"
                />
              </div>
              <AnimatePresence mode="wait">
                <motion.span
                  key={loadingMessageIndex}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.3 }}
                  className="text-[10px] font-bold uppercase tracking-widest min-w-[170px] text-white whitespace-nowrap"
                >
                  {loadingMessages[loadingMessageIndex]}
                </motion.span>
              </AnimatePresence>
              </div>
              </div>        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-black relative">
      <div className="flex-1 flex flex-col min-w-0 md:border-r border-white/10 h-full overflow-hidden">
        {/* Sub-header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black shrink-0">
          <div className="flex bg-neutral-900 p-0.5 rounded-md">
            <button 
              onClick={() => setActiveTab('video')}
              className={`px-3 py-1.5 rounded-sm text-[10px] font-bold tracking-widest uppercase transition-all ${activeTab === 'video' ? 'bg-neutral-800 text-white' : 'text-neutral-600 hover:text-neutral-400'}`}
            >
              Video
            </button>
            <button 
              onClick={() => setActiveTab('notes')}
              className={`px-3 py-1.5 rounded-sm text-[10px] font-bold tracking-widest uppercase transition-all ${activeTab === 'notes' ? 'bg-neutral-800 text-white' : 'text-neutral-600 hover:text-neutral-400'}`}
            >
              Notes
            </button>
          </div>
          <div className="flex items-center gap-1">
            <div className="text-[10px] font-mono text-neutral-700 mr-2 hidden md:block select-all bg-neutral-950 px-2 py-1 rounded border border-white/5 max-w-[200px] truncate">
              {videoData.video_url}
            </div>
            <button className="p-1.5 text-neutral-600 hover:text-white transition-colors"><Share2 className="w-3.5 h-3.5" /></button>
            <button className="p-1.5 text-neutral-600 hover:text-white transition-colors"><Download className="w-3.5 h-3.5" /></button>
            <button 
              onClick={() => setIsChatOpen(true)}
              className="md:hidden p-1.5 text-white hover:opacity-80 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'video' ? (
              <motion.div 
                key="video"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 md:p-6 space-y-6"
              >
                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-neutral-900 ring-1 ring-white/10 shadow-2xl">
                  <iframe
                    ref={iframeRef}
                    src={getEmbedUrl(videoData.video_url)}
                    width="100%"
                    height="100%"
                    className="absolute top-0 left-0 border-none"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <h1 className="text-xl font-bold text-white tracking-tight">{videoData.title}</h1>
                    <a 
                      href={videoData.video_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-neutral-400 hover:text-white hover:border-white/20 transition-all shrink-0"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Watch on YouTube
                    </a>
                  </div>
                  
                  <div className="space-y-3">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      Key Moments
                    </h2>
                    {!videoData.twelve_labs_data ? (
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-900/30 border border-white/5 border-dashed">
                        <Loader2 className="w-4 h-4 text-neutral-700 animate-spin" />
                        <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-700">Indexing with TwelveLabs...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {videoData.twelve_labs_data.key_concepts.map((concept, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSeek(concept.timestamp)}
                            className="flex items-center gap-4 p-3 rounded-xl bg-neutral-900/50 border border-white/5 hover:border-white/20 transition-all text-left group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                              <Play className="w-3 h-3 text-white fill-white" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[13px] font-medium text-neutral-200 truncate">{concept.label}</div>
                              <div className="text-[9px] font-mono text-neutral-600 tracking-tighter">{formatTime(concept.timestamp)}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="notes"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-6 md:p-8 max-w-3xl mx-auto space-y-10"
              >
                {!videoData.lecture_notes ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center bg-white/5">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white">Creating notes with Gemini...</p>
                      <p className="text-[9px] font-medium text-neutral-600 uppercase tracking-widest">This may take a minute</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="prose prose-invert prose-neutral prose-sm max-w-none prose-h1:text-white prose-h2:text-white prose-strong:text-white prose-headings:tracking-tight">
                      <ReactMarkdown>{videoData.lecture_notes.markdown_content}</ReactMarkdown>
                    </div>

                    <div className="space-y-4 pt-8 border-t border-white/10">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 flex items-center gap-2">
                        <ExternalLink className="w-3.5 h-3.5" />
                        Resources
                      </h3>
                      <div className="grid gap-2">
                        {videoData.lecture_notes.external_resources.map((res, idx) => (
                          <a 
                            key={idx}
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-4 rounded-xl bg-neutral-900/50 border border-white/5 hover:border-white/20 flex items-center justify-between group transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <BookOpen className="w-4 h-4 text-neutral-600 group-hover:text-white" />
                              <div>
                                <div className="text-[13px] font-medium text-neutral-200">{res.title}</div>
                                <div className="text-[9px] text-neutral-600 font-bold uppercase tracking-widest">{res.type}</div>
                              </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-neutral-800 group-hover:text-white" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right AI Chat */}
      <AnimatePresence>
        {(isChatOpen || window.innerWidth >= 768) && (
          <motion.div 
            initial={window.innerWidth < 768 ? { x: '100%' } : false}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`
              fixed inset-0 md:relative
              bg-black border-l border-white/10 z-50 md:z-auto
              flex flex-col shrink-0 w-full md:w-[300px]
              ${!isChatOpen && 'hidden md:flex'}
            `}
          >
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="bg-white p-1 rounded-md">
                  <Sparkles className="w-3.5 h-3.5 text-black" />
                </div>
                <span className="font-bold text-[11px] uppercase tracking-[0.2em] text-white">Lecture AI</span>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="md:hidden p-1.5 text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatComponent 
                indexId={videoData?.index_id || ''} 
                videoId={videoData?.video_id || ''} 
                onSeek={handleSeek} 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnalysisView;
