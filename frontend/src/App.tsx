import React, { useState } from 'react';
import './App.css';

function App() {
  const [prompt, setPrompt] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setIsSearching(true);
    // TODO: Connect to backend POST /api/search-video
    console.log('Searching for video with prompt:', prompt);
  };

  return (
    <div className="app-container">
      {!isSearching ? (
        <div className="landing-state">
          <h1>LectureLens</h1>
          <p>Transform any video idea into a structured learning experience.</p>
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Enter a prompt or video URL (e.g., 'Explain Quantum Computing' or YouTube link)"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-button">
              Generate Lecture
            </button>
          </form>
        </div>
      ) : (
        <div className="processing-state">
          <h2>Processing your lecture...</h2>
          <p>Our agents are searching for the best video, transcribing, and generating notes.</p>
          <div className="spinner"></div>
          {/* TODO: Implement polling GET /api/task-status/{task_id} */}
        </div>
      )}
    </div>
  );
}

export default App;
