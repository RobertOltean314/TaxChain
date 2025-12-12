import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent } from '../../shared/ui/card/card.component';
import { GovernmentDashboardService } from '../../shared/services/government-dashboard.service';
import {
  GovernmentMetrics,
  ComplianceTrend,
  EntityTypeDistribution,
  RecentVerification,
} from '../../shared/models/dashboard.models';

@Component({
  selector: 'app-government-dashboard',
  standalone: true,
  imports: [CommonModule, CardComponent],
  templateUrl: './government-dashboard.component.html',
  styleUrls: ['./government-dashboard.component.css'],
})
export class GovernmentDashboardComponent implements OnInit {
  metrics: GovernmentMetrics | null = null;
  complianceTrends: ComplianceTrend[] = [];
  entityTypeDistribution: EntityTypeDistribution[] = [];
  recentVerifications: RecentVerification[] = [];
  isLoading = true;

  constructor(private governmentDashboardService: GovernmentDashboardService) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    this.isLoading = true;

    // Load government metrics
    this.governmentDashboardService.getGovernmentMetrics().subscribe({
      next: (metrics) => {
        this.metrics = metrics;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading government metrics:', error);
        this.isLoading = false;
      },
    });

    // Load compliance trends
    this.governmentDashboardService.getComplianceTrends('monthly').subscribe({
      next: (trends) => {
        this.complianceTrends = trends;
      },
      error: (error) => {
        console.error('Error loading compliance trends:', error);
      },
    });

    // Load entity type distribution
    this.governmentDashboardService.getEntityTypeDistribution().subscribe({
      next: (types) => {
        this.entityTypeDistribution = types;
      },
      error: (error) => {
        console.error('Error loading entity types:', error);
      },
    });

    // Load recent verifications
    this.governmentDashboardService.getRecentVerifications(4).subscribe({
      next: (verifications) => {
        this.recentVerifications = verifications;
      },
      error: (error) => {
        console.error('Error loading verifications:', error);
      },
    });
  }

  getColorClass(type: string): string {
    const colorMap: Record<string, string> = {
      Individual: 'bg-primary',
      Partnership: 'bg-secondary',
      Company: 'bg-accent',
      NGO: 'bg-gradient-to-r from-primary to-secondary',
    };
    return colorMap[type] || 'bg-muted';
  }

  trackByPeriod(index: number, item: ComplianceTrend): string {
    return item.period;
  }

  trackByEntityType(index: number, item: EntityTypeDistribution): string {
    return item.type;
  }

  trackByVerification(index: number, item: RecentVerification): string {
    return item.id;
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  getRelativeTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}
