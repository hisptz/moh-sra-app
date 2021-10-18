import { Component, Input } from '@angular/core';
import { ConflictPayload } from '../../models/conflict.model';

/**
 * Generated class for the ConflictListComponent component.
 *
 * See https://angular.io/api/core/Component for more info on Angular
 * Components.
 */
@Component({
  selector: 'conflict-list',
  templateUrl: 'conflict-list.html'
})
export class ConflictListComponent {
  @Input() conflicts: ConflictPayload[];
  @Input() currentUserInfo: any;
  @Input() currentUserData: any;

  constructor() {
    console.log('Hello ConflictListComponent Component');
  }

}
