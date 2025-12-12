// Dashboard Models
export interface DashboardMetrics {
  complianceStatus: 'Active' | 'Inactive' | 'Pending' | 'Suspended';
  taxObligations: number;
  currency: string;
  invoicesSubmitted: number;
  walletBalance: number;
  walletCurrency: string;
  walletConnected: boolean;
}

export interface Activity {
  id: string;
  date: string;
  action: string;
  status:
    | 'Verified'
    | 'Success'
    | 'Confirmed'
    | 'Active'
    | 'Pending'
    | 'Failed';
  timestamp: Date;
}

export interface DashboardStats {
  nextDeadline: Date | null;
  zkProofsGenerated: number;
  entitiesRegistered: number;
}

// Government Dashboard Models
export interface ComplianceTrend {
  period: string;
  rate: number;
  proofsVerified: number;
}

export interface EntityTypeDistribution {
  type: string;
  count: number;
  percentage: number;
}

export interface RecentVerification {
  id: string;
  taxpayerId: string;
  taxpayerName: string;
  amount: number;
  currency: string;
  status: 'Verified' | 'Pending' | 'Rejected';
  timestamp: Date;
}

export interface GovernmentMetrics {
  totalTaxpayers: number;
  complianceRate: number;
  revenueCollected: number;
  currency: string;
  zkProofsVerified: number;
  totalProofs: number;
  avgResponseTime: number;
  systemUptime: number;
  transactionsToday: number;
}

// Tax Obligation Models
export interface TaxObligation {
  id: string;
  type: string;
  amount: number;
  currency: string;
  dueDate: Date;
  status: 'Pending' | 'Paid' | 'Overdue';
  quarter?: string;
}

// ZK Proof Models
export interface ZKProof {
  id: string;
  proofHash: string;
  timestamp: Date;
  status: 'Generated' | 'Verified' | 'Pending' | 'Failed';
  amount?: number;
  currency?: string;
}
