import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  History, Play, Calendar, Clock, 
  Search, Plus, LayoutDashboard, Settings, LogOut
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
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Sidebar */}
      <div className="w-64 border-r border-slate-800 flex flex-col p-6 hidden md:flex">
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <Play className="w-5 h-5 fill-white text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">LectureLens</span>
        </div>

        <nav className="flex-1 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-500/10 text-indigo-400 rounded-xl font-medium transition-all">
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>
          <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-900 rounded-xl font-medium transition-all group">
            <Plus className="w-5 h-5 group-hover:text-white" />
            New Lecture
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-900 rounded-xl font-medium transition-all group">
            <History className="w-5 h-5 group-hover:text-white" />
            History
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-900 rounded-xl font-medium transition-all group">
            <Settings className="w-5 h-5 group-hover:text-white" />
            Settings
          </button>
        </nav>

        <button className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-400 transition-colors mt-auto">
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold">Welcome back!</h1>
            <p className="text-slate-500 mt-1">Here's what you've been learning lately.</p>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-5 h-5" />
            Create New
          </button>
        </header>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-400" />
              Recent Lectures
            </h2>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search history..."
                className="bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {history.map((item) => (
              <motion.div 
                key={item.id}
                whileHover={{ y: -5 }}
                className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden group cursor-pointer hover:border-indigo-500/50 transition-all"
                onClick={() => navigate('/analysis', { state: { prompt: item.title } })}
              >
                <div className="aspect-video relative overflow-hidden">
                  <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-white/20 backdrop-blur-md p-3 rounded-full">
                      <Play className="w-6 h-6 fill-white text-white" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold font-mono">
                    {item.duration}
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <h3 className="font-bold text-lg leading-tight group-hover:text-indigo-400 transition-colors">{item.title}</h3>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {item.date}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
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
