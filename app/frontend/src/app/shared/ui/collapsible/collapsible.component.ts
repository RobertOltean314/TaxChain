import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-collapsible',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="border rounded-lg overflow-hidden">
      <button
        type="button"
        (click)="toggleCollapse()"
        class="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span class="font-medium text-sm">{{ title }}</span>
        <svg
          class="w-5 h-5 transition-transform"
          [class.rotate-180]="!isCollapsed"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      <div
        class="transition-all duration-200 ease-in-out overflow-hidden"
        [class.max-h-0]="isCollapsed"
        [class.max-h-[2000px]]="!isCollapsed"
      >
        <div class="p-4 bg-white">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class CollapsibleComponent {
  @Input() title: string = '';
  @Input() isCollapsed: boolean = false;

  toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
  }
}
