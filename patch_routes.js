import fs from 'fs';
const file = 'src/server/routes/v1/consultation.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("cancelWaitingSession", "cancelWaitingSession,\n  updateSessionKundliProfile");

const routerUpdate = `
router.post('/:id/heartbeat', heartbeatSession);
router.patch('/:id/kundli-profile', updateSessionKundliProfile);
`;

content = content.replace("router.post('/:id/heartbeat', heartbeatSession);", routerUpdate);

fs.writeFileSync(file, content);
console.log('Patched routes');
