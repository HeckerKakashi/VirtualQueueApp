/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Settings, 
  ArrowLeft, 
  RefreshCcw, 
  CheckCircle2, 
  Clock,
  Trash2,
  Play,
  QrCode,
  Volume2,
  VolumeX,
  ShieldAlert,
  BarChart3,
  Calendar,
  Lock,
  Pause,
  Zap,
  ArrowUpCircle,
  Eye,
  EyeOff,
  Bell,
  MapPin,
  Navigation,
  X,
  History,
  User,
  CreditCard,
  Star,
  Map as MapIcon,
  ChevronsRight,
  AlertCircle,
  Monitor,
  CreditCard as PaymentIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, useMap, ZoomControl, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- Types ---

type LocationID = 'WETNJOY' | 'HOSPITAL' | 'BANK' | 'THEMEPARK' | 'TEMPLE' | 'RESORT';

interface LocationConfig {
  id: LocationID;
  name: string;
  category: 'Hospital' | 'Park' | 'Bank' | 'Attraction' | 'Temple' | 'Resort' | 'Hotel';
  distance: string;
  travelTime: number; // in minutes
  icon: any;
  color: string;
  baseAvgTime: number; // base service time in minutes
  coordinates: [number, number];
  rating: number;
  status: 'Busy' | 'Moderate' | 'Low';
}

interface Token {
  id: string;
  number: number;
  name: string;
  locationId: LocationID;
  timestamp: number;
  priority: boolean;
}

interface PaymentInfo {
  status: 'PENDING' | 'VERIFIED' | 'FAILED';
  method: string;
  amount: number;
}

interface UserProfile {
  name: string;
  role: 'USER' | 'ADMIN';
  company?: string;
  email?: string;
  points?: number;
}

type Screen = 
  | 'HOME' 
  | 'PLACE_SELECT' 
  | 'PLACE_DETAILS' 
  | 'JOIN_FORM' 
  | 'USER_STATUS' 
  | 'HOST_LOGIN' 
  | 'HOST_DASHBOARD' 
  | 'SETTINGS'
  | 'PAYMENT'
  | 'HISTORY'
  | 'PROFILE'
  | 'KIOSK_VIEW'
  | 'LOGIN'
  | 'SIGNUP'
  | 'ADMIN_SIGNUP'
  | 'FEEDBACK';

// --- Constants ---

const LOCATIONS: LocationConfig[] = [
  { id: 'WETNJOY', name: 'Wet n Joy Waterpark', category: 'Attraction', distance: '12 km', travelTime: 25, icon: Zap, color: '#22d3ee', baseAvgTime: 3, coordinates: [18.7557, 73.4542], rating: 4.8, status: 'Moderate' },
  { id: 'HOSPITAL', name: 'City Central Hospital', category: 'Hospital', distance: '3.5 km', travelTime: 10, icon: ShieldAlert, color: '#f43f5e', baseAvgTime: 15, coordinates: [18.5204, 73.8567], rating: 4.5, status: 'Busy' },
  { id: 'BANK', name: 'Global Trust Bank', category: 'Bank', distance: '1.2 km', travelTime: 5, icon: Lock, color: '#f59e0b', baseAvgTime: 8, coordinates: [18.5304, 73.8667], rating: 4.2, status: 'Low' },
  { id: 'THEMEPARK', name: 'Magic Kingdom Ride', category: 'Attraction', distance: '0.5 km', travelTime: 2, icon: Zap, color: '#a855f7', baseAvgTime: 2, coordinates: [18.5404, 73.8767], rating: 4.9, status: 'Moderate' },
  { id: 'TEMPLE', name: 'Golden Shreemant Temple', category: 'Temple', distance: '2.4 km', travelTime: 8, icon: Star, color: '#fbbf24', baseAvgTime: 10, coordinates: [18.5133, 73.8544], rating: 5.0, status: 'Busy' },
  { id: 'RESORT', name: 'Blue Lagoon Resort', category: 'Resort', distance: '15 km', travelTime: 35, icon: Navigation, color: '#10b981', baseAvgTime: 5, coordinates: [18.7200, 73.4800], rating: 4.7, status: 'Moderate' },
];

// --- Utility Components ---

const GlassCard = ({ children, className = "", style = {}, onClick }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void; key?: any }) => (
  <div 
    onClick={onClick}
    className={`backdrop-blur-xl bg-white/[0.06] border border-white/10 rounded-[28px] sm:rounded-[40px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] ${className}`}
    style={style}
  >
    {children}
  </div>
);

