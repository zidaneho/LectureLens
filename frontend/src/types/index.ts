export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface KeyConcept {
  label: string;
  timestamp: number;
}

export interface ExternalResource {
  title: string;
  url: string;
  type: 'paper' | 'exercise' | 'article';
}

export interface VideoData {
  id: string;
  title: string;
  video_url: string;
  twelve_labs_data: {
    transcript: TranscriptSegment[];
    key_concepts: KeyConcept[];
  };
  lecture_notes: {
    markdown_content: string;
    external_resources: ExternalResource[];
  };
}
