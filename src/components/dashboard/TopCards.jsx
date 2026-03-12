import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';

export default function TopCards({ cards = [] }) {
  return (
    <Card className="border border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Top Cards</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {cards.length === 0 && <p className="text-sm text-muted-foreground">No card data</p>}
        {cards.map((card, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-secondary flex items-center justify-center">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{card.name}</p>
                <p className="text-xs text-muted-foreground">{card.orders} {card.orders === 1 ? 'item' : 'items'}</p>
              </div>
            </div>
            <p className="text-sm font-bold text-purple-400">${card.spent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}