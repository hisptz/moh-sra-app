/*
 *
 * Copyright 2015 HISP Tanzania
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston,
 * MA 02110-1301, USA.
 *
 * @since 2015
 * @author Joseph Chingalo <profschingalo@gmail.com>
 *
 */
import { Component, OnInit, Input } from '@angular/core';
import { UserProvider } from '../../../../providers/user/user';
import { ModalController } from 'ionic-angular';
import { AppTranslationProvider } from '../../../../providers/app-translation/app-translation';
import { SynchronizationProvider } from '../../../../providers/synchronization/synchronization';

/**
 * Generated class for the UploadViaInternetComponent component.
 *
 * See https://angular.io/docs/ts/latest/api/core/index/ComponentMetadata-class.html
 * for more info on Angular Components.
 */
@Component({
  selector: 'upload-data-via-internet',
  templateUrl: 'upload-via-internet.html'
})
export class UploadViaInternetComponent implements OnInit {
  @Input() colorSettings: any;

  currentUser: any;
  selectedItems: any = {};
  isLoading: boolean;
  loadingMessage: string;
  itemsToUpload: Array<string>;
  importSummaries: any;
  dataObject: any;
  success: any;
  translationMapper: any;
  progress: string;
  isUploading: boolean;

  constructor(
    private modalCtrl: ModalController,
    private user: UserProvider,
    private appTranslation: AppTranslationProvider,
    private synchronizationProvider: SynchronizationProvider
  ) {
    this.progress = '';
    this.success = "#42f554"
    this.isLoading = true;
    this.itemsToUpload = [];
    this.dataObject = {
      events: [],
      dataValues: [],
      eventsForTracker: [],
      Enrollments: [],
      dataStore: []
    };
    this.importSummaries = null;
    this.translationMapper = {};
  }

  ngOnInit() {
    this.isUploading = true;
    this.appTranslation.getTransalations(this.getValuesToTranslate()).subscribe(
      (data: any) => {
        this.translationMapper = data;
        this.loadingCurrentUsereInfromation(this.isUploading);
      },
      error => {
        this.loadingCurrentUsereInfromation(this.isUploading);
      }
    );
  }

  loadingCurrentUsereInfromation(isUploading: boolean) {
    let key = 'Discovering current user information';
    this.loadingMessage = this.translationMapper[key]
      ? this.translationMapper[key]
      : key;
    this.user.getCurrentUser().subscribe(
      (user: any) => {
        this.currentUser = user;
        this.loadingDataToUpload(isUploading);
      },
      error => {}
    );
  }

  loadingDataToUpload(isUploading: boolean) {
    this.synchronizationProvider.getDataForUpload(this.currentUser, isUploading).subscribe(
      dataObject => {
        this.dataObject = dataObject;
        this.isLoading = false;
      },
      error => {
        this.isLoading = false;
        console.log('error : ' + JSON.stringify(error));
      }
    );
  }

  updateItemsToUpload() {
    this.itemsToUpload = [];
    Object.keys(this.selectedItems).map((key: string) => {
      if (this.selectedItems[key]) {
        this.itemsToUpload.push(key);
      }
    });
  }

  uploadData() {
    let key = 'Uploading selected local data, please wait...';
    this.loadingMessage = this.translationMapper[key]
      ? this.translationMapper[key]
      : key;
    this.progress = '0';
    this.isLoading = true;
    let dataToUpload = {};
    Object.keys(this.dataObject).map(item => {
      if (this.itemsToUpload.indexOf(item) > -1) {
        dataToUpload[item] = this.dataObject[item];
      } else {
        dataToUpload[item] = [];
      }
    });
    this.synchronizationProvider
      .uploadingDataToTheServer(dataToUpload, this.currentUser)
      .subscribe(
        response => {
          const { isCompleted } = response;
          const { importSummaries } = response;
          const { percentage } = response;
          this.progress = percentage;
          if (isCompleted) {
            this.importSummaries = importSummaries;
            const keys = Object.keys(importSummaries);
            this.isLoading = false;
            this.viewUploadImportSummaries(keys);
          }
        },
        error => {
          this.isLoading = false;
          console.log(
            'Error on uploading offline data ' + JSON.stringify(error)
          );
        }
      );
  }

  viewUploadImportSummaries(keys) {
    if (this.importSummaries) {
      let modal = this.modalCtrl.create('ImportSummariesPage', {
        importSummaries: this.importSummaries,
        keys: keys
      });
      modal.onDidDismiss(() => {
        Object.keys(this.selectedItems).forEach((key: string) => {
          this.selectedItems[key] = false;
        });
        this.loadingDataToUpload(this.isUploading);
      });
      modal.present();
    }
  }

  getValuesToTranslate() {
    return [
      'Aggregate data',
      'Events',
      'Events for tracker',
      'Enrollments',
      'Upload data',
      'Discovering current user information',
      'Uploading selected local data, please wait...'
    ];
  }
}
