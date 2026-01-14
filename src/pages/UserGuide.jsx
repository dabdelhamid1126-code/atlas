import React, { useState } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Search, 
  Package, 
  ShoppingCart, 
  PackageCheck, 
  Hash, 
  CreditCard, 
  Upload, 
  FileText, 
  CheckSquare,
  BarChart3,
  AlertTriangle
} from 'lucide-react';

const guides = [
  {
    id: 'inventory',
    title: 'Managing Inventory',
    icon: Package,
    sections: [
      {
        title: 'Viewing Inventory',
        content: 'Navigate to the Inventory page to see all items currently in stock. Use the search bar to find specific products by name or SKU. Filter by status to see pending, received, in-stock, or damaged items.'
      },
      {
        title: 'Inventory Statuses',
        content: 'Items can have the following statuses:\n• Pending - Ordered but not yet received\n• Received - Arrived but not yet processed\n• In Stock - Available for export\n• Reserved - Allocated for an export\n• Exported - Shipped to buyer\n• Damaged - Marked as damaged'
      }
    ]
  },
  {
    id: 'products',
    title: 'Product Catalog',
    icon: ShoppingCart,
    sections: [
      {
        title: 'Adding Products',
        content: 'Click "Add Product" to create a new product in the catalog. Enter the product name, SKU, category, brand, and optionally set base cost and MSRP. Products in the catalog can be used when creating purchase orders.'
      },
      {
        title: 'Editing Products',
        content: 'Click the pencil icon next to any product to edit its details. Changes will apply to new inventory items but won\'t affect existing ones.'
      }
    ]
  },
  {
    id: 'purchase-orders',
    title: 'Purchase Orders',
    icon: PackageCheck,
    sections: [
      {
        title: 'Creating Orders',
        content: 'Create purchase orders to track items you\'re buying from suppliers. Add the supplier name, order date, and list of items with quantities and costs. The system will generate a unique order number.'
      },
      {
        title: 'Order Workflow',
        content: 'Orders follow this workflow:\n1. Pending - Order created\n2. Ordered - Order placed with supplier\n3. Shipped - Items in transit\n4. Partially Received - Some items received\n5. Received - All items received'
      }
    ]
  },
  {
    id: 'receiving',
    title: 'Receiving Items',
    icon: PackageCheck,
    sections: [
      {
        title: 'How to Receive',
        content: 'Go to "Receive Items" to see pending orders. Click "Receive Items" on an order, enter the quantity received for each item, and optionally add serial numbers. This creates inventory items and updates the order status.'
      },
      {
        title: 'Serial Numbers',
        content: 'For items that require tracking, you can add serial numbers during receiving. Each serial number is unique and can be searched later.'
      },
      {
        title: 'Fixing Errors',
        content: 'If you make a mistake during receiving, go to "Fix Receiving" (admin/manager only) to adjust quantities or statuses. All changes are logged.'
      }
    ]
  },
  {
    id: 'serial-numbers',
    title: 'Serial Numbers',
    icon: Hash,
    sections: [
      {
        title: 'Adding Serials',
        content: 'Serial numbers can be added during the receiving process or manually from the Serial Numbers page. Each serial must be unique across all products.'
      },
      {
        title: 'Tracking Serials',
        content: 'Use the search to find items by serial number. Serial status tracks whether the item is in stock, exported, damaged, or returned.'
      }
    ]
  },
  {
    id: 'gift-cards',
    title: 'Gift Cards',
    icon: CreditCard,
    sections: [
      {
        title: 'Adding Cards',
        content: 'Add gift cards by entering the brand, value, card code, and optional PIN. The purchase cost can be recorded to track profit margins.'
      },
      {
        title: 'Card Security',
        content: 'Card codes are partially hidden by default. Click the eye icon to reveal the full code. Only reveal codes when necessary.'
      },
      {
        title: 'Card Status',
        content: 'Cards can be Available, Reserved, Exported, Used, or Invalid. Status updates automatically when cards are included in exports.'
      }
    ]
  },
  {
    id: 'exports',
    title: 'Completing Exports',
    icon: Upload,
    sections: [
      {
        title: 'Creating Exports',
        content: 'Go to "Complete Export" to ship items to buyers. Select inventory items and/or gift cards, enter buyer information, and complete the export. Items are automatically marked as exported.'
      },
      {
        title: 'Export Process',
        content: '1. Click "New Export"\n2. Enter buyer name and shipping info\n3. Select items from inventory tab\n4. Select gift cards if applicable\n5. Review total and complete'
      }
    ]
  },
  {
    id: 'invoices',
    title: 'Invoices',
    icon: FileText,
    sections: [
      {
        title: 'Creating Invoices',
        content: 'Create invoices for exports by entering buyer details and line items. Invoices can be in Draft, Sent, Paid, Overdue, or Cancelled status.'
      },
      {
        title: 'Invoice Workflow',
        content: 'Typical workflow:\n1. Draft - Create and review\n2. Sent - Share with buyer\n3. Paid - Payment received\n\nOverdue status can be set manually if payment is late.'
      }
    ]
  },
  {
    id: 'tasks',
    title: 'Task Management',
    icon: CheckSquare,
    sections: [
      {
        title: 'Creating Tasks',
        content: 'Create tasks for team members with title, description, priority, and due date. Assign tasks to specific users and categorize them.'
      },
      {
        title: 'Task Priorities',
        content: 'Tasks can be Low, Medium, High, or Urgent priority. Use urgent for time-sensitive items that need immediate attention.'
      },
      {
        title: 'Completing Tasks',
        content: 'Click the checkmark icon to mark a task complete. Task history is retained for reference.'
      }
    ]
  },
  {
    id: 'analytics',
    title: 'Analytics',
    icon: BarChart3,
    sections: [
      {
        title: 'Dashboard Metrics',
        content: 'The Analytics page shows key metrics including total inventory, export counts, revenue, and category breakdowns. Select different time periods to analyze trends.'
      },
      {
        title: 'Charts',
        content: 'View export value over time, inventory by category, and top products. Use these insights to optimize your operations.'
      }
    ]
  },
  {
    id: 'damaged',
    title: 'Damaged Items',
    icon: AlertTriangle,
    sections: [
      {
        title: 'Reporting Damage',
        content: 'Report damaged items from the Damaged Items page. Select from inventory or enter details manually. Include damage type, description, and estimated loss.'
      },
      {
        title: 'Resolution',
        content: 'Update damage reports as they\'re assessed and resolved. Track total losses for insurance and accounting purposes.'
      }
    ]
  }
];

export default function UserGuide() {
  const [search, setSearch] = useState('');

  const filteredGuides = guides.filter(guide =>
    guide.title.toLowerCase().includes(search.toLowerCase()) ||
    guide.sections.some(s => 
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.content.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div>
      <PageHeader 
        title="User Guide" 
        description="Learn how to use FalconFlips"
      />

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search guides..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredGuides.map(guide => (
          <Card key={guide.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-3 text-base">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <guide.icon className="h-4 w-4 text-emerald-600" />
                </div>
                {guide.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {guide.sections.map((section, idx) => (
                  <AccordionItem key={idx} value={`${guide.id}-${idx}`}>
                    <AccordionTrigger className="text-sm font-medium">
                      {section.title}
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-slate-600 whitespace-pre-line">
                        {section.content}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ))}

        {filteredGuides.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-slate-500">No guides found matching your search</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}