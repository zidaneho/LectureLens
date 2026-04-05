import React, { useState } from 'react';
import { Send, Sparkles, User, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp?: number;
}

interface ChatComponentProps {
  onSeek: (seconds: number) => void;
}

const ChatComponent: React.FC<ChatComponentProps> = ({ onSeek }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I've analyzed the video. Ask me anything, or click a cited moment to jump to that part of the lecture.",
      sender: 'ai'
    }
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    setTimeout(() => {
      let aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "In the video, this is explained around the 1:30 mark.",
        sender: 'ai',
        timestamp: 90
      };

      if (input.toLowerCase().includes('shor')) {
        aiResponse.text = "Shor's algorithm is discussed starting at 2:30. It's a quantum algorithm for integer factorization.";
        aiResponse.timestamp = 150;
      }

      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
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
                {msg.timestamp !== undefined && (
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
        </AnimatePresence>
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-white/10">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="w-full bg-neutral-900/50 border border-white/10 rounded-xl px-4 py-3 pr-12 focus:ring-1 focus:ring-white/20 transition-all outline-none text-[13px] text-white placeholder:text-neutral-700"
          />
          <button 
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white p-2 rounded-lg hover:bg-neutral-200 transition-all disabled:opacity-30"
            disabled={!input.trim()}
          >
            <Send className="w-3.5 h-3.5 text-black" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatComponent;
