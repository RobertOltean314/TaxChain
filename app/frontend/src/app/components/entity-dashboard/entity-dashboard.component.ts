import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  EntitySearchService,
  MyEntitySummary,
  DashboardResponse,
} from '../../features/entity_management/services/entity-search.service';

@Component({
  selector: 'app-entity-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './entity-dashboard.component.html',
  styleUrls: ['./entity-dashboard.component.css'],
})
export class EntityDashboardComponent implements OnInit {
  walletAddress: string = '';
  entities: MyEntitySummary[] = [];
  totalCount: number = 0;
  isLoading: boolean = false;
  errorMessage: string = '';
  isAuthenticated: boolean = false;

  constructor(private entitySearchService: EntitySearchService) {}

  ngOnInit(): void {
    // Get wallet address from localStorage or session
    this.walletAddress = localStorage.getItem('walletAddress') || '';

    if (this.walletAddress) {
      this.isAuthenticated = true;
      this.loadMyEntities();
    }
  }

  loadMyEntities(): void {
    if (!this.walletAddress) {
      this.errorMessage = 'Please connect your wallet first';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.entitySearchService.getMyEntities(this.walletAddress).subscribe({
      next: (response: DashboardResponse) => {
        this.entities = response.entities;
        this.totalCount = response.total_count;
        this.walletAddress = response.wallet_address;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Dashboard error:', error);
        if (error.status === 401) {
          this.errorMessage =
            'Authentication failed. Please reconnect your wallet.';
        } else {
          this.errorMessage = 'Failed to load your entities. Please try again.';
        }
        this.isLoading = false;
      },
    });
  }

  getEntityTypeLabel(type: string): string {
    const types: { [key: string]: string } = {
      persoana_fizica: 'Individual Person (PFA)',
      persoana_juridica: 'Legal Entity (SRL)',
      ong: 'NGO',
      institutie_publica: 'Public Institution',
      entitate_straina: 'Foreign Entity',
    };
    return types[type] || type;
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'activ':
        return 'bg-green-100 text-green-800';
      case 'inactiv':
        return 'bg-gray-100 text-gray-800';
      case 'suspendat':
        return 'bg-yellow-100 text-yellow-800';
      case 'radiat':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  truncateAddress(address: string): string {
    if (!address || address.length < 20) return address;
    return `${address.substring(0, 10)}...${address.substring(
      address.length - 8
    )}`;
  }
}
