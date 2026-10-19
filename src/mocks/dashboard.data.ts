export interface DashboardMetrics {
  reportingPeriod: string;
  branchName: string;
  grossSales: number;
  discounts: number;
  netRevenue: number;
  ordersCount: number;
  averageOrderValue: number;
  taxCollected: number;
  paymentsCollectedTotal: number;
  paymentsByMethod: {
    method: string;
    amount: number;
    percentage: number;
  }[];
  operatingExpensesToday: number;
  stockAlertsCount: number;
  salesTrend7Days: {
    day: string;
    date: string;
    netSales: number;
    orderCount: number;
  }[];
  hourlySalesToday: {
    hour: string;
    sales: number;
    orders: number;
  }[];
  bestSellers: {
    id: string;
    name: string;
    category: string;
    unitsSold: number;
    revenue: number;
  }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    type: 'Dine-In' | 'Takeaway' | 'QR Self-Order';
    table?: string;
    itemCount: number;
    totalAmount: number;
    status: 'Completed' | 'In Kitchen' | 'Ready to Serve';
    timeAgo: string;
  }[];
}

export const mockDashboardData: DashboardMetrics = {
  reportingPeriod: 'Today (Monday, Oct 19)',
  branchName: 'Main Branch',
  grossSales: 2485.5,
  discounts: 68.0,
  netRevenue: 2417.5,
  ordersCount: 142,
  averageOrderValue: 17.02,
  taxCollected: 199.44, // 8.25% sales tax
  paymentsCollectedTotal: 2616.94,
  paymentsByMethod: [
    { method: 'Credit / Debit Card', amount: 1894.5, percentage: 72.4 },
    { method: 'Cash Drawer', amount: 522.44, percentage: 20.0 },
    { method: 'Digital Wallet / Apple Pay', amount: 200.0, percentage: 7.6 },
  ],
  operatingExpensesToday: 315.0,
  stockAlertsCount: 3,
  salesTrend7Days: [
    { day: 'Tue', date: 'Oct 13', netSales: 2180, orderCount: 128 },
    { day: 'Wed', date: 'Oct 14', netSales: 2340, orderCount: 135 },
    { day: 'Thu', date: 'Oct 15', netSales: 2510, orderCount: 146 },
    { day: 'Fri', date: 'Oct 16', netSales: 3120, orderCount: 184 },
    { day: 'Sat', date: 'Oct 17', netSales: 3890, orderCount: 226 },
    { day: 'Sun', date: 'Oct 18', netSales: 3450, orderCount: 198 },
    { day: 'Today', date: 'Oct 19', netSales: 2417.5, orderCount: 142 },
  ],
  hourlySalesToday: [
    { hour: '07:00', sales: 180, orders: 18 },
    { hour: '08:00', sales: 420, orders: 36 },
    { hour: '09:00', sales: 510, orders: 39 },
    { hour: '10:00', sales: 380, orders: 25 },
    { hour: '11:00', sales: 290, orders: 19 },
    { hour: '12:00', sales: 440, orders: 28 },
    { hour: '13:00', sales: 197.5, orders: 14 },
  ],
  bestSellers: [
    { id: '1', name: 'Flat White', category: 'Espresso', unitsSold: 64, revenue: 304.0 },
    { id: '2', name: 'Smoked Salmon Avocado Toast', category: 'Kitchen', unitsSold: 28, revenue: 378.0 },
    { id: '3', name: 'Vanilla Cardamom Latte', category: 'Espresso', unitsSold: 41, revenue: 225.5 },
    { id: '4', name: 'Twice-Baked Almond Croissant', category: 'Bakery', unitsSold: 32, revenue: 176.0 },
    { id: '5', name: 'Nitro Cold Brew', category: 'Cold Brew', unitsSold: 29, revenue: 152.25 },
  ],
  recentOrders: [
    {
      id: 'ord_142',
      orderNumber: '#142',
      type: 'Dine-In',
      table: 'T-04',
      itemCount: 3,
      totalAmount: 23.75,
      status: 'In Kitchen',
      timeAgo: '2m ago',
    },
    {
      id: 'ord_141',
      orderNumber: '#141',
      type: 'Takeaway',
      itemCount: 1,
      totalAmount: 5.5,
      status: 'Ready to Serve',
      timeAgo: '6m ago',
    },
    {
      id: 'ord_140',
      orderNumber: '#140',
      type: 'QR Self-Order',
      table: 'T-09',
      itemCount: 2,
      totalAmount: 19.25,
      status: 'Completed',
      timeAgo: '12m ago',
    },
    {
      id: 'ord_139',
      orderNumber: '#139',
      type: 'Dine-In',
      table: 'T-02',
      itemCount: 4,
      totalAmount: 44.5,
      status: 'Completed',
      timeAgo: '18m ago',
    },
    {
      id: 'ord_138',
      orderNumber: '#138',
      type: 'Takeaway',
      itemCount: 2,
      totalAmount: 10.25,
      status: 'Completed',
      timeAgo: '25m ago',
    },
  ],
};
