import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { PatientDataProvider } from '@/context/PatientDataContext';
import { SavingsCard } from '@/components/SavingsCard';

const MOCK_SAVINGS_DATA = {
  rx_id: 'APL-RR-1410-RAME',
  medications: [
    {
      prescribed_drug: 'Telmisartan 40 mg oral tablet',
      salt: 'Telmisartan',
      generic_alternative: 'Jan Aushadhi Telmisartan 40mg',
      monthly_savings_rupees: '384.00',
      savings_percentage: '87.3',
      monthly_cost_brand: '440.00',
      monthly_cost_generic: '56.00',
      doses_per_day: 1,
      assumed_frequency: false,
      caution: null,
      price_as_of: '2024-10-01',
      illustrative: true,
    },
    {
      prescribed_drug: 'Levothyroxine 50 mcg oral tablet',
      salt: 'Levothyroxine',
      generic_alternative: 'Jan Aushadhi Levothyroxine 50mcg',
      monthly_savings_rupees: '120.00',
      savings_percentage: '75.0',
      monthly_cost_brand: '160.00',
      monthly_cost_generic: '40.00',
      doses_per_day: 1,
      assumed_frequency: false,
      caution: 'Narrow therapeutic index; do not switch brands or generics without asking your prescriber.',
      price_as_of: '2024-10-01',
      illustrative: true,
    },
  ],
  unmatched: [
    {
      prescribed_drug: 'Telmisartan + Hydrochlorothiazide',
      reason: 'Combination product',
    },
  ],
  total_monthly_savings: '504.00',
  disclaimer: 'Illustrative prices. Do not change medicines without asking your doctor or pharmacist.',
};

describe('SavingsCard Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders total savings header and illustrative prices badge', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(MOCK_SAVINGS_DATA),
      } as any)
    );

    render(
      <PatientDataProvider>
        <SavingsCard rxId="APL-RR-1410-RAME" />
      </PatientDataProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Estimated monthly savings with Jan Aushadhi generics:/i)).toBeDefined();
    });

    expect(screen.getByText('₹504.00')).toBeDefined();
    expect(screen.getByText('Illustrative prices')).toBeDefined();
  });

  it('expands table to show matched drugs with worked savings example and caution', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(MOCK_SAVINGS_DATA),
      } as any)
    );

    render(
      <PatientDataProvider>
        <SavingsCard rxId="APL-RR-1410-RAME" defaultExpanded={true} />
      </PatientDataProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Telmisartan 40 mg oral tablet')).toBeDefined();
    });

    // Check worked example: Telmisartan 40mg -> 440 vs 56 -> 384 (87.3%)
    expect(screen.getByText('Jan Aushadhi Telmisartan 40mg')).toBeDefined();
    expect(screen.getByText('₹440.00')).toBeDefined();
    expect(screen.getByText('₹56.00')).toBeDefined();
    expect(screen.getByText('₹384.00 (87.3%)')).toBeDefined();

    // Check caution for Levothyroxine
    expect(
      screen.getByText(/Narrow therapeutic index; do not switch brands or generics without asking your prescriber/i)
    ).toBeDefined();

    // Check unmatched list
    expect(screen.getByText('Telmisartan + Hydrochlorothiazide')).toBeDefined();
    expect(screen.getByText('Combination product')).toBeDefined();

    // Check mandatory disclaimer
    expect(screen.getByText(/Illustrative prices. Do not change medicines without asking your doctor/i)).toBeDefined();
  });

  it('toggles breakdown visibility on button click', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(MOCK_SAVINGS_DATA),
      } as any)
    );

    render(
      <PatientDataProvider>
        <SavingsCard rxId="APL-RR-1410-RAME" defaultExpanded={false} />
      </PatientDataProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('View breakdown')).toBeDefined();
    });

    expect(screen.queryByText('Telmisartan 40 mg oral tablet')).toBeNull();

    fireEvent.click(screen.getByText('View breakdown'));

    expect(screen.getByText('Telmisartan 40 mg oral tablet')).toBeDefined();
    expect(screen.getByText('Hide breakdown')).toBeDefined();
  });
});