const LargeButton = ({ 
  onClick, 
  children, 
  variant = 'primary', 
  className = "",
  icon: Icon,
  seniorMode = false
}: { 
  onClick: () => void; 
  children: React.ReactNode; 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';
  className?: string;
  icon?: any;
  seniorMode?: boolean;
}) => {
  const variants = {
    primary: 'bg-gradient-to-br from-[#3ddad7] to-[#2fb3a9] text-[#0b1f2a] shadow-[0_15px_40px_-10px_rgba(61,218,215,0.4)] hover:shadow-[0_20px_50px_-10px_rgba(61,218,215,0.6)] font-bold',
    secondary: 'bg-white/5 hover:bg-white/10 text-white border border-white/10 shadow-xl overflow-hidden',
    danger: 'bg-red-500 text-white shadow-lg shadow-red-500/20',
    ghost: 'bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-white/10',
    accent: 'bg-white text-bg-dark hover:bg-accent hover:text-bg-dark'
  };

  return (
    <motion.button
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full flex items-center justify-center gap-[12px] px-8 rounded-[24px] ${seniorMode ? 'text-4xl py-12 px-12 h-auto' : 'text-[18px] h-[72px]'} transition-all duration-300 cursor-pointer border-none ${variants[variant]} ${className}`}
    >
      {Icon && <Icon size={seniorMode ? 44 : 24} strokeWidth={2.5} />}
      <span className="tracking-tight">{children}</span>
    </motion.button>
  );
};

const QRCodePlaceholder = ({ value }: { value: string }) => (
  <div className="bg-white p-4 rounded-3xl w-48 h-48 mx-auto flex items-center justify-center relative overflow-hidden group">
    <QrCode size={120} className="text-bg-dark group-hover:scale-110 transition-transform duration-500" />
    <div className="absolute inset-0 bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity" />
  </div>
);

const MapRecenter = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

const SeniorTip = () => (
  <div className="bg-white/5 p-6 rounded-[32px] border-l-[8px] border-accent text-white/70 leading-relaxed text-xl">
    <strong className="text-accent block text-sm uppercase tracking-[0.3em] font-black mb-2">Help Center:</strong>
    Please relax in our comfortable seating area. A loud bell and bright notification will show when it's your turn.
  </div>
);

const LiveTrackingPanel = ({ 
  myToken, 
  getPosition, 
  getLiveWaitSeconds, 
  formatCountdown, 
  onClose,
  isOpen 
}: { 
  myToken: Token | null; 
  getPosition: (token: Token | null) => number;
  getLiveWaitSeconds: (token: Token | null) => number;
  formatCountdown: (seconds: number) => string;
  onClose: () => void;
  isOpen: boolean;
}) => {
  if (!myToken) return null;
  const pos = getPosition(myToken);
  const waitSec = getLiveWaitSeconds(myToken);
  const progress = Math.max(0, 100 - (pos * 15)); // Simple visual progress

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: isOpen ? 0 : 'calc(100% - 48px)' }}
      className="fixed right-0 top-20 sm:top-24 bottom-20 sm:bottom-24 w-[280px] sm:w-80 z-[3000] drop-shadow-2xl flex"
    >
      <button 
        onClick={onClose}
        className="h-20 sm:h-24 w-10 sm:w-12 bg-accent rounded-l-3xl self-center flex items-center justify-center text-bg-dark shadow-xl"
      >
        {isOpen ? <X size={20} /> : <ChevronsRight size={24} className="rotate-180" />}
      </button>

      <GlassCard className="flex-1 rounded-l-none border-l-0 p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 !bg-[#0b1218]/95 backdrop-blur-3xl overflow-y-auto">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-accent/20 flex items-center justify-center text-accent flex-shrink-0">
            <Zap size={18} fill="currentColor" />
          </div>
          <div>
            <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Live Tracking</h4>
            <p className="text-xs sm:text-sm font-bold text-white truncate max-w-[150px]">Active Session</p>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="text-center py-4 sm:py-6 bg-white/5 rounded-3xl border border-white/5 shadow-inner">
            <span className="block text-4xl sm:text-5xl font-[1000] text-accent tracking-tighter mb-1">{pos}</span>
            <span className="text-[9px] sm:text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">People Ahead</span>
          </div>

          <div className="flex justify-between items-end">
            <div>
              <span className="text-[9px] sm:text-[10px] font-black text-white/40 uppercase tracking-[0.2em] block mb-1">Number</span>
              <p className="text-xl sm:text-2xl font-black text-white">#{myToken.number}</p>
            </div>
            <div className="text-right">
              <span className="text-[9px] sm:text-[10px] font-black text-white/40 uppercase tracking-[0.2em] block mb-1">Wait</span>
              <p className="text-xl sm:text-2xl font-black text-accent">{formatCountdown(waitSec)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[9px] font-bold text-white/20 uppercase tracking-widest">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-accent to-cyan-400 rounded-full shadow-[0_0_10px_#3ddad7]"
              />
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4 space-y-3">
          <button className="w-full py-3 text-[9px] font-black uppercase tracking-widest text-white/40 border border-white/10 rounded-xl hover:bg-white/5 transition-all">
            Share Status
          </button>
          <p className="text-[8px] text-center text-white/20 uppercase tracking-widest font-bold">Refreshes every 5s</p>
        </div>
      </GlassCard>
    </motion.div>
  );
};

const BottomNavigation = ({ currentScreen, setScreen }: { currentScreen: Screen; setScreen: (s: Screen) => void }) => {
  const items: { screen: Screen; icon: any; label: string }[] = [
    { screen: 'HOME', icon: MapPin, label: 'Home' },
    { screen: 'PLACE_SELECT', icon: MapIcon, label: 'Map' },
    { screen: 'HISTORY', icon: History, label: 'History' },
    { screen: 'PROFILE', icon: User, label: 'Profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[4000] p-4 pointer-events-none">
      <div className="max-w-md mx-auto bg-[#0b1218]/80 backdrop-blur-2xl border border-white/10 rounded-[32px] p-2 flex justify-between items-center shadow-2xl pointer-events-auto">
        {items.map((item) => {
          const isActive = currentScreen === item.screen;
          return (
            <button
              key={item.label}
              onClick={() => setScreen(item.screen)}
              className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all ${isActive ? 'bg-accent/10 text-accent' : 'text-white/30 hover:text-white'}`}
            >
              <item.icon size={20} strokeWidth={isActive ? 3 : 2} />
              <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-40'}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface HistoryItem {
  token: Token;
  locationName: string;
  status: 'COMPLETED' | 'CANCELLED';
  date: string;
}

// --- Main App Component ---

