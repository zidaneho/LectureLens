import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  History, Play, Calendar, Clock, 
  Search, Plus
} from 'lucide-react';
import { motion } from 'framer-motion';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const history = [
    { id: '1', title: 'Introduction to Quantum Computing', date: '2026-04-04', duration: '12:45', thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=400' },
    { id: '2', title: 'The Future of AI Agents', date: '2026-04-03', duration: '08:20', thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=400' },
    { id: '3', title: 'Mastering React 19', date: '2026-04-02', duration: '25:10', thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&q=80&w=400' },
  ];

  return (
    <div className="flex-1 bg-black text-white flex flex-col overflow-hidden">
      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white uppercase italic">Welcome back</h1>
            <p className="text-[11px] font-bold tracking-widest text-neutral-600 uppercase mt-1">Your learning journey continues here.</p>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="bg-white text-black px-6 py-3 rounded-xl font-black text-sm uppercase tracking-tight flex items-center gap-2 transition-all hover:bg-neutral-200 shadow-xl shadow-white/5"
          >
            <Plus className="w-4 h-4" />
            Create New
          </button>
        </header>

        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 flex items-center gap-2">
              <History className="w-3.5 h-3.5" />
              Recent Lectures
            </h2>
            <div className="relative group">
              <Search className="w-3.5 h-3.5 text-neutral-700 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-white transition-colors" />
              <input 
                type="text" 
                placeholder="Search history..."
                className="bg-neutral-900/50 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-xs focus:ring-1 focus:ring-white/10 outline-none transition-all w-48 md:w-64 placeholder:text-neutral-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {history.map((item) => (
              <motion.div 
                key={item.id}
                whileHover={{ y: -5 }}
                className="bg-neutral-900/30 border border-white/5 rounded-2xl overflow-hidden group cursor-pointer hover:border-white/20 transition-all shadow-2xl"
                onClick={() => navigate('/analysis', { state: { prompt: item.title } })}
              >
                <div className="aspect-video relative overflow-hidden">
                  <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60 group-hover:opacity-100" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                    <div className="bg-white p-3 rounded-full shadow-2xl">
                      <Play className="w-5 h-5 fill-black text-black ml-0.5" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold font-mono border border-white/10">
                    {item.duration}
                  </div>
                </div>
                <div className="p-6 space-y-4 bg-gradient-to-b from-transparent to-black/20">
                  <h3 className="font-bold text-lg leading-tight group-hover:text-white transition-colors">{item.title}</h3>
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      {item.date}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {item.duration}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
