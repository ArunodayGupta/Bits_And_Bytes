import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AuthProvider } from '@/context/AuthContext';
import { PatientDataProvider } from '@/context/PatientDataContext';
import { ScanDialog } from '@/components/ScanDialog';
import { evaluateCareGaps } from '@/lib/careGaps';

const MOCK_SCAN_DRAFT = {
  provider: 'mock',
  report_date: '2024-10-20',
  report_date_confidence: 95.0,
  items: [
    {
      test_key: 'hba1c',
      display: 'HbA1c (Glycated Hemoglobin)',
      loinc: '4548-4',
      value: 7.2,
      unit: '%',
      reference_range: '< 5.7 %',
      confidence: 96.0,
      needs_review: false,
      issues: [],
      reviewedAcknowledged: true,
      fhir_preview: {
        resourceType: 'Observation',
        code: { coding: [{ system: 'http://loinc.org', code: '4548-4', display: 'HbA1c' }] },
      },
    },
    {
      test_key: 'fasting_glucose',
      display: 'Fasting Blood Glucose',
      loinc: '1558-6',
      value: 118.0,
      unit: 'mg/dL',
      reference_range: '70 - 100 mg/dL',
      confidence: 84.0,
      needs_review: true,
      issues: ['OCR confidence below review threshold (84%)'],
      reviewedAcknowledged: false,
      fhir_preview: {
        resourceType: 'Observation',
        code: { coding: [{ system: 'http://loinc.org', code: '1558-6' }] },
      },
    },
  ],
  unmapped_rows: [],
  warnings: [],
};

describe('Scan-to-FHIR Workflow', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem('healthsafe_auth_role', 'patient');
    sessionStorage.setItem('healthsafe_auth_abha', '91-1234-5678-9012');
    vi.restoreAllMocks();
  });

  it('renders scan dialog with file upload and sample report button', () => {
    render(
      <AuthProvider>
        <PatientDataProvider>
          <ScanDialog open={true} onOpenChange={() => {}} />
        </PatientDataProvider>
      </AuthProvider>
    );

    expect(screen.getByText(/Scan Lab Report/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Use Sample Report/i })).toBeDefined();
  });

  it('loads sample draft and requires acknowledging needs-review rows and confirmation check', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
      if (String(url).includes('sample-scan-draft') || String(url).includes('scan-report')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(MOCK_SCAN_DRAFT),
        } as any);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as any);
    });

    render(
      <AuthProvider>
        <PatientDataProvider>
          <ScanDialog open={true} onOpenChange={() => {}} />
        </PatientDataProvider>
      </AuthProvider>
    );

    // Click "Use Sample Report"
    const sampleBtn = screen.getByRole('button', { name: /Use Sample Report/i });
    fireEvent.click(sampleBtn);

    // Wait for review table
    await waitFor(() => {
      expect(screen.getByText('HbA1c (Glycated Hemoglobin)')).toBeDefined();
    });

    expect(screen.getByText('Fasting Blood Glucose')).toBeDefined();
    expect(screen.getByText(/Needs Review/i)).toBeDefined();

    // Confirm button should be disabled initially because checkbox not ticked
    const confirmBtn = screen.getByRole('button', { name: /Confirm & Save to FHIR/i });
    expect(confirmBtn.hasAttribute('disabled')).toBe(true);

    // Acknowledge the needs-review row
    const needsReviewCheckbox = screen.getByLabelText(/Verified/i);
    fireEvent.click(needsReviewCheckbox);

    // Tick the overall report verification checkbox
    const generalCheckbox = screen.getByLabelText(/I checked these values against my physical lab report/i);
    fireEvent.click(generalCheckbox);

    // Confirm button is now enabled
    expect(confirmBtn.hasAttribute('disabled')).toBe(false);
  });

  it('clears HBA1C_OVERDUE care gap when a recent scanned HbA1c is added to resources', () => {
    // 1. Base resources: Diabetic condition + old HbA1c from April 2024
    const baseResources = [
      {
        resource_type: 'Condition',
        event_date: '2023-01-01',
        raw_json: {
          code: {
            coding: [{ system: 'http://snomed.info/sct', code: '44054006', display: 'Type 2 Diabetes Mellitus' }],
          },
          clinicalStatus: { coding: [{ code: 'active' }] },
        },
      },
      {
        resource_type: 'Observation',
        event_date: '2024-04-10',
        raw_json: {
          code: { coding: [{ system: 'http://loinc.org', code: '4548-4', display: 'HbA1c' }] },
          valueQuantity: { value: 8.1, unit: '%' },
        },
      },
    ];

    // As of 2024-10-15: > 180 days -> HBA1C_OVERDUE fires
    const gapsBefore = evaluateCareGaps(baseResources, '2024-10-15');
    expect(gapsBefore.some((g) => g.code === 'HBA1C_OVERDUE')).toBe(true);

    // 2. Add patient-confirmed OCR scanned HbA1c dated 2024-10-20
    const scannedObservation = {
      resource_type: 'Observation',
      event_date: '2024-10-20',
      source: 'ocr_scan',
      raw_json: {
        code: { coding: [{ system: 'http://loinc.org', code: '4548-4', display: 'HbA1c' }] },
        valueQuantity: { value: 7.2, unit: '%' },
        meta: { tag: [{ system: 'https://phr-demo.example.org/source', code: 'ocr-scan' }] },
      },
    };

    const resourcesAfter = [...baseResources, scannedObservation];
    const gapsAfter = evaluateCareGaps(resourcesAfter, '2024-10-21');

    // Gap cleared!
    expect(gapsAfter.some((g) => g.code === 'HBA1C_OVERDUE')).toBe(false);
  });
});
