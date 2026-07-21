import fs from 'fs';

// 1. Patch endpoints.ts
let endpointsContent = fs.readFileSync('src/services/api/endpoints.ts', 'utf8');
endpointsContent = endpointsContent.replace(
  "CANCEL: (id: string) => `${API_BASE}/consultations/${id}/cancel`,",
  "CANCEL: (id: string) => `${API_BASE}/consultations/${id}/cancel`,\n    UPDATE_KUNDLI_PROFILE: (id: string) => `${API_BASE}/consultations/${id}/kundli-profile`,"
);
fs.writeFileSync('src/services/api/endpoints.ts', endpointsContent);

// 2. Patch IConsultationRepository
let interfaceContent = fs.readFileSync('src/repositories/interfaces/consultation.ts', 'utf8');
interfaceContent = interfaceContent.replace(
  "cancelSession(id: string): Promise<ConsultationHeartbeatResult>;",
  "cancelSession(id: string): Promise<ConsultationHeartbeatResult>;\n  updateKundliProfile(id: string, kundliProfileId: string): Promise<ConsultationSession>;"
);
fs.writeFileSync('src/repositories/interfaces/consultation.ts', interfaceContent);

// 3. Patch apiConsultationRepository.ts
let repoContent = fs.readFileSync('src/repositories/api/apiConsultationRepository.ts', 'utf8');
const methodToAdd = `
  async updateKundliProfile(id: string, kundliProfileId: string): Promise<ConsultationSession> {
    return await ApiClient.patch<ConsultationSession>(ENDPOINTS.CONSULTATION.UPDATE_KUNDLI_PROFILE(id), {
      body: { kundliProfileId },
    });
  }
`;
repoContent = repoContent.replace(
  "async cancelSession(id: string): Promise<ConsultationHeartbeatResult> {\n    return await ApiClient.post<ConsultationHeartbeatResult>(ENDPOINTS.CONSULTATION.CANCEL(id));\n  }",
  "async cancelSession(id: string): Promise<ConsultationHeartbeatResult> {\n    return await ApiClient.post<ConsultationHeartbeatResult>(ENDPOINTS.CONSULTATION.CANCEL(id));\n  }\n" + methodToAdd
);
fs.writeFileSync('src/repositories/api/apiConsultationRepository.ts', repoContent);

console.log('Patched frontend repo');
