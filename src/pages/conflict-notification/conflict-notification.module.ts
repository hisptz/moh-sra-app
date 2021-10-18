import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { IonicPageModule } from 'ionic-angular';
import { sharedComponentsModule } from '../../components/sharedComponents.module';
import { ConflictNotificationPage } from './conflict-notification';

@NgModule({
  declarations: [
    ConflictNotificationPage,
  ],
  imports: [
    IonicPageModule.forChild(ConflictNotificationPage),
    TranslateModule.forChild(),
    sharedComponentsModule
  ],
})
export class ConflictNotificationPageModule {}
