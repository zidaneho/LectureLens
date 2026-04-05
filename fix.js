const fs = require('fs');

const content = `import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Key, Moon, Info, CheckCircle2, 
  ChevronRight, LogOut, Bell, Shield, 
  ExternalLink, Mail, Sparkles, Play, Loader2, Volume2, Copy
} from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useTheme } from '../ThemeContext';
import { useSettings } from '../SettingsContext';
import type { UserPreferences } from '../types';

type Tab = 'account' | 'api' | 'appearance' | 'about';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('account');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isLocalSaving, setIsLocalSaving] = useState(false);
  const { setTheme } = useTheme();
  const { preferences: globalPrefs, email, syncFromServer } = useSettings();

  const [localPreferences, setLocalPreferences] = useState<UserPreferences | null>(null);
  const originalThemeRef = useRef(globalPrefs?.theme);

  useEffect(() => {
    if (globalPrefs) {
      originalThemeRef.current = globalPrefs.theme;
      setLocalPreferences(globalPrefs);
    }
  }, [globalPrefs]);

  // Revert global theme if component unmounts without saving
  useEffect(() => {
    return () => {
      if (originalThemeRef.current) {
        setTheme(originalThemeRef.current as any);
      }
    };
  }, [setTheme]);

  // Revert unsaved changes when switching tabs
  useEffect(() => {
    if (globalPrefs) {
      setLocalPreferences(globalPrefs);
      if (globalPrefs.theme) {
        setTheme(globalPrefs.theme);
      }
    }
  }, [activeTab, globalPrefs, setTheme]);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const copyToClipboard = async (text: string, label: string) => {
    if (!text || text.trim() === '') {
      showToast(\`No \${label} to copy\`, 'error');
      return;
    }
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        showToast(\`Successfully copied \${label}\`);
        setCopiedKey(label.toLowerCase().replace(/\\s+/g, '_'));
        setTimeout(() => setCopiedKey(null), 2000);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch (err) {
      console.error('Failed to copy:', err);
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        showToast(\`Successfully copied \${label}\`);
      } catch (fallbackErr) {
        showToast('Failed to copy to clipboard', 'error');
      }
    }
  };

  const personaSamples: { [key: string]: string } = {
    'Professor': 'https://storage.googleapis.com/eleven-public-prod/premade/voices/pNInz6obpgDQGcFmaJgB/ba43028d-1da5-4d64-8977-55c57016713f.mp3', 
    'Study Buddy': 'https://storage.googleapis.com/eleven-public-prod/premade/voices/IKne3meq5aSn9XLyUdCD/102de6f2-22ed-43e0-a1f1-111fa75c5481.mp3', 
    'Researcher': 'https://storage.googleapis.com/eleven-public-prod/premade/voices/pqHfZKP75CvOlQylNhV4/d782b3ff-84ba-4029-848c-acf01285524d.mp3'
  };

  const playPersonaSample = (persona: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    const sampleUrl = personaSamples[persona];
    if (sampleUrl) {
      audioRef.current = new Audio(sampleUrl);
      audioRef.current.play().catch(e => console.error("Playback failed", e));
    }
  };

  // Stop audio when tab changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const handleSave = async () => {
    if (!localPreferences) return;
    
    setSaveStatus('Saving...');
    setIsLocalSaving(true);
    try {
      const token = localStorage.getItem('ll_token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = \`Bearer \${token}\`;
      }

      const response = await fetch(\`http://localhost:8000/api/user/profile\`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          preferences: localPreferences
        }),
      });

      if (!response.ok) throw new Error('Failed to save settings');
      
      // Tell global context to sync
      await syncFromServer();
      
      setSaveStatus('Settings saved successfully!');
      setTimeout(() => setSaveStatus(null), 1500);
    } catch (err) {
      console.error('Error saving settings:', err);
      setSaveStatus('Failed to save settings');
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setIsLocalSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ll_token');
    localStorage.removeItem('ll_user_profile');
    navigate('/login', { replace: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  const updatePreference = (key: keyof UserPreferences, value: any) => {
    if (!localPreferences) return;
    
    setLocalPreferences(prev => {
      if (!prev) return null;
      return { ...prev, [key]: value };
    });

    if (key === 'theme') {
      setTheme(value);
    }

    if (key === 'persona') {
      playPersonaSample(value);
    }
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'appearance', label: 'Appearance', icon: Moon },
    { id: 'about', label: 'About', icon: Info },
  ];

  const SidebarItem = ({ tab }: { tab: typeof tabs[0] }) => (
    <button
      onClick={() => setActiveTab(tab.id)}
      className={\`
        w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative
        \${activeTab === tab.id 
          ? 'bg-accent text-accent-contrast font-bold shadow-lg' 
          : 'text-neutral-500 hover:bg-white/5 hover:text-white'}
      \`}
    >
      <tab.icon className={\`w-4 h-4 shrink-0 transition-colors duration-300 \${activeTab === tab.id ? 'text-accent-contrast' : 'text-neutral-500'}\`} />
      <motion.span 
        layout
        className="text-sm tracking-tight"
      >
        {tab.label}
      </motion.span>
      {activeTab === tab.id && (
        <motion.div 
          layoutId="sidebar-arrow"
          className="ml-auto"
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30
          }}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </motion.div>
      )}
    </button>
  );

  if (!localPreferences) {
    return (
      <div className="flex-1 flex items-center justify-center bg-primary h-full">
        <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-primary overflow-hidden">
      <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col md:flex-row p-6 md:p-12 gap-12 overflow-hidden">
        
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 space-y-8 shrink-0">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-primary mb-2 uppercase">Settings</h1>
            <p className="text-[11px] font-bold tracking-widest text-neutral-600 uppercase">Manage your workspace</p>
          </div>

          <LayoutGroup id="settings-sidebar">
            <div className="space-y-1">
              {tabs.map((tab) => (
                <SidebarItem key={tab.id} tab={tab} />
              ))}
            </div>
          </LayoutGroup>

          <div className="pt-8 border-t border-white/10">
            <button 
              onClick={handleLogout} 
              className="w-full flex items-center gap-3 px-4 py-3 text-red-500 bg-red-500/5 border border-red-500/10 hover:bg-red-500 hover:text-white hover:border-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] active:scale-[0.98] rounded-xl transition-all duration-300 group"
            >
              <LogOut className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
              <span className="text-sm font-bold tracking-tight">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
          <AnimatePresence mode="wait">
            {activeTab === 'account' && (
              <motion.div
                key="account"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-12"
              >
                <section className="space-y-6">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 flex items-center gap-2">
                    <User className="w-3.5 h-3.5" />
                    Profile Information
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider ml-1">Full Name</label>
                      <input 
                        type="text" 
                        value={localPreferences.full_name || ''}
                        onChange={(e) => updatePreference('full_name', e.target.value)}
                        className="w-full bg-secondary border border-white/10 rounded-xl px-4 py-3 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
                        placeholder="Zidane Ho"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider ml-1">Email Address</label>
                      <input 
                        type="email" 
                        value={email || ''}
                        className="w-full bg-secondary border border-white/10 rounded-xl px-4 py-3 text-sm text-neutral-500 focus:outline-none cursor-not-allowed"
                        disabled
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-6 pt-8 border-t border-white/10">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Preferences
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between ml-1">
                        <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">AI Persona</label>
                        <Volume2 className="w-3 h-3 text-neutral-600 animate-pulse" />
                      </div>
                      <select 
                        value={localPreferences.persona || 'Professor'}
                        onChange={(e) => updatePreference('persona', e.target.value)}
                        className="w-full bg-secondary border border-white/10 rounded-xl px-4 py-3 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-white/20 transition-all appearance-none"
                      >
                        <option value="Professor">Professor (Detailed & Formal)</option>
                        <option value="Study Buddy">Study Buddy (Conversational & Simple)</option>
                        <option value="Researcher">Researcher (Deep Dives & Citations)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider ml-1">Summary Length</label>
                      <div className="flex bg-secondary p-1 rounded-xl border border-white/10">
                        {(['short', 'medium', 'long'] as const).map((len) => (
                          <button
                            key={len}
                            onClick={() => updatePreference('summary_length', len)}
                            className={\`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all \${localPreferences.summary_length === len ? 'bg-accent text-accent-contrast' : 'text-neutral-500 hover:text-white'}\`}
                          >
                            {len}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-6 pt-8 border-t border-white/10">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5" />
                    Notifications
                  </h2>
                  <div className="space-y-4">
                    {[
                      { key: 'notify_processing', label: 'Processing Completion', desc: 'Notify when your video has finished indexing.' },
                      { key: 'notify_weekly', label: 'Weekly Summary', desc: 'Receive a report of your learning progress.' },
                    ].map((item) => {
                      const prefValue = localPreferences[item.key as keyof UserPreferences];
                      return (
                      <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-secondary border border-white/5">
                        <div>
                          <div className="text-[13px] font-semibold text-primary">{item.label}</div>
                          <div className="text-[11px] text-neutral-500">{item.desc}</div>
                        </div>
                        <div 
                          onClick={() => updatePreference(item.key as keyof UserPreferences, !prefValue)}
                          className={\`w-10 h-5 rounded-full relative cursor-pointer transition-colors\`}
                          style={{ backgroundColor: prefValue ? 'var(--toggle-thumb)' : 'var(--toggle-bg)' }}
                        >
                          <div 
                            className={\`absolute top-1 w-3 h-3 rounded-full transition-all \${prefValue ? 'right-1' : 'left-1'}\`}
                            style={{ backgroundColor: prefValue ? 'var(--bg-primary)' : 'var(--text-secondary)' }}
                          />
                        </div>
                      </div>
                    )})}
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'api' && (
              <motion.div
                key="api"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-12"
              >
                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5" />
                      Security & API Access
                    </h2>
                    <a href="#" className="text-[10px] font-bold text-primary hover:underline uppercase tracking-tighter flex items-center gap-1">
                      Documentation <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-5 rounded-2xl bg-secondary border border-white/10 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="text-[13px] font-bold text-primary uppercase tracking-tight">Google Gemini API</div>
                            <div className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">Generative Intelligence</div>
                          </div>
                        </div>
                        <div className="relative">
                          <input 
                            type="password"
                            value={localPreferences.gemini_api_key || ''}
                            onChange={(e) => updatePreference('gemini_api_key', e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="AIzaSy..."
                            className="w-full bg-primary/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-primary font-mono focus:outline-none focus:ring-1 focus:ring-white/20 transition-all pr-24"
                          />
                          <button 
                            onClick={() => copyToClipboard(localPreferences.gemini_api_key || '', 'Gemini Key')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold text-neutral-500 hover:text-white uppercase tracking-widest transition-all"
                          >
                            {copiedKey === 'gemini_key' ? (
                              <><CheckCircle2 className="w-3 h-3 text-green-500" /> Copied</>
                            ) : (
                              <><Copy className="w-3 h-3" /> Copy</>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="p-5 rounded-2xl bg-secondary border border-white/10 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                            <Play className="w-5 h-5 text-accent-contrast fill-accent-contrast" />
                          </div>
                          <div>
                            <div className="text-[13px] font-bold text-primary uppercase tracking-tight">Twelve Labs API</div>
                            <div className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">Video Understanding</div>
                          </div>
                        </div>
                        <div className="relative">
                          <input 
                            type="password"
                            value={localPreferences.twelve_labs_api_key || ''}
                            onChange={(e) => updatePreference('twelve_labs_api_key', e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="tl_..."
                            className="w-full bg-primary/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-primary font-mono focus:outline-none focus:ring-1 focus:ring-white/20 transition-all pr-24"
                          />
                          <button 
                            onClick={() => copyToClipboard(localPreferences.twelve_labs_api_key || '', 'Twelve Labs Key')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold text-neutral-500 hover:text-white uppercase tracking-widest transition-all"
                          >
                            {copiedKey === 'twelve_labs_key' ? (
                              <><CheckCircle2 className="w-3 h-3 text-green-500" /> Copied</>
                            ) : (
                              <><Copy className="w-3 h-3" /> Copy</>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="p-5 rounded-2xl bg-secondary border border-white/10 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
                            <ExternalLink className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="text-[13px] font-bold text-primary uppercase tracking-tight">Browser Use API</div>
                            <div className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">Web Navigation</div>
                          </div>
                        </div>
                        <div className="relative">
                          <input 
                            type="password"
                            value={localPreferences.browser_use_api_key || ''}
                            onChange={(e) => updatePreference('browser_use_api_key', e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="bu_..."
                            className="w-full bg-primary/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-primary font-mono focus:outline-none focus:ring-1 focus:ring-white/20 transition-all pr-24"
                          />
                          <button 
                            onClick={() => copyToClipboard(localPreferences.browser_use_api_key || '', 'Browser Use Key')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold text-neutral-500 hover:text-white uppercase tracking-widest transition-all"
                          >
                            {copiedKey === 'browser_use_key' ? (
                              <><CheckCircle2 className="w-3 h-3 text-green-500" /> Copied</>
                            ) : (
                              <><Copy className="w-3 h-3" /> Copy</>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="p-5 rounded-2xl bg-secondary border border-white/10 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center">
                            <Volume2 className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="text-[13px] font-bold text-primary uppercase tracking-tight">ElevenLabs API</div>
                            <div className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">Speech Synthesis</div>
                          </div>
                        </div>
                        <div className="relative">
                          <input 
                            type="password"
                            value={localPreferences.elevenlabs_api_key || ''}
                            onChange={(e) => updatePreference('elevenlabs_api_key', e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="el_..."
                            className="w-full bg-primary/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-primary font-mono focus:outline-none focus:ring-1 focus:ring-white/20 transition-all pr-24"
                          />
                          <button 
                            onClick={() => copyToClipboard(localPreferences.elevenlabs_api_key || '', 'ElevenLabs Key')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold text-neutral-500 hover:text-white uppercase tracking-widest transition-all"
                          >
                            {copiedKey === 'elevenlabs_key' ? (
                              <><CheckCircle2 className="w-3 h-3 text-green-500" /> Copied</>
                            ) : (
                              <><Copy className="w-3 h-3" /> Copy</>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                </section>
              </motion.div>
            )}

            {activeTab === 'appearance' && (
              <motion.div
                key="appearance"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-12"
              >
                <section className="space-y-6">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 flex items-center gap-2">
                    <Moon className="w-3.5 h-3.5" />
                    Theme & Style
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { id: 'dark_high', label: 'Dark High', desc: 'True Black & White' },
                      { id: 'dark_low', label: 'Dark Low', desc: 'Soft Grays & Slate' },
                      { id: 'light_high', label: 'Light High', desc: 'Pure White & Black' },
                    ].map((theme) => {
                      const isActive = localPreferences.theme === theme.id;
                      return (
                        <button 
                          key={theme.id}
                          onClick={() => updatePreference('theme', theme.id as any)}
                          className={\`p-5 rounded-2xl border transition-all text-left space-y-2 \${isActive ? 'bg-accent border-accent shadow-2xl' : 'bg-secondary border-white/10 hover:border-white/20'}\`}
                        >
                          <div className={\`text-sm font-bold \${isActive ? 'text-accent-contrast' : 'text-primary'}\`}>{theme.label}</div>
                          <div className={\`text-[10px] uppercase font-black tracking-widest \${isActive ? 'opacity-50 text-accent-contrast' : 'text-secondary'}\`}>{theme.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'about' && (
              <motion.div
                key="about"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-12"
              >
                <section className="space-y-6">
                  <div className="p-8 rounded-3xl bg-gradient-to-br from-neutral-900 to-black border border-white/10 flex flex-col items-center text-center space-y-4">
                    <div className="bg-white p-4 rounded-2xl shadow-2xl">
                      <Sparkles className="w-10 h-10 text-black" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">LectureLens v1.0.4</h3>
                      <p className="text-neutral-500 text-sm max-w-sm mx-auto mt-2">The ultimate platform for AI-powered lecture understanding and video synthesis.</p>
                    </div>
                    <div className="flex gap-4 pt-4">
                      <a href="#" className="p-2 text-neutral-400 hover:text-white transition-all"><Sparkles className="w-5 h-5" /></a>
                      <a href="#" className="p-2 text-neutral-400 hover:text-white transition-all"><Mail className="w-5 h-5" /></a>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 rounded-2xl bg-secondary border border-white/5">
                      <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Status</div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-sm font-bold text-primary uppercase tracking-tight">System Operational</span>
                      </div>
                    </div>
                    <div className="p-6 rounded-2xl bg-secondary border border-white/5">
                      <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Backend</div>
                      <div className="text-sm font-bold text-primary uppercase tracking-tight">Connected</div>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Save Button */}
          <div className="mt-12 pt-8 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {saveStatus && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={\`flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest \${saveStatus.includes('failed') ? 'text-red-500' : 'text-green-500'}\`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {saveStatus}
                </motion.div>
              )}
            </div>
            <button 
              onClick={handleSave}
              className="bg-accent text-accent-contrast px-8 py-3 rounded-xl font-black text-sm uppercase tracking-tight hover:opacity-90 transition-all shadow-xl active:scale-95 disabled:opacity-50"
              disabled={isLocalSaving}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Global Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100]"
          >
            <div className={\`px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md border \${
              toast.type === 'success' 
                ? 'bg-green-500/90 border-green-400/50 text-white' 
                : 'bg-red-500/90 border-red-400/50 text-white'
            }\`}>
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Shield className="w-5 h-5" />
              )}
              <span className="text-sm font-bold uppercase tracking-tight">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
`;

fs.writeFileSync('frontend/src/pages/Settings.tsx', content);
