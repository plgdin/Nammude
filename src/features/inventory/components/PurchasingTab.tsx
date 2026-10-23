import React, { useState, useEffect } from 'react';
import { SupplierRecord, PurchaseOrderRecord, IngredientRecord } from '../types';
import { purchasingService } from '../services/purchasingService';
import { GoodsReceiptModal } from './GoodsReceiptModal';
import { formatCurrency } from '@/lib/currency';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Truck,
  Calendar,
  Building,
  Phone,
  Mail,
  FileText,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  organizationId: string;
  branchId: string;
  ingredients: IngredientRecord[];
}

export const PurchasingTab: React.FC<Props> = ({ organizationId, branchId, ingredients }) => {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRecord[]>([]);
  const [isGrnOpen, setIsGrnOpen] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadData = async () => {
    const [sups, pos] = await Promise.all([
      purchasingService.getSuppliers(organizationId),
      purchasingService.getPurchaseOrders(branchId),
    ]);
    setSuppliers(sups);
    setPurchaseOrders(pos);
  };

  useEffect(() => {
    loadData();
  }, [organizationId, branchId]);

  return (
    <div className="space-y-6">
      {successToast && (
        <div className="p-3 bg-emerald-50 text-emerald-800 text-sm rounded-lg flex items-center justify-between border border-emerald-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-xs text-emerald-700 hover:underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center space-x-2">
            <Truck className="w-6 h-6 text-amber-600" />
            <span>Suppliers & Purchase Orders</span>
          </h2>
          <p className="text-sm text-stone-500">
            Manage vendor directories, issue purchase orders, and record received goods.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            onClick={() => setIsGrnOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white flex items-center space-x-1.5 shadow-sm"
          >
            <Truck className="w-4 h-4" />
            <span>Receive Goods (GRN)</span>
          </Button>
        </div>
      </div>

      {/* Two Column Layout: Suppliers on Left, Purchase Orders on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Suppliers List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-md flex items-center space-x-2">
              <Building className="w-4 h-4 text-stone-500" />
              <span>Approved Suppliers ({suppliers.length})</span>
            </h3>
          </div>

          <div className="space-y-3">
            {suppliers.map((s) => (
              <Card key={s.id} className="p-4 hover:border-amber-400 transition-colors">
                <div className="flex items-start justify-between">
                  <h4 className="font-semibold text-stone-900 text-sm">{s.company_name}</h4>
                  <Badge variant="neutral" className="text-xs">
                    {s.payment_terms_days}d terms
                  </Badge>
                </div>
                {s.contact_person && (
                  <p className="text-xs text-stone-600 mt-1">Contact: {s.contact_person}</p>
                )}
                <div className="mt-2 space-y-1 text-xs text-stone-500">
                  {s.phone && (
                    <div className="flex items-center space-x-1.5">
                      <Phone className="w-3.5 h-3.5 text-stone-400" />
                      <span>{s.phone}</span>
                    </div>
                  )}
                  {s.email && (
                    <div className="flex items-center space-x-1.5">
                      <Mail className="w-3.5 h-3.5 text-stone-400" />
                      <span>{s.email}</span>
                    </div>
                  )}
                </div>
                {s.notes && (
                  <p className="text-xs text-stone-500 bg-stone-50 p-2 rounded mt-2 border border-stone-100">
                    {s.notes}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Purchase Orders List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-md flex items-center space-x-2">
              <FileText className="w-4 h-4 text-stone-500" />
              <span>Purchase Orders ({purchaseOrders.length})</span>
            </h3>
          </div>

          <div className="space-y-3">
            {purchaseOrders.map((po) => (
              <Card key={po.id} className="p-4 hover:border-amber-400 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-sm text-stone-900">
                        {po.po_number}
                      </span>
                      <Badge
                        variant={
                          po.status === 'received'
                            ? 'success'
                            : po.status === 'partially_received'
                            ? 'warning'
                            : 'neutral'
                        }
                        className="text-xs capitalize"
                      >
                        {po.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-stone-600 mt-1 font-medium">{po.supplier_name}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-stone-500 block">Total Amount</span>
                    <span className="font-mono font-bold text-stone-900 text-base">
                      {formatCurrency(po.total_amount)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between text-xs text-stone-500 gap-2">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Issued: {new Date(po.created_at).toLocaleDateString()}</span>
                    </span>
                    {po.expected_delivery_date && (
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Expected: {po.expected_delivery_date}</span>
                      </span>
                    )}
                  </div>

                  {po.items && po.items.length > 0 && (
                    <span className="text-stone-600 font-medium">
                      {po.items.length} line item(s)
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Goods Receipt Modal */}
      <GoodsReceiptModal
        isOpen={isGrnOpen}
        onClose={() => setIsGrnOpen(false)}
        onSuccess={(msg) => {
          setSuccessToast(msg);
          loadData();
        }}
        organizationId={organizationId}
        branchId={branchId}
        suppliers={suppliers}
        ingredients={ingredients}
      />
    </div>
  );
};
