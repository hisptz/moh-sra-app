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
import { Component, OnInit, ViewChild } from "@angular/core";
import {
  IonicPage,
  ModalController,
  NavController,
  NavParams,
  Content,
} from "ionic-angular";
import { UserProvider } from "../../../providers/user/user";
import { AppProvider } from "../../../providers/app/app";
import { DataEntryFormProvider } from "../../../providers/data-entry-form/data-entry-form";
import { SettingsProvider } from "../../../providers/settings/settings";
import { DataValuesProvider } from "../../../providers/data-values/data-values";
import { DataSetCompletenessProvider } from "../../../providers/data-set-completeness/data-set-completeness";
import * as _ from "lodash";
import { Store } from "@ngrx/store";
import { State, getCurrentUserColorSettings } from "../../../store";
import { Observable, Subscription } from "rxjs";
import { SynchronizationProvider } from "../../../providers/synchronization/synchronization";
import { ValidationRule, CurrentUser } from "../../../models";
import { ValidationRulesProvider } from "../../../providers/validation-rules/validation-rules";
import { OfflineCompletenessProvider } from "../../../providers/offline-completeness/offline-completeness";
import {
  OfflineCompleteDataValuePayload,
  OfflineSQLITEDataValue,
  SQLITEDataValue,
} from "../../../models/data-value.model";
import { getStandardDataValuePayload } from "../../../helpers/srt-data-value-payload.helper";
import { take } from "rxjs/operators";
import {
  CompleteDataSetRegistration,
  CompletenessPayload,
  CompletenessResponse,
  DataSetCompletenessInfo,
  EntryFormParameter,
  ShortImportSummary,
} from "../../../models/completeness.model";
import { ImportResponse } from "../../../models/import-response.model";
import { NetworkAvailabilityProvider } from "../../../providers/network-availability/network-availability";
import { LocalStorageProvider } from "../../../providers/local-storage/local-storage";

declare var dhis2;

@IonicPage()
@Component({
  selector: "page-data-entry-form",
  templateUrl: "data-entry-form.html",
})
export class DataEntryFormPage implements OnInit {
  entryFormParameter: EntryFormParameter;

  isLoading: boolean;
  loadingMessage: string;
  currentUser: any;
  appSettings: any;
  indicators: Array<any>;
  sectionIds: Array<string>;
  dataSet: any;
  dataSetAttributeOptionCombo: any;
  entryFormSections: any;
  entryFormLayout: string;
  icons: any = {};
  pager: any = {};
  storageStatus: any;
  dataValuesObject: any;
  dataValuesSavingStatusClass: any;
  dataSetsCompletenessInfo: any;
  isDataSetCompleted: boolean;
  isDataSetCompletenessProcessRunning: boolean;
  isValidationProcessRunning: boolean;
  dataEntryFormDesign: string;
  validationRules: ValidationRule[];
  compulsoryDataElementOperands: any[];
  entryFormType: string;
  dataUpdateStatus: { [elementId: string]: string };
  @ViewChild(Content)
  content: Content;
  colorSettings$: Observable<any>;
  isPeriodLocked: boolean;
  isDataSetCompletedAndLocked: boolean;

  // Subscriptions
  subscriptions: Subscription[] = [];
  completenessSubscription$: Subscription;

  constructor(
    private store: Store<State>,
    private navCtrl: NavController,
    private userProvider: UserProvider,
    private appProvider: AppProvider,
    private modalCtrl: ModalController,
    private dataSetCompletenessProvider: DataSetCompletenessProvider,
    private dataEntryFormProvider: DataEntryFormProvider,
    private settingsProvider: SettingsProvider,
    private dataValuesProvider: DataValuesProvider,
    private navParams: NavParams,
    private synchronizationProvider: SynchronizationProvider,
    private validationRulesProvider: ValidationRulesProvider,
    private offlineCompletenessProvider: OfflineCompletenessProvider,
    private networkAvailabilityProvider: NetworkAvailabilityProvider,
    private localStorageProvider: LocalStorageProvider
  ) {
    this.colorSettings$ = this.store.select(getCurrentUserColorSettings);
    this.dataEntryFormDesign = "";
    this.entryFormType = "SECTION";
    this.icons["menu"] = "assets/icon/menu.png";
    this.storageStatus = {
      online: 0,
      offline: 0,
    };
    this.dataSetsCompletenessInfo = {};
    this.isDataSetCompleted = false;
    this.isDataSetCompletenessProcessRunning = false;
    this.dataValuesObject = {};
    this.dataValuesSavingStatusClass = {};
    this.isLoading = true;
    this.validationRules = [];
    this.compulsoryDataElementOperands = [];
    this.isValidationProcessRunning = false;
  }

