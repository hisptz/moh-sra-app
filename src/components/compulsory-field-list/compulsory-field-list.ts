import { Component, Input } from "@angular/core";

/**
 * Generated class for the CompulsoryFieldListComponent component.
 *
 * See https://angular.io/api/core/Component for more info on Angular
 * Components.
 */
@Component({
  selector: "compulsory-field-list",
  templateUrl: "compulsory-field-list.html",
})
export class CompulsoryFieldListComponent {
  @Input() compulsoryFields;
  @Input() currentUserInfo: any;
  @Input() currentUserData: any;

  text: string;

  constructor() {
    console.log("Hello CompulsoryFieldListComponent Component");
    this.text = "Hello World";
  }
}
