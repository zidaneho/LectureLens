import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, PlayCircle, ArrowRight, BookOpen, Clock, Brain } from 'lucide-react';
import { motion } from 'framer-motion';

const Landing: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    navigate('/analysis', { state: { prompt } });
  };

  const suggestions = [
    { text: "Explain Quantum Superposition", icon: Brain },
    { text: "How does the immune system work?", icon: BookOpen },
    { text: "Mastering React 19 concurrent features", icon: Clock },
  ];

  return (
    <div className="flex flex-col h-full w-full max-w-3xl mx-auto items-center justify-center p-6 text-center space-y-10">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="bg-white p-2 rounded-xl shadow-xl">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <h1 className="text-2xl font-bold tracking-widest text-white uppercase">LectureLens</h1>
        </div>
        <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight">How can I help you learn today?</h2>
      </motion.div>

      {/* Suggested prompts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
        {suggestions.map((s, i) => (
          <button 
            key={i}
            onClick={() => { setPrompt(s.text); navigate('/analysis', { state: { prompt: s.text } }); }}
            className="p-4 bg-neutral-900/50 border border-white/10 rounded-xl text-left hover:bg-neutral-800 hover:border-white/20 transition-all group"
          >
            <s.icon className="w-4 h-4 text-neutral-500 mb-2 group-hover:text-white transition-colors" />
            <div className="text-xs font-medium text-neutral-400 group-hover:text-white transition-colors leading-relaxed">{s.text}</div>
          </button>
        ))}
      </div>

      <div className="w-full relative group">
        <form onSubmit={handleSearch} className="relative flex items-center bg-neutral-900/50 border border-white/10 rounded-2xl p-2 shadow-2xl focus-within:ring-1 focus-within:ring-white/20 transition-all">
          <div className="pl-4 text-neutral-600">
            <PlayCircle className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder="Search for a topic or paste a YouTube URL..."
            className="flex-1 bg-transparent border-none outline-none px-4 py-4 text-lg text-white placeholder:text-neutral-700"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button 
            type="submit"
            className="bg-white hover:bg-neutral-200 text-black px-4 py-3 rounded-xl font-bold transition-all mr-1 disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={!prompt.trim()}
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>

      <div className="flex flex-wrap justify-center gap-8 mt-4 text-[9px] text-neutral-600 font-black uppercase tracking-[0.2em]">
        <span>TwelveLabs AI</span>
        <span>Gemini Pro</span>
        <span>Browser Agents</span>
      </div>
    </div>
  );
};

export default Landing;
