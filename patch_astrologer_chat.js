import fs from 'fs';
const file = 'src/features/astrologer/chat/screens/AstrologerConsultationChatScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

const importSearch = `import AstrologerKundliWorkspace from '../../workspace/AstrologerKundliWorkspace';`;
const importReplace = `import AstrologerKundliWorkspace from '../../workspace/AstrologerKundliWorkspace';\nimport { User } from 'lucide-react';`;
if (!content.includes('import { User }')) {
  content = content.replace(importSearch, importReplace);
}

const stateSearch = `  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);`;
const stateReplace = `  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);\n  const [currentKundliProfileId, setCurrentKundliProfileId] = useState<string | null>(null);`;
if (!content.includes('currentKundliProfileId')) {
  content = content.replace(stateSearch, stateReplace);
}

const effectSearch = `const session = await consultationRepository.getSession(activeSessionId);`;
const effectReplace = `const session = await consultationRepository.getSession(activeSessionId);\n      if ((session as any).kundli_profile_id) setCurrentKundliProfileId((session as any).kundli_profile_id);`;
content = content.replace(effectSearch, effectReplace);

const heartbeatSearch = `const result = await consultationRepository.heartbeat(activeSessionId);`;
const heartbeatReplace = `const result = await consultationRepository.heartbeat(activeSessionId);\n        if ((result.session as any).kundli_profile_id) setCurrentKundliProfileId((result.session as any).kundli_profile_id);`;
content = content.replace(heartbeatSearch, heartbeatReplace);

const topBarSearch = `            <div className="flex flex-col ml-3 min-w-0">
              <h2 className="text-[17px] font-[900] text-[#111827] truncate leading-tight tracking-tight">{customerName}</h2>
              <p className="text-[11.5px] font-bold text-[#FF8A00] truncate uppercase tracking-wide">Ongoing Consultation</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">`;
const topBarReplace = `            <div className="flex flex-col ml-3 min-w-0">
              <h2 className="text-[17px] font-[900] text-[#111827] truncate leading-tight tracking-tight">{customerName}</h2>
              <p className="text-[11.5px] font-bold text-[#FF8A00] truncate uppercase tracking-wide">Ongoing Consultation</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button onClick={() => setIsWorkspaceOpen(true)} className="w-10 h-10 rounded-full flex items-center justify-center text-[#FF8A00] bg-[#FF8A00]/10 hover:bg-[#FF8A00]/20 transition-colors">
              <User size={18} />
            </button>`;
if (!content.includes('<User size={18} />')) {
  content = content.replace(topBarSearch, topBarReplace);
}

// Ensure the AstrologerKundliWorkspace gets passed the profileId, though it might just use sessionId to fetch it.
const workspaceSearch = `<AstrologerKundliWorkspace
        isOpen={isWorkspaceOpen}
        onClose={() => setIsWorkspaceOpen(false)}
        sessionId={activeSessionId}
      />`;
const workspaceReplace = `<AstrologerKundliWorkspace
        isOpen={isWorkspaceOpen}
        onClose={() => setIsWorkspaceOpen(false)}
        sessionId={activeSessionId}
        profileId={currentKundliProfileId}
      />`;
content = content.replace(workspaceSearch, workspaceReplace);

fs.writeFileSync(file, content);
console.log('Patched AstrologerConsultationChatScreen');
