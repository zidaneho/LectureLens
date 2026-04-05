import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { UserPreferences, UserProfile } from './types';

interface SettingsContextType {
  preferences: UserPreferences | null;
  email: string | null;
  userId: string | null;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  savePreferences: () => Promise<void>;
  isSaving: boolean;
  saveStatus: string | null;
  isLoading: boolean;
  syncFromServer: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const pendingChangesRef = useRef<Partial<UserPreferences>>({});

  const API_BASE_URL = 'http://localhost:8000/api';

  // Load preferences from server on mount
  useEffect(() => {
    syncFromServer();
  }, []);

  const syncFromServer = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('ll_token');
      if (!token) {
        // Not logged in - use defaults from localStorage
        try {
          const cached = localStorage.getItem('ll_user_profile');
          if (cached) {
            const profile: UserProfile = JSON.parse(cached);
            setPreferences(profile.preferences);
            setEmail(profile.email || null);
            setUserId(profile.user_id || null);
          } else {
            setPreferences({} as UserPreferences);
          }
        } catch (e) {
          console.error('Failed to load cached preferences', e);
          setPreferences({} as UserPreferences);
        }
        return;
      }

      const response = await fetch(`${API_BASE_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch profile');
      const data: UserProfile = await response.json();
      
      setPreferences(data.preferences);
      setEmail(data.email || null);
      setUserId(data.user_id || null);
      pendingChangesRef.current = {};
      setHasUnsavedChanges(false);
      
      localStorage.setItem('ll_user_profile', JSON.stringify(data));
    } catch (err) {
      console.error('Error syncing settings from server:', err);
      try {
        const cached = localStorage.getItem('ll_user_profile');
        if (cached) {
          const profile: UserProfile = JSON.parse(cached);
          setPreferences(profile.preferences);
          setEmail(profile.email || null);
          setUserId(profile.user_id || null);
        }
      } catch (e) {
        console.error('Failed to load cached preferences', e);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePreference = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      setPreferences(prev => {
        if (!prev) return null;
        return {
          ...prev,
          [key]: value
        };
      });

      pendingChangesRef.current[key] = value;
      setHasUnsavedChanges(true);

      try {
        const cached = localStorage.getItem('ll_user_profile');
        if (cached) {
          const profile: UserProfile = JSON.parse(cached);
          profile.preferences[key] = value;
          localStorage.setItem('ll_user_profile', JSON.stringify(profile));
        }
      } catch (e) {
        console.error('Failed to update localStorage cache', e);
      }
    },
    []
  );

  const savePreferences = useCallback(async () => {
    if (!preferences || !hasUnsavedChanges) return;

    setIsSaving(true);
    setSaveStatus('Saving...');

    try {
      const token = localStorage.getItem('ll_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/user/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          preferences: pendingChangesRef.current,
        }),
      });

      if (!response.ok) throw new Error('Failed to save preferences');

      const updatedProfile: UserProfile = await response.json();
      setPreferences(updatedProfile.preferences);
      setEmail(updatedProfile.email || null);
      setUserId(updatedProfile.user_id || null);
      
      localStorage.setItem('ll_user_profile', JSON.stringify(updatedProfile));
      
      pendingChangesRef.current = {};
      setHasUnsavedChanges(false);

      setSaveStatus('Settings saved successfully!');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      console.error('Error saving preferences:', err);
      setSaveStatus('Failed to save settings');
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setIsSaving(false);
    }
  }, [preferences, hasUnsavedChanges]);

  return (
    <SettingsContext.Provider
      value={{
        preferences,
        email,
        userId,
        updatePreference,
        savePreferences,
        isSaving,
        saveStatus,
        isLoading,
        syncFromServer,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
