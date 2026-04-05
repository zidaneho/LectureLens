import type { VideoData } from './types';

export const mockVideoData: VideoData = {
  id: "video-123",
  index_id: "index-123",
  video_id: "video-123-internal",
  title: "Introduction to Quantum Computing",
  video_url: "https://www.youtube.com/watch?v=k6U-i4gXJR8",
  twelve_labs_data: {
    transcript: [
      { start: 0, end: 15, text: "Welcome to this introduction to quantum computing." },
      { start: 15, end: 45, text: "Today we will explore the fundamental principles that make quantum computers different from classical ones." },
      { start: 45, end: 90, text: "First, let's talk about qubits. Unlike classical bits, qubits can exist in superposition." },
      { start: 90, end: 150, text: "Entanglement is another key concept, allowing qubits to be perfectly correlated even over vast distances." },
      { start: 150, end: 210, text: "Shor's algorithm demonstrates how quantum computers could potentially break modern encryption." },
      { start: 210, end: 300, text: "In conclusion, quantum computing is still in its early stages but holds immense potential." }
    ],
    key_concepts: [
      { label: "Classical vs Quantum", timestamp: 15 },
      { label: "Qubits & Superposition", timestamp: 45 },
      { label: "Entanglement", timestamp: 90 },
      { label: "Shor's Algorithm", timestamp: 150 },
      { label: "Future Outlook", timestamp: 210 }
    ]
  },
  lecture_notes: {
    markdown_content: "# Quantum Computing 101\n\n## Core Principles\n- **Superposition**: Ability of a quantum system to be in multiple states at once.\n- **Entanglement**: Phenomenon where particles remain connected regardless of distance.\n\n### Why it matters\nQuantum computers can solve certain problems exponentially faster than classical computers.\n\n### Notable Algorithms\n1. **Shor's Algorithm**: Efficiently factors large integers.\n2. **Grover's Algorithm**: Accelerates unstructured search problems.",
    external_resources: [
      { title: "Quantum Computing for Babies", url: "https://example.com/paper1", type: "paper" },
      { title: "IBM Quantum Lab", url: "https://quantum-computing.ibm.com/", type: "exercise" }
    ]
  }
};
