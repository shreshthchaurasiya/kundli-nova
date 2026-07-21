import fs from 'fs';
const file = 'src/screens/ConsultationChatScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove KundliProfileSelector import
content = content.replace("import KundliProfileSelector from '../features/consultation-chat/components/KundliProfileSelector';", "import ConsultationProfileSheet from '../features/consultation-chat/components/ConsultationProfileSheet';");

// 2. Adjust initial state and prevent double mount
content = content.replace(
  "const [currentState, setCurrentState] = useState<ConsultationState>(\n    readOnlySessionId ? 'CHECKING_WALLET' : 'SELECTING_KUNDLI'\n  );",
  "const [currentState, setCurrentState] = useState<ConsultationState>('CHECKING_WALLET');"
);

content = content.replace(
  "const [isSubmittingSession, setIsSubmittingSession] = useState(false);",
  "const [isSubmittingSession, setIsSubmittingSession] = useState(false);\n  const hasRequestedRef = useRef(false);\n  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);\n  const [currentKundliProfileId, setCurrentKundliProfileId] = useState<string | null>(null);"
);

// In useEffect
content = content.replace(
  `      // NEW SESSION PATH — show Kundli selector first.
      // The selector itself calls runWalletVerification once the customer confirms.
      setCurrentState('SELECTING_KUNDLI');`,
  `      // NEW SESSION PATH
      if (!hasRequestedRef.current) {
        hasRequestedRef.current = true;
        void runWalletVerification();
      }`
);

// Update runWalletVerification
content = content.replace(
  `  const runWalletVerification = async (kundliProfileId?: string) => {
    // Resolve which profileId to use: argument > existing state.
    const resolvedProfileId = kundliProfileId ?? selectedKundliProfileId ?? undefined;`,
  `  const runWalletVerification = async () => {
    // We do not pass kundliProfileId from client anymore for auto-resolution.`
);
content = content.replace(
  `const result = await consultationRepository.createSession(astrologerId, resolvedProfileId ?? undefined);`,
  `const result = await consultationRepository.createSession(astrologerId);`
);

// After result is assigned, we should also track session's kundli_profile_id if returned
content = content.replace(
  `const session = result.session;`,
  `const session = result.session;
      if (session && (session as any).kundli_profile_id) {
        setCurrentKundliProfileId((session as any).kundli_profile_id);
      }`
);
content = content.replace(
  `const session = await consultationRepository.getSession(activeSessionId);`,
  `const session = await consultationRepository.getSession(activeSessionId);
    if ((session as any).kundli_profile_id) setCurrentKundliProfileId((session as any).kundli_profile_id);`
);
content = content.replace(
  `const heartbeat = async () => {
      try {
        const result = await consultationRepository.heartbeat(activeSessionId);`,
  `const heartbeat = async () => {
      try {
        const result = await consultationRepository.heartbeat(activeSessionId);
        if ((result.session as any).kundli_profile_id) setCurrentKundliProfileId((result.session as any).kundli_profile_id);`
);

// Add top-bar profile icon
const topBarSearch = `            <div className="flex flex-col ml-3 min-w-0">
              <h2 className="text-[17px] font-[900] text-[#111827] truncate leading-tight tracking-tight">{astro?.name}</h2>
              <p className="text-[11.5px] font-bold text-[#FF8A00] truncate uppercase tracking-wide">{astro?.skills[0]}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">`;
const topBarReplace = `            <div className="flex flex-col ml-3 min-w-0">
              <h2 className="text-[17px] font-[900] text-[#111827] truncate leading-tight tracking-tight">{astro?.name}</h2>
              <p className="text-[11.5px] font-bold text-[#FF8A00] truncate uppercase tracking-wide">{astro?.skills[0]}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {['ACTIVE', 'LOW_BALANCE', 'RECHARGING'].includes(currentState) && (
              <button onClick={() => setIsProfileSheetOpen(true)} className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors">
                <User size={18} />
              </button>
            )}`;
content = content.replace(topBarSearch, topBarReplace);

// Remove the IF conditions for SELECTING_KUNDLI and PREPARING_KUNDLI entirely
content = content.replace(/  \/\/ 0\. SELECTING KUNDLI[\s\S]*?if \(currentState === 'CHECKING_WALLET'\)/, "  if (currentState === 'CHECKING_WALLET')");
content = content.replace(/  \/\/ 3\. KUNDLI PREPARATION SCREEN[\s\S]*?if \(currentState === 'WAITING_FOR_ASTROLOGER'\)/, "  if (currentState === 'WAITING_FOR_ASTROLOGER')");

// In the final return block, append the ConsultationProfileSheet
const finalReturn = `    </motion.div>
  );
}`;
const finalReplace = `      <ConsultationProfileSheet
        isOpen={isProfileSheetOpen}
        onClose={() => setIsProfileSheetOpen(false)}
        sessionId={activeSessionId}
        currentProfileId={currentKundliProfileId}
        onProfileSwitched={(id) => setCurrentKundliProfileId(id)}
      />
    </motion.div>
  );
}`;
content = content.replace(finalReturn, finalReplace);

fs.writeFileSync(file, content);
console.log('Patched ConsultationChatScreen');
