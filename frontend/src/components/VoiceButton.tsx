import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';

interface VoiceButtonProps {
  text: string;
  autoPlay?: boolean;
}

const API_BASE_URL = 'http://localhost:8000/api';

const VoiceButton: React.FC<VoiceButtonProps> = ({ text, autoPlay = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasAutoPlayed = useRef(false);

  const handleTogglePlay = async () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      return;
    }

    if (audioRef.current && audioRef.current.src) {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    setIsLoading(true);
    try {
      // Try to get ElevenLabs API key from local storage (saved in settings)
      let apiKey = '';
      try {
        const profileStr = localStorage.getItem('ll_user_profile');
        if (profileStr) {
          const profile = JSON.parse(profileStr);
          apiKey = profile.preferences?.elevenlabs_api_key || '';
        }
      } catch (e) {
        console.error('Error reading profile for ElevenLabs key:', e);
      }

      const response = await fetch(`${API_BASE_URL}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text,
          api_key: apiKey 
        }),
      });

      if (!response.ok) throw new Error('Failed to generate speech');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const audio = new Audio(url);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsPlaying(false);
      };

      audio.play();
      setIsPlaying(true);
    } catch (err) {
      console.error('Error playing speech:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (autoPlay && !hasAutoPlayed.current && text) {
      hasAutoPlayed.current = true;
      handleTogglePlay();
    }
  }, [autoPlay, text]);

  return (
    <button
      onClick={handleTogglePlay}
      disabled={isLoading}
      className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${
        isPlaying 
          ? 'bg-white text-black' 
          : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'
      }`}
      title={isPlaying ? "Stop" : "Speak"}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : isPlaying ? (
        <VolumeX className="w-3.5 h-3.5" />
      ) : (
        <Volume2 className="w-3.5 h-3.5" />
      )}
    </button>
  );
};

export default VoiceButton;
