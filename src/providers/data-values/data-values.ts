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
import { Injectable } from "@angular/core";
import { HttpClientProvider } from "../http-client/http-client";
import { SqlLiteProvider } from "../sql-lite/sql-lite";
import { NetworkAvailabilityProvider } from "../network-availability/network-availability";
import { Observable } from "rxjs/Observable";
import * as _ from "lodash";
import { CurrentUser } from "../../models";
import { of } from "rxjs/observable/of";
import { concatMap } from "rxjs/operators";
import { defer } from "rxjs/observable/defer";
import { Subscription } from "rxjs";
import {
  ImportResponse,
  ImportSummary,
} from "../../models/import-response.model";
import {
  OfflineCompleteDataValuePayload,
  SQLITEDataValue,
  SynchronizationDataValuePayload,
} from "../../models/data-value.model";
import { AppProvider } from "../app/app";
import {
  CompletenessPayload,
  CompletenessResponse,
} from "../../models/completeness.model";
import { NavController } from "ionic-angular";

@Injectable()
export class DataValuesProvider {
  resourceName: string;

  constructor(
    private httpClient: HttpClientProvider,
    private sqlLite: SqlLiteProvider,
    private network: NetworkAvailabilityProvider,
    private appProvider: AppProvider
  ) {
    this.resourceName = "dataValues";
  }

  getDataValueSetFromServer(
    dataSetId: string,
    period: string,
    orgUnitId: string,
    attributeOptionCombo: string,
    currentUser: CurrentUser
  ): Observable<any> {
    let parameter =
      "dataSet=" + dataSetId + "&period=" + period + "&orgUnit=" + orgUnitId;
    let networkStatus = this.network.getNetWorkStatus();
    return new Observable((observer) => {
      if (networkStatus.isAvailable) {
        this.httpClient
          .get("/api/dataValueSets.json?" + parameter, true, currentUser)
          .subscribe(
            (response: any) => {
              const dataValues =
                this.getFilteredDataValuesByDataSetAttributeOptionCombo(
                  response,
                  attributeOptionCombo
                );
              observer.next(dataValues);
              observer.complete();
            },
            (error) => {
              observer.error(error);
            }
          );
      } else {
        observer.next([]);
        observer.complete();
      }
    });
  }

  getDataValuesByStatus(
    status: string,
    currentUser: CurrentUser,
    isUploading: boolean
  ): Observable<any> {
    let attributeArray = [];
    attributeArray.push(status);
    return new Observable((observer) => {
      this.sqlLite
        .getDataFromTableByAttributes(
          this.resourceName,
          "syncStatus",
          attributeArray,
          currentUser.currentDatabase,
          isUploading
        )
        .subscribe(
          (dataValues: any) => {
            if (isUploading) {
              observer.next({
                dataValues: dataValues.data ? dataValues.data : [],
                dataValuesToUpload: dataValues.dataUpload
                  ? dataValues.dataUpload
                  : [],
              });
              observer.complete();
            } else {
              observer.next(dataValues);
              observer.complete();
            }
          },
          (error) => {
            observer.error(error);
          }
        );
    });
  }

  getFormattedDataValueForUpload(dataValues: any[]) {
    return _.flatMapDeep(
      _.map(dataValues, (dataValue) => {
        const { de, pe, ou, co, cp, cc } = dataValue;
        let value = dataValue.value;
        let formParameter = `de=${de}&pe=${pe}&ou=${ou}&co=${co}`;
        if (isNaN(cp) && cp != "") {
          formParameter += `&cc=${cc}&cp=${cp}`;
        }
        if (!isNaN(value)) {
          if (new Number(value).toString() === "0") {
            value = "";
          }
        }
        formParameter += `&value=${value}`;
        return formParameter;
      })
    );
  }

