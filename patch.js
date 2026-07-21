import fs from 'fs';
const file = 'src/server/controllers/kundli.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  /if \(error\) {\s*\/\/ The RPC raises EXCEPTION for auth failures.*/,
  `if (error) {
      if (error.message && error.message.includes('User profile not found')) {
        return res.json({
          status: 'success',
          data: null,
          reason: 'INCOMPLETE_BIRTH_DETAILS',
        });
      }
      // The RPC raises EXCEPTION for auth failures — surface those as 500.`
);
fs.writeFileSync(file, content);
console.log('Patched kundli.ts');
