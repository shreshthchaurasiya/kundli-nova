import * as fs from 'fs';

// Chat screen
let chat = fs.readFileSync('src/astrologer-workspace/chat/screens/AstrologerConsultationChatScreen.tsx', 'utf-8');
chat = chat.replace(/from '\.\.\/\.\.\/types'/g, "from '../../../types'");
chat = chat.replace(/from '\.\.\/\.\.\/components/g, "from '../../../components");
chat = chat.replace(/from '\.\.\/\.\.\/consultation-chat/g, "from '../../../screens/ConsultationChatScreen'"); // wait, let's verify what it was
chat = chat.replace(/from '\.\.\/\.\.\/repositories/g, "from '../../../repositories");
fs.writeFileSync('src/astrologer-workspace/chat/screens/AstrologerConsultationChatScreen.tsx', chat);

// Dashboard screen
let dash = fs.readFileSync('src/astrologer-workspace/dashboard/screens/AstrologerDashboardScreen.tsx', 'utf-8');
dash = dash.replace(/from '\.\.\/\.\.\/types'/g, "from '../../../types'");
dash = dash.replace(/from '\.\.\/\.\.\/repositories/g, "from '../../../repositories");
fs.writeFileSync('src/astrologer-workspace/dashboard/screens/AstrologerDashboardScreen.tsx', dash);

// Dashboard service
let svc = fs.readFileSync('src/astrologer-workspace/dashboard/services/astrologerDashboardService.ts', 'utf-8');
svc = svc.replace(/from '\.\.\/\.\.\/lib\/supabase'/g, "from '../../../lib/supabase'");
fs.writeFileSync('src/astrologer-workspace/dashboard/services/astrologerDashboardService.ts', svc);

// Profile Editor
let prof = fs.readFileSync('src/astrologer-workspace/profile-editor/screens/AstrologerProfileEditorScreen.tsx', 'utf-8');
prof = prof.replace(/from '\.\.\/\.\.\/features\/astrologer\/partner\/AstrologerPartnerContext'/g, "from '../../../features/astrologer/partner/AstrologerPartnerContext'");
prof = prof.replace(/from '\.\.\/\.\.\/features\/astrologer\/partner\/astrologerPartnerService'/g, "from '../../../features/astrologer/partner/astrologerPartnerService'");
prof = prof.replace(/from '\.\.\/\.\.\/features\/astrologer\/shared\/constants'/g, "from '../../../features/astrologer/shared/constants'");
prof = prof.replace(/from '\.\.\/\.\.\/types'/g, "from '../../../types'");
fs.writeFileSync('src/astrologer-workspace/profile-editor/screens/AstrologerProfileEditorScreen.tsx', prof);

console.log('Fixed depths');
