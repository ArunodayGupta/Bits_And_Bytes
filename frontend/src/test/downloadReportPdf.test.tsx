import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import type { FhirBundle } from '@/lib/fhir/types';
import {
  buildClinicalItems,
  downloadFhirBundlePdf,
} from '@/lib/fhir/downloadFhirBundlePdf';
import { DownloadReportDialog } from '@/components/DownloadReportDialog';

const mockBundle: FhirBundle = {
  resourceType: 'Bundle',
  type: 'collection',
  entry: [
    {
      resource: {
        resourceType: 'Patient',
        id: 'patient-test-1',
        name: [{ text: 'Ramesh Kumar' }],
        gender: 'male',
        birthDate: '1970-03-12',
      },
    },
    {
      resource: {
        resourceType: 'Condition',
        id: 'cond-1',
        code: { text: 'Type 2 Diabetes Mellitus' },
        clinicalStatus: { coding: [{ code: 'active' }] },
        recordedDate: '2024-10-14',
      },
    },
    {
      resource: {
        resourceType: 'Observation',
        id: 'obs-1',
        code: { text: 'Hemoglobin A1c test' },
        valueQuantity: { value: 7.2, unit: '%' },
        status: 'final',
        effectiveDateTime: '2024-10-14T10:30:00+05:30',
      },
    },
    {
      resource: {
        resourceType: 'Observation',
        id: 'obs-2',
        code: { text: 'Fasting Blood Glucose' },
        valueQuantity: { value: 138, unit: 'mg/dL' },
        status: 'final',
        effectiveDateTime: '2024-10-14T10:30:00+05:30',
      },
    },
    {
      resource: {
        resourceType: 'MedicationRequest',
        id: 'med-1',
        medicationCodeableConcept: { text: 'Telmisartan 40 mg oral tablet' },
        dosageInstruction: [{ text: 'Take once daily in morning' }],
        authoredOn: '2024-10-14',
        status: 'active',
      },
    },
    {
      resource: {
        resourceType: 'Encounter',
        id: 'enc-1',
        class: { display: 'Outpatient Consultation' },
        serviceProvider: { display: 'Apollo Hospitals' },
        status: 'finished',
        period: { start: '2024-10-14' },
      },
    },
  ],
};

