import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

export interface NavItem {
  title: string;
  href: string;
  icon?: string;
  children?: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent {
  @Input() items: NavItem[] = [];
  @Input() title = 'TaxChain';
  @Input() subtitle = 'Tax Compliance';

  isMobileMenuOpen = false;
  expandedItems: string[] = [];

  constructor(public router: Router) {}

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  toggleExpanded(href: string): void {
    const index = this.expandedItems.indexOf(href);
    if (index > -1) {
      this.expandedItems.splice(index, 1);
    } else {
      this.expandedItems.push(href);
    }
  }

  isExpanded(href: string): boolean {
    return this.expandedItems.includes(href);
  }

  isActive(href: string): boolean {
    return this.router.url.startsWith(href);
  }

  trackByHref(index: number, item: NavItem): string {
    return item.href;
  }
}