  ngOnInit() {
    this.loadingMessage = "Discovering current user information";
    this.entryFormParameter = this.navParams.get("parameter");
    this.isPeriodLocked = this.entryFormParameter.isPeriodLocked;
    this.userProvider.getCurrentUser().subscribe(
      (user) => {
        this.currentUser = user;
        this.settingsProvider
          .getSettingsForTheApp(user)
          .subscribe((appSettings: any) => {
            this.appSettings = appSettings;
            if (
              appSettings &&
              appSettings.entryForm &&
              appSettings.entryForm.formLayout
            ) {
              this.entryFormLayout = appSettings.entryForm.formLayout;
            } else {
              this.entryFormLayout = "listLayout";
            }
            this.discoveringDataSetInformation(
              this.entryFormParameter.dataSet.id
            );

            // Retriving Dataset Completeness From Server
            if (this.entryFormParameter) {
              const { isAvailable } =
                this.networkAvailabilityProvider.getNetWorkStatus();
              if (isAvailable) {
                this.dataSetCompletenessProvider
                  .getDataSetCompletenessInfo(
                    this.entryFormParameter.dataSet.id,
                    this.entryFormParameter.period.name,
                    this.entryFormParameter.orgUnit.id,
                    this.entryFormParameter.dataDimension,
                    this.currentUser
                  )
                  .subscribe(
                    (
                      completeDataSetRegistration: CompleteDataSetRegistration
                    ) => {
                      this.offlineCompletenessProvider
                        .savingOfflineEntryFormCompletenessOnFormOpening(
                          this.currentUser,
                          this.entryFormParameter.dataSet.id,
                          this.entryFormParameter.period.name,
                          this.entryFormParameter.orgUnit.id,
                          completeDataSetRegistration
                        )
                        .subscribe((response: CompleteDataSetRegistration) => {
                          if (response) {
                            // Implement Logic
                            console.log("Offline Completeness Saved");
                            this.isDataSetCompletedAndLocked =
                              response.completed;
                            this.isDataSetCompleted = response.completed;
                          }
                        });

                      this.setDataSetIsDataSetCompleted(
                        completeDataSetRegistration.completed,
                        this.entryFormParameter.dataSet.id,
                        this.entryFormParameter.period.name,
                        this.entryFormParameter.orgUnit.id
                      ).subscribe((response: string) => {
                        console.log(response);
                        // Implement Functionality to set the dataSetIsCompleted
                      });
                    }
                  );
              } else {
                this.appProvider.setNormalNotification(
                  `Failed to check if dataset is completed due to network issue. Please check your internet connectivity`
                );
                this.getDataSetIsDataSetCompleted(
                  this.entryFormParameter.dataSet.id,
                  this.entryFormParameter.period.name,
                  this.entryFormParameter.orgUnit.id
                ).subscribe((dataSetIsCompleted) => {
                  this.isDataSetCompletedAndLocked = dataSetIsCompleted;
                  this.isDataSetCompleted = dataSetIsCompleted;
                });
              }
            }
          });
      },
      (error) => {
        console.log(JSON.stringify(error));
        this.isLoading = false;
        this.appProvider.setNormalNotification(
          "Failed to discover current user information"
        );
      }
    );
  }

  goBack() {
    this.navCtrl.pop();
  }

  setDataSetIsDataSetCompleted(
    completed: boolean,
    dataSet: string,
    orgUnit: string,
    period: string
  ): Observable<any> {
    const localStorageCompletenessKey = _.trim(
      `${dataSet}_${orgUnit}_${period}`
    );
    return new Observable((observer) => {
      this.localStorageProvider
        .setDataOnLocalStorage(completed, localStorageCompletenessKey)
        .subscribe(
          () => {
            observer.next(
              `DataSet Completeness Info with key: <${localStorageCompletenessKey}> successfully set`
            );
            observer.complete();
          },
          (error) => {
            observer.error(error);
          }
        );
    });
  }

  getDataSetIsDataSetCompleted(
    dataSet: string,
    orgUnit: string,
    period: string
  ): Observable<boolean> {
    const localStorageCompletenessKey = _.trim(
      `${dataSet}_${orgUnit}_${period}`
    );
    return new Observable((observer) => {
      this.localStorageProvider
        .getDataOnLocalStorage(localStorageCompletenessKey)
        .subscribe(
          (dataSetCompletenessInfo: boolean) => {
            observer.next(dataSetCompletenessInfo);
            observer.complete();
          },
          (error) => {
            observer.error(error);
          }
        );
    });
  }

