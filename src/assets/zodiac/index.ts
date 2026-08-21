// Zodiac image map using Vite's import.meta.url approach to avoid TS declaration issues
const ZODIAC_IMAGES: Record<string, string> = {
  aries: new URL('./aries.png', import.meta.url).href,
  taurus: new URL('./taurus.png', import.meta.url).href,
  gemini: new URL('./gemini.png', import.meta.url).href,
  cancer: new URL('./cancer.png', import.meta.url).href,
  leo: new URL('./leo.png', import.meta.url).href,
  virgo: new URL('./virgo.png', import.meta.url).href,
  libra: new URL('./libra.png', import.meta.url).href,
  scorpio: new URL('./scorpio.png', import.meta.url).href,
  sagittarius: new URL('./sagittarius.png', import.meta.url).href,
  capricorn: new URL('./capricorn.png', import.meta.url).href,
  aquarius: new URL('./aquarius.png', import.meta.url).href,
  pisces: new URL('./pisces.png', import.meta.url).href,
};

export { ZODIAC_IMAGES };
export default ZODIAC_IMAGES;
