import { Injectable } from '@angular/core';

import { BehaviorSubject } from 'rxjs';

import { InitiativeNode } from './initiative.model';

@Injectable({
  providedIn: 'root'
})
export class CircleMapService {
  public selectedCircle = new BehaviorSubject<InitiativeNode | undefined>(undefined);

  onCircleClick(circle: InitiativeNode) {
    if (circle === this.selectedCircle.value && circle.parent && circle.parent.parent) {
      this.selectCircle(circle.parent);
    } else {
      this.selectCircle(circle);
    }
  }

  selectCircle(circle: InitiativeNode) {
    console.log('CircleMapService.selectCircle: ', circle.data.name);

    this.deselectSelectedCircle();
    this.markCircleAsSelected(circle);

    this.selectedCircle.next(circle);
  }

  deselectSelectedCircle() {
    if (this.selectedCircle.value) {
      this.markCircleAsNotSelected(this.selectedCircle.value);
    }
    this.selectedCircle.next(undefined);
  }

  markCircleAsSelected(circle: InitiativeNode) {
    circle.data.isSelected = true;
  }

  markCircleAsNotSelected(circle: InitiativeNode) {
    circle.data.isSelected = false;
  }
}