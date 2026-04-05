import React, { useState } from 'react';
import { Send, Sparkles, User, Play, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE_URL = 'http://localhost:8000/api';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp?: number;
}

interface ChatComponentProps {
  videoId: string;
  onSeek: (seconds: number) => void;
}

const ChatComponent: React.FC<ChatComponentProps> = ({ videoId, onSeek }) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I've analyzed the video. Ask me anything, or click a cited moment to jump to that part of the lecture.",
      sender: 'ai'
    }
  ]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg: Message = { id: Date.now().toString(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: videoId,
          message: input,
          persona: 'default'
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response_text,
        sender: 'ai',
        timestamp: data.timestamp
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble connecting to the AI service right now.",
        sender: 'ai'
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                msg.sender === 'user' ? 'bg-neutral-900 border-white/10' : 'bg-white border-white'
              }`}>
                {msg.sender === 'user' ? <User className="w-3.5 h-3.5 text-neutral-500" /> : <Sparkles className="w-3.5 h-3.5 text-black" />}
              </div>
              <div className={`max-w-[85%] p-3 rounded-xl text-[13px] leading-relaxed transition-all ${
                msg.sender === 'user' ? 'bg-neutral-900 text-neutral-300' : 'bg-black border border-white/10 text-neutral-200'
              }`}>
                {msg.text}
                {msg.timestamp !== undefined && msg.timestamp !== null && (
                  <button
                    onClick={() => onSeek(msg.timestamp!)}
                    className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-white text-black rounded-lg hover:bg-neutral-200 transition-all text-[10px] font-bold uppercase tracking-wider group"
                  >
                    <Play className="w-2.5 h-2.5 fill-black group-hover:scale-110 transition-transform" />
                    Jump to {formatTime(msg.timestamp)}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 border bg-white border-white">
                <Sparkles className="w-3.5 h-3.5 text-black" />
              </div>
              <div className="bg-black border border-white/10 p-3 rounded-xl">
                <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-white/10">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={isTyping}
            className="w-full bg-neutral-900/50 border border-white/10 rounded-xl px-4 py-3 pr-12 focus:ring-1 focus:ring-white/20 transition-all outline-none text-[13px] text-white placeholder:text-neutral-700 disabled:opacity-50"
          />
          <button 
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white p-2 rounded-lg hover:bg-neutral-200 transition-all disabled:opacity-30"
            disabled={!input.trim() || isTyping}
          >
            <Send className="w-3.5 h-3.5 text-black" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatComponent;
