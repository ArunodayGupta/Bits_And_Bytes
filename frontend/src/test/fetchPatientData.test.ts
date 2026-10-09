import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchPatientData } from '../lib/fhir/fetchPatientData';

describe('fetchPatientData data source loader', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves offline source immediately without calling global fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const bundle = await fetchPatientData('offline');

    expect(bundle).toBeDefined();
    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.entry?.length).toBeGreaterThan(0);
    // Offline mode MUST NOT invoke network fetch
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('gracefully falls back to offline bundle on network error when live is requested', async () => {
    const onFallbackMock = vi.fn();

    // Mock fetch to reject with network failure
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network connection error'));

    const bundle = await fetchPatientData('live', onFallbackMock);

    expect(bundle).toBeDefined();
    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.entry?.length).toBeGreaterThan(0);
    expect(onFallbackMock).toHaveBeenCalledTimes(1);
  });

  it('gracefully falls back to offline bundle on non-200 HTTP response', async () => {
    const onFallbackMock = vi.fn();

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    } as Response);

    const bundle = await fetchPatientData('live', onFallbackMock);

    expect(bundle).toBeDefined();
    expect(onFallbackMock).toHaveBeenCalledTimes(1);
  });
});
