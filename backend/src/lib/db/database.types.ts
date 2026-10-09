export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      patients: {
        Row: {
          id: string;
          abha_id: string;
          fhir_id: string | null;
          name: string;
          gender: string | null;
          dob: string | null;
          phone: string | null;
          is_demo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          abha_id: string;
          fhir_id?: string | null;
          name: string;
          gender?: string | null;
          dob?: string | null;
          phone?: string | null;
          is_demo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          abha_id?: string;
          fhir_id?: string | null;
          name?: string;
          gender?: string | null;
          dob?: string | null;
          phone?: string | null;
          is_demo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      prescriptions: {
        Row: {
          rx_id: string;
          patient_id: string;
          abha_id: string;
          encounter_resource_id: string | null;
          hospital_name: string | null;
          doctor_name: string | null;
          issued_on: string;
          created_at: string;
        };
        Insert: {
          rx_id: string;
          patient_id: string;
          abha_id: string;
          encounter_resource_id?: string | null;
          hospital_name?: string | null;
          doctor_name?: string | null;
          issued_on: string;
          created_at?: string;
        };
        Update: {
          rx_id?: string;
          patient_id?: string;
          abha_id?: string;
          encounter_resource_id?: string | null;
          hospital_name?: string | null;
          doctor_name?: string | null;
          issued_on?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'prescriptions_patient_id_fkey';
            columns: ['patient_id'];
            referencedRelation: 'patients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fk_prescriptions_encounter';
            columns: ['encounter_resource_id'];
            referencedRelation: 'fhir_resources';
            referencedColumns: ['id'];
          }
        ];
      };
      fhir_resources: {
        Row: {
          id: string;
          patient_id: string;
          abha_id: string;
          resource_type: string;
          fhir_id: string;
          event_date: string | null;
          encounter_id: string | null;
          speakable_rx_id: string | null;
          summary_title: string;
          summary_value: string | null;
          raw_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          abha_id: string;
          resource_type: string;
          fhir_id: string;
          event_date?: string | null;
          encounter_id?: string | null;
          speakable_rx_id?: string | null;
          summary_title: string;
          summary_value?: string | null;
          raw_json: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          abha_id?: string;
          resource_type?: string;
          fhir_id?: string;
          event_date?: string | null;
          encounter_id?: string | null;
          speakable_rx_id?: string | null;
          summary_title?: string;
          summary_value?: string | null;
          raw_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fhir_resources_patient_id_fkey';
            columns: ['patient_id'];
            referencedRelation: 'patients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fhir_resources_encounter_id_fkey';
            columns: ['encounter_id'];
            referencedRelation: 'fhir_resources';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fhir_resources_speakable_rx_id_fkey';
            columns: ['speakable_rx_id'];
            referencedRelation: 'prescriptions';
            referencedColumns: ['rx_id'];
          }
        ];
      };
      offline_bundles: {
        Row: {
          id: string;
          name: string | null;
          bundle_json: Json;
          created_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          bundle_json: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          bundle_json?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      access_logs: {
        Row: {
          id: number;
          accessed_at: string;
          lookup_type: 'rx_id' | 'abha_timeline' | 'care_gaps' | null;
          lookup_key: string | null;
          found: boolean | null;
        };
        Insert: {
          id?: never;
          accessed_at?: string;
          lookup_type?: 'rx_id' | 'abha_timeline' | 'care_gaps' | null;
          lookup_key?: string | null;
          found?: boolean | null;
        };
        Update: {
          id?: never;
          accessed_at?: string;
          lookup_type?: 'rx_id' | 'abha_timeline' | 'care_gaps' | null;
          lookup_key?: string | null;
          found?: boolean | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_prescription_by_rx_id: {
        Args: {
          p_rx_id: string;
        };
        Returns: Json;
      };
      get_patient_timeline: {
        Args: {
          p_abha_id: string;
          p_filter_type?: string | null;
          p_limit?: number;
          p_before?: string | null;
        };
        Returns: Json;
      };
      get_patient_resources_for_care_gaps: {
        Args: {
          p_abha_id: string;
        };
        Returns: Json;
      };
      ingest_patient_bundle: {
        Args: {
          p_patient: Json;
          p_resources: Json;
          p_prescriptions: Json;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