export default function App() {
  const [screen, setScreen] = useState<Screen>('HOME');
  const [seniorMode, setSeniorMode] = useState(false);
  const [activeHostLocation, setActiveHostLocation] = useState<LocationID | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  
  const [queues, setQueues] = useState<Record<LocationID, Token[]>>({
    WETNJOY: [],
    HOSPITAL: [],
    BANK: [],
    THEMEPARK: [],
    TEMPLE: [],
    RESORT: []
  });
  
  const [servingIndices, setServingIndices] = useState<Record<LocationID, number>>({
    WETNJOY: -1,
    HOSPITAL: -1,
    BANK: -1,
    THEMEPARK: -1,
    TEMPLE: -1,
    RESORT: -1
  });
  
  const [counters, setCounters] = useState<Record<LocationID, number>>({
    WETNJOY: 0,
    HOSPITAL: 0,
    BANK: 0,
    THEMEPARK: 0,
    TEMPLE: 0,
    RESORT: 0
  });

  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    status: 'PENDING',
    method: 'Credit Card',
    amount: 15.00
  });

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLivePanelOpen, setIsLivePanelOpen] = useState(false);

  // Time tracking
  const [serviceTimers, setServiceTimers] = useState<Record<LocationID, number>>({
    WETNJOY: 0,
    HOSPITAL: 0,
    BANK: 0,
    THEMEPARK: 0,
    TEMPLE: 0,
    RESORT: 0
  });
  const [dynamicAverages, setDynamicAverages] = useState<Record<LocationID, number>>({
    WETNJOY: 3,
    HOSPITAL: 15,
    BANK: 8,
    THEMEPARK: 2,
    TEMPLE: 10,
    RESORT: 5
  });

  const [userName, setUserName] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<LocationID | null>(null);
  const [myToken, setMyToken] = useState<Token | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([18.5204, 73.8567]);

  const [loginData, setLoginData] = useState({ user: '', pass: '' });
  const [isPaused, setIsPaused] = useState(false);
  const [totalServed, setTotalServed] = useState(0);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  
  // Refs for audio to prevent browser blocking
  const lastAlertPos = useRef<Record<string, number>>({});

  // Geolocation setup
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserCoords([position.coords.latitude, position.coords.longitude]);
        setMapCenter([position.coords.latitude, position.coords.longitude]);
      });
    }
  }, []);

  // Tick Effect (Real-time updates)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      
      // Increment active service timers
      setServiceTimers(prev => {
        const next = { ...prev };
        LOCATIONS.forEach(loc => {
          if (!isPaused) {
            next[loc.id] += 1;
          }
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused]);

  // Queue Progression Simulation logic
  useEffect(() => {
    LOCATIONS.forEach(loc => {
      const avg = dynamicAverages[loc.id];
      const timer = serviceTimers[loc.id];
      
      // If timer reaches average service time (in seconds for demo, or mock it)
      // Let's use avg * 5 for a faster simulation in the preview
      if (timer >= avg * 5) {
        setServingIndices(prev => {
          const currentIndex = prev[loc.id];
          const queue = queues[loc.id];
          
          if (currentIndex < queue.length - 1) {
            // Serve next person
            const nextIdx = currentIndex + 1;
            const servedToken = queue[nextIdx];

            // If it's my token, alert me!
            if (myToken && myToken.id === servedToken.id) {
              playAlert('call', `Number ${servedToken.number}, your turn has arrived!`);
            } else if (myToken && getPosition(myToken) === 2) {
              playAlert('near', `Number ${myToken.number}, you are next in line. Please proceed.`);
            }

            setTotalServed(t => t + 1);
            return { ...prev, [loc.id]: nextIdx };
          }
          return prev;
        });

        // Reset timer for this location
        setServiceTimers(prev => ({ ...prev, [loc.id]: 0 }));
      }
    });
  }, [serviceTimers, queues, myToken, dynamicAverages]);

  // Sound & Voice Alerts
  const playAlert = (type: 'ding' | 'call' | 'near', text?: string) => {
    if (isMuted) return;

    if (type === 'ding') {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 1);
    }

    if (text && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const formattedTime = currentTime.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    month: 'long',
    day: 'numeric'
  });

  const generateToken = (priority = false) => {
    const finalName = currentUser?.name || userName;
    if (!finalName.trim() || !selectedLocationId) return;
    if (isPaused) {
      alert("Queue is currently paused by host.");
      return;
    }

    const nextNum = counters[selectedLocationId] + 1;
    const newToken: Token = {
      id: Math.random().toString(36).substr(2, 9),
      number: nextNum,
      name: finalName,
      locationId: selectedLocationId,
      timestamp: Date.now(),
      priority
    };

    setQueues(prev => ({
      ...prev,
      [selectedLocationId]: priority ? [newToken, ...prev[selectedLocationId]] : [...prev[selectedLocationId], newToken]
    }));
    setCounters(prev => ({ ...prev, [selectedLocationId]: nextNum }));
    setMyToken(newToken);
    setUserName('');
    setScreen('USER_STATUS');
    setIsLivePanelOpen(true);
    playAlert('ding', `Success! You are now in line at ${LOCATIONS.find(l => l.id === selectedLocationId)?.name}. Your number is ${nextNum}.`);
  };

  const handleJoinQueue = () => {
    if (!selectedLocationId) return;
    setPaymentInfo(prev => ({ ...prev, status: 'PENDING' }));
    if (!currentUser && !userName.trim()) {
      setScreen('JOIN_FORM');
    } else {
      setScreen('PAYMENT');
    }
  };

  const verifyPayment = () => {
    setPaymentInfo(prev => ({ ...prev, status: 'VERIFIED' }));
    setTimeout(() => {
      generateToken();
    }, 1500);
  };

  const cancelQueue = () => {
    if (!myToken) return;
    if (window.confirm("Are you sure you want to leave the queue?")) {
      const loc = LOCATIONS.find(l => l.id === myToken.locationId);
      setHistory(prev => [{
        token: myToken,
        locationName: loc?.name || 'Unknown',
        status: 'CANCELLED',
        date: new Date().toLocaleDateString()
      }, ...prev]);
      
      setQueues(prev => ({
        ...prev,
        [myToken.locationId]: prev[myToken.locationId].filter(t => t.id !== myToken.id)
      }));
      setMyToken(null);
      setScreen('HOME');
      setIsLivePanelOpen(false);
    }
  };

  const completeQueue = () => {
    if (!myToken) return;
    const loc = LOCATIONS.find(l => l.id === myToken.locationId);
    setHistory(prev => [{
      token: myToken,
      locationName: loc?.name || 'Unknown',
      status: 'COMPLETED',
      date: new Date().toLocaleDateString()
    }, ...prev]);
    setMyToken(null);
    setIsLivePanelOpen(false);
  };

  const callNext = (locationId: LocationID) => {
    if (servingIndices[locationId] < queues[locationId].length - 1) {
      const nextIdx = servingIndices[locationId] + 1;
      setServingIndices(prev => ({ ...prev, [locationId]: nextIdx }));
      setServiceTimers(prev => ({ ...prev, [locationId]: 0 })); // Reset timer for new person
      setTotalServed(prev => prev + 1);

      const token = queues[locationId][nextIdx];
      playAlert('ding', `Token ${token.number}, ${token.name}. Please proceed to counter.`);
    }
  };

  const removeToken = (locationId: LocationID, id: string) => {
    const serviceQueue = queues[locationId];
    const index = serviceQueue.findIndex(t => t.id === id);
    if (index === -1) return;

    // If it's the currently serving person, update dynamic average based on actual time spent
    if (index === servingIndices[locationId]) {
      const actualSeconds = serviceTimers[locationId];
      if (actualSeconds > 30) { // Only count if they spent meaningful time
        const actualMinutes = Math.round(actualSeconds / 60);
        setDynamicAverages(prev => ({
          ...prev,
          [locationId]: Math.max(1, Math.round((prev[locationId] * 4 + actualMinutes) / 5)) // Weighted average
        }));
      }
    }

    setQueues(prev => ({
      ...prev,
      [locationId]: prev[locationId].filter(t => t.id !== id)
    }));

    if (index <= servingIndices[locationId]) {
      setServingIndices(prev => ({ ...prev, [locationId]: Math.max(-1, servingIndices[locationId] - 1) }));
    }
  };

  const resetQueue = (locationId: LocationID) => {
    if (window.confirm(`Clear the entire queue for ${LOCATIONS.find(l => l.id === locationId)?.name}?`)) {
      setQueues(prev => ({ ...prev, [locationId]: [] }));
      setServingIndices(prev => ({ ...prev, [locationId]: -1 }));
      setCounters(prev => ({ ...prev, [locationId]: 0 }));
      setServiceTimers(prev => ({ ...prev, [locationId]: 0 }));
      if (myToken?.locationId === locationId) setMyToken(null);
    }
  };

  const getPosition = (token: Token | null) => {
    if (!token) return -1;
    const q = queues[token.locationId];
    const index = q.findIndex(t => t.id === token.id);
    if (index === -1) return -1;
    const pos = index - servingIndices[token.locationId];
    return pos > 0 ? pos : 0;
  };

  const getLiveWaitSeconds = (token: Token | null) => {
    if (!token || getPosition(token) === -1) return 0;
    const pos = getPosition(token);
    if (pos === 0) return 0;

    const avgMinutes = dynamicAverages[token.locationId];
    const avgSeconds = avgMinutes * 60;
    
    // Time for the current person being served
    const currentPersonRemaining = Math.max(0, avgSeconds - serviceTimers[token.locationId]);
    
    // Time for everyone else in between
    const othersTime = (pos - 1) * avgSeconds;
    
    return currentPersonRemaining + othersTime;
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleLogin = () => {
    const credentials: Record<string, LocationID> = {
      'wetnjoy_admin': 'WETNJOY',
      'hospital_admin': 'HOSPITAL',
      'bank_admin': 'BANK',
      'themepark_admin': 'THEMEPARK'
    };

    if (credentials[loginData.user] && loginData.pass === '1234') {
      setActiveHostLocation(credentials[loginData.user]);
      setScreen('HOST_DASHBOARD');
      setLoginData({ user: '', pass: '' });
    } else {
      alert('Invalid Credentials. Use wetnjoy_admin, hospital_admin, etc. with password 1234');
    }
  };

  // --- State Simulation (Realism) ---
  useEffect(() => {
    const interval = setInterval(() => {
      setQueues(prev => {
        const next = { ...prev };
        LOCATIONS.forEach(loc => {
          // 5% chance of a new person joining
          if (Math.random() > 0.95) {
            const nextNum = next[loc.id].length > 0 
              ? next[loc.id][next[loc.id].length - 1].number + 1 
              : 1;
            next[loc.id] = [...next[loc.id], {
              id: `${loc.id}_${Date.now()}`,
              locationId: loc.id, // Using locationId as per new structure
              number: nextNum,
              name: 'Guest',
              timestamp: Date.now()
            }];
          }
        });
        return next;
      });

      // Gradually update serving indices for hosts
      setServingIndices(prev => {
        const next = { ...prev };
        LOCATIONS.forEach(loc => {
          // If queue is long and host is "active", 2% chance to serve next automatically
          if (next[loc.id] < queues[loc.id].length - 1 && Math.random() > 0.98) {
             next[loc.id] += 1;
             setTotalServed(t => t + 1);
          }
        });
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [queues]);

  // Near Turn & Travel Notifications Logic
  useEffect(() => {
    if (myToken) {
      const loc = LOCATIONS.find(l => l.id === myToken.locationId)!;
      const pos = getPosition(myToken);
      const waitSeconds = getLiveWaitSeconds(myToken);
      const waitMinutes = Math.floor(waitSeconds / 60);
      const leaveTime = waitMinutes - loc.travelTime;
      
      const keyPos = `${myToken.id}_pos_${pos}`;
      const keyTravel = `${myToken.id}_travel`;
      
      // Near turn alert
      if (pos > 0 && pos <= 3 && !lastAlertPos.current[keyPos]) {
        playAlert('near', `Please get ready. Only ${pos} people ahead of you.`);
        lastAlertPos.current[keyPos] = pos;
      }

      // Next turn alert
      if (pos === 0 && !lastAlertPos.current[`${myToken.id}_next`]) {
         playAlert('ding', `It is your turn! Please proceed to the counter.`);
         lastAlertPos.current[`${myToken.id}_next`] = 1;
      }

      // Smart Travel alert
      if (leaveTime <= 0 && pos > 0 && !lastAlertPos.current[keyTravel]) {
        playAlert('call', `Your turn is approaching. You are currently in standby. Please reach the location as fast as possible to avoid losing your spot.`);
        lastAlertPos.current[keyTravel] = 1;
      }
    }
  }, [queues, servingIndices, myToken]);

  return (
    <div className={`min-h-screen bg-[#0b1218] text-white font-sans selection:bg-accent selection:text-bg-dark overflow-x-hidden relative ${seniorMode ? 'text-2xl' : ''}`}>
      {/* Premium Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/5 blur-[120px] rounded-full" />
      </div>

      <header className="fixed top-0 left-0 right-0 z-[3000] p-4 sm:p-6 flex justify-between items-center bg-[#0b1218]/80 backdrop-blur-2xl border-b border-white/5">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-2 sm:p-2.5 bg-accent/20 rounded-xl border border-accent/30 shadow-[0_0_20px_rgba(61,218,215,0.2)]">
            <Zap className="text-accent" size={20} sm:size={28} />
          </div>
          <span className="text-xl sm:text-2xl font-[1000] tracking-tighter uppercase italic truncate">QUEUE<span className="text-accent underline decoration-4 underline-offset-4">NOW</span></span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={() => setIsMuted(!isMuted)} 
            className="p-2 sm:p-3 bg-white/5 rounded-xl sm:rounded-2xl border border-white/10 text-white/40 hover:text-accent transition-all shadow-xl"
          >
            {isMuted ? <VolumeX size={20} sm:size={24} /> : <Volume2 size={20} sm:size={24} />}
          </button>
          <button 
            onClick={() => setSeniorMode(!seniorMode)} 
            className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl border transition-all shadow-xl ${seniorMode ? 'bg-accent text-bg-dark border-accent font-black' : 'bg-white/5 text-white/40 border-white/10 font-bold'}`}
          >
            <Eye size={16} sm:size={20} />
            <span className="text-[10px] sm:text-xs uppercase tracking-widest hidden sm:inline">Senior Mode</span>
          </button>
        </div>
      </header>

      {/* Persistent Components */}
      <LiveTrackingPanel 
        myToken={myToken}
        getPosition={getPosition}
        getLiveWaitSeconds={getLiveWaitSeconds}
        formatCountdown={formatCountdown}
        isOpen={isLivePanelOpen}
        onClose={() => setIsLivePanelOpen(!isLivePanelOpen)}
      />

      {screen !== 'HOST_DASHBOARD' && screen !== 'KIOSK_VIEW' && (
        <BottomNavigation currentScreen={screen} setScreen={setScreen} />
      )}

      <div className="relative z-10 pt-32 pb-40 px-4 md:px-12 flex flex-col items-center">
        <main className="w-full max-w-6xl mx-auto flex flex-col items-center justify-center flex-1">
          <AnimatePresence mode="wait">
            {screen === 'LOGIN' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full mx-auto"
              >
                <GlassCard className="p-10 space-y-8">
                  <div className="text-center">
                    <h2 className="text-4xl font-black uppercase tracking-tighter italic">Login</h2>
                    <p className="text-white/40 text-xs uppercase font-bold tracking-widest mt-2">Access your secure node</p>
                  </div>
                  <div className="space-y-4">
                    <input 
                      type="email" 
                      placeholder="Email Address"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-bold focus:border-accent outline-none"
                    />
                    <input 
                      type="password" 
                      placeholder="Password"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-bold focus:border-accent outline-none"
                    />
                    <LargeButton onClick={() => {
                      setCurrentUser({ name: 'Alex Sterling', role: 'USER', email: 'alex@example.com', points: 1250 });
                      setScreen('HOME');
                    }}>Sign In</LargeButton>
                  </div>
                  <div className="text-center">
                    <button onClick={() => setScreen('SIGNUP')} className="text-xs font-bold text-accent uppercase tracking-widest">Create Account</button>
                    <div className="h-px bg-white/10 my-4" />
                    <button onClick={() => setScreen('ADMIN_SIGNUP')} className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] hover:text-white transition-colors">Register as Business Admin</button>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {screen === 'SIGNUP' && (
              <motion.div
                key="signup"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full mx-auto"
              >
                <GlassCard className="p-10 space-y-8">
                  <div className="text-center">
                    <h2 className="text-4xl font-black uppercase tracking-tighter italic">Sign Up</h2>
                    <p className="text-white/40 text-xs uppercase font-bold tracking-widest mt-2">Join the virtual network</p>
                  </div>
                  <div className="space-y-4">
                    <input 
                      type="text" 
                      placeholder="Full Name"
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-bold focus:border-accent outline-none"
                    />
                    <input 
                      type="email" 
                      placeholder="Email Address"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-bold focus:border-accent outline-none"
                    />
                    <input 
                      type="password" 
                      placeholder="Password"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-bold focus:border-accent outline-none"
                    />
                    <LargeButton onClick={() => {
                      setCurrentUser({ name: userName || 'New User', role: 'USER', points: 0 });
                      setScreen('HOME');
                    }}>Join Now</LargeButton>
                  </div>
                  <button onClick={() => setScreen('LOGIN')} className="w-full text-xs font-bold text-white/30 uppercase tracking-widest">Back to Login</button>
                </GlassCard>
              </motion.div>
            )}

            {screen === 'ADMIN_SIGNUP' && (
              <motion.div
                key="admin-signup"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full mx-auto"
              >
                <GlassCard className="p-10 space-y-8">
                  <div className="text-center">
                    <h2 className="text-4xl font-black uppercase tracking-tighter italic">Admin Node</h2>
                    <p className="text-accent text-xs uppercase font-black tracking-[0.2em] mt-2">Business Registration</p>
                  </div>
                  <div className="space-y-4">
                    <input 
                      type="text" 
                      placeholder="Company Name"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-bold focus:border-accent outline-none"
                    />
                    <input 
                      type="text" 
                      placeholder="Admin Name"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-bold focus:border-accent outline-none"
                    />
                    <input 
                      type="email" 
                      placeholder="Work Email"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-bold focus:border-accent outline-none"
                    />
                    <LargeButton onClick={() => {
                      setCurrentUser({ name: 'Admin', role: 'ADMIN', company: 'QueuNow Corp' });
                      setScreen('HOST_DASHBOARD');
                    }}>Deploy Node</LargeButton>
                  </div>
                  <button onClick={() => setScreen('LOGIN')} className="w-full text-xs font-bold text-white/30 uppercase tracking-widest">Cancel Deployment</button>
                </GlassCard>
              </motion.div>
            )}

            {screen === 'FEEDBACK' && (
              <motion.div
                key="feedback"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full mx-auto"
              >
                <GlassCard className="p-10 space-y-8 text-center">
                  <div className="w-20 h-20 bg-accent/20 rounded-3xl mx-auto flex items-center justify-center text-accent">
                    <Star size={40} fill="currentColor" />
                  </div>
                  <h2 className="text-4xl font-black uppercase tracking-tighter">Rate Experience</h2>
                  <p className="text-white/40 text-sm">How was your queue experience at {LOCATIONS.find(l => l.id === myToken?.locationId)?.name}?</p>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button key={s} className="p-4 bg-white/5 rounded-2xl hover:bg-accent/20 hover:text-accent transition-all">
                        <Star size={24} />
                      </button>
                    ))}
                  </div>
                  <textarea 
                    placeholder="Optional message..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 h-32 focus:border-accent outline-none"
                  />
                  <LargeButton onClick={() => {
                    completeQueue();
                    setScreen('HOME');
                  }}>Submit Feedback</LargeButton>
                </GlassCard>
              </motion.div>
            )}
            {screen === 'KIOSK_VIEW' && (
              <motion.div
                key="kiosk-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-[1400px] mx-auto"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-4">
                  {LOCATIONS.map(loc => (
                    <div key={loc.id}>
                      <GlassCard className="p-6 sm:p-12 text-center border-b-[8px] sm:border-b-[12px]" style={{ borderColor: loc.color }}>
                      <div className="flex items-center justify-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                        <loc.icon className="text-accent" size={24} sm:size={32} />
                        <h2 className="text-xl sm:text-3xl font-[900] tracking-tighter uppercase whitespace-nowrap">{loc.name}</h2>
                      </div>

                      <div className="bg-white/5 rounded-[40px] sm:rounded-[60px] py-8 sm:py-12 border border-white/10 mb-6 sm:mb-8">
                        <span className="text-white/20 font-black text-[10px] sm:text-sm uppercase tracking-[0.4em] mb-2 sm:mb-4 block">Serving</span>
                        <motion.span 
                          key={servingIndices[loc.id]}
                          initial={{ scale: 0.5, opacity: 0, y: 20 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          className="text-[6rem] sm:text-[10rem] font-[1000] tracking-tighter leading-none text-white block"
                        >
                          {servingIndices[loc.id] >= 0 ? queues[loc.id][servingIndices[loc.id]].number : '---'}
                        </motion.span>
                      </div>

                      <div className="flex flex-col gap-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.4em] text-white/30">Up Next</h3>
                        <div className="flex justify-center gap-4">
                          {[...queues[loc.id]].slice(servingIndices[loc.id] + 1, servingIndices[loc.id] + 6).map((t, i) => (
                            <div key={t.id} className="w-14 h-14 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center font-bold text-lg opacity-60">
                              {t.number}
                            </div>
                          ))}
                          {queues[loc.id].length <= servingIndices[loc.id] + 1 && (
                            <span className="text-xs font-bold text-white/10 uppercase italic">Standby...</span>
                          )}
                        </div>
                      </div>
                      </GlassCard>
                    </div>
                  ))}
                </div>
                
                <div className="mt-12 text-center">
                   <button 
                    onClick={() => setScreen('HOME')}
                    className="text-white/20 hover:text-white uppercase font-black tracking-widest text-xs border border-white/10 px-8 py-4 rounded-full bg-white/5 backdrop-blur-md"
                   >
                     Exit Public Display
                   </button>
                </div>
              </motion.div>
            )}

          {screen === 'HOME' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              <div className="space-y-8">
                <div className="space-y-4">
                  {currentUser ? (
                    <div className="flex items-center gap-3 bg-white/5 w-fit px-4 py-2 rounded-2xl border border-white/5 mb-4">
                      <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                        <User size={16} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-white/60">
                        Node Active: <span className="text-white">{currentUser.name}</span>
                      </span>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setScreen('LOGIN')}
                      className="text-[10px] font-black uppercase tracking-[0.4em] text-accent/60 hover:text-accent transition-all flex items-center gap-2 mb-4"
                    >
                      <Lock size={12} /> Secure Login Required
                    </button>
                  )}
                  <h1 className="text-5xl sm:text-7xl font-[1000] tracking-tight leading-[0.9] uppercase italic">
                    Skip the <br /><span className="text-accent underline decoration-accent/20">Wait.</span>
                  </h1>
                  <p className="text-white/40 text-lg font-bold uppercase tracking-widest max-w-sm leading-relaxed">
                    Premium queue management for the next generation of logistics.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <GlassCard className="p-6 flex flex-col gap-4 group cursor-pointer hover:bg-white/10 transition-all border-b-4 border-accent shadow-2xl" onClick={() => setScreen('PLACE_SELECT')}>
                    <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center text-bg-dark shadow-[0_0_20px_rgba(61,218,215,0.4)] transition-transform group-hover:scale-110">
                      <Search size={24} strokeWidth={3} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-white">Find Place</h4>
                      <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mt-1">Explore nearby</p>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-6 flex flex-col gap-4 group cursor-pointer hover:bg-white/10 transition-all shadow-2xl" onClick={() => setScreen('HISTORY')}>
                    <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400 transition-transform group-hover:scale-110">
                      <History size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-white">Visited</h4>
                      <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mt-1">Review activity</p>
                    </div>
                  </GlassCard>
                </div>

                {myToken && (
                  <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                    <LargeButton 
                      onClick={() => setScreen('USER_STATUS')}
                      variant="accent"
                      className="h-[80px] text-xl font-[1000] tracking-widest gap-4 mt-4"
                    >
                      LIVE TRACKING <ChevronsRight size={24} strokeWidth={3} />
                    </LargeButton>
                  </motion.div>
                )}
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Real-time Pulse</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-green-500/60 uppercase tracking-widest">Active</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {LOCATIONS.slice(0, 4).map(loc => {
                     const waiting = Math.max(0, queues[loc.id].length - (servingIndices[loc.id] + 1));
                     return (
                      <GlassCard key={loc.id} className="p-6 flex items-center justify-between group hover:border-accent/30 transition-all cursor-pointer" onClick={() => { setSelectedLocationId(loc.id); setScreen('PLACE_SELECT'); }}>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: `${loc.color}20`, color: loc.color }}>
                            <loc.icon size={24} />
                          </div>
                          <div>
                            <p className="text-sm font-black uppercase tracking-widest text-white">{loc.name}</p>
                            <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest mt-1">{loc.status} Traffic • {loc.distance}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-white italic tracking-tighter">{waiting}</p>
                          <p className="text-[9px] text-white/20 font-black uppercase">Wait</p>
                        </div>
                      </GlassCard>
                     );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {screen === 'PAYMENT' && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="max-w-md w-full mx-auto"
            >
              <GlassCard className="p-10 text-center space-y-10 shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
                <div className="space-y-4">
                  <div className="w-20 h-20 bg-accent/20 rounded-3xl mx-auto flex items-center justify-center text-accent shadow-inner">
                    <PaymentIcon size={40} />
                  </div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter">Secure Checkout</h2>
                  <p className="text-white/40 text-xs uppercase tracking-widest font-bold">Verification Required to Join Queue</p>
                </div>

                <div className="bg-white/5 rounded-3xl p-8 border border-white/5 shadow-inner space-y-6">
                  <div className="flex justify-between text-sm uppercase font-black tracking-widest">
                    <span className="text-white/40">Queue Fee</span>
                    <span>$12.00</span>
                  </div>
                  <div className="flex justify-between text-sm uppercase font-black tracking-widest">
                    <span className="text-white/40">Tax</span>
                    <span>$3.00</span>
                  </div>
                  <div className="h-px bg-white/10 my-2" />
                  <div className="flex justify-between text-xl uppercase font-black tracking-widest">
                    <span className="text-accent italic">Total</span>
                    <span className="text-white">$15.00</span>
                  </div>
                </div>

                {paymentInfo.status === 'VERIFIED' ? (
                  <div className="space-y-6">
                    <div className="flex flex-col items-center gap-4 text-green-500 font-black uppercase tracking-[0.2em]">
                      <CheckCircle2 size={48} className="animate-pulse" />
                      Verification Successful
                    </div>
                    <p className="text-[10px] text-white/20 uppercase tracking-widest font-black italic">Initializing secure node...</p>
                  </div>
                ) : (
                  <div className="space-y-4 pt-4">
                    <LargeButton onClick={verifyPayment} icon={ShieldAlert}>
                      Complete Payment
                    </LargeButton>
                    <button onClick={() => setScreen('PLACE_SELECT')} className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white transition-colors">
                      Decline Transaction
                    </button>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          )}

          {screen === 'HISTORY' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="max-w-2xl w-full mx-auto space-y-8"
            >
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h2 className="text-5xl font-[1000] uppercase italic tracking-tighter">History</h2>
                  <p className="text-white/20 text-xs font-black uppercase tracking-widest">Activity Log</p>
                </div>
              </div>

              {history.length > 0 ? (
                <div className="space-y-4">
                  {history.map((item, idx) => (
                    <GlassCard key={idx} className="p-6 flex items-center justify-between border-l-8" style={{ borderColor: item.status === 'COMPLETED' ? '#22d3ee' : '#f43f5e' }}>
                      <div className="flex items-center gap-5">
                         <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${item.status === 'COMPLETED' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-red-500/20 text-red-500'}`}>
                           {item.status === 'COMPLETED' ? <CheckCircle2 size={24} /> : <X size={24} />}
                         </div>
                         <div>
                            <p className="text-lg font-black uppercase tracking-widest text-white">{item.locationName}</p>
                            <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mt-1">Ticket #{item.token.number} • {item.date}</p>
                         </div>
                      </div>
                      <button 
                        onClick={() => { setSelectedLocationId(item.token.locationId); handleJoinQueue(); }}
                        className="p-4 bg-white/5 rounded-2xl text-accent hover:bg-accent hover:text-bg-dark transition-all shadow-xl"
                      >
                        <RefreshCcw size={20} />
                      </button>
                    </GlassCard>
                  ))}
                </div>
              ) : (
                <GlassCard className="p-32 text-center border-dashed">
                  <History size={64} className="mx-auto mb-6 text-white/10" />
                  <p className="text-[10px] uppercase font-black tracking-[0.5em] text-white/20">Empty Activity Log</p>
                </GlassCard>
              )}
            </motion.div>
          )}

          {screen === 'PROFILE' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-xl w-full mx-auto"
            >
              <GlassCard className="p-12 space-y-12">
                <div className="text-center space-y-8">
                  <div className="w-40 h-40 rounded-[4rem] bg-gradient-to-br from-accent to-blue-600 mx-auto p-1.5 shadow-[0_20px_50px_rgba(61,218,215,0.3)]">
                    <div className="w-full h-full rounded-[3.8rem] bg-bg-dark flex items-center justify-center text-accent border border-white/5 shadow-inner">
                       <User size={64} strokeWidth={2.5} />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-4xl font-[1000] uppercase italic tracking-tighter">{currentUser?.name || 'Alex Sterling'}</h2>
                    {currentUser?.role === 'ADMIN' && (
                      <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em] mt-1 italic">Managing {currentUser.company}</p>
                    )}
                    <p className="text-accent text-[11px] font-black uppercase tracking-[0.6em] mt-3 bg-accent/10 py-2 px-6 rounded-full w-fit mx-auto">{currentUser?.role === 'ADMIN' ? 'System Administrator' : 'Premium Elite'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.6em] text-white/20 ml-6">Membership Vault</h4>
                  <div className="space-y-4">
                    <div 
                      onClick={() => setScreen('HOST_LOGIN')}
                      className="group flex justify-between items-center p-8 bg-accent/10 rounded-[2.5rem] border border-accent/20 shadow-xl cursor-pointer hover:bg-accent/20 transition-all"
                    >
                      <div className="flex items-center gap-5">
                        <Lock size={24} className="text-accent" />
                        <span className="text-sm font-black uppercase tracking-widest text-accent">Become Admin</span>
                      </div>
                      <ChevronsRight size={20} className="text-accent group-hover:translate-x-2 transition-transform" />
                    </div>
                    {[
                      { icon: CreditCard, label: 'Payment Node', val: 'Visa **** 9012' },
                      { icon: Bell, label: 'Alert Streams', val: 'Active' },
                      { icon: ShieldAlert, label: 'Identity Protection', val: 'Secured' }
                    ].map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-8 bg-white/5 rounded-[2.5rem] border border-white/5 shadow-inner hover:bg-white/[0.08] transition-all">
                        <div className="flex items-center gap-5">
                          <item.icon size={24} className="text-white/40" />
                          <span className="text-sm font-black uppercase tracking-widest text-white/60">{item.label}</span>
                        </div>
                        <span className="text-[10px] font-black uppercase text-accent tracking-widest">{item.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <LargeButton variant="danger" className="!bg-red-500/10 !text-red-500 h-[72px] rounded-[2.5rem] border border-red-500/20" onClick={() => { setCurrentUser(null); setScreen('LOGIN'); }}>
                    Terminate Session
                  </LargeButton>
                </div>
              </GlassCard>
            </motion.div>
          )}

            {screen === 'PLACE_SELECT' && (
              <motion.div
                key="place-select"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-bg-dark flex flex-col"
              >
                {/* Search Header */}
                <div className="absolute top-0 left-0 right-0 p-6 z-[2000] flex flex-col gap-4 max-w-2xl mx-auto">
                   <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setScreen('HOME')} 
                        className="p-4 bg-[#0b1218]/80 backdrop-blur-2xl rounded-3xl border border-white/10 text-white shadow-2xl hover:bg-white/10 transition-all flex-shrink-0"
                      >
                        <ArrowLeft size={24} />
                      </button>
                      
                      <div className="flex-1 relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-accent" size={20} />
                        <input 
                          type="text"
                          placeholder="Search places..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-[#0b1218]/80 backdrop-blur-2xl border border-white/10 rounded-3xl py-4 pl-16 pr-6 text-white text-sm font-bold focus:outline-none focus:border-accent/50 transition-all shadow-2xl placeholder:opacity-40"
                        />
                      </div>
                   </div>
                </div>

                {/* Split UI: Map on Top, List below */}
                <div className="h-[35vh] sm:h-[40vh] relative pt-24">
                  <MapContainer 
                    center={mapCenter} 
                    zoom={13} 
                    zoomControl={false}
                    className="w-full h-full grayscale-[0.5] invert-[0.9] hue-rotate-[180deg]"
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapRecenter center={mapCenter} />
                    {LOCATIONS.map(loc => {
                       const icon = L.divIcon({
                         className: 'custom-marker',
                         html: `<div class="w-8 h-8 rounded-full border-2 border-white bg-accent shadow-xl flex items-center justify-center text-bg-dark font-black text-[9px]">${queues[loc.id].length}</div>`
                       });
                       return <Marker key={loc.id} position={loc.coordinates} icon={icon} eventHandlers={{ click: () => { setSelectedLocationId(loc.id); setMapCenter(loc.coordinates); }}} />;
                    })}
                  </MapContainer>
                </div>

                <div className="flex-1 bg-gradient-to-b from-[#0b1218] to-black p-4 sm:p-6 overflow-y-auto custom-scrollbar pb-32">
                   <div className="max-w-2xl mx-auto space-y-4">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-4 sm:mb-6">Nearby Nodes</h3>
                      {LOCATIONS.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase())).map(loc => {
                         const crowd = Math.max(0, queues[loc.id].length - (servingIndices[loc.id] + 1));
                         const waitTime = crowd * dynamicAverages[loc.id];
                         return (
                           <GlassCard 
                            key={loc.id} 
                            onClick={() => setSelectedLocationId(loc.id)}
                            className={`p-6 border-l-8 transition-all ${selectedLocationId === loc.id ? 'border-accent bg-white/10' : 'border-white/5'}`}
                           >
                              <div className="flex justify-between items-start">
                                 <div>
                                    <div className="flex items-center gap-3 mb-1">
                                       <span className="text-[9px] font-black uppercase tracking-widest text-accent">{loc.category}</span>
                                       <span className="w-1 h-1 bg-white/20 rounded-full" />
                                       <span className="text-[9px] font-black uppercase tracking-widest text-white/40">{loc.distance} Away</span>
                                    </div>
                                    <h4 className="text-xl font-black uppercase italic tracking-tighter text-white">{loc.name}</h4>
                                 </div>
                                 <div className="text-right">
                                    <span className="text-lg font-black text-white italic tracking-tighter">${(loc.baseAvgTime + 5).toFixed(2)}</span>
                                    <p className="text-[8px] font-black uppercase text-white/20">Access Fee</p>
                                 </div>
                              </div>
                              <div className="mt-6 flex items-center justify-between">
                                 <div className="flex gap-4">
                                    <div className="flex items-center gap-2">
                                       <Users size={14} className="text-white/20" />
                                       <span className="text-xs font-bold text-white/60">{crowd} Waiting</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <Clock size={14} className="text-white/20" />
                                       <span className="text-xs font-bold text-white/60">{waitTime}m Est.</span>
                                    </div>
                                 </div>
                                 {selectedLocationId === loc.id && (
                                   <button 
                                    onClick={(e) => { e.stopPropagation(); handleJoinQueue(); }}
                                    className="px-6 py-2 bg-accent text-bg-dark rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-accent/20"
                                   >
                                      Join Now
                                   </button>
                                 )}
                              </div>
                           </GlassCard>
                         );
                      })}
                   </div>
                </div>
              </motion.div>
            )}

            {screen === 'PLACE_DETAILS' && (
              <div className="fixed inset-0 z-[3000] bg-bg-dark flex items-center justify-center">
                 <div className="text-center">
                    <p className="text-white/20 font-black uppercase tracking-widest animate-pulse">Loading place data...</p>
                 </div>
              </div>
            )}

            {screen === 'JOIN_FORM' && (
              <motion.div
                key="join-form"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="max-w-xl w-full mx-auto"
              >
                <GlassCard className="p-10 relative">
                  <button onClick={() => setScreen('PLACE_SELECT')} className="absolute top-10 left-10 p-3 text-white/20 hover:text-white">
                    <ArrowLeft size={32} />
                  </button>

                  <div className="text-center mb-12 pt-10">
                    <h2 className={`${seniorMode ? 'text-5xl' : 'text-4xl'} font-black uppercase mb-4`}>Your Name</h2>
                    {seniorMode && <p className="text-accent font-black mb-4">PLEASE TYPE YOUR FULL NAME</p>}
                    <p className="text-white/40">Enter name to join the queue</p>
                  </div>

                  <div className="flex flex-col gap-10">
                    <input 
                      type="text"
                      autoFocus
                      placeholder="e.g. John Doe"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className={`w-full bg-white/5 border-2 border-white/10 rounded-[32px] ${seniorMode ? 'py-12 px-10 text-4xl' : 'px-8 py-8 text-2xl'} font-black text-white focus:outline-none focus:border-accent transition-all placeholder:text-white/5 shadow-inner text-center uppercase tracking-widest`}
                    />
                    <LargeButton 
                      onClick={handleJoinQueue}
                      seniorMode={seniorMode}
                    >
                      Join Queue
                    </LargeButton>
                  </div>
                </GlassCard>
              </motion.div>
              )}

            {screen === 'USER_STATUS' && myToken && (
               <motion.div
                key="user-status"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-xl w-full mx-auto px-4"
              >
                {(() => {
                  const loc = LOCATIONS.find(l => l.id === myToken.locationId)!;
                  const pos = getPosition(myToken);
                  const waitSeconds = getLiveWaitSeconds(myToken);
                  const waitMinutes = Math.floor(waitSeconds / 60);
                  const leaveTime = waitMinutes - loc.travelTime;
                  
                  return (
                    <GlassCard className="p-6 sm:p-8 relative">
                       <div className="flex items-center justify-between mb-6 sm:mb-8">
                        <button onClick={() => setScreen('HOME')} className="p-2 sm:p-3 bg-white/5 rounded-xl sm:rounded-2xl text-white/20 hover:text-white transition-all">
                          <ArrowLeft size={20} sm:size={24} />
                        </button>
                        <h2 className="text-[10px] sm:text-sm font-black uppercase tracking-[0.3em] text-accent">Status Card</h2>
                        <div className="w-10 sm:w-12"></div>
                      </div>

                      <div className="bg-white/5 rounded-[32px] sm:rounded-[40px] p-6 sm:p-10 flex flex-col items-center justify-center text-center border border-white/10 mb-6 sm:mb-8 relative overflow-hidden group">
                         <div className={`absolute top-0 right-0 p-3 sm:p-4 ${pos === 0 ? 'bg-green-500' : 'bg-accent'} text-bg-dark font-black text-[8px] sm:text-[10px] rounded-bl-2xl sm:rounded-bl-3xl uppercase tracking-widest`}>
                            {pos === 0 ? 'Now Serving' : 'In Line'}
                         </div>
                         <motion.span 
                            animate={pos === 0 ? { scale: [1, 1.05, 1] } : {}}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="text-[6rem] sm:text-[10rem] font-[1000] leading-none text-white drop-shadow-[0_10px_30px_rgba(255,255,255,0.1)]"
                          >
                            {myToken.number}
                         </motion.span>
                         <span className="text-white/30 font-bold uppercase tracking-[0.2em] sm:tracking-[0.4em] mt-2 sm:mt-4 text-[10px] sm:text-xs truncate w-full px-4">{loc.name}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-8">
                         <div className="bg-white/5 p-6 rounded-[32px] border border-white/10 text-center">
                            <span className="block text-4xl font-black text-accent">{pos === 0 ? '0' : pos}</span>
                            <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Ahead of You</span>
                         </div>
                         <div className="bg-white/5 p-6 rounded-[32px] border border-white/10 text-center">
                            <span className="block text-4xl font-black text-white">{waitMinutes}m</span>
                            <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Est. Wait</span>
                         </div>
                      </div>

                      <div className={`p-6 rounded-[32px] border-2 flex flex-col gap-4 mb-10 ${leaveTime <= 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'}`}>
                         <div className="flex items-center gap-3">
                            <Navigation className={leaveTime <= 0 ? 'text-red-500' : 'text-accent'} size={20} />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Smart Travel Advice</span>
                         </div>
                         
                         {leaveTime > 0 ? (
                            <p className="text-xs font-bold text-white/60 leading-relaxed">
                               With a {loc.travelTime}m travel time, you should leave in 
                               <span className="text-accent ml-1 font-black underline decoration-2">{leaveTime} minutes</span>.
                            </p>
                         ) : (
                            <p className="text-xs font-black text-red-500 uppercase leading-relaxed animate-pulse">
                               Leave now! Wait duration ({waitMinutes}m) is shorter than travel time ({loc.travelTime}m).
                            </p>
                         )}
                      </div>

                      <div className="flex flex-col gap-4">
                        {pos === 0 && (
                          <LargeButton onClick={() => setScreen('FEEDBACK')} className="!bg-green-500 !text-bg-dark font-[1000] uppercase tracking-widest italic shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                            Done? Give Feedback <Star size={20} fill="currentColor" />
                          </LargeButton>
                        )}
                        <LargeButton onClick={() => setScreen('HOME')} variant="secondary" icon={ArrowLeft} className="text-sm uppercase tracking-widest h-[64px]">
                          Return to Dashboard
                        </LargeButton>
                      </div>
                    </GlassCard>
                  );
                })()}
              </motion.div>
            )}

            {screen === 'HOST_LOGIN' && (
              <motion.div
                key="host-login"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-xl w-full mx-auto"
              >
                <GlassCard className="p-12 relative">
                   <button onClick={() => setScreen('HOME')} className="absolute top-10 left-10 p-3 text-white/20 hover:text-white">
                      <ArrowLeft size={32} />
                    </button>
                    
                    <div className="text-center mb-12">
                       <Lock className="text-accent mx-auto mb-4" size={48} strokeWidth={3} />
                       <h2 className="text-4xl font-black uppercase tracking-tighter">Host Login</h2>
                       <p className="text-white/40 text-xs">Access your location dashboard</p>
                    </div>

                    <div className="flex flex-col gap-6">
                       <input 
                         type="text" 
                         placeholder="Username (e.g. wetnjoy_admin)"
                         value={loginData.user}
                         onChange={e => setLoginData({...loginData, user: e.target.value})}
                         className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xl font-bold focus:outline-none focus:border-accent"
                       />
                       <input 
                         type="password" 
                         placeholder="Password (1234)"
                         value={loginData.pass}
                         onChange={e => setLoginData({...loginData, pass: e.target.value})}
                         className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xl font-bold focus:outline-none focus:border-accent"
                       />
                       <LargeButton onClick={handleLogin} icon={Play} className="mt-4">
                          Login
                       </LargeButton>
                       <button 
                         onClick={() => { setLoginData({ user: 'admin', pass: '1234' }); setTimeout(handleLogin, 100); }}
                         className="mt-2 text-[10px] font-black uppercase tracking-[0.4em] text-accent/40 hover:text-accent transition-all"
                       >
                         Quick Access (Admin/1234)
                       </button>
                    </div>
                </GlassCard>
              </motion.div>
            )}

            {screen === 'HOST_DASHBOARD' && activeHostLocation && (
              <motion.div
                key="host-dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-xl w-full mx-auto flex flex-col gap-6 px-2"
              >
                <div className="flex justify-between items-center px-4 pt-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-accent uppercase tracking-widest">{LOCATIONS.find(l => l.id === activeHostLocation)?.name}</span>
                    <h2 className="text-3xl font-[1000] tracking-tighter uppercase whitespace-nowrap">Dashboard</h2>
                  </div>
                  <button 
                    onClick={() => { setScreen('HOME'); setActiveHostLocation(null); }}
                    className="p-4 bg-white/5 rounded-2xl text-white/30 hover:text-white border border-white/10"
                  >
                    <Lock size={20} />
                  </button>
                </div>

                <GlassCard className="p-6 sm:p-8 text-center flex flex-col gap-6 sm:gap-8 shadow-2xl">
                  <div>
                    <span className="text-white/20 font-black text-[9px] sm:text-[10px] uppercase tracking-[0.4em] mb-2 sm:mb-4 block">Currently Serving</span>
                    <motion.div 
                      key={servingIndices[activeHostLocation]}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-[6rem] sm:text-[10rem] font-[1000] leading-none text-accent"
                    >
                      {servingIndices[activeHostLocation] >= 0 ? queues[activeHostLocation][servingIndices[activeHostLocation]].number : '---'}
                    </motion.div>
                  </div>

                  <div className="py-6 sm:py-8 bg-white/5 rounded-[32px] sm:rounded-[40px] border border-white/5">
                    <span className="text-white/20 font-black text-[9px] sm:text-[10px] uppercase tracking-[0.4em] mb-1 sm:mb-2 block">Active Service Timer</span>
                    <span className="text-4xl sm:text-6xl font-mono font-black text-white">{formatCountdown(serviceTimers[activeHostLocation])}</span>
                  </div>

                  <div className="mt-8 flex flex-col gap-4">
                    <LargeButton 
                      onClick={() => callNext(activeHostLocation)} 
                      icon={Play} 
                      className="py-10 bg-accent text-bg-dark shadow-xl"
                    >
                      Call Next
                    </LargeButton>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {servingIndices[activeHostLocation] >= 0 && (
                        <button 
                          onClick={() => removeToken(activeHostLocation, queues[activeHostLocation][servingIndices[activeHostLocation]].id)}
                          className="flex-1 p-8 bg-green-500 text-bg-dark rounded-[32px] font-black uppercase text-xs tracking-widest shadow-lg shadow-green-500/10"
                        >
                          Served
                        </button>
                      )}
                      <button 
                        onClick={() => setIsPaused(!isPaused)}
                        className={`flex-1 p-8 rounded-[32px] font-black uppercase text-xs tracking-widest transition-all ${isPaused ? 'bg-amber-500 text-bg-dark' : 'bg-white/5 text-amber-500 border border-white/10'}`}
                      >
                        {isPaused ? 'Resume' : 'Pause'}
                      </button>
                    </div>

                    <button 
                      onClick={() => setScreen('KIOSK_VIEW')}
                      className="w-full py-6 flex items-center justify-center gap-3 bg-blue-500/10 text-blue-400 rounded-[2rem] border border-blue-500/20 font-black uppercase text-xs tracking-[0.2em] shadow-inner"
                    >
                      <Monitor size={16} /> Open Public Kiosk
                    </button>

                    <button 
                      onClick={() => resetQueue(activeHostLocation)}
                      className="w-full py-4 text-red-500/40 hover:text-red-500 font-black uppercase text-[10px] tracking-[0.3em] transition-all"
                    >
                      Clear Queue Data
                    </button>
                  </div>
                </GlassCard>

                <GlassCard className="p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Queue List</h3>
                    <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black text-accent">{Math.max(0, queues[activeHostLocation].length - (servingIndices[activeHostLocation] + 1))} Waiting</span>
                  </div>
                  
                  <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {queues[activeHostLocation].filter((_, i) => i > servingIndices[activeHostLocation]).map(token => {
                      const tokenIdx = queues[activeHostLocation].findIndex(t => t.id === token.id);
                      return (
                        <div key={token.id} className="p-5 bg-white/5 rounded-2xl flex items-center justify-between border border-white/5 group">
                          <div className="flex items-center gap-4 text-left">
                            <span className="text-2xl font-black text-white/60">#{token.number}</span>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-white">{token.name}</span>
                              <span className="text-[9px] font-black uppercase text-accent tracking-widest">{token.priority ? 'Express' : 'Standard'} Node</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => setServingIndices(prev => ({ ...prev, [activeHostLocation!]: tokenIdx }))}
                            className="px-5 py-2.5 bg-accent/10 text-accent rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-accent hover:text-bg-dark transition-all opacity-0 group-hover:opacity-100"
                          >
                            Serve
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

      <footer className="w-full max-w-7xl mx-auto mt-10 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-white/20 font-bold text-[10px] uppercase tracking-[0.4em] relative z-10">
        <div className="flex gap-8">
          <span className="flex items-center gap-2"><ShieldAlert size={12} /> HIPAA COMPLIANT SYSTEM</span>
          <span className="flex items-center gap-2"><Zap size={12} fill="currentColor" /> CLOUD NODE ACTIVE</span>
        </div>
        <div className="flex gap-8">
           <span className="cursor-pointer hover:text-accent transition-colors">Diagnostics</span>
           <span className="cursor-pointer hover:text-white transition-colors">&copy; 2026 DIGITAL QUEUE</span>
        </div>
      </footer>
    </div>
  );
}
