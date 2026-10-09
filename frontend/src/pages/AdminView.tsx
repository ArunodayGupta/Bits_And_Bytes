import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Database,
  Users,
  Pill,
  Activity,
  FileCode2,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface AdminMetrics {
  database_connected: boolean;
  supabase_host: string;
  total_patients: number;
  total_prescriptions: number;
  total_fhir_resources: number;
  total_access_logs: number;
  resource_breakdown: Record<string, number>;
}

interface AccessLog {
  id: number;
  accessed_at: string;
  lookup_type: string;
  lookup_key: string;
  found: boolean;
}

interface PatientRow {
  id: string;
  abha_id: string;
  name: string;
  gender: string;
  dob: string | null;
  phone?: string | null;
  is_demo: boolean;
  created_at?: string;
}

interface PractitionerRow {
  id: string;
  name: string;
  role: 'doctor' | 'physician';
  specialty: string;
  hospital_or_facility: string;
  license_id: string;
  status: string;
  actions_permitted: string;
}

interface PrescriptionRow {
  rx_id: string;
  patient_id?: string;
  abha_id?: string;
  hospital_name: string;
  doctor_name: string;
  issued_on: string;
  created_at?: string;
}

interface FhirResourceRow {
  id: string;
  fhir_id: string;
  abha_id: string;
  resource_type: string;
  summary_title: string;
  summary_value?: string | null;
  event_date?: string | null;
  created_at?: string;
}

