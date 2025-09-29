import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'user' | 'guest';
  isActive: boolean;
  tags: string[];
  metadata: Record<string, any>;
}

@Component({
  selector: 'app-user-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-card.component.html',
  styleUrl: './user-card.component.css'
})
export class UserCardComponent {
  @Input() user!: User;
  @Input() showEmail: boolean = true;
  @Input() clickable: boolean = false;
  @Input() theme: 'light' | 'dark' = 'light';

  get displayName(): string {
    return this.user?.name || 'Unknown User';
  }

  get statusColor(): string {
    return this.user?.isActive ? 'green' : 'red';
  }

  get roleClass(): string {
    return `role-${this.user?.role || 'guest'}`;
  }

  get formattedLastSeen(): string {
    const lastSeen = this.user?.metadata?.['lastSeen'];
    if (!lastSeen || lastSeen === 'Never') {
      return 'Never';
    }

    const date = new Date(lastSeen);
    if (isNaN(date.getTime())) {
      return lastSeen;
    }

    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${month}/${day}/${year}`;
  }

  onCardClick() {
    if (this.clickable) {
      console.log('User card clicked:', this.user);
    }
  }
}