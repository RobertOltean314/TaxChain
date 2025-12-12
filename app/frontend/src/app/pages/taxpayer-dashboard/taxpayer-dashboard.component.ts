import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CardComponent } from '../../shared/ui/card/card.component';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { DashboardService } from '../../shared/services/dashboard.service';
import {
  DashboardMetrics,
  Activity,
  DashboardStats,
} from '../../shared/models/dashboard.models';

@Component({
  selector: 'app-taxpayer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, CardComponent, ButtonComponent],
  templateUrl: './taxpayer-dashboard.component.html',
  styleUrls: ['./taxpayer-dashboard.component.css'],
})
export class TaxpayerDashboardComponent implements OnInit {
  metrics: DashboardMetrics | null = null;
  recentActivities: Activity[] = [];
  stats: DashboardStats | null = null;
  isLoading = true;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    this.isLoading = true;

    // Load metrics
    this.dashboardService.getDashboardMetrics().subscribe({
      next: (metrics) => {
        this.metrics = metrics;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard metrics:', error);
        this.isLoading = false;
      },
    });

    // Load recent activities
    this.dashboardService.getRecentActivities(4).subscribe({
      next: (activities) => {
        this.recentActivities = activities;
      },
      error: (error) => {
        console.error('Error loading activities:', error);
      },
    });

    // Load stats
    this.dashboardService.getDashboardStats().subscribe({
      next: (stats) => {
        this.stats = stats;
      },
      error: (error) => {
        console.error('Error loading stats:', error);
      },
    });
  }
}
