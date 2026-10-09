import { useContext } from 'react';
import { PatientDataContext, type PatientDataContextValue } from './contextDefinition';

export function usePatientData(): PatientDataContextValue {
  const context = useContext(PatientDataContext);
  if (!context) {
    throw new Error('usePatientData must be used within a PatientDataProvider');
  }
  return context;
}
