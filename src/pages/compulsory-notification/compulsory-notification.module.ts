import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { IonicPageModule } from 'ionic-angular';
import { sharedComponentsModule } from '../../components/sharedComponents.module';
import { CompulsoryNotificationPage } from './compulsory-notification';

@NgModule({
  declarations: [
    CompulsoryNotificationPage,
  ],
  imports: [
    IonicPageModule.forChild(CompulsoryNotificationPage),
    TranslateModule.forChild(),
    sharedComponentsModule
  ],
})
export class CompulsoryNotificationPageModule {}