  discoveringDataSetInformation(dataSetId) {
    this.loadingMessage = "Discovering entry form information";
    this.dataEntryFormProvider
      .loadingDataSetInformation(dataSetId, this.currentUser)
      .subscribe(
        (dataSetInformation: any) => {
          this.dataSet = dataSetInformation.dataSet;
          this.sectionIds = dataSetInformation.sectionIds;
          this.loadingMessage = "Discovering indicators";
          this.dataEntryFormProvider
            .getEntryFormIndicators(
              dataSetInformation.indicatorIds,
              this.currentUser
            )
            .subscribe(
              (indicators: any) => {
                this.indicators = indicators;
                this.discoveringEntryForm(this.dataSet, this.sectionIds);
              },
              (error) => {
                this.isLoading = false;
                this.loadingMessage = "";
                this.appProvider.setNormalNotification(
                  "Failed to discover indicators"
                );
              }
            );
        },
        (error) => {
          this.isLoading = false;
          this.loadingMessage = "";
          this.appProvider.setNormalNotification(
            "Failed to discover entry form information"
          );
        }
      );
  }

  discoveringEntryForm(dataSet, sectionIds) {
    this.loadingMessage = "Preparing entry form";
    this.dataEntryFormProvider
      .getEntryForm(
        sectionIds,
        dataSet.id,
        dataSet.formType,
        this.appSettings,
        this.currentUser
      )
      .subscribe(
        (entryFormResponse: any) => {
          if (
            dataSet.formType == "CUSTOM" &&
            this.appSettings &&
            this.appSettings.entryForm &&
            this.appSettings.entryForm.formLayout &&
            this.appSettings.entryForm.formLayout == "customLayout"
          ) {
            this.dataEntryFormDesign = entryFormResponse.entryForm;
            this.entryFormSections = entryFormResponse.entryFormSections;
            this.entryFormType = "CUSTOM";
          } else {
            this.entryFormSections = entryFormResponse;
            this.pager["page"] = 1;
            this.pager["total"] = entryFormResponse.length;
            this.entryFormType = "SECTION";
          }
          let dataSetId = this.dataSet.id;
          let period = this.entryFormParameter.period.iso;
          let orgUnitId = this.entryFormParameter.orgUnit.id;
          let dataDimension = this.entryFormParameter.dataDimension;
          this.dataSetAttributeOptionCombo =
            this.dataValuesProvider.getDataValuesSetAttributeOptionCombo(
              dataDimension,
              this.dataSet.categoryCombo.categoryOptionCombos
            );
          this.loadingMessage = "Discovering mandatory fields";
          this.dataEntryFormProvider
            .getCompulsoryDataElementOperandsByDataSetId(
              dataSetId,
              this.currentUser
            )
            .subscribe(
              (compulsoryDataElementOperands) => {
                this.compulsoryDataElementOperands =
                  compulsoryDataElementOperands;
                this.discoveringData(
                  dataSetId,
                  period,
                  orgUnitId,
                  dataDimension
                );
              },
              (error) => {
                console.log(JSON.stringify(error));
                this.isLoading = false;
                this.loadingMessage = "";
                this.appProvider.setNormalNotification(
                  "Fail to dicover mandatory fields"
                );
              }
            );
        },
        (error) => {
          console.log(JSON.stringify(error));
          this.isLoading = false;
          this.loadingMessage = "";
          this.appProvider.setNormalNotification("Fail to prepare entry form");
        }
      );
  }

  discoveringData(dataSetId, period, orgUnitId, dataDimension) {
    this.loadingMessage = "Discovering available local data";
    this.dataValuesProvider
      .getAllEntryFormDataValuesFromStorage(
        dataSetId,
        period,
        orgUnitId,
        this.entryFormSections,
        dataDimension,
        this.currentUser
      )
      .subscribe(
        (entryFormDataValues: any) => {
          entryFormDataValues.map((dataValue: any) => {
            this.dataValuesObject[dataValue.id] = dataValue;
            dataValue.status == "synced"
              ? this.storageStatus.online++
              : this.storageStatus.offline++;
          });
          this.discoveringValidationRulesByEntryFormFields(
            this.entryFormSections,
            this.currentUser
          );
        },
        (error) => {
          this.isLoading = false;
          this.appProvider.setNormalNotification(
            "Failed to discover available local data"
          );
        }
      );
  }

  discoveringValidationRulesByEntryFormFields(
    entryFormSections: any[],
    currentUser: CurrentUser
  ) {
    this.validationRulesProvider
      .discoveringValidationRulesByEntryFormFields(
        entryFormSections,
        currentUser
      )
      .subscribe(
        (validationRules: ValidationRule[]) => {
          this.validationRules = validationRules;
          this.isLoading = false;
        },
        (error) => {
          this.isLoading = false;
          this.appProvider.setNormalNotification(
            "Failed to discover available local data"
          );
        }
      );
  }

  onValidatingDateEntry() {
    this.isValidationProcessRunning = true;
    this.validationRulesProvider
      .evaluateAndGetValidationResults(
        this.validationRules,
        this.dataValuesObject
      )
      .subscribe(
        (violatedValidationRule: any) => {
          let modal = this.modalCtrl.create("ValidationRulesResultsPage", {
            violatedValidationRule,
          });
          modal.present();
          this.isValidationProcessRunning = false;
        },
        (error) => {
          this.isValidationProcessRunning = false;
          this.appProvider.setNormalNotification(
            "Failed to evaluate validation rules"
          );
        }
      );
  }

