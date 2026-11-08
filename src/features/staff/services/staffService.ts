import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import {
  EmployeeRecord,
  ShiftRecord,
  AttendanceRecord,
  ComplianceDocumentRecord,
  AttendanceMethod,
} from '../types';

const isLive = () => env.isConfigured && !env.isMockAuthEnabled;

let localEmployees: EmployeeRecord[] = [
  {
    id: 'emp-00000000-0000-0000-0000-000000000001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    user_id: 'a1111111-1111-1111-1111-111111111111',
    full_name: 'Marco Silva',
    email: 'marco.cashier@harborcafe.com',
    phone: '+91 90000 00001',
    role: 'cashier',
    status: 'active',
    hire_date: '2026-08-10',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'emp-00000000-0000-0000-0000-000000000002',
    organization_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    user_id: 'a2222222-2222-2222-2222-222222222222',
    full_name: 'Elena Rostova',
    email: 'elena.barista@harborcafe.com',
    phone: '+91 90000 00002',
    role: 'kitchen',
    status: 'active',
    hire_date: '2026-08-15',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let localShifts: ShiftRecord[] = [
  {
    id: 'shift-00000000-0000-0000-0000-000000000001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    employee_id: 'emp-00000000-0000-0000-0000-000000000001',
    shift_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '17:00',
    role_on_shift: 'cashier',
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let localAttendance: AttendanceRecord[] = [
  {
    id: 'att-00000000-0000-0000-0000-000000000001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    employee_id: 'emp-00000000-0000-0000-0000-000000000001',
    shift_id: 'shift-00000000-0000-0000-0000-000000000001',
    clock_in: new Date(Date.now() - 3600000 * 2).toISOString(),
    clock_out: null,
    method: 'pin',
    notes: null,
    created_at: new Date().toISOString(),
  },
];

let localCompliance: ComplianceDocumentRecord[] = [
  {
    id: 'comp-00000000-0000-0000-0000-000000000001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    employee_id: 'emp-00000000-0000-0000-0000-000000000001',
    doc_type: 'food_handler_license',
    document_number: 'FHL-2026-001',
    issued_date: '2026-01-15',
    expires_date: new Date(Date.now() + 86400000 * 20).toISOString().split('T')[0],
    file_path: null,
    verified_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const staffService = {
  // --- Employees ---
  async getEmployees(organizationId: string, branchId?: string): Promise<EmployeeRecord[]> {
    if (isLive()) {
      try {
        let query = (supabase.from('employees') as any)
          .select('*')
          .eq('organization_id', organizationId)
          .order('full_name', { ascending: true });
        if (branchId) query = query.eq('branch_id', branchId);
        const { data, error } = await query;
        if (!error && data) return data as EmployeeRecord[];
      } catch (err) {
        console.warn('[staffService] Failed to load employees:', err);
      }
      return [];
    }
    return localEmployees.filter(
      (e) => e.organization_id === organizationId && (!branchId || e.branch_id === branchId)
    );
  },

  async createEmployee(params: {
    organizationId: string;
    branchId?: string | null;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    role: string;
    hireDate?: string | null;
  }): Promise<{ success: boolean; employee?: EmployeeRecord; error?: string }> {
    const fullName = params.fullName.trim();
    if (fullName.length < 2) return { success: false, error: 'Employee name must be at least 2 characters.' };
    if (params.email && !params.email.includes('@')) {
      return { success: false, error: 'A valid work email is required.' };
    }

    if (isLive()) {
      try {
        const { data, error } = await (supabase.from('employees') as any)
          .insert({
            organization_id: params.organizationId,
            branch_id: params.branchId || null,
            full_name: fullName,
            email: params.email || null,
            phone: params.phone || null,
            role: params.role,
            status: 'active',
            hire_date: params.hireDate || null,
          })
          .select()
          .single();
        if (error) return { success: false, error: error.message };
        return { success: true, employee: data as EmployeeRecord };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to create employee.' };
      }
    }

    const employee: EmployeeRecord = {
      id: `emp-${Date.now()}`,
      organization_id: params.organizationId,
      branch_id: params.branchId || null,
      user_id: null,
      full_name: fullName,
      email: params.email || null,
      phone: params.phone || null,
      role: params.role,
      status: 'active',
      hire_date: params.hireDate || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localEmployees.push(employee);
    return { success: true, employee };
  },

  async updateEmployee(
    employeeId: string,
    updates: Partial<Pick<EmployeeRecord, 'full_name' | 'email' | 'phone' | 'role' | 'status' | 'branch_id' | 'hire_date'>>
  ): Promise<{ success: boolean; error?: string }> {
    if (isLive()) {
      try {
        const { error } = await (supabase.from('employees') as any)
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', employeeId);
        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to update employee.' };
      }
    }
    const target = localEmployees.find((e) => e.id === employeeId);
    if (!target) return { success: false, error: 'Employee not found.' };
    Object.assign(target, updates, { updated_at: new Date().toISOString() });
    return { success: true };
  },

  // --- Shifts ---
  async getShifts(branchId: string, date?: string): Promise<ShiftRecord[]> {
    if (isLive()) {
      try {
        let query = (supabase.from('shifts') as any)
          .select('*')
          .eq('branch_id', branchId)
          .order('start_time', { ascending: true });
        if (date) query = query.eq('shift_date', date);
        const { data, error } = await query;
        if (!error && data) return data as ShiftRecord[];
      } catch (err) {
        console.warn('[staffService] Failed to load shifts:', err);
      }
      return [];
    }
    return localShifts.filter(
      (s) => s.branch_id === branchId && (!date || s.shift_date === date)
    );
  },

  async createShift(params: {
    organizationId: string;
    branchId: string;
    employeeId: string;
    shiftDate: string;
    startTime: string;
    endTime: string;
    roleOnShift?: string | null;
    notes?: string | null;
  }): Promise<{ success: boolean; shift?: ShiftRecord; error?: string }> {
    if (!params.shiftDate) return { success: false, error: 'Shift date is required.' };
    if (!params.startTime || !params.endTime) {
      return { success: false, error: 'Start and end times are required.' };
    }
    if (params.endTime <= params.startTime) {
      return { success: false, error: 'End time must be after start time.' };
    }

    if (isLive()) {
      try {
        const { data, error } = await (supabase.from('shifts') as any)
          .insert({
            organization_id: params.organizationId,
            branch_id: params.branchId,
            employee_id: params.employeeId,
            shift_date: params.shiftDate,
            start_time: params.startTime,
            end_time: params.endTime,
            role_on_shift: params.roleOnShift || null,
            notes: params.notes || null,
          })
          .select()
          .single();
        if (error) return { success: false, error: error.message };
        return { success: true, shift: data as ShiftRecord };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to create shift.' };
      }
    }

    const shift: ShiftRecord = {
      id: `shift-${Date.now()}`,
      organization_id: params.organizationId,
      branch_id: params.branchId,
      employee_id: params.employeeId,
      shift_date: params.shiftDate,
      start_time: params.startTime,
      end_time: params.endTime,
      role_on_shift: params.roleOnShift || null,
      notes: params.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localShifts.push(shift);
    return { success: true, shift };
  },

  // --- Attendance ---
  async getAttendance(branchId: string, date?: string): Promise<AttendanceRecord[]> {
    if (isLive()) {
      try {
        let query = (supabase.from('attendance_events') as any)
          .select('*')
          .eq('branch_id', branchId)
          .order('clock_in', { ascending: false })
          .limit(200);
        if (date) {
          query = query.gte('clock_in', `${date}T00:00:00.000Z`).lte('clock_in', `${date}T23:59:59.999Z`);
        }
        const { data, error } = await query;
        if (!error && data) return data as AttendanceRecord[];
      } catch (err) {
        console.warn('[staffService] Failed to load attendance:', err);
      }
      return [];
    }
    return localAttendance.filter(
      (a) => a.branch_id === branchId && (!date || a.clock_in.slice(0, 10) === date)
    );
  },

  async clockIn(params: {
    organizationId: string;
    branchId: string;
    employeeId: string;
    shiftId?: string | null;
    method?: AttendanceMethod;
  }): Promise<{ success: boolean; record?: AttendanceRecord; error?: string }> {
    // Prevent double clock-in without clock-out.
    const existing = await this.getAttendance(params.branchId);
    const open = existing.find((a) => a.employee_id === params.employeeId && !a.clock_out);
    if (open) return { success: false, error: 'Employee is already clocked in.' };

    if (isLive()) {
      try {
        const { data, error } = await (supabase.from('attendance_events') as any)
          .insert({
            organization_id: params.organizationId,
            branch_id: params.branchId,
            employee_id: params.employeeId,
            shift_id: params.shiftId || null,
            clock_in: new Date().toISOString(),
            method: params.method || 'manual',
          })
          .select()
          .single();
        if (error) return { success: false, error: error.message };
        return { success: true, record: data as AttendanceRecord };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to clock in.' };
      }
    }

    const record: AttendanceRecord = {
      id: `att-${Date.now()}`,
      organization_id: params.organizationId,
      branch_id: params.branchId,
      employee_id: params.employeeId,
      shift_id: params.shiftId || null,
      clock_in: new Date().toISOString(),
      clock_out: null,
      method: params.method || 'manual',
      notes: null,
      created_at: new Date().toISOString(),
    };
    localAttendance.unshift(record);
    return { success: true, record };
  },

  async clockOut(recordId: string): Promise<{ success: boolean; error?: string }> {
    if (isLive()) {
      try {
        const { error } = await (supabase.from('attendance_events') as any)
          .update({ clock_out: new Date().toISOString() })
          .eq('id', recordId)
          .is('clock_out', null);
        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to clock out.' };
      }
    }
    const target = localAttendance.find((a) => a.id === recordId);
    if (!target) return { success: false, error: 'Attendance record not found.' };
    if (target.clock_out) return { success: false, error: 'Employee is already clocked out.' };
    target.clock_out = new Date().toISOString();
    return { success: true };
  },

  // --- Compliance documents ---
  async getComplianceDocuments(organizationId: string): Promise<ComplianceDocumentRecord[]> {
    if (isLive()) {
      try {
        const { data, error } = await (supabase.from('compliance_documents') as any)
          .select('*')
          .eq('organization_id', organizationId)
          .order('expires_date', { ascending: true });
        if (!error && data) return data as ComplianceDocumentRecord[];
      } catch (err) {
        console.warn('[staffService] Failed to load compliance documents:', err);
      }
      return [];
    }
    return localCompliance.filter((d) => d.organization_id === organizationId);
  },

  async createComplianceDocument(params: {
    organizationId: string;
    employeeId?: string | null;
    docType: string;
    documentNumber?: string | null;
    issuedDate?: string | null;
    expiresDate?: string | null;
  }): Promise<{ success: boolean; document?: ComplianceDocumentRecord; error?: string }> {
    if (params.docType.trim().length < 2) {
      return { success: false, error: 'Document type is required.' };
    }

    if (isLive()) {
      try {
        const { data, error } = await (supabase.from('compliance_documents') as any)
          .insert({
            organization_id: params.organizationId,
            employee_id: params.employeeId || null,
            doc_type: params.docType.trim(),
            document_number: params.documentNumber || null,
            issued_date: params.issuedDate || null,
            expires_date: params.expiresDate || null,
          })
          .select()
          .single();
        if (error) return { success: false, error: error.message };
        return { success: true, document: data as ComplianceDocumentRecord };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to record compliance document.' };
      }
    }

    const document: ComplianceDocumentRecord = {
      id: `comp-${Date.now()}`,
      organization_id: params.organizationId,
      employee_id: params.employeeId || null,
      doc_type: params.docType.trim(),
      document_number: params.documentNumber || null,
      issued_date: params.issuedDate || null,
      expires_date: params.expiresDate || null,
      file_path: null,
      verified_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localCompliance.push(document);
    return { success: true, document };
  },

  /**
   * Documents expiring within the given window (default 30 days), including overdue.
   */
  async getExpiringComplianceDocuments(
    organizationId: string,
    withinDays = 30
  ): Promise<ComplianceDocumentRecord[]> {
    const docs = await this.getComplianceDocuments(organizationId);
    const cutoff = new Date(Date.now() + withinDays * 86400000).toISOString().split('T')[0];
    return docs
      .filter((d) => d.expires_date && d.expires_date <= cutoff)
      .sort((a, b) => (a.expires_date || '').localeCompare(b.expires_date || ''));
  },
};
