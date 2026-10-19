import React, { useState, useEffect } from 'react';
import { useOrganization } from '@/features/organization/OrganizationContext';
import { kotService } from '@/features/pos/services/kotService';
import { KotTicketRecord } from '@/features/pos/types';
import { Button } from '@/components/ui/Button';
import {
  CookingPot,
  Clock,
  CheckCircle2,
  RotateCcw,
  Coffee,
  Flame,
  ChefHat,
  Filter,
} from 'lucide-react';

export const KitchenScreen: React.FC = () => {
  const { currentOrganization, currentBranch } = useOrganization();
  const [tickets, setTickets] = useState<KotTicketRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Ticker for elapsed time minutes
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 15000);
    return () => clearInterval(interval);
  }, []);

  // Fetch tickets
  const loadTickets = async () => {
    if (!currentBranch) return;
    setIsLoading(true);
    const data = await kotService.getActiveTickets(
      currentBranch.id,
      selectedStation === 'all' ? undefined : selectedStation
    );
    setTickets(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadTickets();
  }, [currentBranch?.id, selectedStation]);

  const handleAdvanceStatus = async (ticket: KotTicketRecord) => {
    let nextStatus: KotTicketRecord['status'] = 'in_progress';
    if (ticket.status === 'queued') nextStatus = 'in_progress';
    else if (ticket.status === 'in_progress') nextStatus = 'ready';
    else if (ticket.status === 'ready') nextStatus = 'bumped';

    await kotService.advanceTicketStatus(ticket.id, nextStatus);
    loadTickets();
  };

  const getElapsedTimeMinutes = (createdDateStr: string) => {
    const diffMs = currentTime - new Date(createdDateStr).getTime();
    return Math.max(1, Math.floor(diffMs / 60000));
  };

  return (
    <div className="flex h-full flex-col bg-canvas select-none overflow-hidden">
      {/* Top Bar: Station Selector, Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border bg-surface px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15 text-brand border border-brand/30">
            <CookingPot className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Kitchen Display System (KDS)</h1>
            <p className="text-xs text-gray-400 font-mono">
              {currentOrganization?.name} • {currentBranch?.name}
            </p>
          </div>
        </div>

        {/* Station Tabs */}
        <div className="flex items-center gap-1.5 bg-surface-elevated p-1 rounded-xl border border-surface-border">
          {[
            { id: 'all', label: 'All Stations', icon: Filter },
            { id: 'barista_station', label: 'Barista', icon: Coffee },
            { id: 'main_kitchen', label: 'Main Kitchen', icon: ChefHat },
            { id: 'kitchen_grill', label: 'Grill', icon: Flame },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSelectedStation(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedStation === id
                  ? 'bg-brand text-brand-fg shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <Button variant="secondary" onClick={loadTickets} className="gap-1.5 text-xs py-2">
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Tickets Board */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-gray-500">
            <span>Loading kitchen tickets...</span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex h-80 flex-col items-center justify-center text-center text-gray-500">
            <CheckCircle2 className="h-12 w-12 text-emerald-500/40 mb-3" />
            <h3 className="text-base font-bold text-gray-300">All Orders Prepped</h3>
            <p className="text-xs text-gray-500 mt-1">No pending tickets in kitchen queue.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tickets.map((ticket) => {
              const elapsedMins = getElapsedTimeMinutes(ticket.created_at);
              const isUrgent = elapsedMins >= 15;
              const isWarning = elapsedMins >= 10 && elapsedMins < 15;

              return (
                <div
                  key={ticket.id}
                  className={`flex flex-col justify-between rounded-2xl border bg-surface-elevated transition-all shadow-md overflow-hidden ${
                    isUrgent
                      ? 'border-red-500/50 ring-1 ring-red-500/40'
                      : isWarning
                      ? 'border-amber-500/50'
                      : 'border-surface-border'
                  }`}
                >
                  {/* Ticket Header */}
                  <div className="flex items-center justify-between border-b border-surface-border bg-surface px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white font-mono tracking-tight">
                        {ticket.kot_number}
                      </span>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-surface-border text-gray-300 font-mono">
                        {ticket.station.replace('_', ' ')}
                      </span>
                    </div>

                    <div
                      className={`flex items-center gap-1 text-xs font-bold font-mono px-2 py-0.5 rounded ${
                        isUrgent
                          ? 'bg-red-500/20 text-red-400 animate-pulse'
                          : isWarning
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-surface-elevated text-gray-400'
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      <span>{elapsedMins}m</span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="p-4 flex-1 space-y-3">
                    {(Array.isArray(ticket.items_snapshot) ? ticket.items_snapshot : []).map(
                      (item: any, idx: number) => (
                        <div key={idx} className="flex items-start justify-between gap-2 border-b border-surface-border/40 pb-2 last:border-b-0 last:pb-0">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-white leading-tight block">
                              {item.item_name || item.name || 'Item'}
                            </span>
                            {item.instructions && (
                              <p className="text-[10px] font-medium text-amber-300 italic">
                                Note: {item.instructions}
                              </p>
                            )}
                          </div>
                          <span className="text-xs font-black text-brand font-mono bg-brand/10 px-2 py-0.5 rounded">
                            x{item.quantity || 1}
                          </span>
                        </div>
                      )
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="p-3 border-t border-surface-border bg-surface/50">
                    <Button
                      variant={
                        ticket.status === 'queued'
                          ? 'secondary'
                          : ticket.status === 'in_progress'
                          ? 'primary'
                          : 'primary'
                      }
                      onClick={() => handleAdvanceStatus(ticket)}
                      className="w-full text-xs font-bold py-2.5"
                    >
                      {ticket.status === 'queued' && 'Start Preparation'}
                      {ticket.status === 'in_progress' && 'Mark Ready'}
                      {ticket.status === 'ready' && 'Bump (Served / Out)'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
