import React, { useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ChecklistInstance, ChecklistInstanceItem } from '../types';
import { checklistService } from '../services/checklistService';
import {
  ClipboardCheck,
  AlertTriangle,
  Thermometer,
  FileText,
  Clock,
} from 'lucide-react';

interface ChecklistExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  instance: ChecklistInstance | null;
  onUpdated: () => void;
}

export const ChecklistExecutionModal: React.FC<ChecklistExecutionModalProps> = ({
  isOpen,
  onClose,
  instance,
  onUpdated,
}) => {
  const [items, setItems] = useState<ChecklistInstanceItem[]>(instance?.items || []);
  const [activeItemNotes, setActiveItemNotes] = useState<{ [id: string]: string }>({});
  const [activeItemTemps, setActiveItemTemps] = useState<{ [id: string]: string }>({});
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  React.useEffect(() => {
    if (instance) {
      setItems(instance.items || []);
      const notesMap: { [id: string]: string } = {};
      const tempsMap: { [id: string]: string } = {};
      (instance.items || []).forEach((item) => {
        if (item.notes) notesMap[item.id] = item.notes;
        if (item.temperature_reading !== null && item.temperature_reading !== undefined) {
          tempsMap[item.id] = String(item.temperature_reading);
        }
      });
      setActiveItemNotes(notesMap);
      setActiveItemTemps(tempsMap);
    }
  }, [instance]);

  if (!instance) return null;

  const handleToggle = async (item: ChecklistInstanceItem) => {
    const nextState = !item.is_completed;
    setIsUpdating(true);
    try {
      const tempVal = activeItemTemps[item.id] ? parseFloat(activeItemTemps[item.id]) : undefined;
      const notesVal = activeItemNotes[item.id] || undefined;

      await checklistService.toggleItem({
        itemId: item.id,
        isCompleted: nextState,
        notes: notesVal,
        temperature: tempVal,
      });

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_completed: nextState } : i))
      );
      onUpdated();
    } catch (err) {
      console.error('[ChecklistExecutionModal] Error toggling item:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFlagException = async (item: ChecklistInstanceItem) => {
    const reason = prompt('Please describe the exception or compliance issue:');
    if (!reason || !reason.trim()) return;

    setIsUpdating(true);
    try {
      await checklistService.toggleItem({
        itemId: item.id,
        isCompleted: true,
        isException: true,
        exceptionReason: reason.trim(),
      });

      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_completed: true, is_exception: true, exception_reason: reason.trim() } : i
        )
      );
      onUpdated();
    } catch (err) {
      console.error('[ChecklistExecutionModal] Error flagging exception:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const completedCount = items.filter((i) => i.is_completed).length;
  const progressPct = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;
  const isAllDone = completedCount === items.length && items.length > 0;

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <ModalHeader>
          <div className="flex items-center justify-between">
            <ModalTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-brand" />
              {instance.template_title || 'Operational Checklist'}
            </ModalTitle>
            <Badge variant={isAllDone ? 'success' : 'info'} size="sm">
              {completedCount} / {items.length} Done ({progressPct}%)
            </Badge>
          </div>
          <ModalDescription>
            Shift: {instance.shift_name} • Date: {instance.scheduled_date}
          </ModalDescription>
        </ModalHeader>

        {/* Progress Bar */}
        <div className="w-full bg-surface-elevated rounded-full h-2 overflow-hidden my-2">
          <div
            className="bg-brand h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Task Items List */}
        <div className="space-y-3 overflow-y-auto pr-1 flex-1 py-2">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border transition-all ${
                item.is_completed
                  ? item.is_exception
                    ? 'bg-amber-950/20 border-amber-800/60'
                    : 'bg-surface-elevated/70 border-emerald-900/60'
                  : 'bg-surface-elevated border-surface-border'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id={`check-${item.id}`}
                  checked={item.is_completed}
                  onChange={() => handleToggle(item)}
                  disabled={isUpdating}
                  className="h-5 w-5 mt-0.5 rounded border-surface-border bg-surface text-brand focus:ring-brand cursor-pointer"
                />
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor={`check-${item.id}`}
                      className={`text-xs font-semibold cursor-pointer ${
                        item.is_completed ? 'line-through text-gray-400' : 'text-white'
                      }`}
                    >
                      {idx + 1}. {item.task_description}
                    </label>

                    {item.is_exception && (
                      <Badge variant="warning" size="sm">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Exception Flagged
                      </Badge>
                    )}
                  </div>

                  {item.exception_reason && (
                    <p className="text-[11px] text-amber-300 bg-amber-950/40 p-2 rounded-lg border border-amber-800/40">
                      Exception: {item.exception_reason}
                    </p>
                  )}

                  {/* Temperature or Note inputs if active */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Thermometer className="h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Temp °F"
                        value={activeItemTemps[item.id] || ''}
                        onChange={(e) =>
                          setActiveItemTemps({ ...activeItemTemps, [item.id]: e.target.value })
                        }
                        className="w-20 bg-surface border border-surface-border rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 text-xs flex-1 min-w-[140px]">
                      <FileText className="h-3.5 w-3.5 text-gray-400" />
                      <input
                        placeholder="Staff notes (e.g. dial adjusted)"
                        value={activeItemNotes[item.id] || ''}
                        onChange={(e) =>
                          setActiveItemNotes({ ...activeItemNotes, [item.id]: e.target.value })
                        }
                        className="w-full bg-surface border border-surface-border rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>

                    {!item.is_exception && (
                      <button
                        type="button"
                        onClick={() => handleFlagException(item)}
                        className="text-[10px] text-amber-400 hover:text-amber-300 hover:underline"
                      >
                        Flag Issue
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-surface-border mt-2">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Started: {new Date(instance.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <Button variant="primary" onClick={onClose}>
            {isAllDone ? 'Done & Close' : 'Save Progress'}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
};
