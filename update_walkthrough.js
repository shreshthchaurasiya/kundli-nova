import fs from 'fs';
const path = '/home/shreshthchaurasiya/.gemini/antigravity-ide/brain/dae43909-8b74-4dde-a32b-12fc04caf3a2/walkthrough.md';
let content = fs.readFileSync(path, 'utf8');

const newContent = `
## Critical Bug Fixes (v2)

Based on the final audit, three critical bugs were patched via a new additive migration (\`20260727000003_astrologer_billing_fixes_v2.sql\`):

### 1. Authorization Must Happen Before Billing
- **Context:** In \`finish_consultation_session\`, the \`bill_consultation_session\` was being called prior to verifying the caller's authorization. 
- **Fix:** Restructured the function so that the session is loaded, locked, and fully authorized *first*. \`bill_consultation_session\` is strictly invoked only after authorization passes and only if the session is not already \`ENDED\`. This fully prevents unauthorized calls from mutating billing state or generating rogue events.

### 2. Exclude Reversed Ledger Rows
- **Context:** The \`get_my_astrologer_dashboard_summary\` was missing the \`calculation_status <> 'reversed'\` filter on the aggregate query, causing reversed billing amounts to falsely inflate the astrologer's total lifetime/month/week sums.
- **Fix:** Appended \`and calculation_status <> 'reversed'\` directly onto the aggregate query predicate to guarantee reversed sums are correctly excluded from all UI metrics.

### 3. Correct Timezone Conversion
- **Context:** The previous \`earned_at at time zone 'utc' at time zone p_timezone\` produced unnecessary double conversions on \`timestamptz\` types which could shift boundaries inaccurately.
- **Fix:** Simplified timestamp handling to strictly use \`at time zone p_timezone\` alongside \`pg_catalog.now() at time zone p_timezone\` for precise local date boundary isolation (Midnight UTC/IST issues resolved).

### Verification
- **Code Health:** \`npm run lint\`, \`npm test\` and \`npm run build\` passed successfully.
- **Database Testing:** Added timezone and \`reversed\` testing logic into \`supabase/tests/database/astrologer_billing.test.sql\`. *(Execution against \`npx supabase test db\` remains pending active local environment.)*
`;

content = content + '\n' + newContent;
fs.writeFileSync(path, content, 'utf8');
