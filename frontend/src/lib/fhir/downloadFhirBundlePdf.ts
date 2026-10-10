import type { FhirBundle, FhirPatient, FhirResource } from './types';

const PAGE_MARGIN = 16;
const BOTTOM_MARGIN = 18;
const LINE_HEIGHT = 4.8;
const CATEGORY_ORDER = ['Visit', 'Diagnosis', 'Clinical history', 'Prescription', 'Other record'];
type ResourceRecord = Record<string, any>;
type ClinicalItem = {
  resource: FhirResource;
  category: string;
  dateKey: string;
  dateLabel: string;
  title: string;
  details: string[];
};

function pdfText(value: unknown): string {
  return String(value ?? '').replace(/[^\x20-\x7E]/gu, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0xffff) return `\\u${codePoint.toString(16).padStart(4, '0')}`;
    const scalar = codePoint - 0x10000;
    return `\\u${(0xd800 + (scalar >> 10)).toString(16)}\\u${(0xdc00 + (scalar & 0x3ff)).toString(16)}`;
  });
}

function getPatient(bundle: FhirBundle): FhirPatient | undefined {
  return bundle.entry?.find((entry) => entry.resource.resourceType === 'Patient')
    ?.resource as FhirPatient | undefined;
}

function getPatientName(bundle: FhirBundle): string {
  const patient = getPatient(bundle);
  return patient?.name?.[0]?.text ||
    [patient?.name?.[0]?.given?.join(' '), patient?.name?.[0]?.family]
      .filter(Boolean)
      .join(' ') || 'Patient';
}

function makeFilename(name: string): string {
  const slug = name.normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s-]+/g, '_').toLowerCase();
  return `${slug || 'patient'}_clinical_history_fhir_r4.pdf`;
}

function concept(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const coded = value as { text?: string; coding?: Array<{ display?: string; code?: string; system?: string }> };
  return coded.text || coded.coding?.map((coding) => coding.display || coding.code)
    .filter(Boolean).join(', ');
}

function asRecord(resource: FhirResource): ResourceRecord {
  return resource as unknown as ResourceRecord;
}

function eventDate(resource: FhirResource): string | undefined {
  const item = asRecord(resource);
  const date = item.period?.start || item.effectiveDateTime || item.effectivePeriod?.start ||
    item.authoredOn || item.onsetDateTime || item.onsetPeriod?.start || item.recordedDate ||
    item.occurrenceDateTime || item.performedDateTime || item.date || item.issued || item.birthDate;
  return typeof date === 'string' && date ? date : undefined;
}

function dateKey(rawDate?: string): string {
  if (!rawDate) return 'undated';
  const match = rawDate.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return 'undated';
  return parsed.toISOString().slice(0, 10);
}

