import { Component, OnInit } from "@angular/core";
import { Store } from "@ngrx/store";
import { IonicPage, NavController, NavParams } from "ionic-angular";
import { Observable } from "rxjs";
import { State, getCurrentUserColorSettings } from "../../store";
import { CompulsoryField } from "../../models/compulsory-field.model";
import * as _ from "lodash";
import { LocalStorageProvider } from "../../providers/local-storage/local-storage";
import { take } from "rxjs/operators";
import {
  CurrentUserData,
  UserRole,
} from "../../models/current-user-data.model";
/**
 * Generated class for the CompulsoryNotificationPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: "page-compulsory-notification",
  templateUrl: "compulsory-notification.html",
})
export class CompulsoryNotificationPage implements OnInit {
  colorSettings$: Observable<any>;
  compulsoryFields: string[];
  currentUserInfo$: Observable<any>;
  currentUserData$: Observable<CurrentUserData>;
  dataSetCompleteUserRole: UserRole;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private store: Store<State>,
    private localStorageProvider: LocalStorageProvider
  ) {
    this.colorSettings$ = this.store.select(getCurrentUserColorSettings);
    this.compulsoryFields = this.sanitizeCompulsoryField(
      navParams.get("compulsoryFields")
    );
    this.currentUserInfo$ =
      this.localStorageProvider.getDataOnLocalStorage("user");
    this.currentUserData$ =
      this.localStorageProvider.getDataOnLocalStorage("userData");
  }
  ngOnInit(): void {
    this.currentUserData$
      .pipe(take(1))
      .subscribe((currentUserData: CurrentUserData) => {
        if (currentUserData) {
          this.dataSetCompleteUserRole = _.head(
            _.filter(currentUserData.userRoles, (userRole: UserRole) => {
              return userRole.name === "SRA_COMPLETE_SUPPORT";
            })
          );
        }
      });
  }

  ionViewDidLoad() {
    console.log("ionViewDidLoad CompulsoryNotificationPage");
  }

  sanitizeCompulsoryField(compulsoryFields: CompulsoryField[]) {
    return _.map(compulsoryFields, (compulsoryField: CompulsoryField) => {
      return _.trim(compulsoryField.name);
    });
  }
}
