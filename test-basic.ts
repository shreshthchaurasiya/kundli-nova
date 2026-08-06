import { config } from 'dotenv';
import { ProkeralaHoroscopeProvider } from './src/server/providers/prokeralaHoroscopeProvider';

config();

async function test() {
  const provider = new ProkeralaHoroscopeProvider();
  const originalGetValidToken = (provider as any).getValidToken.bind(provider);
  
  try {
    const token = await originalGetValidToken();
    const url = `https://api.prokerala.com/v2/horoscope/daily?sign=cancer&datetime=${encodeURIComponent(new Date().toISOString())}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    const data = await response.json();
    console.log(response.status);
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}

test();
