/**
 * frontend/src/lib/api/abhaClient.ts
 * ABDM (Ayushman Bharat Digital Mission) Client for ABHA M1 & V3 Authentication and Enrollment.
 */

export interface AbhaAuthRequestOtpResponse {
  success: boolean;
  txn_id: string;
  auth_mode: string;
  message: string;
  demo_otp?: string;
  test_otp?: string;
  masked_mobile?: string;
  error?: { code: string; message: string };
}

export interface AbhaAuthVerifyOtpResponse {
  success: boolean;
  txn_id?: string;
  abha_id: string;
  abha_number?: string;
  patient_name: string;
  abdm_token?: string;
  profile?: {
    name: string;
    gender?: string;
    dob?: string;
    abha_address?: string;
    mobile?: string;
  };
  error?: { code: string; message: string };
}

export interface AbhaEnrollmentRequestOtpResponse {
  success: boolean;
  txn_id: string;
  auth_mode: 'aadhaar' | 'mobile';
  message: string;
  demo_otp?: string;
  test_otp?: string;
  error?: { code: string; message: string };
}

export interface AbhaEnrollmentVerifyOtpResponse {
  success: boolean;
  message: string;
  abha_id: string;
  abha_number?: string;
  abha_address: string;
  profile: {
    name: string;
    gender: string;
    dob: string;
    mobile?: string;
    abha_address: string;
    pin_code?: string;
    state?: string;
    district?: string;
  };
  abdm_token: string;
  error?: { code: string; message: string };
}

export interface AbhaCardData {
  abha_id: string;
  name: string;
  gender: string;
  dob: string;
  abha_address: string;
  mobile_masked?: string;
  status: string;
  health_records_synced: number;
  badge: string;
}

/**
 * Format raw digits into standard 14-digit ABHA: 91-XXXX-XXXX-XXXX
 */
export function formatAbha(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  let formatted = '';
  if (digits.length > 0) {
    formatted = digits.substring(0, 2);
    if (digits.length > 2) formatted += '-' + digits.substring(2, 6);
    if (digits.length > 6) formatted += '-' + digits.substring(6, 10);
    if (digits.length > 10) formatted += '-' + digits.substring(10, 14);
  }
  return formatted;
}

/**
 * Format 12-digit Aadhaar number: XXXX XXXX XXXX
 */
export function formatAadhaar(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 12);
  const parts = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join(' ');
}

/**
 * Request OTP for ABHA Login
 */
export async function requestAuthOtp(
  abhaId: string,
  authMode: 'mobile_otp' | 'aadhaar_otp' = 'mobile_otp'
): Promise<AbhaAuthRequestOtpResponse> {
  try {
    const res = await fetch('/api/abha/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ abha_id: abhaId, auth_mode: authMode }),
    });

    if (res.ok) {
      const data = await res.json();
      const abha = data.abha_id || data.abha_number || '';
      return {
        ...data,
        abha_id: abha,
        abha_number: abha,
      };
    }

    const err = await res.json().catch(() => ({}));
    const message = err.detail?.error?.message || 'Failed to request OTP from ABDM gateway.';
    return {
      success: false,
      txn_id: '',
      auth_mode: authMode,
      message,
      error: { code: 'OTP_REQUEST_FAILED', message },
    };
  } catch {
    // Graceful offline fallback for simulated/local testing
    const fallbackTxn = 'txn-offline-auth-' + Math.random().toString(36).substring(2, 10);
    return {
      success: true,
      txn_id: fallbackTxn,
      auth_mode: authMode,
      message: 'OTP sent successfully to registered mobile number (Offline Demo Mode)',
      demo_otp: '123456',
      test_otp: '123456',
      masked_mobile: '******9012',
    };
  }
}

/**
 * Verify OTP for ABHA Login
 */
export async function verifyAuthOtp(
  txnId: string,
  otp: string
): Promise<AbhaAuthVerifyOtpResponse> {
  try {
    const res = await fetch('/api/abha/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txn_id: txnId, otp }),
    });

    if (res.ok) {
      const data = await res.json();
      const abha = data.abha_id || data.abha_number || '';
      return {
        ...data,
        abha_id: abha,
        abha_number: abha,
      };
    }

    const err = await res.json().catch(() => ({}));
    const message = err.detail?.error?.message || 'Invalid OTP. Please enter demo OTP: 123456';
    return {
      success: false,
      abha_id: '',
      patient_name: '',
      error: { code: 'INVALID_OTP', message },
    };
  } catch {
    // Graceful offline fallback
    if (otp.trim() === '123456') {
      return {
        success: true,
        txn_id: txnId,
        abha_id: '91-1234-5678-9012',
        patient_name: 'Ramesh Kumar',
        abdm_token: 'abdm-token-offline-demo',
        profile: {
          name: 'Ramesh Kumar',
          gender: 'male',
          dob: '1974-05-12',
          abha_address: 'ramesh.kumar@abdm',
        },
      };
    }
    return {
      success: false,
      abha_id: '',
      patient_name: '',
      error: { code: 'INVALID_OTP', message: 'Invalid OTP. Please enter demo OTP: 123456' },
    };
  }
}

