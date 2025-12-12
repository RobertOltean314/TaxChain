import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="cardClasses">
      <ng-content></ng-content>
    </div>
  `,
  styles: [],
})
export class CardComponent {
  @Input() class = '';

  get cardClasses(): string {
    return `rounded-lg border border-border bg-card text-card-foreground shadow-sm ${this.class}`;
  }
}

@Component({
  selector: 'app-card-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="headerClasses">
      <ng-content></ng-content>
    </div>
  `,
  styles: [],
})
export class CardHeaderComponent {
  @Input() class = '';

  get headerClasses(): string {
    return `flex flex-col space-y-1.5 p-6 ${this.class}`;
  }
}

@Component({
  selector: 'app-card-title',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h3 [class]="titleClasses">
      <ng-content></ng-content>
    </h3>
  `,
  styles: [],
})
export class CardTitleComponent {
  @Input() class = '';

  get titleClasses(): string {
    return `text-2xl font-semibold leading-none tracking-tight ${this.class}`;
  }
}

@Component({
  selector: 'app-card-content',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="contentClasses">
      <ng-content></ng-content>
    </div>
  `,
  styles: [],
})
export class CardContentComponent {
  @Input() class = '';

  get contentClasses(): string {
    return `p-6 pt-0 ${this.class}`;
  }
}
