import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { LOGO_URL } from '../data';
import { Screen } from '../types';
import { profileStorage } from '../services/storage/profileStorage';

interface SplashScreenProps {
  onFinish: (screen: Screen) => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      const profile = profileStorage.getProfile();
      if (profile) {
        onFinish('home');
      } else {
        onFinish('login');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <img 
          src={LOGO_URL} 
          alt="Kundli Nova Logo" 
          className="w-32 h-32 object-contain mb-6 drop-shadow-md rounded-2xl"
        />
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Kundli Nova</h1>
      </motion.div>
    </div>
  );
}