/**
 * Request OTP for ABHA Enrollment (Aadhaar or Mobile)
 */
export async function requestEnrollmentOtp(
  authMode: 'aadhaar' | 'mobile',
  value: string,
  consent: boolean = true
): Promise<AbhaEnrollmentRequestOtpResponse> {
  try {
    const res = await fetch('/api/abha/enrollment/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth_mode: authMode, value, consent }),
    });

    if (res.ok) {
      const data = await res.json();
      const abha = data.abha_id || data.abha_number || '';
      return {
        ...data,
        abha_id: abha,
        abha_number: abha,
      };
    }

    const err = await res.json().catch(() => ({}));
    const message = err.detail?.error?.message || 'Failed to request registration OTP from ABDM gateway.';
    return {
      success: false,
      txn_id: '',
      auth_mode: authMode,
      message,
      error: { code: 'ENROLLMENT_REQUEST_FAILED', message },
    };
  } catch {
    // Graceful offline fallback
    const fallbackTxn = 'txn-offline-enroll-' + Math.random().toString(36).substring(2, 10);
    return {
      success: true,
      txn_id: fallbackTxn,
      auth_mode: authMode,
      message: `OTP sent to mobile linked with ${authMode === 'aadhaar' ? 'Aadhaar' : 'mobile'} (Offline Demo Mode)`,
      demo_otp: '123456',
      test_otp: '123456',
    };
  }
}

/**
 * Verify OTP and generate official ABHA ID
 */
export async function verifyEnrollmentOtp(params: {
  txnId: string;
  otp: string;
  name?: string;
  gender?: string;
  dob?: string;
  mobile?: string;
  abhaAddress?: string;
  pinCode?: string;
  state?: string;
  district?: string;
}): Promise<AbhaEnrollmentVerifyOtpResponse> {
  try {
    const res = await fetch('/api/abha/enrollment/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        txn_id: params.txnId,
        otp: params.otp,
        name: params.name,
        gender: params.gender,
        dob: params.dob,
        mobile: params.mobile,
        abha_address: params.abhaAddress,
        pin_code: params.pinCode,
        state: params.state,
        district: params.district,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const abha = data.abha_id || data.abha_number || '';
      return {
        ...data,
        abha_id: abha,
        abha_number: abha,
      };
    }

    const err = await res.json().catch(() => ({}));
    const message = err.detail?.error?.message || 'Registration verification failed.';
    return {
      success: false,
      message,
      abha_id: '',
      abha_address: '',
      profile: {
        name: params.name || 'Citizen',
        gender: params.gender || 'male',
        dob: params.dob || '1995-01-01',
        abha_address: '',
      },
      abdm_token: '',
      error: { code: 'VERIFICATION_FAILED', message },
    };
  } catch {
    // Graceful offline fallback
    if (params.otp.trim() !== '123456') {
      return {
        success: false,
        message: 'Invalid OTP. Please enter demo OTP: 123456',
        abha_id: '',
        abha_address: '',
        profile: {
          name: params.name || 'Citizen',
          gender: params.gender || 'male',
          dob: params.dob || '1995-01-01',
          abha_address: '',
        },
        abdm_token: '',
        error: { code: 'INVALID_OTP', message: 'Invalid OTP. Please enter demo OTP: 123456' },
      };
    }

    const r = Math.floor(1000 + Math.random() * 9000);
    const r2 = Math.floor(1000 + Math.random() * 9000);
    const generatedAbha = `91-72${r.toString().slice(0, 2)}-${r2}-${Math.floor(1000 + Math.random() * 9000)}`;
    const cleanHandle = (params.name || 'citizen').toLowerCase().replace(/[^a-z0-9]/g, '.');
    const finalAddress = params.abhaAddress
      ? (params.abhaAddress.endsWith('@abdm') ? params.abhaAddress : `${params.abhaAddress}@abdm`)
      : `${cleanHandle}@abdm`;

    return {
      success: true,
      message: 'ABHA ID generated successfully (Offline Demo Mode)',
      abha_id: generatedAbha,
      abha_address: finalAddress,
      profile: {
        name: params.name || 'Priya Sharma',
        gender: params.gender || 'female',
        dob: params.dob || '1995-06-15',
        mobile: params.mobile || '9876543210',
        abha_address: finalAddress,
        pin_code: params.pinCode || '110001',
        state: params.state || 'Delhi',
        district: params.district || 'Central Delhi',
      },
      abdm_token: 'abdm-token-offline-enrollment',
    };
  }
}

/**
 * Fetch official ABHA Card details
 */
export async function getAbhaCard(abhaId: string): Promise<AbhaCardData | null> {
  try {
    const res = await fetch(`/api/abha/card/${encodeURIComponent(abhaId)}`);
    if (res.ok) {
      const data = await res.json();
      const abha = data.abha_id || data.abha_number || '';
      return {
        ...data,
        abha_id: abha,
        abha_number: abha,
      };
    }
    return null;
  } catch {
    return null;
  }
}

