import { NavamshaProvider } from './src/server/providers/navamshaProvider';
import dotenv from 'dotenv';
dotenv.config();

async function runSmokeTest() {
  console.log('--- STAGE 6B SMOKE TEST ---');
  console.log('Using Base URL:', process.env.NAVAMSHA_API_BASE_URL);

  const provider = new NavamshaProvider({ timeoutMs: 25000 });

  // Construct dummy verified inputs (mimicking two real profiles with valid coordinates)
  const brideInput = {
    profileId: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Bride',
    dateOfBirth: '1995-05-15',
    timeOfBirth: '10:30:00',
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: 'Asia/Kolkata',
    ayanamsha: 'lahiri'
  };

  const groomInput = {
    profileId: '987f6543-e21b-12d3-a456-426614174000',
    name: 'Groom',
    dateOfBirth: '1993-08-20',
    timeOfBirth: '14:45:00',
    latitude: 18.5204,
    longitude: 73.8567,
    timezone: 'Asia/Kolkata',
    ayanamsha: 'lahiri'
  };

  try {
    console.log('Sending Kundli Matching Request to Navamsha...');
    const result = await provider.getCompatibilityAnalysis(brideInput as any, groomInput as any);
    console.log('\n--- REAL RAW PROVIDER OUTPUT (REDACTED) ---');
    console.log('Provider Success: true');
    
    // Safety: Redact the object
    const redact = (obj: any, depth = 0): any => {
      if (depth > 2) return typeof obj;
      if (Array.isArray(obj)) return `Array(${obj.length}) [ ${obj.length > 0 ? typeof obj[0] : 'empty'} ]`;
      if (obj !== null && typeof obj === 'object') {
        const result: any = {};
        for (const key of Object.keys(obj)) {
          if (depth === 2) {
            result[key] = typeof obj[key];
          } else {
            result[key] = redact(obj[key], depth + 1);
          }
        }
        return result;
      }
      return typeof obj;
    };
   
    // Wait, the result is actually the 'output' field from the response envelope based on our provider implementation.
    // Provider returns `validatedResponse.data.output as any`
    console.log('Output Type:', typeof result);
    if (result && typeof result === 'object') {
      console.log('Output Keys:', Object.keys(result));
      console.log('First-level nested structure:', JSON.stringify(redact(result), null, 2));
    }
    console.log('--------------------------------');
  } catch (err: any) {
    console.error('Error during matching:', err.message);
  }
}

runSmokeTest();
