export type EmployeeStatus = 'active' | 'on_leave' | 'inactive';
export type AttendanceMethod = 'manual' | 'pin' | 'qr' | 'system';

export interface EmployeeRecord {
  id: string;
  organization_id: string;
  branch_id: string | null;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: EmployeeStatus;
  hire_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftRecord {
  id: string;
  organization_id: string;
  branch_id: string;
  employee_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  role_on_shift: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  organization_id: string;
  branch_id: string;
  employee_id: string;
  shift_id: string | null;
  clock_in: string;
  clock_out: string | null;
  method: AttendanceMethod;
  notes: string | null;
  created_at: string;
}

export interface ComplianceDocumentRecord {
  id: string;
  organization_id: string;
  employee_id: string | null;
  doc_type: string;
  document_number: string | null;
  issued_date: string | null;
  expires_date: string | null;
  file_path: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
}
