import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { socketClient } from '../services/socket';
import {
  Activity,
  Volume2,
  VolumeX,
  Clock,
  Sparkles,
  RefreshCw,
  Building,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { SocketDisplayPayload } from '@smartqueue/shared';

export const DisplayScreenPage: React.FC = () => {
  const { hospitalId: paramHospitalId } = useParams();
  const [displayData, setDisplayData] = useState<SocketDisplayPayload | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeHospitalId, setActiveHospitalId] = useState<string>(paramHospitalId || '');

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial hospital if not in param
  useEffect(() => {
    const initHospital = async () => {
      if (!activeHospitalId) {
        try {
          const res = await api.get('/hospitals');
          if (res.data.success && res.data.data.length > 0) {
            setActiveHospitalId(res.data.data[0]._id);
          }
        } catch (err) {
          // Ignore
        }
      }
    };
    initHospital();
  }, [activeHospitalId]);

  // Socket and Polling for display data
  useEffect(() => {
    if (!activeHospitalId) return;

    fetchDisplayData();

    const socket = socketClient.connect();
    socketClient.joinHospital(activeHospitalId);

    const handleDisplayUpdate = (payload: SocketDisplayPayload) => {
      setDisplayData(payload);
      playChime();
    };

    socket.on('display:update', handleDisplayUpdate);

    // Fast polling fallback for TV screen
    const interval = setInterval(fetchDisplayData, 5000);

    return () => {
      socket.off('display:update', handleDisplayUpdate);
      socketClient.leaveHospital(activeHospitalId);
      clearInterval(interval);
    };
  }, [activeHospitalId]);

  const fetchDisplayData = async () => {
    if (!activeHospitalId) return;
    try {
      const res = await api.get(`/queue/display/${activeHospitalId}`);
      if (res.data.success) {
        setDisplayData(res.data.data);
      }
    } catch (err) {
      // Ignore
    }
  };

  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3); // G5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
      // Ignore
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 text-white flex flex-col justify-between selection:bg-medical-500 selection:text-white">
      {/* Top TV Header Bar */}
      <header className="px-6 py-4 bg-navy-900/90 border-b border-navy-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-medical-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-medical-500/30">
            <Activity className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              SmartQueue <span className="text-medical-400">Live Waiting Board</span>
            </h1>
            <p className="text-xs text-navy-400">
              Metro Health Multispecialty Hospital | Real-Time Consultation Queue
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Digital Clock */}
          <div className="text-right">
            <p className="text-2xl font-black tracking-widest text-teal-300 font-mono">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-[11px] text-navy-400 uppercase tracking-wider">
              {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-navy-200 transition-colors"
              title={soundEnabled ? 'Mute announcement chimes' : 'Enable announcement chimes'}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5 text-medical-400" /> : <VolumeX className="w-5 h-5 text-navy-500" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-navy-200 transition-colors"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Display Grid */}
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        {!displayData || displayData.departments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-20 text-navy-400">
            <Clock className="w-16 h-16 text-navy-600 animate-spin mb-4" />
            <h3 className="text-2xl font-bold text-white">Loading Live Queue Board...</h3>
            <p className="text-sm text-navy-500 mt-2">Connecting to hospital real-time feed...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {displayData.departments.map((dept) => (
              <div key={dept.departmentName} className="space-y-4">
                <div className="flex items-center gap-2 border-b border-navy-800 pb-2">
                  <span className="w-3 h-3 rounded-full bg-medical-500" />
                  <h2 className="text-xl font-bold uppercase tracking-wider text-medical-400">
                    {dept.departmentName} Department
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dept.doctors.map((doc) => (
                    <div
                      key={doc.doctorId}
                      className="bg-navy-900/90 border border-navy-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between"
                    >
                      {/* Doctor & Room Header */}
                      <div className="p-4 bg-navy-800/60 border-b border-navy-800 flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-extrabold text-white">{doc.doctorName}</h3>
                          <p className="text-xs text-navy-400">{doc.specialization}</p>
                        </div>
                        <div className="text-right">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-medical-500/20 text-medical-300 border border-medical-500/40 text-xs font-bold uppercase">
                            Room {doc.roomNumber}
                          </span>
                        </div>
                      </div>

                      {/* Now Serving Big Box */}
                      <div className="p-6 text-center bg-gradient-to-b from-navy-900 to-navy-950">
                        <p className="text-xs font-bold uppercase tracking-widest text-navy-400">
                          Now Serving
                        </p>
                        {doc.nowServingToken ? (
                          <div className="my-3">
                            <span className="text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-medical-400 via-teal-300 to-emerald-400 tracking-tight animate-pulse inline-block font-mono">
                              {doc.nowServingToken}
                            </span>
                          </div>
                        ) : (
                          <div className="my-5">
                            <span className="text-2xl font-bold text-navy-600 uppercase tracking-widest">
                              No Patient In Room
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Next in Queue Strip */}
                      <div className="p-3 bg-navy-950/80 border-t border-navy-800/80 flex items-center justify-between text-xs">
                        <span className="text-navy-400 font-semibold uppercase text-[11px]">
                          Next Up:
                        </span>
                        <div className="flex items-center gap-2">
                          {doc.nextTokens.length > 0 ? (
                            doc.nextTokens.map((t, idx) => (
                              <span
                                key={t}
                                className={`px-2 py-0.5 rounded font-mono font-bold ${
                                  idx === 0
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-navy-800 text-navy-300'
                                }`}
                              >
                                {t}
                              </span>
                            ))
                          ) : (
                            <span className="text-navy-600 font-medium italic">Queue Empty</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer Ticker */}
      <footer className="px-6 py-3 bg-navy-900/90 border-t border-navy-800 flex items-center justify-between text-xs text-navy-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Live Cloud Feed Active
          </span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">Please proceed to your assigned consultation room when your token is called.</span>
        </div>
        <Link to="/" className="text-medical-400 hover:text-medical-300 font-semibold">
          SmartQueue Portal →
        </Link>
      </footer>
    </div>
  );
};
