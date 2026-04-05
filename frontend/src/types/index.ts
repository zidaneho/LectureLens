export type UserPreferences = {
  full_name?: string;
  theme?: 'dark_high' | 'dark_low' | 'light_high';
  persona?: string;
  summary_length?: 'short' | 'medium' | 'long';
  gemini_api_key?: string;
  twelve_labs_api_key?: string;
  browser_use_api_key?: string;
  elevenlabs_api_key?: string;
  notify_processing?: boolean;
  notify_weekly?: boolean;
  browser_context?: string;
}

export type UserProfile = {
  user_id: string;
  email?: string;
  preferences: UserPreferences;
}

export type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
}

export type KeyConcept = {
  label: string;
  timestamp: number;
}

export type ExternalResource = {
  title: string;
  url: string;
  type: 'paper' | 'exercise' | 'article';
}

export type VideoData = {
  id: string; // Task ID
  index_id?: string;
  video_id?: string;
  title: string;
  video_url: string;
  twelve_labs_data?: {
    transcript: TranscriptSegment[];
    key_concepts: KeyConcept[];
  };
  lecture_notes?: {
    markdown_content: string;
    external_resources: ExternalResource[];
  };
}
