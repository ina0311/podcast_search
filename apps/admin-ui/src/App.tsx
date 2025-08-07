import React, { useState } from 'react';
import SearchForm from './components/SearchForm';

interface Episode {
  id: number;
  title: string;
  url: string;
}

export default function App() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>Podcast Episode Search</h1>
      <SearchForm onResults={setEpisodes} />
      <ul style={{ marginTop: 16, listStyle: 'none', padding: 0 }}>
        {episodes.map((ep) => (
          <li key={ep.id} style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4, marginBottom: 8 }}>
            <a href={ep.url} target="_blank" rel="noreferrer">
              {ep.title}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
} 