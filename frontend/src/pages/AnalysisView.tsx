import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Loader2, CheckCircle2, Clock, BookOpen, MessageSquare, Play, 
  ExternalLink, ChevronRight, Share2, Download, X, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactPlayer from 'react-player';
import ReactMarkdown from 'react-markdown';
import { mockVideoData } from '../mockVideoData';
import ChatComponent from '../components/ChatComponent';

type Status = 'searching' | 'processing' | 'generating' | 'ready';

const AnalysisView: React.FC = () => {
  const location = useLocation();
  const prompt = location.state?.prompt || 'Loading...';
  const [status, setStatus] = useState<Status>('searching');
  const [progress, setProgress] = useState(10);
  const [activeTab, setActiveTab] = useState<'notes' | 'video'>('video');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setStatus('ready');
          return 100;
        }
        if (prev > 70) setStatus('generating');
        else if (prev > 30) setStatus('processing');
        return prev + Math.random() * 10;
      });
    }, 500);

    return () => clearInterval(timer);
  }, []);

  const handleSeek = (seconds: number) => {
    playerRef.current?.seekTo(seconds, 'seconds');
    setActiveTab('video');
    if (window.innerWidth < 768) setIsChatOpen(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const stages: { id: Status; label: string; icon: any }[] = [
    { id: 'searching', label: 'Finding best video...', icon: Play },
    { id: 'processing', label: 'Indexing with TwelveLabs...', icon: Clock },
    { id: 'generating', label: 'Creating notes with Gemini...', icon: BookOpen },
    { id: 'ready', label: 'Ready!', icon: CheckCircle2 },
  ];

  if (status !== 'ready') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-black">
        <div className="max-w-md w-full space-y-10">
          <div className="space-y-3 text-center">
            <h1 className="text-xl font-bold text-white italic tracking-tight">"{prompt}"</h1>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-600">Preparing Lecture</p>
          </div>

          <div className="space-y-5">
            {stages.slice(0, 3).map((stage, idx) => {
              const isActive = status === stage.id;
              const currentStageIdx = stages.findIndex(s => s.id === status);
              const isCompleted = currentStageIdx > idx;
              
              return (
                <div key={stage.id} className="flex items-center gap-4">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border transition-all duration-700 ${
                    isActive ? 'border-white bg-white/5' : isCompleted ? 'border-neutral-500 bg-neutral-500/10' : 'border-neutral-900 bg-neutral-900/50'
                  }`}>
                    {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5 text-neutral-500" /> : isActive ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <stage.icon className="w-3.5 h-3.5 text-neutral-800" />}
                  </div>
                  <div className={`flex-1 h-[1px] bg-neutral-900 relative`}>
                    {isActive && (
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 bg-white"
                      />
                    )}
                    {isCompleted && <div className="absolute inset-0 bg-neutral-500" />}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest min-w-[130px] ${isActive ? 'text-white' : isCompleted ? 'text-neutral-500' : 'text-neutral-800'}`}>
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const Player = ReactPlayer as any;

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
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-neutral-900 ring-1 ring-white/10">
                  <Player
                    ref={playerRef}
                    url={mockVideoData.video_url}
                    width="100%"
                    height="100%"
                    controls
                    playing
                  />
                </div>
                
                <div className="space-y-4">
                  <h1 className="text-xl font-bold text-white tracking-tight">{mockVideoData.title}</h1>
                  
                  <div className="space-y-3">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      Key Moments
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {mockVideoData.twelve_labs_data.key_concepts.map((concept, idx) => (
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
                <div className="prose prose-invert prose-neutral prose-sm max-w-none prose-h1:text-white prose-h2:text-white prose-strong:text-white prose-headings:tracking-tight">
                  <ReactMarkdown>{mockVideoData.lecture_notes.markdown_content}</ReactMarkdown>
                </div>

                <div className="space-y-4 pt-8 border-t border-white/10">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 flex items-center gap-2">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Resources
                  </h3>
                  <div className="grid gap-2">
                    {mockVideoData.lecture_notes.external_resources.map((res, idx) => (
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
              fixed inset-y-0 right-0 w-full sm:w-[320px] md:relative
              bg-black border-l border-white/10 z-50 md:z-auto
              flex flex-col shrink-0 md:w-[300px]
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
              <ChatComponent onSeek={handleSeek} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnalysisView;
