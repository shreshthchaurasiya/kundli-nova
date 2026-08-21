import 'dotenv/config';
import { ApiNinjasHoroscopeProvider } from './src/server/providers/apiNinjasHoroscopeProvider';

async function test() {
  const apiKey = process.env.API_NINJAS_API_KEY || '';
  const url1 = `https://api.api-ninjas.com/v1/horoscope?sign=aries`;
  const url2 = `https://api.api-ninjas.com/v1/horoscope?zodiac=aries`;
  const url3 = `https://api.api-ninjas.com/v1/horoscope?sign=aries&day=tomorrow`;
  try {
    const res = await fetch(`https://api.api-ninjas.com/v1/horoscope?zodiac=aries&date=2026-08-12`, { headers: { 'X-Api-Key': apiKey } });
    console.log(await res.text());
  } catch (e: any) {
    console.error(e.message);
  }
}
test();