  onDataSetCompletenessInformattionLoaded(dataSetCompletenessInfo: any) {
    const entryFormSelection = dhis2.dataEntrySelection;
    this.dataSetCompletenessProvider
      .savingEntryFormCompletenessData(
        entryFormSelection,
        dataSetCompletenessInfo,
        this.currentUser
      )
      .subscribe((dataSetCompleteness) => {
        this.dataSetsCompletenessInfo = dataSetCompleteness;
        this.isDataSetCompleted = dataSetCompleteness.completed;
        this.isDataSetCompletedAndLocked = dataSetCompleteness.completed;
      });
  }

  onMergingWithOnlineData(data: any) {
    const { dataValues, action } = data;
    if (action === "decline") {
      Object.keys(this.dataValuesObject).map((id) => {
        const dataValue = this.dataValuesObject[id];
        dataValues.push({ ...dataValue, status: "synced" });
      });
      this.appProvider.setTopNotification("Uploading offline data");
      this.synchronizationProvider
        .syncAllOfflineDataToServer(this.currentUser)
        .subscribe(
          (response) => {
            const percentage =
              response && response.percentage
                ? parseInt(response.percentage)
                : 0;
            const { importSummaries } = response;
            if (importSummaries && importSummaries.dataValues) {
              const { fail } = importSummaries.dataValues;
              if (fail == 0 && percentage === 100) {
                this.appProvider.setTopNotification(
                  "Offline data has been uploaded successfully"
                );
                this.savingDataValuesAfterResolvingConflicts(dataValues);
              } else {
                this.appProvider.setTopNotification(
                  "Failed to upload offline data"
                );
              }
            }
          },
          (error) => {
            console.log(JSON.stringify({ error }));
          }
        );
    } else {
      this.savingDataValuesAfterResolvingConflicts(dataValues);
    }
  }

  savingDataValuesAfterResolvingConflicts(dataValues: any[]) {
    this.isLoading = true;
    this.loadingMessage = "";
    let newDataValue = [];
    const dataSetId = this.dataSet.id;
    const period = this.entryFormParameter.period.iso;
    const orgUnitId = this.entryFormParameter.orgUnit.id;
    const orgUnitName = this.entryFormParameter.orgUnit.name;
    const dataDimension = this.entryFormParameter.dataDimension;
    const status = "synced";
    _.map(dataValues, (dataValue) => {
      const dataValueId = dataValue.id;
      const fieldIdArray = dataValueId.split("-");
      newDataValue.push({
        orgUnit: orgUnitName,
        dataElement: fieldIdArray[0],
        categoryOptionCombo: fieldIdArray[1],
        value: dataValue.value,
        period: this.entryFormParameter.period.name,
      });
      this.dataValuesObject[dataValueId] = dataValue;
    });
    this.dataValuesProvider
      .saveDataValues(
        newDataValue,
        dataSetId,
        period,
        orgUnitId,
        dataDimension,
        status,
        this.currentUser
      )
      .subscribe(
        () => {
          _.map(dataValues, (dataValue) => {
            this.dataValuesSavingStatusClass[dataValue.id] =
              "input-field-container-success";
            this.dataValuesObject[dataValue.id] = dataValue;
          });
          this.storageStatus.offline = 0;
          this.storageStatus.online = 0;
          _.map(_.keys(this.dataValuesObject), (key) => {
            const dataValue = this.dataValuesObject[key];
            if (dataValue.status === "synced") {
              this.storageStatus.online += 1;
            } else {
              this.storageStatus.offline += 1;
            }
          });
          this.isLoading = false;
        },
        (error) => {
          this.isLoading = false;
        }
      );
  }

  scrollEntryFormUp() {
    setTimeout(() => {
      this.content.scrollToTop(1300);
    }, 200);
  }

  openSectionList() {
    let modal = this.modalCtrl.create("DataEntrySectionSelectionPage", {
      pager: this.pager,
      sections: this.getEntryFormSections(this.entryFormSections),
    });
    modal.onDidDismiss((pager: any) => {
      if (pager && pager.page) {
        this.pager = pager;
        this.scrollEntryFormUp();
      }
    });
    modal.present();
  }

  viewUserCompletenessInformation(dataSetsCompletenessInfo) {
    let username =
      dataSetsCompletenessInfo && dataSetsCompletenessInfo.storedBy
        ? dataSetsCompletenessInfo.storedBy
        : "";
    let modal = this.modalCtrl.create("EntryFormCompletenessPage", {
      username: username,
      currentUser: this.currentUser,
    });
    modal.present();
  }

