import React from 'react';
import FaceScanner from './components/FaceScanner';

function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 selection:bg-indigo-500/30">
      <header className="mb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 mb-4 tracking-tight">
          Face Structure Scanner
        </h1>
      </header>
      
      <main className="w-full max-w-4xl px-4">
        <FaceScanner />
      </main>
    </div>
  );
}

export default App;
