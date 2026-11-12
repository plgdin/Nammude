import React, { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { BranchConfig } from '@/config/tenant.config';
import { useOrganization } from '@/features/organization/OrganizationContext';
import { useAuth } from '@/features/auth/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { reservationService } from './services/reservationService';
import { tableService } from '@/features/pos/services/tableService';
import { DiningTableRecord } from '@/features/pos/types';
import type { Database } from '@/types/database.types';
import { Calendar, Plus, Users, Clock, CheckCircle2, XCircle, UserCheck } from 'lucide-react';

type Reservation = Database['public']['Tables']['reservations']['Row'];

export const ReservationsScreen: React.FC = () => {
  const { selectedBranch } = useOutletContext<{ selectedBranch: BranchConfig }>();
  const { currentOrganization, currentBranch } = useOrganization();
  const { user } = useAuth();

  const orgId = currentOrganization?.id || '11111111-1111-1111-1111-111111111111';
  const branch = currentBranch || selectedBranch;
  const branchId = branch?.id || '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<DiningTableRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showForm, setShowForm] = useState<boolean>(false);

  // form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formParty, setFormParty] = useState(2);
  const [formTime, setFormTime] = useState('19:00');
  const [formNotes, setFormNotes] = useState('');
  const [formTable, setFormTable] = useState<string>('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [res, tbls] = await Promise.all([
        reservationService.getReservations(branchId, date),
        tableService.getTablesByBranch(branchId),
      ]);
      setReservations(res);
      setTables(tbls);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [branchId, date]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!formName.trim()) return;
    const reservationTime = new Date(`${date}T${formTime}:00`).toISOString();
    const res = await reservationService.createReservation({
      organization_id: orgId,
      branch_id: branchId,
      customer_name: formName.trim(),
      customer_phone: formPhone.trim() || null,
      party_size: formParty,
      reservation_time: reservationTime,
      duration_minutes: 90,
      table_id: formTable || null,
      status: 'booked',
      notes: formNotes.trim() || null,
      created_by: user?.id || null,
    });
    if (res.success) {
      setShowForm(false);
      setFormName('');
      setFormPhone('');
      setFormParty(2);
      setFormNotes('');
      setFormTable('');
      load();
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'neutral'> = {
      booked: 'info',
      confirmed: 'success',
      seated: 'success',
      completed: 'neutral',
      cancelled: 'danger',
      no_show: 'warning',
    };
    return <Badge variant={map[status] || 'default'} size="sm">{status}</Badge>;
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-brand" />
            Reservations
          </h2>
          <p className="text-xs text-gray-400 mt-1">Table bookings for {branch?.name || 'branch'}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-1.5 text-xs text-white"
          />
          <Button variant="primary" size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" />
            New Booking
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-bold text-white">New Reservation</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              placeholder="Guest name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white"
            />
            <input
              placeholder="Phone"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white"
            />
            <input
              type="number"
              min={1}
              value={formParty}
              onChange={(e) => setFormParty(Number(e.target.value))}
              className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white"
              placeholder="Party size"
            />
            <input
              type="time"
              value={formTime}
              onChange={(e) => setFormTime(e.target.value)}
              className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white"
            />
            <select
              value={formTable}
              onChange={(e) => setFormTable(e.target.value)}
              className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white"
            >
              <option value="">Auto-assign later</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  Table {t.table_number} ({t.capacity} seats)
                </option>
              ))}
            </select>
            <input
              placeholder="Notes"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleCreate}>
              Create Booking
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <p className="text-xs text-gray-400">Loading reservations…</p>
      ) : reservations.length === 0 ? (
        <Card className="p-6 text-center text-xs text-gray-400">No reservations for this date.</Card>
      ) : (
        <div className="space-y-3">
          {reservations.map((r) => (
            <Card key={r.id} className="p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{r.customer_name}</span>
                  {statusBadge(r.status)}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{r.party_size}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(r.reservation_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {r.customer_phone && <span>{r.customer_phone}</span>}
                  {r.notes && <span>• {r.notes}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {r.status === 'booked' && (
                  <Button variant="secondary" size="sm" onClick={() => reservationService.updateStatus(r.id, 'confirmed').then(load)}>
                    <CheckCircle2 className="h-4 w-4" /> Confirm
                  </Button>
                )}
                {r.status === 'confirmed' && (
                  <Button variant="secondary" size="sm" onClick={() => reservationService.updateStatus(r.id, 'seated').then(load)}>
                    <UserCheck className="h-4 w-4" /> Seat
                  </Button>
                )}
                {!['completed', 'cancelled', 'no_show'].includes(r.status) && (
                  <Button variant="secondary" size="sm" onClick={() => reservationService.updateStatus(r.id, 'cancelled').then(load)}>
                    <XCircle className="h-4 w-4" /> Cancel
                  </Button>
                )}
                {r.status === 'seated' && (
                  <Button variant="primary" size="sm" onClick={() => reservationService.updateStatus(r.id, 'completed').then(load)}>
                    Complete
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
