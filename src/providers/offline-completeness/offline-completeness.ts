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
import { Observable } from "rxjs/Observable";
import * as _ from "lodash";
import { CurrentUser } from "../../models";
import { SqlLiteProvider } from "../sql-lite/sql-lite";

@Injectable()
export class OfflineCompletenessProvider {
  constructor(private sqlLite: SqlLiteProvider) {}

  getOfflineCompletenessesByIdAndStatus(
    id: string,
    status: string,
    currentUser: CurrentUser
  ): Observable<any> {
    const tableName = "offlineCompleteness";
    return new Observable((observer) => {
      const query = `SELECT * FROM ${tableName} WHERE id = '${id}' AND status = '${status}'`;
      this.sqlLite
        .getByUsingQuery(query, tableName, currentUser.currentDatabase)
        .subscribe(
          (data) => {
            observer.next(data);
            observer.complete();
          },
          (error) => {
            observer.error(error);
          }
        );
    });
  }

  getOfflineCompletenessesByType(
    type: string,
    currentUser: CurrentUser
  ): Observable<any> {
    const tableName = "offlineCompleteness";
    // ToDo: Update querying strategy by limiting number of data to be queried to optimized device performance
    // ToDo: when the number of items in the local database grow exponentially.
    return new Observable((observer) => {
      const query = `SELECT * FROM ${tableName} WHERE type  = '${type}'`;
      this.sqlLite
        .getByUsingQuery(query, tableName, currentUser.currentDatabase)
        .subscribe(
          (data) => {
            observer.next(data);
            observer.complete();
          },
          (error) => {
            observer.error(error);
          }
        );
    });
  }

  getOfflineCompletenessesByIds(
    ids: string[],
    currentUser: CurrentUser
  ): Observable<any> {
    const tableName = "offlineCompleteness";
    return new Observable((observer) => {
      this.sqlLite
        .getDataFromTableByAttributes(
          tableName,
          "id",
          ids,
          currentUser.currentDatabase,
          false
        )
        .subscribe(
          (data) => {
            observer.next(data);
            observer.complete();
          },
          (error) => {
            observer.error(error);
          }
        );
    });
  }

  deleteOfflineCompletenessesByIds(
    ids: string[],
    currentUser: CurrentUser
  ): Observable<any> {
    const tableName = "offlineCompleteness";
    return new Observable((observer) => {
      this.sqlLite
        .deleteFromTableByAttribute(
          tableName,
          "id",
          ids,
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
    });
  }

  savingOfflineCompleteness(
    data: any,
    currentUser: CurrentUser
  ): Observable<any> {
    const tableName = "offlineCompleteness";
    return new Observable((observer) => {
      this.sqlLite
        .insertBulkDataOnTable(tableName, data, currentUser.currentDatabase)
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

  offlineEventCompleteness(
    eventId: string,
    currentUser: CurrentUser
  ): Observable<any> {
    const id = eventId;
    const isDeleted = false;
    const type = "event";
    const status = "not-sync";
    const completedBy = currentUser.username;
    const completedDate = new Date().toISOString().split("T")[0];
    return new Observable((observer) => {
      this.savingOfflineCompleteness(
        [{ id, eventId, status, isDeleted, type, completedBy, completedDate }],
        currentUser
      ).subscribe(
        () => {
          observer.next({ completedBy, completedDate });
          observer.complete();
        },
        (error) => {
          observer.error(error);
        }
      );
    });
  }

  offlineEventUncompleteness(
    eventIds: string[],
    currentUser: CurrentUser
  ): Observable<any> {
    const isDeleted = true;
    const status = "not-sync";
    const completedBy = "";
    const completedDate = "";
    return new Observable((observer) => {
      this.getOfflineCompletenessesByIds(eventIds, currentUser).subscribe(
        (data: any) => {
          if (data && data.length > 0) {
            const comletenessData = _.map(data, (dataObj) => {
              return {
                ...dataObj,
                isDeleted,
                status,
                completedBy,
                completedDate,
              };
            });
            this.savingOfflineCompleteness(
              comletenessData,
              currentUser
            ).subscribe(
              () => {
                observer.next();
                observer.complete();
              },
              (error) => {
                observer.error(error);
              }
            );
          } else {
            const message = `Completeness info  has not found`;
            observer.error(message);
          }
        },
        (error) => {
          observer.error(error);
        }
      );
    });
  }

  offlneEntryFormCompleteness(
    entryFormSelection: any,
    currentUser: CurrentUser,
    dataSetCompletenessInfo?: any
  ): Observable<any> {
    const { selectedOrgUnit, selectedDataSet, selectedPeriod, dataDimension } =
      entryFormSelection;
    const dataSetId = selectedDataSet.id;
    const periodId = selectedPeriod.iso;
    const organisationUnitId = selectedOrgUnit.id;
    const isDeleted = false;
    const type = "aggregate";
    const status = "not-sync";
    const completedBy =
      dataSetCompletenessInfo && dataSetCompletenessInfo.storedBy
        ? dataSetCompletenessInfo.storedBy
        : currentUser.username;
    const completedDate =
      dataSetCompletenessInfo && dataSetCompletenessInfo.date
        ? dataSetCompletenessInfo.date
        : new Date().toISOString().split("T")[0];
    const id = this.getEntryFormConpletenessDataId(entryFormSelection);
    return new Observable((observer) => {
      console.log(
        "MAMA NDOGO SAVING ENTRY FORM COMPLETENESS OFFLINE COMPLETENESS:::",
        JSON.stringify("SAVING ON FORM OPENING")
      );
      this.savingOfflineCompleteness(
        [
          {
            id,
            dataDimension,
            periodId,
            dataSetId,
            organisationUnitId,
            status,
            isDeleted,
            type,
            completedBy,
            completedDate,
          },
        ],
        currentUser
      ).subscribe(
        () => {
          observer.next({
            storedBy: completedBy,
            date: completedDate,
            complete: true,
          });
          observer.complete();
        },
        (error) => {
          observer.error(error);
        }
      );
    });
  }

  offlneEntryFormUncompleteness(
    entryFormSelection: any,
    currentUser: CurrentUser
  ): Observable<any> {
    return new Observable((observer) => {
      const id = this.getEntryFormConpletenessDataId(entryFormSelection);
      this.getOfflineCompletenessesByIds([id], currentUser).subscribe(
        (data: any) => {
          if (data && data.length > 0) {
            const comletenessData = data[0];
            const isDeleted = true;
            const status = "not-sync";
            const completedBy = "";
            const completedDate = "";
            this.savingOfflineCompleteness(
              [
                {
                  ...comletenessData,
                  isDeleted,
                  status,
                  completedBy,
                  completedDate,
                },
              ],
              currentUser
            ).subscribe(
              () => {
                observer.next();
                observer.complete();
              },
              (error) => {
                observer.error(error);
              }
            );
          } else {
            const message = `Completeness info has not found`;
            observer.error(message);
          }
        },
        (error) => {
          observer.error(error);
        }
      );
    });
  }

  getEntryFormConpletenessDataId(entryFormSelection: any): string {
    const { selectedOrgUnit, selectedDataSet, selectedPeriod, dataDimension } =
      entryFormSelection;
    const { cc, cp } = dataDimension;
    const dataSetId = selectedDataSet.id;
    const periodId = selectedPeriod.iso;
    const organisationUnitId = selectedOrgUnit.id;
    let idArray = [dataSetId, periodId, organisationUnitId];
    if (cp !== "") {
      idArray = [...idArray, cc, cp];
    }
    return idArray.join("-");
  }
}