  viewEntryFormIndicators(indicators) {
    if (indicators && indicators.length > 0) {
      let modal = this.modalCtrl.create("DataEntryIndicatorsPage", {
        indicators: indicators,
        dataValuesObject: this.dataValuesObject,
        dataSet: { id: this.dataSet.id, name: this.dataSet.name },
      });
      modal.onDidDismiss(() => {});
      modal.present();
    } else {
      this.appProvider.setNormalNotification("There are no indicators to view");
    }
  }

  changePagination(page) {
    page = parseInt(page);
    if (page > 0 && page <= this.pager.total) {
      this.isLoading = true;
      this.pager.page = page;
      this.isLoading = false;
      this.scrollEntryFormUp();
    }
  }

  updateData(updateDataValue) {
    let dataValueId = updateDataValue.id;
    let dataSetId = this.dataSet.id;
    let period = this.entryFormParameter.period.iso;
    let orgUnitId = this.entryFormParameter.orgUnit.id;
    let orgUnitName = this.entryFormParameter.orgUnit.name;
    let dataDimension = this.entryFormParameter.dataDimension;
    let newDataValue = [];
    let fieldIdArray = dataValueId.split("-");
    newDataValue.push({
      orgUnit: orgUnitName,
      dataElement: fieldIdArray[0],
      categoryOptionCombo: fieldIdArray[1],
      value: updateDataValue.value,
      period: this.entryFormParameter.period.name,
    });
    this.dataValuesProvider
      .saveDataValues(
        newDataValue,
        dataSetId,
        period,
        orgUnitId,
        dataDimension,
        updateDataValue.status,
        this.currentUser
      )
      .subscribe(
        () => {
          if (
            this.dataValuesObject[dataValueId] &&
            this.dataValuesObject[dataValueId].status == "synced"
          ) {
            this.storageStatus.online--;
            this.storageStatus.offline++;
          } else if (!this.dataValuesObject[dataValueId]) {
            this.storageStatus.offline++;
          }
          this.dataValuesSavingStatusClass[dataValueId] =
            "input-field-container-success";
          this.dataValuesObject[dataValueId] = updateDataValue;

          // Update dataValue update status
          this.dataUpdateStatus = { [updateDataValue.domElementId]: "OK" };
        },
        (error) => {
          this.dataValuesSavingStatusClass[dataValueId] =
            "input-field-container-failed";

          // Update dataValue update status
          this.dataUpdateStatus = { [updateDataValue.domElementId]: "FAIL" };
        }
      );
  }

  getEntryFormSections(entryFormSections) {
    let sections = [];
    entryFormSections.forEach((entryFormSection: any) => {
      sections.push({
        id: entryFormSection.id,
        name: entryFormSection.name,
      });
    });
    return sections;
  }

