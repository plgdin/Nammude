import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { BranchConfig } from '@/config/tenant.config';
import { useOrganization } from '@/features/organization/OrganizationContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ChecklistInstance, ChecklistTemplate } from './types';
import { checklistService } from './services/checklistService';
import { ChecklistExecutionModal } from './components/ChecklistExecutionModal';
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  RefreshCw,
  Plus,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export const ChecklistsScreen: React.FC = () => {
  const { selectedBranch } = useOutletContext<{ selectedBranch: BranchConfig }>();
  const { currentOrganization } = useOrganization();

  const [instances, setInstances] = useState<ChecklistInstance[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [activeInstance, setActiveInstance] = useState<ChecklistInstance | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const orgId = currentOrganization?.id || '11111111-1111-1111-1111-111111111111';
  const branchId = selectedBranch?.id || '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [instData, tmplData] = await Promise.all([
        checklistService.getInstances(branchId),
        checklistService.getTemplates(orgId, branchId),
      ]);
      setInstances(instData);
      setTemplates(tmplData);
    } catch (err) {
      console.error('[ChecklistsScreen] Error fetching checklists:', err);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, branchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStartTemplate = async (templateId: string) => {
    try {
      const res = await checklistService.instantiateChecklist({
        organizationId: orgId,
        branchId,
        templateId,
      });
      await fetchData();
      const updated = await checklistService.getInstances(branchId);
      const newlyCreated = updated.find((i) => i.id === res.instanceId);
      if (newlyCreated) setActiveInstance(newlyCreated);
    } catch (err) {
      console.error('[ChecklistsScreen] Error starting template:', err);
    }
  };

  const filteredInstances = instances.filter((i) => {
    if (selectedCategory === 'ALL') return true;
    return i.category === selectedCategory;
  });

  const totalTasksToday = instances.reduce((acc, curr) => acc + curr.total_items, 0);
  const completedTasksToday = instances.reduce((acc, curr) => acc + curr.completed_items, 0);
  const flaggedCount = instances.filter((i) => i.status === 'flagged_exceptions').length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-surface-border bg-gradient-to-r from-surface to-surface-elevated p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="info" size="sm">
              Staff Operations Core
            </Badge>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs font-medium text-gray-300">
              {selectedBranch?.name || 'Primary Branch'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-brand" />
            Operational Checklists & Shift Procedures
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Standardized opening, food-safety temperature logging, hygiene sanitation, and closing checklists.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 bg-surface">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>Tasks Completed Today</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-300 mt-1">
            {completedTasksToday} / {totalTasksToday}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {totalTasksToday > 0 ? Math.round((completedTasksToday / totalTasksToday) * 100) : 0}% Shift Completion
          </p>
        </Card>

        <Card className="p-4 bg-surface">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>Active Checklists</span>
            <Clock className="h-4 w-4 text-brand" />
          </div>
          <p className="text-2xl font-bold text-white mt-1">
            {instances.filter((i) => i.status === 'in_progress').length}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">In-progress execution</p>
        </Card>

        <Card className="p-4 bg-surface">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>Exceptions Flagged</span>
            <ShieldAlert className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-300 mt-1">{flaggedCount}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Non-compliance alerts</p>
        </Card>

        <Card className="p-4 bg-surface">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>Template Library</span>
            <Sparkles className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-purple-300 mt-1">{templates.length}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Approved SOP procedures</p>
        </Card>
      </div>

      {/* Exception Warning Banner if any exceptions exist */}
      {flaggedCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/60 text-amber-300 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            <span>
              <strong>Operational Alert:</strong> {flaggedCount} checklist session(s) reported compliance exceptions or equipment issues today.
            </span>
          </div>
        </div>
      )}

      {/* Main Board: Active Instances & Quick Launch Templates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Active Checklist Sessions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Today's Shift Checklists</h3>
            <div className="flex items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-surface-elevated border border-surface-border rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="opening">Opening</option>
                <option value="food_temperature">Food Temp</option>
                <option value="closing">Closing</option>
                <option value="hygiene_cleaning">Hygiene</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredInstances.length === 0 ? (
              <Card className="p-8 text-center text-gray-500 text-xs">
                No active checklists found. Launch a template from the right panel to begin.
              </Card>
            ) : (
              filteredInstances.map((inst) => {
                const pct = inst.total_items > 0 ? Math.round((inst.completed_items / inst.total_items) * 100) : 0;
                return (
                  <Card key={inst.id} className="p-4 hover:border-brand/40 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              inst.status === 'completed'
                                ? 'success'
                                : inst.status === 'flagged_exceptions'
                                ? 'warning'
                                : 'info'
                            }
                            size="sm"
                          >
                            {inst.status === 'flagged_exceptions' ? 'Exceptions' : inst.status}
                          </Badge>
                          <span className="text-[11px] text-gray-400 uppercase font-mono">
                            {inst.shift_name}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1">
                          {inst.template_title}
                        </h4>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {inst.completed_items} of {inst.total_items} items checked ({pct}%)
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-surface-elevated rounded-full h-2 overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full ${
                              inst.status === 'completed' ? 'bg-emerald-500' : 'bg-brand'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <Button variant="primary" size="sm" onClick={() => setActiveInstance(inst)}>
                          <Play className="h-3.5 w-3.5 mr-1" />
                          {inst.status === 'completed' ? 'Review' : 'Resume'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Template Quick Launch */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white">Launch Operational SOP</h3>
          <Card className="p-4 space-y-3">
            <p className="text-xs text-gray-400">
              Instantiate standard procedures for your shift:
            </p>

            <div className="space-y-2.5">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="p-3 rounded-xl border border-surface-border bg-surface-elevated hover:border-brand/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-brand uppercase font-mono font-bold">
                        {tmpl.category.replace('_', ' ')}
                      </span>
                      <h5 className="text-xs font-bold text-white mt-0.5">{tmpl.title}</h5>
                      <span className="text-[10px] text-gray-400">
                        {tmpl.items?.length || 0} checks • Role: {tmpl.assigned_role}
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleStartTemplate(tmpl.id)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Checklist Execution Modal */}
      <ChecklistExecutionModal
        isOpen={Boolean(activeInstance)}
        onClose={() => {
          setActiveInstance(null);
          fetchData();
        }}
        instance={activeInstance}
        onUpdated={fetchData}
      />
    </div>
  );
};