  uploadDataValues(
    isCompleting: boolean,
    formattedDataValues: string[],
    sqliteDataValues: SQLITEDataValue[],
    currentUser: CurrentUser,
    synchronizationDataValuePayload?:
      | SynchronizationDataValuePayload
      | OfflineCompleteDataValuePayload,
    completenessPayload?: CompletenessPayload
  ): Observable<any> {
    let syncedDataValues = [];
    let importSummaries = {
      success: 0,
      fail: 0,
      errorMessages: [],
    };

    if (isCompleting) {
      return new Observable((observer) => {
        if (sqliteDataValues && synchronizationDataValuePayload) {
          const url = `/api/dataValueSets.json?dataElementIdScheme=uid&orgUnitIdScheme=uid&importStrategy=CREATE_AND_UPDATE`;
          const completenessURL = `/api/completeDataSetRegistrations`;

          let message = "";
          const dataValueSetsSubscription$: Subscription = this.httpClient
            .post(url, synchronizationDataValuePayload, currentUser)
            .subscribe((importResponse: ImportResponse) => {
              if (importResponse && importResponse.status === (200 || 201)) {
                const importSummary: ImportSummary = JSON.parse(
                  importResponse.data
                ) as ImportSummary;

                // Success Count
                importSummaries.success =
                  importSummaries.success +
                  +importSummary.importCount.imported +
                  +importSummary.importCount.updated;

                // Failure Count
                importSummaries.fail =
                  importSummaries.fail + +importSummary.importCount.ignored;

                importSummaries.errorMessages = [
                  ...importSummaries.errorMessages,
                  ...importSummary.conflicts,
                ];

                if (
                  importSummary &&
                  importSummary.importCount &&
                  importSummary.importCount.ignored === 0
                ) {
                  const processedDataValues: SQLITEDataValue[] = _.map(
                    sqliteDataValues,
                    (sqliteDataValue: SQLITEDataValue) => {
                      return {
                        ...sqliteDataValue,
                        value: sqliteDataValue.value,
                        syncStatus: "synced",
                      };
                    }
                  );
                  this.sqlLite
                    .insertBulkDataOnTable(
                      this.resourceName,
                      processedDataValues,
                      currentUser.currentDatabase
                    )
                    .subscribe(
                      () => {
                        const completenessResponse: CompletenessResponse =
                          JSON.parse(
                            importResponse.data
                          ) as CompletenessResponse;
                        if (
                          completenessResponse &&
                          completenessResponse.importCount &&
                          completenessResponse.importCount.ignored > 0
                        ) {
                          observer.next({
                            importSummaries,
                            completenessResponse,
                          });
                          observer.complete();
                        } else {
                          const completenessSubscription$: Subscription =
                            this.httpClient
                              .post(
                                completenessURL,
                                completenessPayload,
                                currentUser
                              )
                              .subscribe(
                                (importResponse: ImportResponse) => {
                                  if (
                                    importResponse &&
                                    importResponse.status === (200 || 201)
                                  ) {
                                    if (
                                      completenessResponse &&
                                      completenessResponse.status === "SUCCESS"
                                    ) {
                                      if (
                                        importSummaries &&
                                        importSummaries.fail > 0
                                      ) {
                                        message = `${importSummaries.success} response(s) synced successfully, ${importSummaries.fail} failed`;
                                        this.appProvider.setTopNotification(
                                          message
                                        );
                                      } else {
                                        if (
                                          importSummaries &&
                                          importSummaries.success &&
                                          importSummaries.success > 0
                                        ) {
                                          message = `${importSummaries.success} response(s) synced successfully`;
                                          this.appProvider.setTopNotification(
                                            message
                                          );
                                        }
                                      }
                                      observer.next({
                                        importSummaries,
                                        importResponse,
                                      });
                                      observer.complete();
                                      if (dataValueSetsSubscription$) {
                                        dataValueSetsSubscription$.unsubscribe();
                                      }
                                    } else if (
                                      completenessResponse &&
                                      completenessResponse.status === "ERROR"
                                    ) {
                                      if (
                                        completenessResponse.conflicts &&
                                        completenessResponse.conflicts.length >
                                          0
                                      ) {
                                        observer.next({
                                          importSummaries,
                                          importResponse,
                                        });
                                        observer.complete();
                                      } else {
                                        observer.next({
                                          importSummaries,
                                          importResponse,
                                        });
                                        observer.complete();
                                        this.appProvider.setNormalNotification(
                                          "Error on Completing Dataset"
                                        );
                                      }
                                    } else {
                                      this.appProvider.setNormalNotification(
                                        "Error on Completing Dataset"
                                      );
                                    }
                                  } else {
                                    observer.next({
                                      importSummaries,
                                      importResponse,
                                    });
                                    observer.complete();

                                    if (completenessSubscription$) {
                                      completenessSubscription$.unsubscribe();
                                    }
                                  }
                                },
                                (error) => {
                                  if (error) {
                                    this.appProvider.setNormalNotification(
                                      "Error on Completing Dataset"
                                    );
                                  }
                                }
                              );
                        }
                      },
                      (error) => {
                        observer.error(error);
                      }
                    );
                } else {
                  observer.next({ importSummaries, importResponse: null });
                  observer.complete();
                }
              } else {
                observer.next({ importSummaries, importResponse: null });
                observer.complete();

                if (dataValueSetsSubscription$) {
                  dataValueSetsSubscription$.unsubscribe();
                }
              }
            });
        } else {
          observer.next();
          observer.complete();
        }
      });
    } else {
      return new Observable((observer) => {
        if (
          sqliteDataValues &&
          synchronizationDataValuePayload &&
          synchronizationDataValuePayload.dataValues &&
          synchronizationDataValuePayload.dataValues.length > 0
        ) {
          const url = `/api/dataValueSets`;
          let message = "";
          const dataValueSetsSubscription$: Subscription = this.httpClient
            .post(url, synchronizationDataValuePayload, currentUser)
            .subscribe((importResponse: ImportResponse) => {
              if (importResponse && importResponse.status === (200 || 201)) {
                const importSummary: ImportSummary = JSON.parse(
                  importResponse.data
                ) as ImportSummary;

                // Success Count
                importSummaries.success =
                  importSummaries.success +
                  +importSummary.importCount.imported +
                  +importSummary.importCount.updated;

                // Failure Count
                importSummaries.fail =
                  importSummaries.fail + +importSummary.importCount.ignored;

                importSummaries.errorMessages = [
                  ...importSummaries.errorMessages,
                  ...importSummary.conflicts,
                ];

                if (
                  importSummary &&
                  importSummary.importCount &&
                  importSummary.importCount.ignored === 0
                ) {
                  const processedDataValues: SQLITEDataValue[] = _.map(
                    sqliteDataValues,
                    (sqliteDataValue: SQLITEDataValue) => {
                      return {
                        ...sqliteDataValue,
                        syncStatus: "synced",
                      };
                    }
                  );

                  if (processedDataValues && processedDataValues.length > 0) {
                    this.sqlLite
                      .insertBulkDataOnTable(
                        this.resourceName,
                        processedDataValues,
                        currentUser.currentDatabase
                      )
                      .subscribe(
                        () => {
                          if (importSummaries && importSummaries.fail > 0) {
                            message = `${importSummaries.success} response(s) synced successfully, ${importSummaries.fail} failed`;
                            this.appProvider.setTopNotification(message);
                          } else {
                            // message = `${importSummaries.success} response(s) synced successfully`;
                            // this.appProvider.setTopNotification(message);
                            if (
                              importSummaries &&
                              importSummaries.success &&
                              importSummaries.success > 0
                            ) {
                              message = `${importSummaries.success} response(s) synced successfully`;
                              this.appProvider.setTopNotification(message);
                            }
                          }
                          observer.next(importSummaries);
                          observer.complete();
                          if (dataValueSetsSubscription$) {
                            dataValueSetsSubscription$.unsubscribe();
                          }
                        },
                        (error) => {
                          observer.error(error);
                        }
                      );
                  }
                } else {
                  if (importSummary.importCount.ignored > 0) {
                    message = `${importSummaries.success} response(s) synced successfully, ${importSummaries.fail} failed`;
                    this.appProvider.setTopNotification(message);
                  }
                  observer.next(importSummaries);
                  observer.complete();
                }
              } else {
                observer.next(importResponse);
                observer.complete();

                if (dataValueSetsSubscription$) {
                  dataValueSetsSubscription$.unsubscribe();
                }
              }
            });
        } else {
          observer.next();
          observer.complete();
        }
      });
    }

    // return new Observable((observer) => {
    //   formattedDataValues.forEach((formattedDataValue: any, index: any) => {
    //     const url = `/api/dataValues?${formattedDataValue}`;
    //     const dataValuesSubscriptios$: Subscription = this.httpClient
    //       .post(url, {}, currentUser)
    //       .subscribe(
    //         (status) => {
    //           if (dataValuesSubscriptios$) {
    //             dataValuesSubscriptios$.unsubscribe();
    //           }
    //           let syncedDataValue = sqliteDataValues[index];
    //           importSummaries.success++;
    //           syncedDataValue["syncStatus"] = "synced";
    //           syncedDataValues.push(syncedDataValue);
    //           if (
    //             formattedDataValues.length ==
    //             importSummaries.success + importSummaries.fail
    //           ) {
    //             if (syncedDataValues.length > 0) {
    //               this.sqlLite
    //                 .insertBulkDataOnTable(
    //                   this.resourceName,
    //                   syncedDataValues,
    //                   currentUser.currentDatabase
    //                 )
    //                 .subscribe(
    //                   () => {
    //                     observer.next(importSummaries);
    //                     observer.complete();
    //                   },
    //                   (error) => {
    //                     observer.error(error);
    //                   }
    //                 );
    //             } else {
    //               observer.next(importSummaries);
    //               observer.complete();
    //             }
    //           }
    //         },
    //         (error) => {
    //           importSummaries.fail++;
    //           if (importSummaries.errorMessages.indexOf(error) == -1) {
    //             importSummaries.errorMessages.push(error.error);
    //           }
    //           if (
    //             formattedDataValues.length ==
    //             importSummaries.success + importSummaries.fail
    //           ) {
    //             if (syncedDataValues.length > 0) {
    //               this.sqlLite
    //                 .insertBulkDataOnTable(
    //                   this.resourceName,
    //                   syncedDataValues,
    //                   currentUser.currentDatabase
    //                 )
    //                 .subscribe(
    //                   () => {
    //                     observer.next(importSummaries);
    //                     observer.complete();
    //                   },
    //                   (error) => {
    //                     observer.error(error);
    //                   }
    //                 );
    //             } else {
    //               observer.next(importSummaries);
    //               observer.complete();
    //             }
    //           }
    //         }
    //       );
    //   });
    // });
  }

