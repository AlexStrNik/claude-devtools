import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-counter',
  standalone: true,
  imports: [],
  templateUrl: './counter.component.html',
  styleUrl: './counter.component.css'
})
export class CounterComponent {
  @Input() initialValue: number = 0;
  @Input() step: number = 1;
  @Input() label: string = 'Counter';
  @Output() valueChanged = new EventEmitter<number>();

  count: number = 0;

  ngOnInit() {
    this.count = this.initialValue;
  }

  increment() {
    this.count += this.step;
    this.valueChanged.emit(this.count);
  }

  decrement() {
    this.count -= this.step;
    this.valueChanged.emit(this.count);
  }

  reset() {
    this.count = this.initialValue;
    this.valueChanged.emit(this.count);
  }
}