function displayDate(key: string): string {
  if (key === 'undated') return 'Date not recorded';
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

function displayDateTime(rawDate?: string): string | undefined {
  if (!rawDate) return undefined;
  const key = dateKey(rawDate);
  if (key === 'undated') return rawDate;
  const date = displayDate(key);
  const time = rawDate.match(/T(\d{2}:\d{2})/);
  const zone = rawDate.match(/([+-]\d{2}:?\d{2}|Z)$/)?.[0];
  if (!time) return date;
  return `${date} at ${time[1]}${zone && zone !== 'Z' ? ` (${zone})` : zone === 'Z' ? ' UTC' : ''}`;
}

function quantity(value: ResourceRecord | undefined): string | undefined {
  if (!value) return undefined;
  const amount = value.value ?? value.low?.value;
  const unit = value.unit || value.code;
  if (amount === undefined) return undefined;
  return `${amount}${unit ? ` ${unit}` : ''}`;
}

function observationResult(item: ResourceRecord): string[] {
  const results: string[] = [];
  if (item.valueQuantity) {
    const value = quantity(item.valueQuantity);
    if (value) results.push(`Result: ${value}`);
  }
  if (item.valueString) results.push(`Result: ${item.valueString}`);
  if (item.valueBoolean !== undefined) results.push(`Result: ${item.valueBoolean ? 'Yes' : 'No'}`);
  if (item.valueCodeableConcept) results.push(`Result: ${concept(item.valueCodeableConcept)}`);
  if (item.valueRange) {
    const low = quantity(item.valueRange.low);
    const high = quantity(item.valueRange.high);
    if (low || high) results.push(`Range: ${low || 'not specified'} to ${high || 'not specified'}`);
  }
  for (const component of item.component || []) {
    const name = concept(component.code) || 'Component';
    const componentValue = component.valueQuantity
      ? quantity(component.valueQuantity)
      : component.valueString || concept(component.valueCodeableConcept);
    if (componentValue) results.push(`${name}: ${componentValue}`);
  }
  for (const range of item.referenceRange || []) {
    const low = quantity(range.low);
    const high = quantity(range.high);
    if (low || high) results.push(`Reference range: ${low || 'not specified'} to ${high || 'not specified'}`);
    if (range.text) results.push(`Reference range: ${range.text}`);
  }
  const interpretation = concept(item.interpretation?.[0]);
  if (interpretation) results.push(`Interpretation: ${interpretation}`);
  if (item.dataAbsentReason) results.push(`Result unavailable: ${concept(item.dataAbsentReason)}`);
  return results;
}

function codeDetails(code: ResourceRecord | undefined): string[] {
  if (!code) return [];
  const values: string[] = [];
  const text = concept(code);
  if (text) values.push(`Code: ${text}`);
  for (const coding of code.coding || []) {
    const system = coding.system ? coding.system.split('/').pop() : undefined;
    const value = [system, coding.code].filter(Boolean).join(' ');
    if (value) values.push(`Code system: ${value}`);
  }
  return values;
}

function getCategory(resourceType: string): string {
  switch (resourceType) {
    case 'Encounter': return 'Visit';
    case 'Condition': return 'Diagnosis';
    case 'Observation': return 'Clinical history';
    case 'MedicationRequest': return 'Prescription';
    case 'Patient':
    case 'Practitioner':
    case 'Organization':
      return '';
    default: return 'Other record';
  }
}

function getTitle(resource: FhirResource): string {
  const item = asRecord(resource);
  switch (resource.resourceType) {
    case 'Encounter': return concept(item.type?.[0]) || item.class?.display || 'Clinical visit';
    case 'Condition': return concept(item.code) || 'Diagnosis';
    case 'Observation': return concept(item.code) || 'Clinical observation';
    case 'MedicationRequest': return concept(item.medicationCodeableConcept) || 'Medication';
    default: return item.code ? concept(item.code) || resource.resourceType : resource.resourceType;
  }
}

function getDetails(resource: FhirResource): string[] {
  const item = asRecord(resource);
  const details: string[] = [];
  const add = (label: string, value?: unknown) => {
    if (value === undefined || value === null || value === '') return;
    const text = typeof value === 'object' ? concept(value) : String(value);
    if (text) details.push(`${label}: ${text}`);
  };

  switch (resource.resourceType) {
    case 'Encounter':
      add('Status', item.status);
      add('Facility', item.serviceProvider?.display);
      add('Clinician', item.participant?.map((p: ResourceRecord) => p.individual?.display).filter(Boolean).join(', '));
      add('Visit type', item.class?.display || concept(item.type?.[0]));
      add('Reason for visit', item.reasonCode?.map(concept).filter(Boolean).join(', '));
      add('FHIR resource ID', resource.id);
      break;
    case 'Condition':
      add('Clinical status', concept(item.clinicalStatus));
      add('Verification', concept(item.verificationStatus));
      add('Onset', displayDateTime(item.onsetDateTime || item.onsetPeriod?.start));
      add('Recorded', displayDateTime(item.recordedDate));
      details.push(...codeDetails(item.code).filter((line) => line !== `Code: ${getTitle(resource)}`));
      for (const note of item.note || []) add('Clinical note', note.text);
      add('FHIR resource ID', resource.id);
      break;
    case 'Observation':
      add('Status', item.status);
      add('Recorded', displayDateTime(item.effectiveDateTime || item.effectivePeriod?.start || item.issued));
      details.push(...observationResult(item));
      details.push(...codeDetails(item.code).filter((line) => line !== `Code: ${getTitle(resource)}`));
      add('FHIR resource ID', resource.id);
      break;
    case 'MedicationRequest': {
      add('Status', item.status);
      add('Prescribed', displayDateTime(item.authoredOn));
      for (const dosage of item.dosageInstruction || []) add('Instructions', dosage.text);
      add('Prescribed by', item.requester?.display);
      add('Related visit', item.encounter?.display);
      const token = item.identifier?.find((identifier: ResourceRecord) =>
        identifier.system?.toLowerCase().includes('rx-token') || identifier.system?.toLowerCase().includes('prescription'),
      )?.value || item.groupIdentifier?.value;
      add('Prescription ID', token);
      add('FHIR resource ID', resource.id);
      break;
    }
    default:
      add('Status', item.status);
      add('FHIR resource ID', resource.id);
      add('Recorded', displayDateTime(item.date || item.issued || item.authoredOn || item.recordedDate));
      add('Description', item.description || item.content?.[0]?.attachment?.title);
      details.push(...codeDetails(item.code));
  }
  return [...new Set(details)];
}

function buildClinicalItems(bundle: FhirBundle): ClinicalItem[] {
  return (bundle.entry || []).flatMap(({ resource }) => {
    const category = getCategory(resource.resourceType);
    if (!category) return [];
    const rawDate = eventDate(resource);
    return [{
      resource,
      category,
      dateKey: dateKey(rawDate),
      dateLabel: displayDateTime(rawDate) || 'Date not recorded',
      title: getTitle(resource),
      details: getDetails(resource),
    }];
  }).sort((left, right) => {
    if (left.dateKey === 'undated') return right.dateKey === 'undated' ? 0 : 1;
    if (right.dateKey === 'undated') return -1;
    const dateDiff = left.dateKey.localeCompare(right.dateKey);
    if (dateDiff !== 0) return dateDiff;
    return CATEGORY_ORDER.indexOf(left.category) - CATEGORY_ORDER.indexOf(right.category);
  });
}

export async function downloadFhirBundlePdf(bundle: FhirBundle): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const patientName = getPatientName(bundle);
  const patient = getPatient(bundle);
  const items = buildClinicalItems(bundle);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  let y = PAGE_MARGIN;
  let activeDateLabel = '';

  pdf.setProperties({
    title: `${patientName} - Clinical History (FHIR R4)`,
    subject: 'Date-based clinical timeline with diagnoses, observations, visits, and prescriptions',
    creator: 'HealthSafe',
  });

  const startContinuationPage = () => {
    pdf.addPage();
    y = PAGE_MARGIN;
    pdf.setFillColor(31, 48, 37);
    pdf.rect(0, 0, pageWidth, 13, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    pdf.text(`${pdfText(patientName)} - Clinical History`, PAGE_MARGIN, 8.5);
    y = 19;
    if (activeDateLabel) {
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(8);
      pdf.setTextColor(91, 105, 94);
      pdf.text(`Timeline continued: ${pdfText(activeDateLabel)}`, PAGE_MARGIN, y);
      y += 6;
    }
  };

  const ensureRoom = (height: number) => {
    if (y + height > pageHeight - BOTTOM_MARGIN) startContinuationPage();
  };

  const addWrapped = (
    text: string,
    x: number,
    width: number,
    options: { size?: number; style?: string; color?: [number, number, number]; indent?: number } = {},
  ) => {
    const { size = 9, style = 'normal', color = [42, 53, 45], indent = 0 } = options;
    pdf.setFont('helvetica', style);
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(pdfText(text), width - indent) as string[];
    for (const line of lines) {
      ensureRoom(LINE_HEIGHT);
      pdf.text(line, x + indent, y);
      y += LINE_HEIGHT;
    }
  };

  const addTreeLine = (prefix: string, text: string, x: number, width: number, bold = false) => {
    pdf.setFont('courier', bold ? 'bold' : 'normal');
    pdf.setFontSize(bold ? 9 : 8.5);
    pdf.setTextColor(45, 59, 48);
    const fontWidth = pdf.getTextWidth(prefix);
    const lines = pdf.splitTextToSize(pdfText(text), width - fontWidth) as string[];
    lines.forEach((line, index) => {
      ensureRoom(LINE_HEIGHT);
      pdf.text(index === 0 ? `${prefix}${line}` : `${' '.repeat(prefix.length)}${line}`, x, y);
      y += LINE_HEIGHT;
    });
  };

  // Cover header and compact patient summary.
  pdf.setFillColor(31, 48, 37);
  pdf.roundedRect(PAGE_MARGIN, y, contentWidth, 34, 3, 3, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(255, 255, 255);
  pdf.text('Clinical History', PAGE_MARGIN + 6, y + 11);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('Patient timeline - HL7 FHIR R4', PAGE_MARGIN + 6, y + 18);
  pdf.setFontSize(11);
  pdf.text(`Patient: ${pdfText(patientName)}`, PAGE_MARGIN + 6, y + 27);
  y += 41;

  const diagnoses = items.filter((item) => item.category === 'Diagnosis').length;
  const visits = items.filter((item) => item.category === 'Visit').length;
  const observations = items.filter((item) => item.category === 'Clinical history').length;
  const prescriptions = items.filter((item) => item.category === 'Prescription').length;
  const generated = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  const demographicParts = [
    patient?.birthDate ? `Date of birth: ${patient.birthDate}` : '',
    patient?.gender ? `Gender: ${patient.gender}` : '',
  ].filter(Boolean);
  if (demographicParts.length) {
    addWrapped(demographicParts.join('   |   '), PAGE_MARGIN, contentWidth, { size: 9, color: [75, 88, 78] });
  }
  addWrapped(`Generated ${generated}   |   ${diagnoses} diagnoses   |   ${visits} visits   |   ${observations} clinical results   |   ${prescriptions} prescriptions`, PAGE_MARGIN, contentWidth, { size: 9, color: [75, 88, 78] });
  addWrapped('The timeline below groups available FHIR records by clinical date. Only information present in this chart is included.', PAGE_MARGIN, contentWidth, { size: 8.5, color: [100, 110, 102] });
  y += 5;

  const grouped = new Map<string, ClinicalItem[]>();
  for (const item of items) {
    const list = grouped.get(item.dateKey) || [];
    list.push(item);
    grouped.set(item.dateKey, list);
  }

  if (diagnoses === 0) {
    addWrapped('No diagnosis records (FHIR Condition resources) were present in this chart.', PAGE_MARGIN, contentWidth, { size: 9, color: [133, 83, 51] });
    y += 4;
  }

  const dateEntries = [...grouped.entries()];
  for (let dateIndex = 0; dateIndex < dateEntries.length; dateIndex += 1) {
    const [key, dateItems] = dateEntries[dateIndex];
    activeDateLabel = displayDate(key);
    ensureRoom(17);

    pdf.setDrawColor(116, 145, 94);
    pdf.setLineWidth(0.7);
    pdf.line(PAGE_MARGIN + 2, y - 1, PAGE_MARGIN + 2, y + 9);
    pdf.setFillColor(77, 112, 61);
    pdf.circle(PAGE_MARGIN + 2, y + 3, 1.6, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(38, 69, 45);
    pdf.text(displayDate(key), PAGE_MARGIN + 8, y + 4);
    const timestamp = dateItems.map((item) => item.dateLabel).find((label) => label.includes(' at '));
    if (timestamp) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(97, 109, 99);
      pdf.text(timestamp.split(' at ').slice(1).join(' at '), pageWidth - PAGE_MARGIN, y + 4, { align: 'right' });
    }
    y += 11;

    const categories = CATEGORY_ORDER.filter((category) => dateItems.some((item) => item.category === category));
    for (let categoryIndex = 0; categoryIndex < categories.length; categoryIndex += 1) {
      const category = categories[categoryIndex];
      const categoryItems = dateItems.filter((item) => item.category === category);
      const lastCategory = categoryIndex === categories.length - 1;
      const categoryPrefix = lastCategory ? '`-- ' : '|-- ';
      const childPrefix = lastCategory ? '    ' : '|   ';
      addTreeLine(categoryPrefix, `${category}${categoryItems.length > 1 ? ` (${categoryItems.length})` : ''}`, PAGE_MARGIN + 7, contentWidth - 7, true);

      for (let itemIndex = 0; itemIndex < categoryItems.length; itemIndex += 1) {
        const item = categoryItems[itemIndex];
        const lastItem = itemIndex === categoryItems.length - 1;
        const itemPrefix = `${childPrefix}${lastItem ? '`-- ' : '|-- '}`;
        const detailPrefix = `${childPrefix}${lastItem ? '    ' : '|   '}    - `;
        addTreeLine(itemPrefix, item.title, PAGE_MARGIN + 7, contentWidth - 7);

        const summaryDetails = item.details.filter((detail) =>
          !detail.startsWith('FHIR resource ID:') &&
          !detail.startsWith('FHIR resource type:') &&
          !detail.startsWith('Recorded:') &&
          !detail.startsWith('Prescribed:') &&
          !detail.startsWith('Onset:')
        );
        const dateDetail = item.dateLabel !== 'Date not recorded' ? `Date: ${item.dateLabel}` : '';
        const visibleDetails = [dateDetail, ...summaryDetails].filter(Boolean);
        for (const detail of visibleDetails) {
          addTreeLine(detailPrefix, detail, PAGE_MARGIN + 7, contentWidth - 7);
        }
        addTreeLine(detailPrefix, `FHIR ${item.resource.resourceType}/${item.resource.id}`, PAGE_MARGIN + 7, contentWidth - 7, false);
      }
    }

    y += dateIndex === dateEntries.length - 1 ? 2 : 6;
  }

  if (items.length === 0) {
    addWrapped('No dated clinical records were available in this FHIR bundle.', PAGE_MARGIN, contentWidth, { size: 9, color: [100, 110, 102] });
  }

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(110, 120, 112);
    pdf.text(`HealthSafe  |  FHIR R4  |  Page ${page} of ${pageCount}`, pageWidth - PAGE_MARGIN, pageHeight - 7, { align: 'right' });
  }

  pdf.save(makeFilename(patientName));
}
