import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CounterComponent } from './counter/counter.component';
import { UserCardComponent, User } from './user-card/user-card.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, CounterComponent, UserCardComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Angular 17 Component Testing';

  // Sample data for testing
  users: User[] = [
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
      isActive: true,
      tags: ['developer', 'team-lead', 'frontend'],
      metadata: { lastSeen: '2024-01-15', projects: 5 }
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'user',
      isActive: false,
      tags: ['designer', 'ui/ux'],
      metadata: { lastSeen: '2024-01-10', projects: 3 }
    },
    {
      id: 3,
      name: 'Bob Wilson',
      email: 'bob@example.com',
      role: 'guest',
      isActive: true,
      tags: ['intern', 'learning'],
      metadata: { lastSeen: '2024-01-16', projects: 1 }
    }
  ];

  counterValue = 0;

  onCounterChanged(newValue: number) {
    this.counterValue = newValue;
    console.log('Counter changed to:', newValue);
  }
}