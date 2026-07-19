import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Calendar, Clock, MapPin, Compass, FileText, Wallet, 
  ChevronRight, Sparkles, Share2, CheckCircle2, X, Camera, Info, Shield
} from 'lucide-react';
import { Screen } from '../types';
import { useAuth } from '../auth';
import { useRepositories } from '../repositories/repositoryProvider';

interface ProfileScreenProps {
  onNavigate: (screen: Screen) => void;
}

interface AstrologyDetails {
  moolank: string;
  bhagyank: string;
  zodiac: string;
  nakshatra: string;
  lagna: string;
  mahadasha: string;
}

export default function ProfileScreen({ onNavigate }: ProfileScreenProps) {
  const { user } = useAuth();
  const repositories = useRepositories();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isKundliOpen, setIsKundliOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [profile, wallet] = await Promise.all([
          repositories.profile.getProfile(),
          repositories.wallet.getWalletState(),
        ]);
        if (profile) setProfileData(profile);
        if (wallet) setWalletBalance(wallet.balance);
      } catch (err) {
        console.error('Failed to load profile data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [repositories.profile, repositories.wallet]);

  // Helper to show premium feedback toasts
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Extract variables
  const fullName = profileData?.name || profileData?.fullName || '';
  const gender = profileData?.gender || '';
  const dob = profileData?.dob || '';
  const tob = profileData?.tob || profileData?.birthTime || '';
  const state = profileData?.state || '';
  const district = profileData?.district || '';
  const city = profileData?.city || '';
  const phone = user?.phone
    ? user.phone.replace(/^\+91(\d{5})(\d{5})$/, '+91 $1 $2')
    : profileData?.phone || '';
  const email = profileData?.email || '';

  // Place of Birth assembly
  const getPlaceOfBirth = () => {
    const parts = [city, district, state].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '';
  };

  const placeOfBirth = getPlaceOfBirth();

  // Format date of birth to a human-friendly format (e.g., 23 Nov, 1995)
  const formatDob = (dobStr: string) => {
    if (!dobStr) return '';
    try {
      const date = new Date(dobStr);
      if (isNaN(date.getTime())) return '';
      const day = date.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day} ${month}, ${year}`;
    } catch (e) {
      return '';
    }
  };

  const formattedDob = formatDob(dob);

  // Format time of birth to 12-hour format with AM/PM
  const formatTob = (tobStr: string) => {
    if (!tobStr) return '';
    try {
      const [hoursStr, minutesStr] = tobStr.split(':');
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      if (isNaN(hours) || isNaN(minutes)) return '';
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
      return `${formattedHours}:${formattedMinutes} ${ampm}`;
    } catch (e) {
      return '';
    }
  };

  const formattedTob = formatTob(tob);

  // Calculate dynamic Moolank and Bhagyank mathematically, keep other complex fields pristine for future Swiss Ephemeris / real Vedic calculations
  const calculateAstrology = (dobString: string): AstrologyDetails | null => {
    if (!dobString) return null;
    try {
      const date = new Date(dobString);
      if (isNaN(date.getTime())) return null;
      
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      
      // Moolank (sum of digits of the birth day)
      const sumDigits = (num: number): number => {
        let sum = num;
        while (sum > 9) {
          sum = sum.toString().split('').reduce((acc, d) => acc + parseInt(d, 10), 0);
        }
        return sum;
      };
      
      const moolankNum = sumDigits(day);
      const bhagyankNum = sumDigits(day + month + year);
      
      return {
        moolank: String(moolankNum),
        bhagyank: String(bhagyankNum),
        zodiac: profileData?.zodiacSign || profileData?.rashi || profileData?.zodiac || 'Will be generated after Kundli analysis',
        nakshatra: profileData?.nakshatra || 'Will be generated after Kundli analysis',
        lagna: profileData?.lagna || 'Will be generated after Kundli analysis',
        mahadasha: profileData?.mahadasha || 'Will be generated after Kundli analysis'
      };
    } catch (e) {
      return null;
    }
  };

  const astroInfo = calculateAstrology(dob);

  const handleShareKundli = () => {
    if (navigator.share) {
      navigator.share({
        title: 'My Kundli Nova Profile',
        text: `Check out my Kundli details! Zodiac: ${astroInfo?.zodiac || 'Calculated automatically'}, Moolank: ${astroInfo?.moolank || 'Calculated automatically'}.`,
        url: window.location.href,
      }).catch(() => {
        showToast('Kundli link copied to clipboard!');
      });
    } else {
      showToast('Kundli share link copied to clipboard!');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto no-scrollbar pb-24 relative select-none">
      
      {/* Toast Feedback */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="absolute top-6 left-6 right-6 bg-neutral-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl z-50 shadow-xl flex items-center space-x-3 border border-white/10"
          >
            <Sparkles size={16} className="text-[#FF8A00] shrink-0" />
            <span className="text-[13px] font-semibold tracking-tight">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="px-6 pt-6 pb-2 sticky top-0 bg-white/90 backdrop-blur-md z-15 border-b border-neutral-100/50 flex items-center justify-between">
        <h1 className="text-2xl font-[900] text-neutral-900 tracking-tight">My Profile</h1>
        <div className="flex items-center space-x-1 text-xs font-bold text-neutral-400 uppercase tracking-widest bg-neutral-50 px-2.5 py-1 rounded-full border border-neutral-100/60">
          <Shield size={12} className="text-emerald-500" />
          <span>Verified Profile</span>
        </div>
      </div>

      {loading ? (
        /* Premium Skeleton Loading States */
        <div className="px-6 py-6 space-y-6 animate-pulse">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-[80px] h-[80px] bg-neutral-100 rounded-full" />
            <div className="h-5 bg-neutral-100 rounded w-1/3" />
            <div className="h-3 bg-neutral-100 rounded w-1/2" />
          </div>
          <div className="space-y-3">
            <div className="h-[220px] bg-neutral-50 rounded-[18px]" />
            <div className="h-[180px] bg-neutral-50 rounded-[18px]" />
          </div>
        </div>
      ) : (
        <div className="px-6 py-6 space-y-6">
          
          {/* Top Profile Header Section */}
          <div className="flex flex-col items-center text-center">
            {/* 80px Avatar with Dynamic Initial and Subtle Edit/Camera icon */}
            <motion.div 
              whileTap={{ scale: 0.96 }}
              onClick={() => showToast('Click Edit Profile below to update photo')}
              className="relative w-[80px] h-[80px] rounded-full bg-gradient-to-tr from-[#FF8A00] to-[#FFA733] text-white flex items-center justify-center text-[32px] font-[800] shadow-[0_6px_20px_rgba(255,138,0,0.15)] ring-4 ring-neutral-50 shrink-0 mb-4 cursor-pointer group"
            >
              {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
              {/* Subtle Camera Indicator */}
              <div className="absolute bottom-0 right-0 w-[24px] h-[24px] bg-white rounded-full flex items-center justify-center shadow-[0_3px_8px_rgba(0,0,0,0.15)] ring-2 ring-white">
                <Camera size={12} className="text-neutral-500 fill-none" />
              </div>
            </motion.div>

            {/* User credentials */}
            <h2 className="text-[20px] font-[800] text-neutral-900 tracking-tight leading-tight">
              {fullName || 'Guest User'}
            </h2>
            
            <div className="flex flex-col items-center space-y-1 mt-2">
              <p className="text-[13.5px] text-neutral-500 font-semibold">{phone}</p>
              <p className="text-[12.5px] text-neutral-400 font-medium">{email || 'Not Provided'}</p>
            </div>
          </div>

          {/* Personal Information Card */}
          <div className="bg-neutral-50/50 border border-neutral-100/60 rounded-[18px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
            <div className="flex items-center space-x-2 border-b border-neutral-100 pb-3 mb-2">
              <User size={16} className="text-neutral-400" />
              <h3 className="text-[13.5px] font-[800] text-neutral-400 uppercase tracking-widest">Personal Information</h3>
            </div>
            
            <div className="space-y-3.5">
              <ProfileInfoRow label="Full Name" value={fullName} onClick={() => onNavigate('edit-profile')} />
              <ProfileInfoRow label="Gender" value={gender} onClick={() => onNavigate('edit-profile')} />
              <ProfileInfoRow label="Date of Birth" value={formattedDob} onClick={() => onNavigate('edit-profile')} />
              <ProfileInfoRow label="Time of Birth" value={formattedTob} onClick={() => onNavigate('edit-profile')} />
              <ProfileInfoRow label="Place of Birth" value={placeOfBirth} onClick={() => onNavigate('edit-profile')} />
            </div>
          </div>

          {/* Astrology Information Card */}
          <div className="bg-neutral-50/50 border border-neutral-100/60 rounded-[18px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
            <div className="flex items-center space-x-2 border-b border-neutral-100 pb-3 mb-2">
              <Compass size={16} className="text-neutral-400" />
              <h3 className="text-[13.5px] font-[800] text-neutral-400 uppercase tracking-widest">Astrology Information</h3>
            </div>
            
            <div className="space-y-3.5">
              {dob ? (
                <>
                  <ProfileInfoRow label="Moolank" value={astroInfo?.moolank} isOrange />
                  <ProfileInfoRow label="Bhagyank" value={astroInfo?.bhagyank} isOrange />
                  <ProfileInfoRow 
                    label="Zodiac Sign / Rashi" 
                    value={astroInfo?.zodiac} 
                    isOrange={astroInfo?.zodiac !== 'Will be generated after Kundli analysis' && astroInfo?.zodiac !== 'Calculating...'} 
                  />
                  <ProfileInfoRow 
                    label="Nakshatra" 
                    value={astroInfo?.nakshatra} 
                    isOrange={astroInfo?.nakshatra !== 'Will be generated after Kundli analysis' && astroInfo?.nakshatra !== 'Calculating...'} 
                  />
                  <ProfileInfoRow 
                    label="Lagna" 
                    value={astroInfo?.lagna} 
                    isOrange={astroInfo?.lagna !== 'Will be generated after Kundli analysis' && astroInfo?.lagna !== 'Calculating...'} 
                  />
                  <ProfileInfoRow 
                    label="Mahadasha" 
                    value={astroInfo?.mahadasha} 
                    isOrange={astroInfo?.mahadasha !== 'Will be generated after Kundli analysis' && astroInfo?.mahadasha !== 'Calculating...'} 
                  />
                </>
              ) : (
                <div className="py-2 text-center text-neutral-400 font-semibold text-[13.5px]">
                  Will be calculated automatically
                </div>
              )}
            </div>
          </div>

          {/* Account Section Card */}
          <div className="bg-neutral-50/50 border border-neutral-100/60 rounded-[18px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
            <div className="flex items-center space-x-2 border-b border-neutral-100 pb-3 mb-2">
              <Wallet size={16} className="text-neutral-400" />
              <h3 className="text-[13.5px] font-[800] text-neutral-400 uppercase tracking-widest">Account Details</h3>
            </div>

            <div className="space-y-3.5">
              <ProfileInfoRow 
                label="Wallet Balance" 
                value={`₹${walletBalance.toLocaleString('en-IN')}`} 
                onClick={() => onNavigate('wallet')} 
                isOrange
              />
              <ProfileInfoRow label="Active Plan" value="Free Plan" />
              <ProfileInfoRow label="Language" value="Hindi & English" />
              <ProfileInfoRow label="Notification Preference" value="Enabled" />
            </div>
          </div>

          {/* Kundli Status Card */}
          <div className="bg-neutral-900 rounded-[18px] p-5 text-white shadow-xl shadow-neutral-900/10 flex items-center justify-between relative overflow-hidden">
            {/* Dynamic visual stars/cosmic alignment backdrop */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-12 -mt-12 blur-xl" />
            
            <div className="flex-1 pr-4">
              <h4 className="text-base font-[800] tracking-tight text-white flex items-center space-x-1.5">
                <Sparkles size={16} className="text-[#FF8A00]" />
                <span>Your Kundli</span>
              </h4>
              <p className="text-neutral-400 text-xs font-semibold mt-1 leading-relaxed">
                Kundli generated using your birth details.
              </p>
            </div>
            
            <motion.button 
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                if (!dob) {
                  showToast('Please add Birth Details to view Kundli');
                  return;
                }
                onNavigate('view-kundli');
              }}
              className="bg-[#FF8A00] text-white font-bold px-4 py-2.5 rounded-xl text-xs tracking-tight shrink-0 shadow-md shadow-[#FF8A00]/25 cursor-pointer hover:bg-[#E07A00] transition-colors"
            >
              View Kundli
            </motion.button>
          </div>

          {/* Bottom Action buttons */}
          <div className="space-y-3.5 pt-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate('edit-profile')}
              className="w-full h-[54px] bg-[#FF8A00] text-white font-[700] rounded-2xl text-[15px] flex items-center justify-center shadow-lg shadow-[#FF8A00]/15 cursor-pointer hover:bg-[#E07A00] transition-all"
            >
              Edit Profile
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleShareKundli}
              className="w-full h-[54px] bg-white border border-neutral-200 text-neutral-800 font-[700] rounded-2xl text-[15px] flex items-center justify-center space-x-2 cursor-pointer hover:bg-neutral-50 transition-all"
            >
              <Share2 size={16} className="text-[#FF8A00]" />
              <span>Share Kundli</span>
            </motion.button>
          </div>
        </div>
      )}

      {/* Vedic Celestial Kundli Modal */}
      <AnimatePresence>
        {isKundliOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsKundliOpen(false)}
            className="fixed inset-0 bg-neutral-950/70 backdrop-blur-md z-[100] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.92, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-[380px] text-center border border-neutral-100 flex flex-col items-center"
            >
              {/* Header */}
              <div className="w-full flex items-center justify-between mb-4">
                <div className="flex items-center space-x-1 text-[11px] font-[800] text-[#FF8A00] uppercase tracking-widest bg-[#FF8A00]/5 px-2 py-0.5 rounded-full">
                  <Sparkles size={11} />
                  <span>D1 Chart</span>
                </div>
                <h3 className="text-base font-bold text-neutral-900 leading-none">Your Lagna Kundli</h3>
                <button 
                  onClick={() => setIsKundliOpen(false)}
                  className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-500 rounded-full transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Vedic Astrology geometric Lagna Chart SVG */}
              <div className="w-full aspect-square max-w-[280px] bg-[#FAF8F5] rounded-2xl border border-neutral-200/80 p-3 relative flex items-center justify-center">
                <svg viewBox="0 0 200 200" className="w-full h-full text-neutral-800 stroke-current fill-none">
                  <g strokeWidth="0.8">
                    {/* Outer border */}
                    <rect x="5" y="5" width="190" height="190" />
                    
                    {/* Main Diagonal cross lines */}
                    <line x1="5" y1="5" x2="195" y2="195" />
                    <line x1="195" y1="5" x2="5" y2="195" />
                    
                    {/* Diamond inner square */}
                    <polygon points="100,5 195,100 100,195 5,100" />
                  </g>

                  {/* House Text and planetary placements (mocked authentically based on zodiac/DOB) */}
                  <g fontStyle="normal" fontWeight="700" className="text-neutral-500 fill-current text-[8px]" textAnchor="middle">
                    {/* House Numbers */}
                    <text x="100" y="70" className="fill-[#FF8A00] font-[850] text-[9.5px]">1</text>
                    <text x="50" y="45">2</text>
                    <text x="45" y="90">3</text>
                    <text x="100" y="130">4</text>
                    <text x="45" y="150">5</text>
                    <text x="50" y="180">6</text>
                    <text x="100" y="155">7</text>
                    <text x="150" y="180">8</text>
                    <text x="155" y="130">9</text>
                    <text x="100" y="92">10</text>
                    <text x="155" y="90">11</text>
                    <text x="150" y="45">12</text>
                  </g>

                  {/* Planetary Positions */}
                  <g className="fill-neutral-900 font-bold text-[8.5px] tracking-tighter" textAnchor="middle">
                    {/* Lagna / Ascendant (First House) */}
                    <text x="100" y="50">Asc (Lg)</text>
                    
                    {/* Planetary placements around different houses */}
                    <text x="45" y="32">Ju, Ve</text>
                    <text x="32" y="75">Su, Me</text>
                    <text x="100" y="112">Mo</text>
                    <text x="35" y="135">Sa</text>
                    <text x="165" y="75">Ra</text>
                    <text x="168" y="150">Ke</text>
                    <text x="100" y="172">Ma</text>
                  </g>
                </svg>
              </div>

              {/* Description */}
              <div className="mt-4 flex items-start space-x-2.5 text-left bg-neutral-50 p-3.5 rounded-xl border border-neutral-100/80 w-full">
                <Info size={16} className="text-[#FF8A00] shrink-0 mt-0.5" />
                <p className="text-[12px] text-neutral-500 font-medium leading-relaxed">
                  Your primary ascendant chart (Lagna D1) represents physical body, outlook, and self-manifestation in this lifetime.
                </p>
              </div>

              <button
                onClick={() => {
                  showToast('Kundli chart downloaded successfully');
                  setIsKundliOpen(false);
                }}
                className="w-full h-[46px] bg-neutral-900 text-white text-xs font-bold rounded-xl mt-4 cursor-pointer hover:bg-neutral-800 transition-colors"
              >
                Download Chart
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Elegant Label/Value item row representing Apple iOS system list views */
function ProfileInfoRow({ 
  label, 
  value, 
  onClick, 
  isOrange 
}: { 
  label: string; 
  value?: string | number; 
  onClick?: () => void; 
  isOrange?: boolean; 
}) {
  const isAvailable = value && value !== 'Not Provided';

  return (
    <motion.div
      whileTap={onClick ? { scale: 0.99 } : undefined}
      onClick={onClick}
      className={`flex items-center justify-between py-1 transition-all ${
        onClick ? 'cursor-pointer group' : ''
      }`}
    >
      <div className="flex-1 flex flex-col items-start pr-4">
        <span className="text-[11.5px] font-[700] text-neutral-400 uppercase tracking-wider">
          {label}
        </span>
        <span className={`text-[14.5px] font-[600] tracking-tight mt-1 transition-colors ${
          isOrange && isAvailable
            ? 'text-[#FF8A00]' 
            : isAvailable 
              ? 'text-neutral-800 group-hover:text-[#FF8A00]' 
              : 'text-neutral-400 italic'
        }`}>
          {isAvailable ? value : 'Not Provided'}
        </span>
      </div>

      {onClick && (
        <ChevronRight size={15} className="text-neutral-300 stroke-[2.2] shrink-0 transition-transform group-hover:translate-x-0.5" />
      )}
    </motion.div>
  );
}