  // ToDo: Improve loading local data during data upload and during data entry form opening
  getAllEntryFormDataValuesFromStorage(
    dataSetId: string,
    period: string,
    orgUnitId: string,
    entryFormSections: any[],
    dataDimension: any,
    currentUser: CurrentUser
  ): Observable<any> {
    let entryFormDataValuesFromStorage = [];
    const ids = _.flatMapDeep(
      _.map(entryFormSections, (section: any) => {
        const { dataElements } = section;
        return _.map(dataElements, (dataElement) => {
          const { categoryCombo } = dataElement;
          const { categoryOptionCombos } = categoryCombo;
          return _.map(categoryOptionCombos, (categoryOptionCombo) => {
            const id = `${dataSetId}-${dataElement.id}-${categoryOptionCombo.id}-${period}-${orgUnitId}`;
            return id;
          });
        });
      })
    );
    return new Observable((observer) => {
      this.sqlLite
        .getDataFromTableByAttributes(
          this.resourceName,
          "id",
          ids,
          currentUser.currentDatabase,
          false
        )
        .subscribe(
          (dataValues: any) => {
            dataValues.map((dataValue: any) => {
              if (
                (dataDimension.cp === dataValue.cp ||
                  dataValue.cp === "" ||
                  !isNaN(dataValue.cp)) &&
                dataDimension.cc === dataValue.cc
              ) {
                entryFormDataValuesFromStorage.push({
                  id: dataValue.de + "-" + dataValue.co,
                  value: dataValue.value,
                  status: dataValue.syncStatus,
                });
              }
            });
            observer.next(entryFormDataValuesFromStorage);
            observer.complete();
          },
          (error) => {
            observer.error(error);
          }
        );
    });
  }