  updateDataSetCompleteness() {
    const { isAvailable } = this.networkAvailabilityProvider.getNetWorkStatus();

    if (isAvailable) {
      this.content.scrollToBottom(1000);
      this.isDataSetCompletenessProcessRunning = true;
      const entryFormSelection = dhis2.dataEntrySelection;
      const period = this.entryFormParameter.period.iso;
      const orgUnitId = this.entryFormParameter.orgUnit.id;
      const dataDimension = this.entryFormParameter.dataDimension;

      if (this.isDataSetCompleted) {
        this.uploadDataValuesOnComplete(
          period,
          orgUnitId,
          dataDimension,
          this.dataSet.id,
          this.isDataSetCompleted
        ).subscribe((importResponse: ImportResponse) => {
          if (importResponse && importResponse.status === (200 || 201)) {
            const completenessResponse: CompletenessResponse = JSON.parse(
              importResponse.data
            ) as CompletenessResponse;

            if (
              completenessResponse &&
              (completenessResponse.status === "ERROR" ||
                completenessResponse.status === "CONFLICT")
            ) {
              // TODO: Implement Section In The Future If There Is A Need
              this.offlineCompletenessProvider
                .savingOfflineEntryFormCompletenessOnFormOpening(
                  this.currentUser,
                  this.entryFormParameter.dataSet.id,
                  this.entryFormParameter.period.name,
                  this.entryFormParameter.orgUnit.id,
                  {
                    period: this.entryFormParameter.period.name,
                    dataSet: this.entryFormParameter.dataSet.id,
                    organisationUnit: this.entryFormParameter.orgUnit.id,
                    attributeOptionCombo:
                      this.entryFormParameter.dataDimension.cc,
                    date: new Date().toISOString().split("T")[0],
                    storedBy: this.currentUser.username,
                    completed: this.isDataSetCompleted,
                  }
                )
                .subscribe(
                  (response: any) => {
                    if (response) {
                      // Implement Logic
                      console.log("Offline Completeness Saved");
                    }
                  },
                  (error) => {
                    this.isDataSetCompletenessProcessRunning = false;
                    console.log(JSON.stringify(error));
                    this.appProvider.setNormalNotification(
                      "Failed to un complete entry form"
                    );
                  }
                );
              this.isDataSetCompleted = false;
              this.isDataSetCompletenessProcessRunning = false;
              if (
                completenessResponse &&
                completenessResponse.conflicts &&
                completenessResponse.conflicts.length > 0
              ) {
                this.appProvider.setNormalNotification(
                  "Oops, Please respond to the following questions before uncompleting dataset"
                );
              }
            } else {
              this.offlineCompletenessProvider
                .savingOfflineEntryFormCompletenessOnFormOpening(
                  this.currentUser,
                  this.entryFormParameter.dataSet.id,
                  this.entryFormParameter.period.name,
                  this.entryFormParameter.orgUnit.id,
                  {
                    period: this.entryFormParameter.period.name,
                    dataSet: this.entryFormParameter.dataSet.id,
                    organisationUnit: this.entryFormParameter.orgUnit.id,
                    attributeOptionCombo:
                      this.entryFormParameter.dataDimension.cc,
                    date: new Date().toISOString().split("T")[0],
                    storedBy: this.currentUser.username,
                    completed: !this.isDataSetCompleted,
                  }
                )
                .subscribe(
                  (response: any) => {
                    if (response) {
                      // Implement Logic
                      console.log("Offline Completeness Saved");
                    }
                  },
                  (error) => {
                    this.isDataSetCompletenessProcessRunning = false;
                    console.log(JSON.stringify(error));
                    this.appProvider.setNormalNotification(
                      "Failed to un complete entry form"
                    );
                  }
                );
              this.offlineCompletenessProvider
                .offlneEntryFormUncompleteness(
                  entryFormSelection,
                  this.currentUser
                )
                .subscribe(
                  () => {
                    this.dataSetsCompletenessInfo = {};
                    this.isDataSetCompletenessProcessRunning = false;
                    this.isDataSetCompleted = false;
                    this.content.scrollToBottom(1000);
                  },
                  (error) => {
                    this.isDataSetCompletenessProcessRunning = false;
                    console.log(JSON.stringify(error));
                    this.appProvider.setNormalNotification(
                      "Failed to un complete entry form"
                    );
                  }
                );
              // this.offlineCompletenessProvider
              //   .offlneEntryFormCompleteness(
              //     entryFormSelection,
              //     this.currentUser
              //   )
              //   .subscribe(
              //     (dataSetCompletenessInfo: DataSetCompletenessInfo) => {
              //       this.dataSetsCompletenessInfo = dataSetCompletenessInfo;
              //       if (
              //         dataSetCompletenessInfo &&
              //         dataSetCompletenessInfo.complete
              //       ) {
              //         this.isDataSetCompleted = true;
              //         this.content.scrollToBottom(1000);
              //       }
              //       this.isDataSetCompletenessProcessRunning = false;
              //     },
              //     (error) => {
              //       this.isDataSetCompletenessProcessRunning = false;
              //       console.log(JSON.stringify(error));
              //       this.appProvider.setNormalNotification(
              //         "Failed to complete entry form"
              //       );
              //     }
              //   );
            }
          }
        });
      } else {
        const { status, violatedMandatoryFields } =
          this.dataEntryFormProvider.getViolatedCompulsoryDataElementOperands(
            this.compulsoryDataElementOperands,
            this.dataValuesObject
          );

        // @todo also checking default settings
        if (status) {
          const fieldNames = _.map(
            violatedMandatoryFields,
            (violatedMandatoryField: any) => {
              const { dimensionItem, name } = violatedMandatoryField;
              this.dataValuesSavingStatusClass[dimensionItem] =
                "input-field-container-failed";
              return name;
            }
          );

          if (violatedMandatoryFields && violatedMandatoryFields.length > 0) {
            this.navCtrl.push("CompulsoryNotificationPage", {
              compulsoryFields: violatedMandatoryFields,
            });
          }

          this.isDataSetCompletenessProcessRunning = false;
        } else {
          this.uploadDataValuesOnComplete(
            period,
            orgUnitId,
            dataDimension,
            this.dataSet.id,
            this.isDataSetCompleted
          ).subscribe((importResponse: ImportResponse) => {
            if (importResponse && importResponse.status === (200 || 201)) {
              const completenessResponse: CompletenessResponse = JSON.parse(
                importResponse.data
              ) as CompletenessResponse;

              if (
                completenessResponse &&
                (completenessResponse.status === "ERROR" ||
                  completenessResponse.status === "CONFLICT")
              ) {
                // TODO: Implement Section In The Future If There Is A Need

                this.isDataSetCompleted = false;
                this.isDataSetCompletenessProcessRunning = false;
                if (
                  completenessResponse &&
                  completenessResponse.conflicts &&
                  completenessResponse.conflicts.length > 0
                ) {
                  this.appProvider.setNormalNotification(
                    "Oops, Please respond to the following questions before completing dataset"
                  );
                }
              } else {
                this.offlineCompletenessProvider
                  .offlneEntryFormCompleteness(
                    entryFormSelection,
                    this.currentUser,
                    {
                      period: this.entryFormParameter.period.name,
                      dataSet: this.entryFormParameter.dataSet.id,
                      organisationUnit: this.entryFormParameter.orgUnit.id,
                      attributeOptionCombo:
                        this.entryFormParameter.dataDimension.cc,
                      date: new Date().toISOString().split("T")[0],
                      storedBy: this.currentUser.username,
                      completed: !this.isDataSetCompleted,
                    }
                  )
                  .subscribe(
                    (dataSetCompletenessInfo: DataSetCompletenessInfo) => {
                      this.dataSetsCompletenessInfo = dataSetCompletenessInfo;
                      if (dataSetCompletenessInfo) {
                        this.isDataSetCompletedAndLocked =
                          dataSetCompletenessInfo.completed;
                        this.isDataSetCompleted =
                          dataSetCompletenessInfo.completed;
                        this.content.scrollToBottom(1000);
                        this.isDataSetCompletenessProcessRunning = false;
                      }
                    },
                    (error) => {
                      this.isDataSetCompletenessProcessRunning = false;
                      console.log(JSON.stringify(error));
                      this.appProvider.setNormalNotification(
                        "Failed to complete entry form"
                      );
                    }
                  );
              }
            }
          });
        }
      }
    } else {
      this.isDataSetCompletenessProcessRunning = false;
      this.appProvider.setNormalNotification(
        `Failed to complete/un-complete dataset due to network error. Please check your internet connectivity`
      );
    }
  }