describe('Selectable PDF Report Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('buildClinicalItems extracts and categorizes all clinical resources', () => {
    const items = buildClinicalItems(mockBundle);
    expect(items.length).toBe(5); // 1 condition, 2 observations, 1 medication, 1 encounter
    const categories = items.map((i) => i.category);
    expect(categories).toContain('Diagnosis');
    expect(categories).toContain('Clinical history');
    expect(categories).toContain('Prescription');
    expect(categories).toContain('Visit');

    const titles = items.map((i) => i.title);
    expect(titles).toContain('Type 2 Diabetes Mellitus');
    expect(titles).toContain('Hemoglobin A1c test');
    expect(titles).toContain('Fasting Blood Glucose');
    expect(titles).toContain('Telmisartan 40 mg oral tablet');
    expect(titles).toContain('Outpatient Consultation');
  });

  it('downloadFhirBundlePdf executes without throwing when filtering by selected resource IDs', async () => {
    await expect(
      downloadFhirBundlePdf(mockBundle, {
        selectedResourceIds: ['obs-1', 'med-1'],
        reportTitle: 'Custom Selected Reports',
      })
    ).resolves.not.toThrow();
  });

  it('downloadFhirBundlePdf accepts raw array of IDs for backward compatibility', async () => {
    await expect(downloadFhirBundlePdf(mockBundle, ['obs-1'])).resolves.not.toThrow();
  });

  it('renders DownloadReportDialog with all reports pre-selected by default', () => {
    const onOpenChange = vi.fn();
    render(
      <DownloadReportDialog
        open={true}
        onOpenChange={onOpenChange}
        bundle={mockBundle}
        patientName="Ramesh Kumar"
      />
    );

    expect(screen.getByText('Select Reports to Download')).toBeTruthy();
    expect(screen.getByTestId('selected-summary').textContent).toContain('Selected 5 of 5 reports');
    expect(screen.getByText('Hemoglobin A1c test')).toBeTruthy();
    expect(screen.getByText('Telmisartan 40 mg oral tablet')).toBeTruthy();
    expect(screen.getByText('Outpatient Consultation')).toBeTruthy();
  });

  it('allows toggling individual reports, updating the selected count and button', () => {
    const onOpenChange = vi.fn();
    render(
      <DownloadReportDialog
        open={true}
        onOpenChange={onOpenChange}
        bundle={mockBundle}
        patientName="Ramesh Kumar"
      />
    );

    // Click on HbA1c item to uncheck it
    const hba1cCard = screen.getByText('Hemoglobin A1c test').closest('[role="checkbox"]');
    expect(hba1cCard).toBeTruthy();
    fireEvent.click(hba1cCard!);

    expect(screen.getByTestId('selected-summary').textContent).toContain('Selected 4 of 5 reports');
    expect(screen.getByText(/Download PDF \(4\)/i)).toBeTruthy();

    // Click again to re-check it
    fireEvent.click(hba1cCard!);
    expect(screen.getByTestId('selected-summary').textContent).toContain('Selected 5 of 5 reports');
  });

  it('handles "Clear" and "Select all" quick action controls', () => {
    const onOpenChange = vi.fn();
    render(
      <DownloadReportDialog
        open={true}
        onOpenChange={onOpenChange}
        bundle={mockBundle}
        patientName="Ramesh Kumar"
      />
    );

    const clearButton = screen.getByRole('button', { name: /^Clear$/i });
    fireEvent.click(clearButton);

    expect(screen.getByTestId('selected-summary').textContent).toContain('Selected 0 of 5 reports');
    const downloadBtn = screen.getByRole('button', { name: /Download PDF \(0\)/i });
    expect(downloadBtn.hasAttribute('disabled')).toBe(true);

    const selectAllBtn = screen.getByRole('button', { name: /^Select all$/i });
    fireEvent.click(selectAllBtn);
    expect(screen.getByTestId('selected-summary').textContent).toContain('Selected 5 of 5 reports');
    expect(screen.getByRole('button', { name: /Download PDF \(5\)/i }).hasAttribute('disabled')).toBe(false);
  });

  it('filters reports when searching by keyword', () => {
    const onOpenChange = vi.fn();
    render(
      <DownloadReportDialog
        open={true}
        onOpenChange={onOpenChange}
        bundle={mockBundle}
        patientName="Ramesh Kumar"
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search reports by test/i);
    fireEvent.change(searchInput, { target: { value: 'Telmisartan' } });

    expect(screen.getByText('Telmisartan 40 mg oral tablet')).toBeTruthy();
    expect(screen.queryByText('Hemoglobin A1c test')).toBeNull();
  });

  it('filters reports when switching category tabs', () => {
    const onOpenChange = vi.fn();
    render(
      <DownloadReportDialog
        open={true}
        onOpenChange={onOpenChange}
        bundle={mockBundle}
        patientName="Ramesh Kumar"
      />
    );

    // Switch to Prescriptions tab
    const rxTab = screen.getByRole('button', { name: /Prescriptions/i });
    fireEvent.click(rxTab);

    expect(screen.getByText('Telmisartan 40 mg oral tablet')).toBeTruthy();
    expect(screen.queryByText('Hemoglobin A1c test')).toBeNull();
    expect(screen.queryByText('Outpatient Consultation')).toBeNull();
  });

  it('allows selecting only current category using the "Only [category]" shortcut', () => {
    const onOpenChange = vi.fn();
    render(
      <DownloadReportDialog
        open={true}
        onOpenChange={onOpenChange}
        bundle={mockBundle}
        patientName="Ramesh Kumar"
      />
    );

    // Click Labs tab
    const labsTab = screen.getByRole('button', { name: /Labs/i });
    fireEvent.click(labsTab);

    // Click "Only lab" button
    const onlyLabBtn = screen.getByRole('button', { name: /Only lab/i });
    fireEvent.click(onlyLabBtn);

    expect(screen.getByTestId('selected-summary').textContent).toContain('Selected 2 of 5 reports');
  });

  it('triggers download when clicking Download PDF with selected reports', async () => {
    const onOpenChange = vi.fn();
    render(
      <DownloadReportDialog
        open={true}
        onOpenChange={onOpenChange}
        bundle={mockBundle}
        patientName="Ramesh Kumar"
      />
    );

    const downloadBtn = screen.getByRole('button', { name: /Download PDF \(5\)/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(screen.getByText(/Downloaded!/i)).toBeTruthy();
    });
  });
});