export const AdminView: React.FC = () => {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [practitioners, setPractitioners] = useState<PractitionerRow[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [fhirResources, setFhirResources] = useState<FhirResourceRow[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchLogQuery, setSearchLogQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('logs');

  const fetchAllAdminData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [mRes, logRes, patRes, rxRes, fhirRes, staffRes] = await Promise.all([
        fetch('/api/admin/metrics'),
        fetch('/api/admin/access-logs?limit=100'),
        fetch('/api/admin/patients'),
        fetch('/api/admin/prescriptions'),
        fetch('/api/admin/fhir-resources?limit=60'),
        fetch('/api/admin/practitioners'),
      ]);

      if (mRes.ok) {
        setMetrics(await mRes.json());
      }
      if (logRes.ok) {
        setAccessLogs(await logRes.json());
      }
      if (patRes.ok) {
        setPatients(await patRes.json());
      }
      if (staffRes.ok) {
        setPractitioners(await staffRes.json());
      }
      if (rxRes.ok) {
        setPrescriptions(await rxRes.json());
      }
      if (fhirRes.ok) {
        setFhirResources(await fhirRes.json());
      }
    } catch (err: any) {
      console.error('Failed to load admin telemetry:', err);
      setErrorMsg('Failed to connect to administrative telemetry server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllAdminData();
  }, [fetchAllAdminData]);

  const filteredLogs = accessLogs.filter((log) => {
    if (!searchLogQuery) return true;
    const q = searchLogQuery.toLowerCase();
    return (
      log.lookup_type?.toLowerCase().includes(q) ||
      log.lookup_key?.toLowerCase().includes(q) ||
      String(log.id).includes(q)
    );
  });

  return (
    <div className="space-y-8 pb-16 animate-fade-up">
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="eyebrow-pill">
              <span className="eyebrow-dot bg-amber-500" />
              RESTRICTED · ADMINISTRATOR ACCESS ONLY
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600">
              <CheckCircle2 className="h-3 w-3" />
              {metrics?.database_connected ? 'Live Database Linked' : 'Database Checking'}
            </span>
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            System Administration & Telemetry
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Audit API requests, inspect registered ABHA profiles, and monitor real-time FHIR R4 resources.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAllAdminData}
            disabled={isLoading}
            className="rounded-full gap-2 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs font-medium text-destructive">
          {errorMsg}
        </div>
      )}

      {/* Metrics Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Registered Patients */}
        <Card className="rounded-24 border border-hairline bg-card shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Registered Patients
            </CardTitle>
            <div className="rounded-full bg-moss-100 p-2 text-moss-600 dark:bg-moss-900/30">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-serif text-3xl font-bold text-ink">
              {metrics ? metrics.total_patients : '—'}
            </div>
            <p className="mt-1 text-[11px] text-ink-soft flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-moss-600" />
              ABHA-indexed demo records
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Prescriptions */}
        <Card className="rounded-24 border border-hairline bg-card shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Active Prescriptions
            </CardTitle>
            <div className="rounded-full bg-sky-100 p-2 text-sky-600 dark:bg-sky-900/30">
              <Pill className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-serif text-3xl font-bold text-ink">
              {metrics ? metrics.total_prescriptions : '—'}
            </div>
            <p className="mt-1 text-[11px] text-ink-soft">
              Speakable 16-character Rx-IDs
            </p>
          </CardContent>
        </Card>

        {/* Card 3: FHIR Resources */}
        <Card className="rounded-24 border border-hairline bg-card shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              FHIR Resources
            </CardTitle>
            <div className="rounded-full bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-900/30">
              <FileCode2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-serif text-3xl font-bold text-ink">
              {metrics ? metrics.total_fhir_resources : '—'}
            </div>
            <p className="mt-1 text-[11px] text-ink-soft">
              Conditions, Observations, Encounters
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Access Logs / API Requests */}
        <Card className="rounded-24 border border-hairline bg-card shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Audited API Requests
            </CardTitle>
            <div className="rounded-full bg-amber-100 p-2 text-amber-600 dark:bg-amber-900/30">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-serif text-3xl font-bold text-ink">
              {metrics ? metrics.total_access_logs : '—'}
            </div>
            <p className="mt-1 text-[11px] text-ink-soft">
              Full trace in <code className="text-[10px] bg-paper-2 px-1 py-0.5 rounded">access_logs</code>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Resource Breakdown Banner */}
      {metrics?.resource_breakdown && (
        <div className="rounded-20 border border-hairline bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Resource Distribution Breakdown
            </span>
            <span className="text-xs text-ink-soft font-mono">
              Host: {metrics.supabase_host}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(metrics.resource_breakdown).map(([type, count]) => (
              <span
                key={type}
                className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-paper-2 px-3 py-1 text-xs font-medium text-ink"
              >
                <span className="h-2 w-2 rounded-full bg-moss-600" />
                <span>{type}:</span>
                <span className="font-bold text-moss-700 dark:text-moss-400">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main Tabs Explorer */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-2">
          <TabsList className="bg-paper-2 p-1 rounded-full border border-hairline flex flex-wrap">
            <TabsTrigger value="logs" className="rounded-full text-xs font-semibold">
              API Requests Audit ({accessLogs.length})
            </TabsTrigger>
            <TabsTrigger value="patients" className="rounded-full text-xs font-semibold">
              Patients ({patients.length})
            </TabsTrigger>
            <TabsTrigger value="practitioners" className="rounded-full text-xs font-semibold">
              Doctors & Physicians ({practitioners.length})
            </TabsTrigger>
            <TabsTrigger value="prescriptions" className="rounded-full text-xs font-semibold">
              Prescriptions ({prescriptions.length})
            </TabsTrigger>
            <TabsTrigger value="fhir" className="rounded-full text-xs font-semibold">
              FHIR Resources ({fhirResources.length})
            </TabsTrigger>
          </TabsList>

          {activeTab === 'logs' && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-ink-soft" />
              <Input
                placeholder="Filter logs by key or type..."
                value={searchLogQuery}
                onChange={(e) => setSearchLogQuery(e.target.value)}
                className="h-8 pl-8 rounded-full text-xs"
              />
            </div>
          )}
        </div>

        {/* Tab 1: API Requests Audit Logs */}
        <TabsContent value="logs" className="space-y-4">
          <Card className="rounded-24 border border-hairline bg-card shadow-soft overflow-hidden">
            <CardHeader className="bg-paper-2/40 border-b border-hairline py-3 px-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Live Access Logs</CardTitle>
                  <CardDescription className="text-xs">
                    Real-time audit log of lookups, care-gap runs, and savings calculations. Fetched exclusively for admin.
                  </CardDescription>
                </div>
                <span className="text-xs text-ink-soft">
                  Showing {filteredLogs.length} recent requests
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-paper-2/80 border-b border-hairline text-ink-soft uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="px-5 py-3">Log ID</th>
                      <th className="px-5 py-3">Timestamp</th>
                      <th className="px-5 py-3">Request Type</th>
                      <th className="px-5 py-3">Lookup Key / ABHA / Rx-ID</th>
                      <th className="px-5 py-3 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-ink-soft">
                          No audit logs matching query.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-paper-2/40 transition-colors">
                          <td className="px-5 py-3 font-mono font-medium text-ink-soft">
                            #{log.id}
                          </td>
                          <td className="px-5 py-3 font-mono text-[11px] text-ink-soft">
                            {new Date(log.accessed_at).toLocaleString('en-IN', {
                              timeZone: 'Asia/Kolkata',
                              hour12: true,
                            })}
                          </td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center rounded-full bg-paper-2 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-ink border border-hairline">
                              {log.lookup_type}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-mono font-medium text-ink">
                            {log.lookup_key}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {log.found ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 border border-emerald-500/20">
                                <CheckCircle2 className="h-3 w-3" /> Found (200 OK)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 border border-amber-500/20">
                                <XCircle className="h-3 w-3" /> Not Found
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Patients Directory */}
        <TabsContent value="patients" className="space-y-4">
          <Card className="rounded-24 border border-hairline bg-card shadow-soft overflow-hidden">
            <CardHeader className="bg-paper-2/40 border-b border-hairline py-3 px-6">
              <CardTitle className="text-sm font-semibold">Registered ABHA Patients</CardTitle>
              <CardDescription className="text-xs">
                Synthetic verified patients loaded into the cloud repository.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-paper-2/80 border-b border-hairline text-ink-soft uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="px-5 py-3">Full Name</th>
                      <th className="px-5 py-3">ABHA Identifier</th>
                      <th className="px-5 py-3">Gender</th>
                      <th className="px-5 py-3">DOB</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {patients.map((p) => (
                      <tr key={p.id} className="hover:bg-paper-2/40 transition-colors">
                        <td className="px-5 py-3 font-semibold text-ink">{p.name}</td>
                        <td className="px-5 py-3 font-mono font-medium text-moss-700 dark:text-moss-400">
                          {p.abha_id}
                        </td>
                        <td className="px-5 py-3 capitalize text-ink-soft">{p.gender}</td>
                        <td className="px-5 py-3 font-mono text-ink-soft">{p.dob || '—'}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-moss-500/10 border border-moss-500/20 px-2 py-0.5 text-[10px] font-semibold text-moss-700">
                            Demo Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Doctors & Dispensary Physicians */}
        <TabsContent value="practitioners" className="space-y-4">
          <Card className="rounded-24 border border-hairline bg-card shadow-soft overflow-hidden">
            <CardHeader className="bg-paper-2/40 border-b border-hairline py-3 px-6">
              <CardTitle className="text-sm font-semibold">Doctors & Dispensary Physicians Roster</CardTitle>
              <CardDescription className="text-xs">
                Clinical doctors (EHR diagnosis & electronic prescriptions) and dispensary physicians (PMBJP generic medicine alternatives & savings engine).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-paper-2/80 border-b border-hairline text-ink-soft uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="px-5 py-3">Practitioner Name</th>
                      <th className="px-5 py-3">Role</th>
                      <th className="px-5 py-3">Specialty / Category</th>
                      <th className="px-5 py-3">Hospital / Kendra Facility</th>
                      <th className="px-5 py-3">License ID</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Permissions & Scope</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {practitioners.map((doc) => (
                      <tr key={doc.id} className="hover:bg-paper-2/40 transition-colors">
                        <td className="px-5 py-3 font-semibold text-ink">{doc.name}</td>
                        <td className="px-5 py-3">
                          {doc.role === 'doctor' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                              <Stethoscope className="h-3 w-3" /> Doctor
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 text-[10px] font-semibold text-teal-700 dark:text-teal-300">
                              <Pill className="h-3 w-3" /> Physician
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-ink-soft">{doc.specialty}</td>
                        <td className="px-5 py-3 text-ink">{doc.hospital_or_facility}</td>
                        <td className="px-5 py-3 font-mono font-medium text-ink-soft">{doc.license_id}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                            {doc.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-[11px] text-ink-soft">{doc.actions_permitted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Prescriptions Registry */}
        <TabsContent value="prescriptions" className="space-y-4">
          <Card className="rounded-24 border border-hairline bg-card shadow-soft overflow-hidden">
            <CardHeader className="bg-paper-2/40 border-b border-hairline py-3 px-6">
              <CardTitle className="text-sm font-semibold">Prescriptions Registry</CardTitle>
              <CardDescription className="text-xs">
                Speakable prescriptions verified across hospitals and doctors.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-paper-2/80 border-b border-hairline text-ink-soft uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="px-5 py-3">Rx-ID</th>
                      <th className="px-5 py-3">Doctor</th>
                      <th className="px-5 py-3">Hospital / Facility</th>
                      <th className="px-5 py-3">Patient ABHA</th>
                      <th className="px-5 py-3">Issued Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {prescriptions.map((rx) => (
                      <tr key={rx.rx_id} className="hover:bg-paper-2/40 transition-colors">
                        <td className="px-5 py-3 font-mono font-bold text-sky-700 dark:text-sky-400">
                          {rx.rx_id}
                        </td>
                        <td className="px-5 py-3 font-medium text-ink">{rx.doctor_name}</td>
                        <td className="px-5 py-3 text-ink-soft">{rx.hospital_name}</td>
                        <td className="px-5 py-3 font-mono text-xs text-ink-soft">{rx.abha_id || '—'}</td>
                        <td className="px-5 py-3 font-mono text-ink-soft">{rx.issued_on}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: FHIR Resources */}
        <TabsContent value="fhir" className="space-y-4">
          <Card className="rounded-24 border border-hairline bg-card shadow-soft overflow-hidden">
            <CardHeader className="bg-paper-2/40 border-b border-hairline py-3 px-6">
              <CardTitle className="text-sm font-semibold">Recent FHIR R4 Resources</CardTitle>
              <CardDescription className="text-xs">
                Stored entries across Condition, Observation, Encounter, and MedicationRequest profiles.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-paper-2/80 border-b border-hairline text-ink-soft uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="px-5 py-3">Resource Type</th>
                      <th className="px-5 py-3">Summary Title</th>
                      <th className="px-5 py-3">Clinical Value</th>
                      <th className="px-5 py-3">Target ABHA</th>
                      <th className="px-5 py-3">Event Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {fhirResources.map((r) => (
                      <tr key={r.id} className="hover:bg-paper-2/40 transition-colors">
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center rounded-full bg-paper-2 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-ink border border-hairline">
                            {r.resource_type}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-semibold text-ink">{r.summary_title}</td>
                        <td className="px-5 py-3 font-mono text-ink-soft">{r.summary_value || '—'}</td>
                        <td className="px-5 py-3 font-mono text-ink-soft">{r.abha_id}</td>
                        <td className="px-5 py-3 font-mono text-[11px] text-ink-soft">
                          {r.event_date ? new Date(r.event_date).toLocaleDateString('en-IN') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
