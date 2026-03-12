import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Target } from 'lucide-react';

export default function Goals() {
  const queryClient = useQueryClient();
  const [goals, setGoals] = useState({
    profit: { weekly: 0, monthly: 0, weeklyActive: false, monthlyActive: false },
    revenue: { weekly: 0, monthly: 0, weeklyActive: false, monthlyActive: false },
    cashback: { weekly: 0, monthly: 0, weeklyActive: false, monthlyActive: false },
    transactions: { weekly: 0, monthly: 0, weeklyActive: false, monthlyActive: false },
  });

  const { data: existingGoals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.list(),
  });

  useEffect(() => {
    if (existingGoals.length > 0) {
      const newGoals = { ...goals };
      existingGoals.forEach(goal => {
        if (newGoals[goal.type]) {
          if (goal.timeframe === 'weekly') {
            newGoals[goal.type].weekly = goal.target_value;
            newGoals[goal.type].weeklyActive = goal.active;
          } else if (goal.timeframe === 'monthly') {
            newGoals[goal.type].monthly = goal.target_value;
            newGoals[goal.type].monthlyActive = goal.active;
          }
        }
      });
      setGoals(newGoals);
    }
  }, [existingGoals]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Delete all existing goals
      const existing = await base44.entities.Goal.list();
      await Promise.all(existing.map(g => base44.entities.Goal.delete(g.id)));

      // Create new goals
      const newGoals = [];
      Object.entries(goals).forEach(([type, values]) => {
        if (values.weekly > 0 || values.weeklyActive) {
          newGoals.push({
            type,
            timeframe: 'weekly',
            target_value: values.weekly,
            active: values.weeklyActive,
          });
        }
        if (values.monthly > 0 || values.monthlyActive) {
          newGoals.push({
            type,
            timeframe: 'monthly',
            target_value: values.monthly,
            active: values.monthlyActive,
          });
        }
      });
      if (newGoals.length > 0) {
        await base44.entities.Goal.bulkCreate(newGoals);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  const handleValueChange = (type, timeframe, value) => {
    setGoals(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [timeframe]: parseFloat(value) || 0,
      },
    }));
  };

  const handleActiveChange = (type, timeframe, active) => {
    setGoals(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [`${timeframe}Active`]: active,
      },
    }));
  };

  if (isLoading) return <div>Loading...</div>;

  const goalTypes = [
    { key: 'profit', label: 'Profit', color: 'text-teal-400' },
    { key: 'revenue', label: 'Revenue', color: 'text-green-400' },
    { key: 'cashback', label: 'Cashback', color: 'text-pink-400' },
    { key: 'transactions', label: 'Transactions', color: 'text-purple-400' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-6 w-6 text-purple-400" />
          <h1 className="text-3xl font-bold text-foreground">Goal Tracking</h1>
        </div>
        <p className="text-muted-foreground">Set profit, revenue, cashback, or transaction targets. Active goals appear on your Dashboard.</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Configure Your Goals</CardTitle>
          <CardDescription>Set weekly and monthly targets for each goal type</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {goalTypes.map(({ key, label, color }) => (
            <div key={key} className="space-y-3 pb-6 border-b border-border last:border-0">
              <div className={`text-sm font-semibold ${color}`}>{label}</div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Weekly */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground">Weekly Target</label>
                    <Switch
                      checked={goals[key].weeklyActive}
                      onCheckedChange={(checked) => handleActiveChange(key, 'weekly', checked)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {key !== 'transactions' && <span className="text-muted-foreground">$</span>}
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={goals[key].weekly || ''}
                      onChange={(e) => handleValueChange(key, 'weekly', e.target.value)}
                      className="bg-secondary border-border"
                    />
                  </div>
                </div>

                {/* Monthly */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground">Monthly Target</label>
                    <Switch
                      checked={goals[key].monthlyActive}
                      onCheckedChange={(checked) => handleActiveChange(key, 'monthly', checked)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {key !== 'transactions' && <span className="text-muted-foreground">$</span>}
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={goals[key].monthly || ''}
                      onChange={(e) => handleValueChange(key, 'monthly', e.target.value)}
                      className="bg-secondary border-border"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="bg-purple-600 hover:bg-purple-700 text-white px-8"
      >
        {saveMutation.isPending ? 'Saving...' : 'Save Goals'}
      </Button>
    </div>
  );
}