  getDataValuesSetAttributeOptionCombo(
    dataDimension: any,
    categoryOptionCombos: any
  ) {
    let attributeOptionCombo = "";
    if (dataDimension && dataDimension.cp && dataDimension.cp != "") {
      let categoriesOptionsArray = dataDimension.cp.split(";");
      for (let i = 0; i < categoryOptionCombos.length; i++) {
        let hasAttributeOptionCombo = true;
        let categoryOptionCombo = categoryOptionCombos[i];
        categoryOptionCombo.categoryOptions.map((categoryOption: any) => {
          if (categoriesOptionsArray.indexOf(categoryOption.id) === -1) {
            hasAttributeOptionCombo = false;
          }
        });
        if (hasAttributeOptionCombo) {
          attributeOptionCombo = categoryOptionCombo.id;
          break;
        }
      }
    } else {
      attributeOptionCombo = categoryOptionCombos[0].id;
    }
    return attributeOptionCombo;
  }

  getFilteredDataValuesByDataSetAttributeOptionCombo(
    dataValuesResponse: any,
    attributeOptionCombo: string
  ) {
    const dataValues =
      dataValuesResponse && dataValuesResponse.dataValues
        ? dataValuesResponse.dataValues
        : [];
    return _.flatMap(
      _.map(
        _.filter(dataValues, (dataValue: any) => {
          return (
            dataValue && dataValue.attributeOptionCombo === attributeOptionCombo
          );
        }),
        (dataValue: any) => {
          const { categoryOptionCombo, dataElement, value } = dataValue;
          return { categoryOptionCombo, dataElement, value };
        }
      )
    );
  }

