import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Mic2, 
  Settings, 
  History, 
  AlertCircle, 
  Wifi, 
  WifiOff,
  User,
  Volume2,
  Play,
  Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProcessResult {
  token: string;
  speech: string;
  source: 'gemini' | 'fallback';
  warning?: string;
}

export default function App() {
  const [signals, setSignals] = useState<number[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<ProcessResult[]>([]);
  const [profile, setProfile] = useState('Patient prefers formal tone, polite Indonesian/English');
  const [status, setStatus] = useState<'online' | 'offline'>('online');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Simulate signal visualization
  useEffect(() => {
    if (!isRecording) return;
    
    const interval = setInterval(() => {
      const newVal = Math.random();
      setSignals(prev => [...prev.slice(-49), newVal]);
    }, 100);

    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;

    signals.forEach((val, i) => {
      const x = (i / 50) * canvas.width;
      const y = canvas.height - (val * canvas.height);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [signals]);

  const handleProcess = async () => {
    if (signals.length === 0) return;
    
    setIsLoading(true);
    setIsRecording(false);
    
    try {
      const response = await fetch('/api/process-signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signals, profile })
      });
      
      const data = await response.json();
      setResult(data);
      setHistory(prev => [data, ...prev].slice(0, 5));
      setStatus(data.source === 'gemini' ? 'online' : 'offline');
      
      // Text to Speech simulation
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(data.speech);
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error("Failed to process signals", error);
      setStatus('offline');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans p-4 md:p-8">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight italic font-serif">Glossa</h1>
          <p className="text-sm text-gray-500 uppercase tracking-widest font-mono">Neural-to-Speech Interface v2.6</p>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono ${status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {status === 'online' ? <Wifi size={14} /> : <WifiOff size={14} />}
            {status.toUpperCase()}
          </div>
          <button className="p-2 hover:bg-white rounded-full transition-colors border border-black/5">
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Signal Monitor - Large Bento Box */}
        <section className="md:col-span-8 bg-white rounded-3xl p-6 shadow-sm border border-black/5 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-gray-500 uppercase text-xs font-bold tracking-wider">
              <Activity size={16} className="text-emerald-500" />
              Micro-Pressure Signal Monitor
            </div>
            <div className="text-xs font-mono text-gray-400">SENSORS: ACTIVE</div>
          </div>
          
          <div className="relative h-64 bg-gray-50 rounded-2xl overflow-hidden border border-black/5">
            <canvas 
              ref={canvasRef} 
              width={800} 
              height={256} 
              className="w-full h-full"
            />
            {!isRecording && signals.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-serif italic">
                Waiting for neural input...
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => setIsRecording(!isRecording)}
              className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all ${isRecording ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-black text-white hover:bg-gray-800'}`}
            >
              {isRecording ? <Square size={20} /> : <Play size={20} />}
              {isRecording ? 'STOP CAPTURE' : 'START CAPTURE'}
            </button>
            <button 
              onClick={handleProcess}
              disabled={isLoading || signals.length === 0}
              className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-bold hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Mic2 size={20} />
              )}
              PROCESS INTENT
            </button>
          </div>
        </section>

        {/* Output - Medium Bento Box */}
        <section className="md:col-span-4 bg-black text-white rounded-3xl p-6 shadow-xl flex flex-col gap-6">
          <div className="flex items-center gap-2 text-gray-400 uppercase text-xs font-bold tracking-wider">
            <Volume2 size={16} className="text-emerald-400" />
            Speech Output
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key={result.speech}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <p className="text-3xl font-serif italic leading-tight">
                    "{result.speech}"
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-white/10 rounded text-[10px] font-mono text-gray-400">
                      {result.token}
                    </span>
                    {result.source === 'fallback' && (
                      <span className="flex items-center gap-1 text-amber-400 text-[10px] font-bold">
                        <AlertCircle size={10} /> OFFLINE FALLBACK
                      </span>
                    )}
                  </div>
                </motion.div>
              ) : (
                <p className="text-gray-500 font-serif italic text-lg">
                  Generated speech will appear here...
                </p>
              )}
            </AnimatePresence>
          </div>

          <div className="pt-6 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                <User size={20} className="text-gray-400" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Patient Profile</p>
                <p className="text-xs text-gray-300 truncate max-w-[200px]">{profile}</p>
              </div>
            </div>
          </div>
        </section>

        {/* History - Small Bento Box */}
        <section className="md:col-span-4 bg-white rounded-3xl p-6 shadow-sm border border-black/5">
          <div className="flex items-center gap-2 mb-4 text-gray-500 uppercase text-xs font-bold tracking-wider">
            <History size={16} />
            Recent History
          </div>
          <div className="space-y-3">
            {history.length > 0 ? history.map((h, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-xl border border-black/5">
                <p className="text-sm font-serif italic line-clamp-1">"{h.speech}"</p>
                <p className="text-[10px] font-mono text-gray-400 mt-1">{h.token}</p>
              </div>
            )) : (
              <p className="text-xs text-gray-400 italic">No history yet.</p>
            )}
          </div>
        </section>

        {/* Settings/Profile - Small Bento Box */}
        <section className="md:col-span-8 bg-white rounded-3xl p-6 shadow-sm border border-black/5">
          <div className="flex items-center gap-2 mb-4 text-gray-500 uppercase text-xs font-bold tracking-wider">
            <Settings size={16} />
            Patient Configuration
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-gray-400">Tone & Language Profile</label>
              <textarea 
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                className="w-full h-24 p-3 bg-gray-50 rounded-xl border border-black/5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                placeholder="Describe patient preferences..."
              />
            </div>
            <div className="flex flex-col justify-between">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-gray-400">System Health</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Latency</p>
                    <p className="text-lg font-mono font-bold text-emerald-700">24ms</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-600 uppercase">Battery</p>
                    <p className="text-lg font-mono font-bold text-blue-700">92%</p>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 italic mt-4">
                Optimized for Indonesian Health System (BPJS Ready)
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="max-w-7xl mx-auto mt-12 pt-8 border-t border-black/5 text-center">
        <p className="text-[10px] font-mono text-gray-400 uppercase tracking-[0.2em]">
          &copy; 2026 Glossa Neural Systems • High-Trust Healthcare AI
        </p>
      </footer>
    </div>
  );
}
