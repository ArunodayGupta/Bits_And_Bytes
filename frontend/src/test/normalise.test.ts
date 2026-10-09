import { describe, it, expect } from 'vitest';
import { normaliseQuery, matchesRxId, matchesAbha } from '../lib/normalise';

describe('Clinician search normaliser', () => {
  it('normalises unhyphenated or lowercase Rx-IDs to canonical form', () => {
    const res1 = normaliseQuery('APLRR1410RAME');
    expect(res1.type).toBe('rx-id');
    expect(res1.canonical).toBe('APL-RR-1410-RAME');

    const res2 = normaliseQuery('apl-rr-1410-rame');
    expect(res2.type).toBe('rx-id');
    expect(res2.canonical).toBe('APL-RR-1410-RAME');

    const res3 = normaliseQuery('APL RR 1410 RAME');
    expect(res3.type).toBe('rx-id');
    expect(res3.canonical).toBe('APL-RR-1410-RAME');
  });

  it('normalises ABHA numbers correctly', () => {
    const res1 = normaliseQuery('91-1234-5678-9012');
    expect(res1.type).toBe('abha');
    expect(res1.canonical).toBe('91-1234-5678-9012');

    const res2 = normaliseQuery('91123456789012');
    expect(res2.type).toBe('abha');
    expect(res2.canonical).toBe('91-1234-5678-9012');
  });

  it('matchesRxId compares flexibly regardless of spacing or hyphens', () => {
    expect(matchesRxId('APL-RR-1410-RAME', 'APLRR1410RAME')).toBe(true);
    expect(matchesRxId('APL-RR-1410-RAME', 'apl-rr-1410-rame')).toBe(true);
    expect(matchesRxId('APL-RR-1410-RAME', ' APL RR 1410 RAME ')).toBe(true);
    expect(matchesRxId('APL-RR-1410-RAME', 'OTHER-ID')).toBe(false);
  });

  it('matchesAbha compares flexibly', () => {
    expect(matchesAbha('91-1234-5678-9012', '91123456789012')).toBe(true);
    expect(matchesAbha('91-1234-5678-9012', ' 91-1234-5678-9012 ')).toBe(true);
    expect(matchesAbha('91-1234-5678-9012', '12345')).toBe(false);
  });
});
