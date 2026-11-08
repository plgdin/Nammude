import { describe, it, expect } from 'vitest';
import { staffService } from '@/features/staff/services/staffService';

const orgId = '11111111-1111-1111-1111-111111111111';
const branchId = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('Staff Operations: employees, shifts, attendance, compliance', () => {
  it('creates and updates an employee', async () => {
    const created = await staffService.createEmployee({
      organizationId: orgId,
      branchId,
      fullName: 'Ananya Iyer',
      email: 'ananya@harborcafe.com',
      role: 'waiter',
    });
    expect(created.success).toBe(true);
    expect(created.employee?.full_name).toBe('Ananya Iyer');

    const updated = await staffService.updateEmployee(created.employee!.id, {
      status: 'on_leave',
    });
    expect(updated.success).toBe(true);

    const employees = await staffService.getEmployees(orgId);
    const found = employees.find((e) => e.id === created.employee!.id);
    expect(found?.status).toBe('on_leave');
  });

  it('rejects invalid employee details', async () => {
    const badName = await staffService.createEmployee({
      organizationId: orgId,
      fullName: 'A',
      role: 'cashier',
    });
    expect(badName.success).toBe(false);

    const badEmail = await staffService.createEmployee({
      organizationId: orgId,
      fullName: 'Test Person',
      email: 'not-an-email',
      role: 'cashier',
    });
    expect(badEmail.success).toBe(false);
  });

  it('creates shifts and validates time ranges', async () => {
    const employees = await staffService.getEmployees(orgId);
    const employee = employees[0];
    const today = new Date().toISOString().split('T')[0];

    const shift = await staffService.createShift({
      organizationId: orgId,
      branchId,
      employeeId: employee.id,
      shiftDate: today,
      startTime: '09:00',
      endTime: '17:00',
    });
    expect(shift.success).toBe(true);

    const bad = await staffService.createShift({
      organizationId: orgId,
      branchId,
      employeeId: employee.id,
      shiftDate: today,
      startTime: '17:00',
      endTime: '09:00',
    });
    expect(bad.success).toBe(false);
    expect(bad.error).toMatch(/end time/i);
  });

  it('enforces single open clock-in per employee', async () => {
    const fresh = await staffService.createEmployee({
      organizationId: orgId,
      branchId,
      fullName: 'Clock Test Person',
      role: 'cashier',
    });
    expect(fresh.success).toBe(true);

    const first = await staffService.clockIn({
      organizationId: orgId,
      branchId,
      employeeId: fresh.employee!.id,
    });
    expect(first.success).toBe(true);

    const second = await staffService.clockIn({
      organizationId: orgId,
      branchId,
      employeeId: fresh.employee!.id,
    });
    expect(second.success).toBe(false);
    expect(second.error).toMatch(/already clocked in/i);

    const out = await staffService.clockOut(first.record!.id);
    expect(out.success).toBe(true);

    const doubleOut = await staffService.clockOut(first.record!.id);
    expect(doubleOut.success).toBe(false);
  });

  it('records compliance documents and flags expiring ones', async () => {
    const created = await staffService.createComplianceDocument({
      organizationId: orgId,
      docType: 'food_handler_license',
      documentNumber: 'FHL-TEST-001',
      expiresDate: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0],
    });
    expect(created.success).toBe(true);

    const expiring = await staffService.getExpiringComplianceDocuments(orgId, 30);
    expect(expiring.some((d) => d.document_number === 'FHL-TEST-001')).toBe(true);
  });
});
