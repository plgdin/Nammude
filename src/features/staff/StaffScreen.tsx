import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useOrganization } from '@/features/organization/OrganizationContext';
import { BranchConfig } from '@/config/tenant.config';
import { useOutletContext } from 'react-router-dom';
import { staffService } from './services/staffService';
import {
  EmployeeRecord,
  ShiftRecord,
  AttendanceRecord,
  ComplianceDocumentRecord,
} from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal';
import {
  Users,
  CalendarClock,
  ClipboardCheck,
  ShieldCheck,
  Plus,
  RefreshCw,
  Loader2,
  LogIn,
  LogOut,
  AlertTriangle,
  Search,
} from 'lucide-react';

type Tab = 'employees' | 'shifts' | 'attendance' | 'compliance';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  general_manager: 'General Manager',
  branch_manager: 'Branch Manager',
  cashier: 'Cashier',
  waiter: 'Waiter / FOH',
  kitchen: 'Kitchen',
  inventory: 'Inventory',
  operations: 'Operations',
  auditor: 'Auditor',
  staff: 'Staff',
};

const COMPLIANCE_TYPES = [
  'food_handler_license',
  'health_certificate',
  'fire_safety',
  'gst_registration',
  'other',
];

export const StaffScreen: React.FC = () => {
  const { currentOrganization, currentBranch } = useOrganization();
  const outletContext = useOutletContext<{ selectedBranch?: BranchConfig }>();
  const activeBranch = currentBranch || outletContext?.selectedBranch;
  const orgId = currentOrganization?.id || '11111111-1111-1111-1111-111111111111';
  const branchId = activeBranch?.id || '';

  const todayStr = new Date().toISOString().split('T')[0];

  const [activeTab, setActiveTab] = useState<Tab>('employees');
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [compliance, setCompliance] = useState<ComplianceDocumentRecord[]>([]);
  const [expiring, setExpiring] = useState<ComplianceDocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Employee modal
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | null>(null);
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empRole, setEmpRole] = useState('cashier');
  const [empStatus, setEmpStatus] = useState('active');
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);
  const [employeeError, setEmployeeError] = useState<string | null>(null);

  // Shift modal
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [shiftEmployeeId, setShiftEmployeeId] = useState('');
  const [shiftDate, setShiftDate] = useState(todayStr);
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('17:00');
  const [isSavingShift, setIsSavingShift] = useState(false);
  const [shiftError, setShiftError] = useState<string | null>(null);

  // Compliance modal
  const [isComplianceModalOpen, setIsComplianceModalOpen] = useState(false);
  const [compEmployeeId, setCompEmployeeId] = useState('');
  const [compType, setCompType] = useState(COMPLIANCE_TYPES[0]);
  const [compNumber, setCompNumber] = useState('');
  const [compExpires, setCompExpires] = useState('');
  const [isSavingCompliance, setIsSavingCompliance] = useState(false);
  const [complianceError, setComplianceError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [emps, shiftData, attData, compData, expData] = await Promise.all([
        staffService.getEmployees(orgId),
        branchId ? staffService.getShifts(branchId) : Promise.resolve([] as ShiftRecord[]),
        branchId ? staffService.getAttendance(branchId, todayStr) : Promise.resolve([] as AttendanceRecord[]),
        staffService.getComplianceDocuments(orgId),
        staffService.getExpiringComplianceDocuments(orgId, 30),
      ]);
      setEmployees(emps);
      setShifts(shiftData);
      setAttendance(attData);
      setCompliance(compData);
      setExpiring(expData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load staff data.');
    } finally {
      setIsLoading(false);
    }
  }, [orgId, branchId, todayStr]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const employeeNameById = useMemo(
    () => new Map(employees.map((e) => [e.id, e.full_name])),
    [employees]
  );

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return employees.filter(
      (e) =>
        q.length === 0 ||
        e.full_name.toLowerCase().includes(q) ||
        (e.email || '').toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  const handleSaveEmployee = async () => {
    setIsSavingEmployee(true);
    setEmployeeError(null);
    let result: { success: boolean; error?: string };
    if (editingEmployee) {
      result = await staffService.updateEmployee(editingEmployee.id, {
        full_name: empName.trim(),
        email: empEmail.trim() || null,
        phone: empPhone.trim() || null,
        role: empRole,
        status: empStatus as EmployeeRecord['status'],
      });
    } else {
      result = await staffService.createEmployee({
        organizationId: orgId,
        branchId: branchId || null,
        fullName: empName,
        email: empEmail.trim() || null,
        phone: empPhone.trim() || null,
        role: empRole,
      });
    }
    setIsSavingEmployee(false);
    if (!result.success) {
      setEmployeeError(result.error || 'Unable to save employee.');
      return;
    }
    setIsEmployeeModalOpen(false);
    setToast(editingEmployee ? 'Employee updated.' : 'Employee added.');
    await fetchData();
  };

  const openNewEmployee = () => {
    setEditingEmployee(null);
    setEmpName('');
    setEmpEmail('');
    setEmpPhone('');
    setEmpRole('cashier');
    setEmpStatus('active');
    setEmployeeError(null);
    setIsEmployeeModalOpen(true);
  };

  const openEditEmployee = (employee: EmployeeRecord) => {
    setEditingEmployee(employee);
    setEmpName(employee.full_name);
    setEmpEmail(employee.email || '');
    setEmpPhone(employee.phone || '');
    setEmpRole(employee.role);
    setEmpStatus(employee.status);
    setEmployeeError(null);
    setIsEmployeeModalOpen(true);
  };

  const handleSaveShift = async () => {
    setIsSavingShift(true);
    setShiftError(null);
    const result = await staffService.createShift({
      organizationId: orgId,
      branchId,
      employeeId: shiftEmployeeId,
      shiftDate,
      startTime: shiftStart,
      endTime: shiftEnd,
    });
    setIsSavingShift(false);
    if (!result.success) {
      setShiftError(result.error || 'Unable to create shift.');
      return;
    }
    setIsShiftModalOpen(false);
    setToast('Shift scheduled.');
    await fetchData();
  };

  const handleClockIn = async (employeeId: string) => {
    const result = await staffService.clockIn({
      organizationId: orgId,
      branchId,
      employeeId,
      method: 'manual',
    });
    if (result.success) {
      setToast('Clocked in.');
      await fetchData();
    } else {
      setToast(result.error || 'Unable to clock in.');
    }
  };

  const handleClockOut = async (recordId: string) => {
    const result = await staffService.clockOut(recordId);
    if (result.success) {
      setToast('Clocked out.');
      await fetchData();
    } else {
      setToast(result.error || 'Unable to clock out.');
    }
  };

  const handleSaveCompliance = async () => {
    setIsSavingCompliance(true);
    setComplianceError(null);
    const result = await staffService.createComplianceDocument({
      organizationId: orgId,
      employeeId: compEmployeeId || null,
      docType: compType,
      documentNumber: compNumber.trim() || null,
      expiresDate: compExpires || null,
    });
    setIsSavingCompliance(false);
    if (!result.success) {
      setComplianceError(result.error || 'Unable to record document.');
      return;
    }
    setIsComplianceModalOpen(false);
    setToast('Compliance document recorded.');
    await fetchData();
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'shifts', label: 'Shifts', icon: CalendarClock },
    { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
    { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
  ];

  const activeCount = employees.filter((e) => e.status === 'active').length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-surface-border bg-gradient-to-r from-surface to-surface-elevated p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="info" size="sm">Staff Operations</Badge>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs font-medium text-gray-300">
              {activeBranch?.name || 'Current branch'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
            <Users className="h-5 w-5 text-brand" />
            Staff, Shifts & Attendance
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Employee roster, shift scheduling, clock in/out, and compliance document tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="primary" onClick={openNewEmployee}>
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4">
          <span className="text-xs text-gray-400">Employees</span>
          <p className="text-2xl font-bold text-white mt-1">{employees.length}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-gray-400">Active</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{activeCount}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-gray-400">Clocked In Now</span>
          <p className="text-2xl font-bold text-blue-400 mt-1">
            {attendance.filter((a) => !a.clock_out).length}
          </p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-gray-400">Compliance Expiring Soon</span>
          <p className="text-2xl font-bold text-amber-400 mt-1">{expiring.length}</p>
        </Card>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-2 border-b border-surface-border pb-1 overflow-x-auto text-xs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-brand/20 text-brand border border-brand/40'
                : 'text-gray-400 hover:text-white hover:bg-surface-elevated'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {toast && (
        <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/50 px-4 py-3 text-xs text-emerald-300">
          {toast}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-800/60 bg-rose-950/50 px-4 py-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Employees tab */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employees..."
              className="w-full rounded-xl border border-surface-border bg-surface-elevated pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Employee Roster</CardTitle>
              <span className="text-xs text-gray-400">{filteredEmployees.length} employee(s)</span>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-16 text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-xs">Loading employees...</span>
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium text-gray-300">No employees found</p>
                  <p className="text-xs mt-1">Add your first team member to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-elevated/60 text-gray-400">
                      <tr>
                        <th className="px-4 py-3 font-medium">Employee</th>
                        <th className="px-4 py-3 font-medium">Contact</th>
                        <th className="px-4 py-3 font-medium">Role</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {filteredEmployees.map((employee) => (
                        <tr key={employee.id} className="hover:bg-surface-elevated/40">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/20 text-brand font-semibold text-xs border border-brand/30">
                                {employee.full_name[0]}
                              </div>
                              <span className="font-semibold text-white">{employee.full_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-400">
                            {employee.email || '—'}
                            {employee.phone ? <div className="text-[11px]">{employee.phone}</div> : null}
                          </td>
                          <td className="px-4 py-3 text-gray-300">
                            {ROLE_LABELS[employee.role] || employee.role}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={employee.status === 'active' ? 'success' : employee.status === 'on_leave' ? 'warning' : 'neutral'}
                              size="sm"
                            >
                              {employee.status.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleClockIn(employee.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-surface-border px-2 py-1 text-[10px] font-medium text-gray-300 hover:bg-surface-elevated hover:text-white"
                              >
                                <LogIn className="h-3 w-3" /> Clock In
                              </button>
                              <button
                                onClick={() => openEditEmployee(employee)}
                                className="inline-flex items-center gap-1 rounded-lg border border-surface-border px-2 py-1 text-[10px] font-medium text-gray-300 hover:bg-surface-elevated hover:text-white"
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Shifts tab */}
      {activeTab === 'shifts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">Scheduled shifts for this branch.</p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setShiftEmployeeId(employees[0]?.id || '');
                setShiftError(null);
                setIsShiftModalOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New Shift
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-16 text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-xs">Loading shifts...</span>
                </div>
              ) : shifts.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium text-gray-300">No shifts scheduled</p>
                  <p className="text-xs mt-1">Schedule a shift for an employee to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-elevated/60 text-gray-400">
                      <tr>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Employee</th>
                        <th className="px-4 py-3 font-medium">Time</th>
                        <th className="px-4 py-3 font-medium">Role on Shift</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {shifts.map((shift) => (
                        <tr key={shift.id} className="hover:bg-surface-elevated/40">
                          <td className="px-4 py-3 font-mono text-gray-300">{shift.shift_date}</td>
                          <td className="px-4 py-3 font-semibold text-white">
                            {employeeNameById.get(shift.employee_id) || 'Unknown'}
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-300">
                            {shift.start_time} – {shift.end_time}
                          </td>
                          <td className="px-4 py-3 text-gray-300">
                            {shift.role_on_shift ? ROLE_LABELS[shift.role_on_shift] || shift.role_on_shift : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Attendance tab */}
      {activeTab === 'attendance' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Attendance — Today</CardTitle>
            <span className="text-xs text-gray-400">{attendance.length} record(s)</span>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span className="text-xs">Loading attendance...</span>
              </div>
            ) : attendance.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium text-gray-300">No attendance recorded today</p>
                <p className="text-xs mt-1">Clock employees in from the roster to start the day.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-elevated/60 text-gray-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Employee</th>
                      <th className="px-4 py-3 font-medium">Clock In</th>
                      <th className="px-4 py-3 font-medium">Clock Out</th>
                      <th className="px-4 py-3 font-medium">Method</th>
                      <th className="px-4 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {attendance.map((record) => (
                      <tr key={record.id} className="hover:bg-surface-elevated/40">
                        <td className="px-4 py-3 font-semibold text-white">
                          {employeeNameById.get(record.employee_id) || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-300">
                          {new Date(record.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-300">
                          {record.clock_out
                            ? new Date(record.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={record.clock_out ? 'neutral' : 'info'} size="sm">
                            {record.method}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!record.clock_out && (
                            <button
                              onClick={() => handleClockOut(record.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-surface-border px-2 py-1 text-[10px] font-medium text-gray-300 hover:bg-surface-elevated hover:text-white"
                            >
                              <LogOut className="h-3 w-3" /> Clock Out
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Compliance tab */}
      {activeTab === 'compliance' && (
        <div className="space-y-4">
          {expiring.length > 0 && (
            <div className="rounded-xl border border-amber-800/60 bg-amber-950/40 px-4 py-3 text-xs text-amber-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">{expiring.length} document(s) expiring within 30 days</span>
                <div className="mt-1 text-amber-400/90">
                  {expiring.map((d) => `${d.doc_type} (${d.expires_date})`).join(', ')}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Health and compliance documents. Sensitive details are restricted to owners, managers, and auditors.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setCompEmployeeId('');
                setCompType(COMPLIANCE_TYPES[0]);
                setCompNumber('');
                setCompExpires('');
                setComplianceError(null);
                setIsComplianceModalOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Record Document
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-16 text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-xs">Loading compliance documents...</span>
                </div>
              ) : compliance.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium text-gray-300">No compliance documents recorded</p>
                  <p className="text-xs mt-1">Record food handler licenses and health certificates here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-elevated/60 text-gray-400">
                      <tr>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Employee</th>
                        <th className="px-4 py-3 font-medium">Number</th>
                        <th className="px-4 py-3 font-medium">Expires</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {compliance.map((doc) => {
                        const isExpired = Boolean(doc.expires_date && doc.expires_date < todayStr);
                        const isSoon = Boolean(
                          doc.expires_date &&
                            !isExpired &&
                            expiring.some((d) => d.id === doc.id)
                        );
                        return (
                          <tr key={doc.id} className="hover:bg-surface-elevated/40">
                            <td className="px-4 py-3 font-semibold text-white">
                              {doc.doc_type.replace(/_/g, ' ')}
                            </td>
                            <td className="px-4 py-3 text-gray-300">
                              {doc.employee_id ? employeeNameById.get(doc.employee_id) || 'Unknown' : 'Restaurant-wide'}
                            </td>
                            <td className="px-4 py-3 font-mono text-gray-400">{doc.document_number || '—'}</td>
                            <td className="px-4 py-3 font-mono text-gray-300">{doc.expires_date || '—'}</td>
                            <td className="px-4 py-3">
                              <Badge variant={isExpired ? 'danger' : isSoon ? 'warning' : 'success'} size="sm">
                                {isExpired ? 'Expired' : isSoon ? 'Expiring Soon' : 'Valid'}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Employee modal */}
      <Modal open={isEmployeeModalOpen} onOpenChange={(open) => !open && !isSavingEmployee && setIsEmployeeModalOpen(false)}>
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>{editingEmployee ? 'Edit Employee' : 'Add Employee'}</ModalTitle>
            <ModalDescription>Roster record only — platform login access is managed separately under Settings.</ModalDescription>
          </ModalHeader>

          {employeeError && (
            <div className="rounded-lg border border-rose-800/60 bg-rose-950/50 px-3 py-2 text-xs text-rose-300">
              {employeeError}
            </div>
          )}

          <label className="text-xs font-medium text-gray-300">Full name <span className="text-rose-400">*</span></label>
          <input
            value={empName}
            onChange={(e) => setEmpName(e.target.value)}
            placeholder="e.g. Priya Nair"
            className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">Email</label>
              <input
                value={empEmail}
                onChange={(e) => setEmpEmail(e.target.value)}
                placeholder="name@cafe.com"
                className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">Phone</label>
              <input
                value={empPhone}
                onChange={(e) => setEmpPhone(e.target.value)}
                placeholder="+91 ..."
                className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">Role</label>
              <select
                value={empRole}
                onChange={(e) => setEmpRole(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
              >
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">Status</label>
              <select
                value={empStatus}
                onChange={(e) => setEmpStatus(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <ModalFooter>
            <Button variant="secondary" onClick={() => setIsEmployeeModalOpen(false)} disabled={isSavingEmployee}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveEmployee} disabled={isSavingEmployee || empName.trim().length < 2}>
              {isSavingEmployee ? 'Saving...' : editingEmployee ? 'Save Changes' : 'Add Employee'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Shift modal */}
      <Modal open={isShiftModalOpen} onOpenChange={(open) => !open && !isSavingShift && setIsShiftModalOpen(false)}>
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>Schedule Shift</ModalTitle>
            <ModalDescription>Assign an employee to a branch shift.</ModalDescription>
          </ModalHeader>

          {shiftError && (
            <div className="rounded-lg border border-rose-800/60 bg-rose-950/50 px-3 py-2 text-xs text-rose-300">
              {shiftError}
            </div>
          )}

          <label className="text-xs font-medium text-gray-300">Employee</label>
          <select
            value={shiftEmployeeId}
            onChange={(e) => setShiftEmployeeId(e.target.value)}
            className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
          >
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.full_name}</option>
            ))}
          </select>
          <label className="text-xs font-medium text-gray-300">Date</label>
          <input
            type="date"
            value={shiftDate}
            onChange={(e) => setShiftDate(e.target.value)}
            className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">Start</label>
              <input
                type="time"
                value={shiftStart}
                onChange={(e) => setShiftStart(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">End</label>
              <input
                type="time"
                value={shiftEnd}
                onChange={(e) => setShiftEnd(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>

          <ModalFooter>
            <Button variant="secondary" onClick={() => setIsShiftModalOpen(false)} disabled={isSavingShift}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveShift}
              disabled={isSavingShift || !shiftEmployeeId || !shiftDate}
            >
              {isSavingShift ? 'Saving...' : 'Schedule Shift'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Compliance modal */}
      <Modal open={isComplianceModalOpen} onOpenChange={(open) => !open && !isSavingCompliance && setIsComplianceModalOpen(false)}>
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>Record Compliance Document</ModalTitle>
            <ModalDescription>Track licence expiry dates. Keep sensitive details minimal.</ModalDescription>
          </ModalHeader>

          {complianceError && (
            <div className="rounded-lg border border-rose-800/60 bg-rose-950/50 px-3 py-2 text-xs text-rose-300">
              {complianceError}
            </div>
          )}

          <label className="text-xs font-medium text-gray-300">Document type</label>
          <select
            value={compType}
            onChange={(e) => setCompType(e.target.value)}
            className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
          >
            {COMPLIANCE_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <label className="text-xs font-medium text-gray-300">Employee (optional)</label>
          <select
            value={compEmployeeId}
            onChange={(e) => setCompEmployeeId(e.target.value)}
            className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="">Restaurant-wide</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.full_name}</option>
            ))}
          </select>
          <label className="text-xs font-medium text-gray-300">Document number</label>
          <input
            value={compNumber}
            onChange={(e) => setCompNumber(e.target.value)}
            placeholder="FHL-2026-001"
            className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs font-mono text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <label className="text-xs font-medium text-gray-300">Expires on</label>
          <input
            type="date"
            value={compExpires}
            onChange={(e) => setCompExpires(e.target.value)}
            className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
          />

          <ModalFooter>
            <Button variant="secondary" onClick={() => setIsComplianceModalOpen(false)} disabled={isSavingCompliance}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveCompliance} disabled={isSavingCompliance}>
              {isSavingCompliance ? 'Saving...' : 'Record Document'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};