  uploadDataValuesOnComplete(
    period: string,
    orgUnitId: string,
    dataDimension: any,
    dataSetId: string,
    completeStatus: boolean
  ) {
    return new Observable((observer) => {
      let sqliteDataValues: SQLITEDataValue[] = [];

      this.dataValuesProvider
        .getAllEntryFormDataValuesFromStorage(
          dataSetId,
          period,
          orgUnitId,
          this.entryFormSections,
          dataDimension,
          this.currentUser
        )
        .pipe(take(1))
        .subscribe((offlineSQLITEDataValues: OfflineSQLITEDataValue[]) => {
          if (offlineSQLITEDataValues && offlineSQLITEDataValues.length > 0) {
            const offlineSQLITEDataValueObject: {
              [key: string]: OfflineSQLITEDataValue;
            } = _.keyBy(
              _.filter(
                offlineSQLITEDataValues,
                (offlineSQLITEDataValue: OfflineSQLITEDataValue) =>
                  offlineSQLITEDataValue.status === "not-synced"
              ),
              "id"
            );

            const processedDataValues = _.map(
              _.keys(offlineSQLITEDataValueObject),
              (fieldId: string) => {
                const fieldIdArray = fieldId.split("-");
                return {
                  de: fieldIdArray[0],
                  co: fieldIdArray[1],
                  pe: period,
                  ou: orgUnitId,
                  cc: dataDimension.cc,
                  cp: dataDimension.cp,
                  value: offlineSQLITEDataValueObject[fieldId].value,
                };
              }
            );

            if (processedDataValues) {
              const offlineCompleteDataValuePayload: OfflineCompleteDataValuePayload =
                getStandardDataValuePayload(
                  processedDataValues,
                  orgUnitId,
                  dataSetId,
                  period
                );

              // ! Deprecated Approach
              let formattedDataValues =
                this.dataValuesProvider.getFormattedDataValueForUpload(
                  sqliteDataValues
                );

              const completenessPayload: CompletenessPayload = {
                completeDataSetRegistrations: [
                  {
                    dataSet: dataSetId,
                    period: period,
                    organisationUnit: orgUnitId,
                    completed: !completeStatus,
                  },
                ],
              };

              this.dataValuesProvider
                .uploadDataValues(
                  true,
                  formattedDataValues,
                  processedDataValues,
                  this.currentUser,
                  offlineCompleteDataValuePayload,
                  completenessPayload,
                  completeStatus
                )
                .subscribe(
                  ({ importSummaries, importResponse, dbCompleteResponse }) => {
                    const shortImportSummary: ShortImportSummary =
                      importSummaries;
                    const mImportResponse: ImportResponse = importResponse;

                    if (
                      !mImportResponse &&
                      shortImportSummary.fail > 0 &&
                      shortImportSummary.errorMessages.length > 0
                    ) {
                      this.navCtrl.push("ConflictNotificationPage", {
                        conflicts:
                          mImportResponse &&
                          mImportResponse.data &&
                          JSON.parse(mImportResponse.data) &&
                          JSON.parse(mImportResponse.data).conflicts
                            ? JSON.parse(mImportResponse.data).conflicts
                            : [],
                      });
                    } else {
                      if (
                        mImportResponse &&
                        mImportResponse.status === (200 || 201)
                      ) {
                        if (dbCompleteResponse) {
                          // ToDO: Improve The Approach
                          if (
                            dbCompleteResponse &&
                            dbCompleteResponse.listGrid &&
                            dbCompleteResponse.listGrid.rows &&
                            dbCompleteResponse.listGrid.rows.length > 0 &&
                            _.toLower(
                              dbCompleteResponse.listGrid.rows[0][0]
                            ) === "success"
                          ) {
                            this.isDataSetCompletedAndLocked = !completeStatus;
                            this.storageStatus.offline = 0;
                            this.storageStatus.online +=
                              sqliteDataValues.length;
                            this.appProvider.setNormalNotification(
                              `Data set ${
                                !completeStatus ? "COMPLETED" : "UN-COMPLETED"
                              } successfully`
                            );
                            console.log("Success uploading data");
                            observer.next(mImportResponse);
                            observer.complete();
                          } else {
                            const completenessResponse: CompletenessResponse =
                              JSON.parse(
                                mImportResponse.data
                              ) as CompletenessResponse;
                            if (
                              completenessResponse.conflicts &&
                              completenessResponse.conflicts.length > 0
                            ) {
                              this.navCtrl.push("ConflictNotificationPage", {
                                conflicts: completenessResponse.conflicts,
                              });
                            }
                            observer.next(mImportResponse);
                            observer.complete();
                          }
                        } else {
                          const completenessResponse: CompletenessResponse =
                            JSON.parse(
                              mImportResponse.data
                            ) as CompletenessResponse;

                          if (
                            completenessResponse &&
                            completenessResponse.status === "ERROR"
                          ) {
                            if (
                              completenessResponse.conflicts &&
                              completenessResponse.conflicts.length > 0
                            ) {
                              this.navCtrl.push("ConflictNotificationPage", {
                                conflicts: completenessResponse.conflicts,
                              });
                            }
                            observer.next(mImportResponse);
                            observer.complete();
                          } else {
                            this.isDataSetCompletedAndLocked = !completeStatus;
                            this.storageStatus.offline = 0;
                            this.storageStatus.online +=
                              sqliteDataValues.length;
                            this.appProvider.setNormalNotification(
                              `Data set ${
                                !completeStatus ? "COMPLETED" : "UN-COMPLETED"
                              } successfully`
                            );
                            console.log("Success uploading data");
                            observer.next(mImportResponse);
                            observer.complete();
                          }
                        }
                      }
                    }
                  },
                  (error) => {
                    this.appProvider.setNormalNotification(
                      "Error while completing Dataset"
                    );

                    console.log("Failed to upload data");
                    observer.next(error);
                    observer.complete();
                  }
                );
            }
          }
        });

      // if (this.dataValuesObject) {
      //   Object.keys(this.dataValuesObject).map((fieldId: any) => {
      //     const fieldIdArray = fieldId.split("-");
      //     if (this.dataValuesObject[fieldId]) {
      //       let dataValue = this.dataValuesObject[fieldId];

      //       sqliteDataValues.push({
      //         de: fieldIdArray[0],
      //         co: fieldIdArray[1],
      //         pe: period,
      //         ou: orgUnitId,
      //         cc: dataDimension.cc,
      //         cp: dataDimension.cp,
      //         value: dataValue.value,
      //       });
      //     }
      //   });
      // }

      // if (sqliteDataValues.length > 0) {
      //   this.loadingMessage = "Uploading data";

      //   const offlineCompleteDataValuePayload: OfflineCompleteDataValuePayload =
      //     getStandardDataValuePayload(
      //       sqliteDataValues,
      //       orgUnitId,
      //       dataSetId,
      //       period
      //     );

      //   // ! Deprecated Approach
      //   let formattedDataValues =
      //     this.dataValuesProvider.getFormattedDataValueForUpload(
      //       sqliteDataValues
      //     );

      //   this.dataValuesProvider
      //     .uploadDataValues(
      //       formattedDataValues,
      //       sqliteDataValues,
      //       this.currentUser
      //     )
      //     .subscribe(
      //       () => {
      //         this.storageStatus.offline = 0;
      //         this.storageStatus.online += sqliteDataValues.length;
      //         console.log("Success uploading data");
      //         this.appProvider.setNormalNotification(
      //           "Data set completed successfully"
      //         );
      //       },
      //       (error) => {
      //         this.appProvider.setNormalNotification(
      //           "Error while completing Dataset"
      //         );
      //         console.log("Failed to upload data");
      //       }
      //     );
      // }
    });
  }

  trackByFn(index, item) {
    return item && item.id ? item.id : index;
  }
}
