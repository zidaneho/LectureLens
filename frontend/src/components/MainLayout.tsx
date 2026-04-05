import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, MessageSquare, Settings, 
  Menu, X, Sparkles 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserProfile } from '../types';

const API_BASE_URL = 'http://localhost:8000/api';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const cached = localStorage.getItem('ll_user_profile');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const loadUserProfile = async () => {
      const token = localStorage.getItem('ll_token');
      if (!token) return;
      
      try {
        const response = await fetch(`${API_BASE_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setUserProfile(data);
          localStorage.setItem('ll_user_profile', JSON.stringify(data));
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
      }
    };

    loadUserProfile();
  }, []);

  const mockHistory = [
    { id: '1', title: 'Quantum Computing 101' },
    { id: '2', title: 'The Future of AI Agents' },
    { id: '3', title: 'React 19 Hooks Guide' },
  ];

  const getInitials = (name?: string): string => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const userName = userProfile?.preferences?.full_name || 'User';
  const userInitials = getInitials(userName);

  const prefetchSettings = () => {
    const token = localStorage.getItem('ll_token');
    if (!token) return;
    
    fetch(`${API_BASE_URL}/user/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        setUserProfile(data);
        localStorage.setItem('ll_user_profile', JSON.stringify(data));
      })
      .catch(() => {});
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-secondary border-r border-white/10">
      <div className="p-4 pt-6">
        <button 
          onClick={() => {
            navigate('/');
            setIsMobileMenuOpen(false);
          }}
          className="w-full flex items-center justify-center md:justify-start gap-2 px-3 py-2 border border-white/20 rounded-md hover:opacity-90 active:scale-[0.98] transition-all text-[13px] font-medium text-accent-contrast bg-accent"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span className="truncate">New Lecture</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-0.5 custom-scrollbar">
        <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider px-2 mb-1 mt-2">
          History
        </div>
        {mockHistory.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              navigate('/analysis', { state: { prompt: item.title } });
              setIsMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-neutral-800 text-[13px] text-neutral-400 hover:text-white transition-all group text-left"
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-40 group-hover:opacity-100" />
            <span className="truncate">{item.title}</span>
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-white/10">
        <div className="relative group">
          <button 
            onClick={() => {
              navigate('/settings');
              setIsMobileMenuOpen(false);
            }}
            onMouseEnter={prefetchSettings}
            className="w-full flex items-center gap-2.5 px-2 py-2.5 rounded-lg hover:bg-neutral-800 transition-colors text-[13px]"
          >
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-accent-contrast shrink-0 shadow-xl">
              {userInitials}
            </div>
            <div className="flex-1 text-left truncate">
              <div className="font-semibold text-white truncate text-xs">{userName}</div>
            </div>
            <Settings className="w-4 h-4 text-neutral-500 group-hover:text-white shrink-0 transition-colors mr-1" />
          </button>
          
          <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-2 py-1 bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest rounded opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50 shadow-2xl translate-y-1 group-hover:translate-y-0">
            Settings
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-primary text-primary overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[240px] flex-col h-full shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 bg-secondary z-50 md:hidden border-r border-white/10"
            >
              <div className="flex justify-between items-center p-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  <span className="font-bold text-sm tracking-tight text-primary uppercase">LectureLens</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-neutral-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-primary">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/10 bg-secondary/50 backdrop-blur-md z-30">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-neutral-400 hover:text-white">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <span className="font-bold text-sm tracking-tight text-primary uppercase">LectureLens</span>
          </div>
          <button onClick={() => navigate('/')} className="p-2 -mr-2 text-neutral-400 hover:text-white">
            <Plus className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 relative overflow-hidden flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