  saveDataValues(
    dataValues: any[],
    dataSetId: string,
    period: string,
    orgUnitId: string,
    dataDimension: any,
    syncStatus: string,
    currentUser: CurrentUser
  ): Observable<any> {
    return new Observable((observer) => {
      if (dataValues.length > 0) {
        const bulkData = _.map(dataValues, (dataValue) => {
          const id = `${dataSetId}-${dataValue.dataElement}-${dataValue.categoryOptionCombo}-${period}-${orgUnitId}`;
          return {
            id,
            de: dataValue.dataElement,
            co: dataValue.categoryOptionCombo,
            pe: period,
            ou: orgUnitId,
            cc: dataDimension.cc,
            cp: dataDimension.cp,
            value: dataValue.value,
            syncStatus: syncStatus,
            dataSetId: dataSetId,
            period: dataValue.period,
            orgUnit: dataValue.orgUnit,
          };
        });
        this.sqlLite
          .insertBulkDataOnTable(
            this.resourceName,
            bulkData,
            currentUser.currentDatabase
          )
          .subscribe(
            () => {
              observer.next();
              observer.complete();
            },
            (error) => {
              observer.error(error);
            }
          );
      } else {
        observer.next();
        observer.complete();
      }
    });
  }

  deleteDataValueByIds(
    dataValueIds: string[],
    currentUser: CurrentUser
  ): Observable<any> {
    let successCount = 0;
    let failCount = 0;
    return new Observable((observer) => {
      for (let dataValueId of dataValueIds) {
        this.sqlLite
          .deleteFromTableByAttribute(
            this.resourceName,
            "id",
            dataValueId,
            currentUser.currentDatabase
          )
          .subscribe(
            () => {
              successCount = successCount + 1;
              if (successCount + failCount == dataValueIds.length) {
                observer.next();
                observer.complete();
              }
            },
            (error) => {
              failCount = failCount + 1;
              if (successCount + failCount == dataValueIds.length) {
                observer.next();
                observer.complete();
              }
            }
          );
      }
    });
  }

  getAllDataValues(currentUser: CurrentUser): Observable<any> {
    return new Observable((observer) => {
      this.sqlLite
        .getAllDataFromTable(this.resourceName, currentUser.currentDatabase)
        .subscribe(
          (dataValues: any) => {
            observer.next(dataValues);
            observer.complete();
          },
          (error) => {
            observer.error(error);
          }
        );
    });
  }

  deleteAllDataValues(currentUser): Observable<any> {
    return new Observable((observer) => {
      this.sqlLite
        .dropTable(this.resourceName, currentUser.currentDatabase)
        .subscribe(
          () => {
            observer.next();
            observer.complete();
          },
          (error) => {
            observer.error(error);
          }
        );
    });
  }
}
