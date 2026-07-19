import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, ChevronRight, Check, Search, X, Shield, Sparkles, 
  User, Calendar, Clock, MapPin, Globe, Compass, Smartphone, Mail
} from 'lucide-react';
import { Screen } from '../types';

// Mock Data
const COUNTRIES = [
  'India', 'Nepal', 'Sri Lanka', 'United States', 'United Kingdom', 
  'United Arab Emirates', 'Canada', 'Australia', 'Singapore', 'Germany'
];

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

const DISTRICTS_MAP: { [key: string]: string[] } = {
  'Maharashtra': ['Mumbai', 'Pune', 'Thane', 'Nagpur', 'Nashik', 'Aurangabad', 'Solapur', 'Amravati', 'Kolhapur'],
  'Delhi': ['New Delhi', 'South Delhi', 'North Delhi', 'West Delhi', 'East Delhi', 'Dwarka'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Gautam Buddha Nagar (Noida)', 'Ghaziabad', 'Varanasi', 'Agra', 'Prayagraj', 'Meerut', 'Bareilly'],
  'Karnataka': ['Bangalore Urban', 'Bangalore Rural', 'Mysore', 'Hubli-Dharwad', 'Mangalore', 'Belgaum', 'Gulbarga'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar', 'Bhavnagar', 'Jamnagar'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner', 'Alwar', 'Sikar'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Vellore'],
  'West Bengal': ['Kolkata', 'Howrah', 'North 24 Parganas', 'South 24 Parganas', 'Darjeeling', 'Hooghly', 'Medinipur'],
  'Bihar': ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga', 'Arrah', 'Begusarai'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali'],
  'Haryana': ['Gurugram (Gurgaon)', 'Faridabad', 'Panipat', 'Ambala', 'Rohtak', 'Karnal'],
  'Kerala': ['Ernakulam (Kochi)', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur', 'Kollam', 'Alappuzha']
};

const CITIES_MAP: { [key: string]: string[] } = {
  // Maharashtra
  'Mumbai': ['Mumbai City', 'Andheri', 'Bandra', 'Colaba', 'Borivali', 'Mulund'],
  'Pune': ['Pune City', 'Pimpri-Chinchwad', 'Hinjewadi', 'Kothrud', 'Baner', 'Hadapsar'],
  'Thane': ['Thane City', 'Kalyan', 'Dombivli', 'Navi Mumbai', 'Mira-Bhayandar'],
  // Delhi
  'New Delhi': ['Connaught Place', 'Chanakyapuri', 'Vasant Kunj', 'Saket', 'Karol Bagh'],
  'South Delhi': ['Greater Kailash', 'Lajpat Nagar', 'Hauz Khas', 'Green Park'],
  // Uttar Pradesh
  'Lucknow': ['Lucknow City', 'Hazratganj', 'Gomti Nagar', 'Alambagh', 'Indira Nagar'],
  'Gautam Buddha Nagar (Noida)': ['Noida Sector 15', 'Noida Sector 62', 'Greater Noida', 'Dadri'],
  'Ghaziabad': ['Indirapuram', 'Vaishali', 'Vasundhara', 'Kavi Nagar', 'Raj Nagar'],
  // Karnataka
  'Bangalore Urban': ['Bengaluru City', 'Whitefield', 'Indiranagar', 'Koramangala', 'Jayanagar', 'Electronic City', 'HSR Layout'],
  // Gujarat
  'Ahmedabad': ['Ahmedabad City', 'Satellite', 'Maninagar', 'Vastrapur', 'Bapunagar'],
  // Rajasthan
  'Jaipur': ['Jaipur City', 'C-Scheme', 'Malviya Nagar', 'Vaishali Nagar', 'Mansarovar']
};

// Flattened general fallback lists
const GENERAL_DISTRICTS = ['Mumbai', 'New Delhi', 'Lucknow', 'Bangalore Urban', 'Ahmedabad', 'Jaipur', 'Patna', 'Bhopal', 'Kolkata', 'Chennai'];
const GENERAL_CITIES = ['Mumbai City', 'Bengaluru City', 'Noida', 'Gurugram', 'Pune City', 'Kolkata City', 'Chennai City', 'Jaipur City', 'Ahmedabad City', 'Lucknow City'];

interface EditProfileScreenProps {
  onNavigate: (screen: Screen) => void;
}

export default function EditProfileScreen({ onNavigate }: EditProfileScreenProps) {
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [tob, setTob] = useState('');
  const [country, setCountry] = useState('India');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  
  // Sheet state
  const [activeSheet, setActiveSheet] = useState<'country' | 'state' | 'district' | 'city' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load existing profile data on mount
  useEffect(() => {
    const loadProfile = () => {
      const data = localStorage.getItem('kundli_nova_profile');
      if (data) {
        try {
          const parsed = JSON.parse(data);
          setFullName(parsed.name || parsed.fullName || '');
          setPhone(parsed.phone || '');
          setEmail(parsed.email || '');
          setGender(parsed.gender || '');
          setDob(parsed.dob || '');
          setTob(parsed.tob || parsed.birthTime || '');
          setCountry(parsed.country || 'India');
          setState(parsed.state || '');
          setDistrict(parsed.district || '');
          setCity(parsed.city || '');
        } catch (e) {
          console.error(e);
        }
      }
    };

    loadProfile();

    const timer = setTimeout(() => {
      setLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleSave = () => {
    if (!fullName.trim()) {
      setErrorMessage('Full Name is required');
      return;
    }
    if (!gender) {
      setErrorMessage('Please select Gender');
      return;
    }
    if (!dob) {
      setErrorMessage('Please enter Date of Birth');
      return;
    }
    if (!tob) {
      setErrorMessage('Please enter Time of Birth');
      return;
    }
    if (!state) {
      setErrorMessage('Please select State');
      return;
    }
    if (!district) {
      setErrorMessage('Please select District');
      return;
    }
    if (!city) {
      setErrorMessage('Please select City');
      return;
    }

    setErrorMessage(null);

    // Save changes back to localStorage
    const updatedProfile = {
      name: fullName.trim(),
      fullName: fullName.trim(),
      gender,
      dob,
      tob,
      birthTime: tob,
      country,
      state,
      district,
      city,
      phone: phone.trim(),
      email: email.trim()
    };

    localStorage.setItem('kundli_nova_profile', JSON.stringify(updatedProfile));

    // Show success message and navigate back to ProfileScreen after short delay
    triggerToast('Profile updated successfully.');
    setTimeout(() => {
      onNavigate('profile');
    }, 1500);
  };

  // Safe selectors list generators based on dependency state
  const getDistrictsList = () => {
    if (state && DISTRICTS_MAP[state]) {
      return DISTRICTS_MAP[state];
    }
    return GENERAL_DISTRICTS;
  };

  const getCitiesList = () => {
    if (district && CITIES_MAP[district]) {
      return CITIES_MAP[district];
    }
    return GENERAL_CITIES;
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto no-scrollbar pb-24 relative select-none">
      
      {/* Toast Overlay */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-6 left-6 right-6 bg-neutral-900/95 backdrop-blur-md text-white px-4 py-3.5 rounded-2xl z-50 shadow-xl flex items-center space-x-3 border border-white/10"
          >
            <div className="bg-[#FF8A00]/20 p-1 rounded-full text-[#FF8A00]">
              <Check size={16} strokeWidth={3} />
            </div>
            <span className="text-[13.5px] font-bold tracking-tight">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom sticky high-fidelity Header */}
      <div className="px-6 py-4 sticky top-0 bg-white/95 backdrop-blur-md z-30 border-b border-neutral-100/50 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => onNavigate('profile')}
            className="p-1.5 -ml-1 rounded-full hover:bg-neutral-50 active:bg-neutral-100 transition-colors text-neutral-800"
          >
            <ArrowLeft size={22} strokeWidth={2.5} />
          </button>
          <h1 className="text-xl font-[800] text-neutral-900 tracking-tight">Edit Profile</h1>
        </div>
        <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center space-x-1">
          <Shield size={12} className="text-emerald-500" />
          <span>Secured</span>
        </div>
      </div>

      {loading ? (
        /* Skeletons */
        <div className="p-6 space-y-6 animate-pulse">
          <div className="h-12 bg-neutral-50 rounded-2xl" />
          <div className="h-12 bg-neutral-50 rounded-2xl" />
          <div className="h-[200px] bg-neutral-50 rounded-2xl" />
          <div className="h-14 bg-neutral-50 rounded-2xl" />
        </div>
      ) : (
        <div className="px-6 py-6 space-y-6">
          
          {/* Header Message */}
          <div className="bg-neutral-50 p-4 rounded-[18px] border border-neutral-100/60 flex items-start space-x-3">
            <Compass size={18} className="text-[#FF8A00] shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-[13px] font-[800] text-neutral-800 uppercase tracking-wider">Birth Details Notice</h4>
              <p className="text-[12px] text-neutral-500 font-medium leading-relaxed mt-1">
                Your Date of Birth, Time, and Place are critical. Even a few minutes of deviation can alter your Lagna Kundli, Mahadasha cycles, and zodiac planetary alignments.
              </p>
            </div>
          </div>

          {/* Form Fields Card */}
          <div className="space-y-4">
            
            {/* Full Name */}
            <div className="space-y-2">
              <label className="text-[12px] font-[800] text-neutral-400 uppercase tracking-widest pl-1">Full Name</label>
              <div className="relative h-[54px] w-full bg-neutral-50/60 rounded-[16px] border border-neutral-100 flex items-center px-4 focus-within:border-[#FF8A00] focus-within:bg-white transition-all duration-200">
                <User size={18} className="text-neutral-400 mr-3 shrink-0" />
                <input 
                  type="text"
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setErrorMessage(null); }}
                  placeholder="Enter full name"
                  className="flex-1 bg-transparent border-none focus:outline-none text-neutral-800 text-[14.5px] font-[600]"
                />
              </div>
            </div>

            {/* Phone & Email Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[12px] font-[800] text-neutral-400 uppercase tracking-widest pl-1">Phone Number</label>
                <div className="relative h-[54px] w-full bg-neutral-50/60 rounded-[16px] border border-neutral-100 flex items-center px-4 focus-within:border-[#FF8A00] focus-within:bg-white transition-all duration-200">
                  <Smartphone size={18} className="text-neutral-400 mr-3 shrink-0" />
                  <input 
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter mobile number"
                    className="flex-1 bg-transparent border-none focus:outline-none text-neutral-800 text-[14.5px] font-[600]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-[800] text-neutral-400 uppercase tracking-widest pl-1">Email Address</label>
                <div className="relative h-[54px] w-full bg-neutral-50/60 rounded-[16px] border border-neutral-100 flex items-center px-4 focus-within:border-[#FF8A00] focus-within:bg-white transition-all duration-200">
                  <Mail size={18} className="text-neutral-400 mr-3 shrink-0" />
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="flex-1 bg-transparent border-none focus:outline-none text-neutral-800 text-[14.5px] font-[600]"
                  />
                </div>
              </div>
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <label className="text-[12px] font-[800] text-neutral-400 uppercase tracking-widest pl-1">Gender</label>
              <div className="flex bg-neutral-50 p-1.5 rounded-[16px] border border-neutral-100/80">
                {['Male', 'Female', 'Other'].map((g) => (
                  <motion.button 
                    key={g}
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setGender(g); setErrorMessage(null); }}
                    className={`flex-1 py-2.5 rounded-[12px] text-[13.5px] font-bold transition-all ${
                      gender === g 
                        ? 'bg-white text-[#FF8A00] shadow-sm shadow-neutral-900/5' 
                        : 'text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    {g}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* DOB & TOB Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[12px] font-[800] text-neutral-400 uppercase tracking-widest pl-1">Date of Birth</label>
                <div className="relative h-[54px] w-full bg-neutral-50/60 rounded-[16px] border border-neutral-100 flex items-center px-4 focus-within:border-[#FF8A00] focus-within:bg-white transition-all duration-200">
                  <Calendar size={18} className="text-neutral-400 mr-3 shrink-0" />
                  <input 
                    type="date"
                    value={dob}
                    onChange={(e) => { setDob(e.target.value); setErrorMessage(null); }}
                    className="flex-1 bg-transparent border-none focus:outline-none text-neutral-800 text-[14.5px] font-[600] w-full"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-[800] text-neutral-400 uppercase tracking-widest pl-1">Time of Birth</label>
                <div className="relative h-[54px] w-full bg-neutral-50/60 rounded-[16px] border border-neutral-100 flex items-center px-4 focus-within:border-[#FF8A00] focus-within:bg-white transition-all duration-200">
                  <Clock size={18} className="text-neutral-400 mr-3 shrink-0" />
                  <input 
                    type="time"
                    value={tob}
                    onChange={(e) => { setTob(e.target.value); setErrorMessage(null); }}
                    className="flex-1 bg-transparent border-none focus:outline-none text-neutral-800 text-[14.5px] font-[600] w-full"
                  />
                </div>
              </div>
            </div>

            {/* Location dropdown selectors */}
            <div className="grid grid-cols-2 gap-4">
              
              {/* Country */}
              <div className="space-y-2">
                <label className="text-[12px] font-[800] text-neutral-400 uppercase tracking-widest pl-1">Country</label>
                <div 
                  onClick={() => setActiveSheet('country')}
                  className="relative h-[54px] w-full bg-neutral-50/60 rounded-[16px] border border-neutral-100 flex items-center justify-between px-4 hover:border-neutral-200 cursor-pointer transition-all duration-200"
                >
                  <div className="flex items-center">
                    <Globe size={18} className="text-neutral-400 mr-3 shrink-0" />
                    <span className={`text-[14px] font-[600] ${country ? 'text-neutral-800' : 'text-neutral-400'}`}>
                      {country || 'Select Country'}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-neutral-400" />
                </div>
              </div>

              {/* State */}
              <div className="space-y-2">
                <label className="text-[12px] font-[800] text-neutral-400 uppercase tracking-widest pl-1">State</label>
                <div 
                  onClick={() => setActiveSheet('state')}
                  className="relative h-[54px] w-full bg-neutral-50/60 rounded-[16px] border border-neutral-100 flex items-center justify-between px-4 hover:border-neutral-200 cursor-pointer transition-all duration-200"
                >
                  <div className="flex items-center">
                    <MapPin size={18} className="text-neutral-400 mr-3 shrink-0" />
                    <span className={`text-[14px] font-[600] ${state ? 'text-neutral-800' : 'text-neutral-400'}`}>
                      {state || 'Select State'}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-neutral-400" />
                </div>
              </div>

            </div>

            <div className="grid grid-cols-2 gap-4">
              
              {/* District */}
              <div className="space-y-2">
                <label className="text-[12px] font-[800] text-neutral-400 uppercase tracking-widest pl-1">District</label>
                <div 
                  onClick={() => setActiveSheet('district')}
                  className="relative h-[54px] w-full bg-neutral-50/60 rounded-[16px] border border-neutral-100 flex items-center justify-between px-4 hover:border-neutral-200 cursor-pointer transition-all duration-200"
                >
                  <div className="flex items-center">
                    <MapPin size={18} className="text-neutral-400 mr-3 shrink-0" />
                    <span className={`text-[14px] font-[600] ${district ? 'text-neutral-800' : 'text-neutral-400'}`}>
                      {district || 'Select District'}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-neutral-400" />
                </div>
              </div>

              {/* City */}
              <div className="space-y-2">
                <label className="text-[12px] font-[800] text-neutral-400 uppercase tracking-widest pl-1">City / Town</label>
                <div 
                  onClick={() => setActiveSheet('city')}
                  className="relative h-[54px] w-full bg-neutral-50/60 rounded-[16px] border border-neutral-100 flex items-center justify-between px-4 hover:border-neutral-200 cursor-pointer transition-all duration-200"
                >
                  <div className="flex items-center">
                    <MapPin size={18} className="text-neutral-400 mr-3 shrink-0" />
                    <span className={`text-[14px] font-[600] ${city ? 'text-neutral-800' : 'text-neutral-400'}`}>
                      {city || 'Select City'}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-neutral-400" />
                </div>
              </div>

            </div>

          </div>

          {/* Premium Read-Only Astrology Attributes Section */}
          <div className="bg-neutral-50/50 border border-neutral-100/60 rounded-[18px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-2">
              <div className="flex items-center space-x-2">
                <Sparkles size={16} className="text-[#FF8A00]" />
                <h3 className="text-[12.5px] font-[800] text-neutral-400 uppercase tracking-widest">Astrology Information</h3>
              </div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase bg-neutral-100 px-2 py-0.5 rounded-full">
                Auto
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-y-4 gap-x-2">
              <div>
                <span className="text-[10.5px] font-[800] text-neutral-400 uppercase tracking-wider block">Moolank</span>
                <span className="text-xs font-semibold text-neutral-500 block mt-1">Will be calculated from birth details</span>
              </div>
              <div>
                <span className="text-[10.5px] font-[800] text-neutral-400 uppercase tracking-wider block">Bhagyank</span>
                <span className="text-xs font-semibold text-neutral-500 block mt-1">Will be calculated from birth details</span>
              </div>
              <div>
                <span className="text-[10.5px] font-[800] text-neutral-400 uppercase tracking-wider block">Zodiac / Rashi</span>
                <span className="text-xs font-semibold text-neutral-500 block mt-1">Calculation pending</span>
              </div>
              <div>
                <span className="text-[10.5px] font-[800] text-neutral-400 uppercase tracking-wider block">Nakshatra</span>
                <span className="text-xs font-semibold text-neutral-500 block mt-1">Calculation pending</span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold text-center border border-red-100">
              {errorMessage}
            </div>
          )}

          {/* Save Action */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            className="w-full h-[54px] bg-[#FF8A00] text-white font-[700] rounded-2xl text-[15px] flex items-center justify-center shadow-lg shadow-[#FF8A00]/15 cursor-pointer hover:bg-[#E07A00] transition-all"
          >
            Save Changes
          </motion.button>

        </div>
      )}

      {/* Render Searchable Bottom Sheet component for Dropdowns */}
      <AnimatePresence>
        {activeSheet && (
          <SearchBottomSheet
            title={
              activeSheet === 'country' ? 'Select Country' :
              activeSheet === 'state' ? 'Select State' :
              activeSheet === 'district' ? 'Select District' : 'Select City'
            }
            options={
              activeSheet === 'country' ? COUNTRIES :
              activeSheet === 'state' ? STATES :
              activeSheet === 'district' ? getDistrictsList() : getCitiesList()
            }
            selectedValue={
              activeSheet === 'country' ? country :
              activeSheet === 'state' ? state :
              activeSheet === 'district' ? district : city
            }
            onSelect={(val) => {
              if (activeSheet === 'country') setCountry(val);
              else if (activeSheet === 'state') {
                setState(val);
                setDistrict(''); // Reset downstream dependencies
                setCity('');
              }
              else if (activeSheet === 'district') {
                setDistrict(val);
                setCity(''); // Reset downstream city
              }
              else if (activeSheet === 'city') setCity(val);
              
              setActiveSheet(null);
              setErrorMessage(null);
            }}
            onClose={() => setActiveSheet(null)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

// Searchable bottom sheet styled perfectly like native Apple iOS drawers
function SearchBottomSheet({ title, options, selectedValue, onSelect, onClose }: any) {
  const [search, setSearch] = useState('');
  
  const filtered = options.filter((o: string) => o.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      {/* Backdrop overlay */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm" 
        onClick={onClose} 
      />
      
      {/* Bottom Sheet wrapper */}
      <motion.div 
        initial={{ y: '100%' }} 
        animate={{ y: 0 }} 
        exit={{ y: '100%' }} 
        transition={{ type: 'spring', damping: 28, stiffness: 240 }}
        className="relative w-full h-[65dvh] sm:h-[55dvh] sm:max-w-[400px] sm:mx-auto bg-[#FFFFFF] rounded-t-[24px] flex flex-col overflow-hidden shadow-2xl border-t border-neutral-100"
      >
        {/* Notch and Header */}
        <div className="p-5 pb-3 flex flex-col border-b border-neutral-100 bg-white">
          <div className="w-12 h-1.5 bg-neutral-200 rounded-full mx-auto mb-4" />
          
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-neutral-900">{title}</h3>
            <button 
              onClick={onClose}
              className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-500 rounded-full transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Search bar inside bottom drawer */}
          <div className="relative h-[46px] w-full bg-neutral-50 border border-neutral-100/80 rounded-[14px] flex items-center px-4 focus-within:ring-2 focus-within:ring-[#FF8A00]/15 focus-within:bg-white focus-within:border-[#FF8A00] transition-all">
            <Search size={16} className="text-neutral-400 mr-2.5 shrink-0" />
            <input 
              autoFocus
              type="text" 
              placeholder="Search..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="flex-1 bg-transparent border-none focus:outline-none text-neutral-800 text-[14px] font-[500]" 
            />
          </div>
        </div>

        {/* Scrollable selections list */}
        <div className="flex-1 overflow-y-auto px-4 py-2 no-scrollbar pb-10">
          {filtered.map((opt: string) => (
            <button 
              key={opt}
              type="button"
              onClick={() => onSelect(opt)}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl mb-1.5 transition-colors ${
                selectedValue === opt 
                  ? 'bg-[#FF8A00]/5 text-[#FF8A00]' 
                  : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <span className={`text-[14.5px] ${selectedValue === opt ? 'font-bold' : 'font-[600]'}`}>{opt}</span>
              {selectedValue === opt && <Check size={16} className="text-[#FF8A00]" strokeWidth={3} />}
            </button>
          ))}

          {/* Dynamic addition if query not found */}
          {search.trim().length > 0 && !options.some((o: string) => o.toLowerCase() === search.trim().toLowerCase()) && (
            <button 
              type="button"
              onClick={() => onSelect(search.trim())}
              className="w-full flex items-center justify-start space-x-2 px-4 py-3.5 rounded-xl mb-1.5 bg-neutral-50 border border-dashed border-neutral-200 text-neutral-600 hover:text-[#FF8A00]"
            >
              <Check size={14} className="text-neutral-400" />
              <span className="text-[13.5px] font-[600]">Add custom "{search.trim()}"</span>
            </button>
          )}

          {filtered.length === 0 && search.trim().length === 0 && (
            <div className="py-12 text-center text-neutral-400 font-bold text-xs">
              No options available
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
