import React from 'react';

export const CELESTIAL_CHAT_BACKGROUND_URL = 'https://i.ibb.co/DHDVBJSZ/unnamed.png';

export default function CelestialChatBackground() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none"
    >
      <img
        src={CELESTIAL_CHAT_BACKGROUND_URL}
        alt=""
        className="h-full w-full object-cover pointer-events-none select-none"
        draggable={false}
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-white/8" />
    </div>
  );
}
