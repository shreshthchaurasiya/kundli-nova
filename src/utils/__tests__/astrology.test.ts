import { describe, it, expect } from 'vitest';
import { getWesternSunSign } from '../astrology';

describe('getWesternSunSign', () => {
  it('correctly derives Aries', () => {
    expect(getWesternSunSign('1990-03-21')).toBe('aries');
    expect(getWesternSunSign('1990-04-19')).toBe('aries');
  });

  it('correctly derives Taurus', () => {
    expect(getWesternSunSign('1990-04-20')).toBe('taurus');
    expect(getWesternSunSign('1990-05-20')).toBe('taurus');
  });

  it('correctly derives Capricorn', () => {
    expect(getWesternSunSign('1990-12-22')).toBe('capricorn');
    expect(getWesternSunSign('1991-01-19')).toBe('capricorn');
  });

  it('returns null for missing or invalid dates', () => {
    expect(getWesternSunSign('')).toBeNull();
    expect(getWesternSunSign('invalid-date')).toBeNull();
  });
});
