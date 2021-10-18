import { Component } from "@angular/core";
import { Store } from "@ngrx/store";
import { IonicPage, NavController, NavParams } from "ionic-angular";
import { Observable } from "rxjs";
import {
  CurrentUserData,
  UserRole,
} from "../../models/current-user-data.model";
import { LocalStorageProvider } from "../../providers/local-storage/local-storage";
import { getCurrentUserColorSettings, State } from "../../store";

/**
 * Generated class for the ConflictNotificationPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: "page-conflict-notification",
  templateUrl: "conflict-notification.html",
})
export class ConflictNotificationPage {
  colorSettings$: Observable<any>;
  conflicts: string[];
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
    this.conflicts = navParams.get("conflicts");
    this.currentUserInfo$ =
      this.localStorageProvider.getDataOnLocalStorage("user");
    this.currentUserData$ =
      this.localStorageProvider.getDataOnLocalStorage("userData");
  }

  ionViewDidLoad() {
    console.log("ionViewDidLoad ConflictNotificationPage");
  }
}
