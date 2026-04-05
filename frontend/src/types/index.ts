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
