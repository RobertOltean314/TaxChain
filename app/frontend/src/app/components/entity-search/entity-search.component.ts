import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  EntitySearchService,
  EntitySearchResult,
  SearchResponse,
} from '../../features/entity_management/services/entity-search.service';

@Component({
  selector: 'app-entity-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './entity-search.component.html',
  styleUrls: ['./entity-search.component.css'],
})
export class EntitySearchComponent implements OnInit {
  searchQuery: string = '';
  entityType: string = '';
  currentPage: number = 1;
  perPage: number = 20;

  results: EntitySearchResult[] = [];
  totalResults: number = 0;
  isLoading: boolean = false;
  errorMessage: string = '';

  entityTypes = [
    { value: '', label: 'All Types' },
    { value: 'persoana_fizica', label: 'Individual Person (PFA)' },
    { value: 'persoana_juridica', label: 'Legal Entity (SRL)' },
    { value: 'ong', label: 'NGO' },
    { value: 'institutie_publica', label: 'Public Institution' },
    { value: 'entitate_straina', label: 'Foreign Entity' },
  ];

  constructor(private entitySearchService: EntitySearchService) {}

  ngOnInit(): void {
    this.performSearch();
  }

  performSearch(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.entitySearchService
      .searchEntities(
        this.searchQuery || undefined,
        this.entityType || undefined,
        this.currentPage,
        this.perPage
      )
      .subscribe({
        next: (response: SearchResponse) => {
          this.results = response.results;
          this.totalResults = response.total;
          this.currentPage = response.page;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Search error:', error);
          this.errorMessage = 'Failed to search entities. Please try again.';
          this.isLoading = false;
        },
      });
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.performSearch();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.performSearch();
  }

  get totalPages(): number {
    return Math.ceil(this.totalResults / this.perPage);
  }

  getEntityTypeLabel(type: string): string {
    const found = this.entityTypes.find((et) => et.value === type);
    return found ? found.label : type;
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
}
