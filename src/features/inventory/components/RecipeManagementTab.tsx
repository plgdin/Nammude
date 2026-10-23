import React, { useState, useEffect } from 'react';
import { RecipeRecord } from '../types';
import { recipeService } from '../services/recipeService';
import { formatCurrency } from '@/lib/currency';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ChefHat, Scale, DollarSign } from 'lucide-react';

interface Props {
  organizationId: string;
}

export const RecipeManagementTab: React.FC<Props> = ({ organizationId }) => {
  const [recipes, setRecipes] = useState<RecipeRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    recipeService.getRecipes(organizationId).then((data) => {
      if (isMounted) {
        setRecipes(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [organizationId]);

  if (loading) {
    return (
      <div className="py-12 text-center text-stone-500 flex items-center justify-center space-x-2">
        <ChefHat className="w-5 h-5 animate-pulse text-amber-500" />
        <span>Loading recipes and Bill of Materials...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center space-x-2">
            <ChefHat className="w-6 h-6 text-amber-600" />
            <span>Recipe Bill of Materials (BOM)</span>
          </h2>
          <p className="text-sm text-stone-500">
            Authoritative ingredient composition per menu item with prep wastage factors.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {recipes.map((recipe) => (
          <Card key={recipe.id} className="p-5 flex flex-col justify-between hover:border-amber-400 transition-colors">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-stone-900">{recipe.menu_item_name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="neutral" className="text-xs font-mono">
                      v{recipe.version}
                    </Badge>
                    <span className="text-xs text-stone-500 flex items-center space-x-1">
                      <Scale className="w-3.5 h-3.5" />
                      <span>Yield: {recipe.yield_servings} serving(s)</span>
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium text-stone-500 block">Food Cost</span>
                  <span className="text-lg font-bold text-emerald-700">
                    {formatCurrency(recipe.calculated_cost ?? 0)}
                  </span>
                </div>
              </div>

              {recipe.preparation_instructions && (
                <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-lg mt-3 border border-stone-200/60">
                  {recipe.preparation_instructions}
                </p>
              )}

              <div className="mt-4">
                <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                  Ingredients ({recipe.ingredients?.length ?? 0})
                </h4>
                <div className="space-y-1.5">
                  {recipe.ingredients?.map((ing) => (
                    <div
                      key={ing.id}
                      className="flex items-center justify-between text-sm py-1 border-b border-stone-100 last:border-0"
                    >
                      <span className="text-stone-800 font-medium">{ing.ingredient_name}</span>
                      <div className="flex items-center space-x-2 text-stone-600">
                        <span className="font-mono font-medium">
                          {ing.quantity} {ing.unit}
                        </span>
                        {ing.wastage_percentage > 0 && (
                          <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                            +{ing.wastage_percentage}% waste
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
              <span className="flex items-center space-x-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>Auto-deducted on confirmed POS orders</span>
              </span>
              <span className="text-stone-400">Strict version locked</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
