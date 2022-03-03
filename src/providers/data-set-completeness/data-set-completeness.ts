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
import { Observable } from "rxjs/Observable";
import * as _ from "lodash";
import { CurrentUser } from "../../models";
import { OfflineCompletenessProvider } from "../offline-completeness/offline-completeness";
import {
  CompleteDataSetRegistration,
  DataSetRegistrationPayload,
} from "../../models/completeness.model";

@Injectable()
export class DataSetCompletenessProvider {
  constructor(
    private httpClient: HttpClientProvider,
    private offlineCompletenessProvider: OfflineCompletenessProvider
  ) {}

  savingEntryFormCompletenessData(
    entryFormSelection: any,
    dataSetCompletenessInfo: any,
    currentUser: CurrentUser
  ): Observable<any> {
    return new Observable((observer) => {
      this.discoverAndUpdateEntryFormCompletenessInfo(
        entryFormSelection,
        dataSetCompletenessInfo,
        currentUser
      )
        .then((response) => {
          observer.next(response);
          observer.complete();
        })
        .catch((error) => {
          observer.error(error);
        });
    });
  }

  async discoverAndUpdateEntryFormCompletenessInfo(
    entryFormSelection: any,
    dataSetCompletenessInfo: CompleteDataSetRegistration,
    currentUser: CurrentUser
  ) {
    const id =
      this.offlineCompletenessProvider.getEntryFormConpletenessDataId(
        entryFormSelection
      );
    const offlineData = await this.offlineCompletenessProvider
      .getOfflineCompletenessesByIds([id], currentUser)
      .toPromise();
    // @TODO take handlig preference from setting default is device
    if (offlineData && offlineData.length > 0) {
      const offlineDataSetCompleteness = {
        ...offlineData[0],
        isDeleted: JSON.parse(offlineData[0].isDeleted),
      };

      dataSetCompletenessInfo = {
        ...dataSetCompletenessInfo,
      };
    } else {
      const { completed } = dataSetCompletenessInfo;
      if (completed) {
        try {
          dataSetCompletenessInfo = await this.offlineCompletenessProvider
            .offlneEntryFormCompleteness(
              entryFormSelection,
              currentUser,
              dataSetCompletenessInfo
            )
            .toPromise();
        } catch (error) {
          console.log({ error });
        }
      } else {
        try {
          await this.offlineCompletenessProvider
            .offlneEntryFormUncompleteness(entryFormSelection, currentUser)
            .toPromise();
        } catch (error) {
          console.log({ error });
        }
      }
    }
    return dataSetCompletenessInfo;
  }

  async uploadingDataSetCompleteness(currentUser: CurrentUser) {
    const type = "aggregate";
    const status = "not-sync";
    const offlineData = await this.offlineCompletenessProvider
      .getOfflineCompletenessesByType(type, currentUser)
      .toPromise();
    const data = _.map(offlineData, (dataObj) => {
      const { isDeleted } = dataObj;
      return { ...dataObj, isDeleted: JSON.parse(isDeleted) };
    });
    const unCompletedData = _.filter(
      data,
      (dataObject) => dataObject.isDeleted
    );
    const completedData = _.filter(
      data,
      (dataObject) => !dataObject.isDeleted && dataObject.status === status
    );
    // await this.completeEntryFormsOnline(completedData, currentUser);
    // await this.unCompleteEntryFormsOnline(unCompletedData, currentUser);
  }

  async completeEntryFormsOnline(completedData: any, currentUser: CurrentUser) {
    for (const data of completedData) {
      const { dataSetId, organisationUnitId, periodId, dataDimension } = data;
      await this.unDoCompleteOnDataSetRegistrations(
        dataSetId,
        periodId,
        organisationUnitId,
        dataDimension,
        currentUser
      ).toPromise();
      await this.offlineCompletenessProvider
        .savingOfflineCompleteness([{ ...data, status: "synced" }], currentUser)
        .toPromise();
    }
  }

  async unCompleteEntryFormsOnline(
    unCompletedData: any,
    currentUser: CurrentUser
  ) {
    for (const data of unCompletedData) {
      const { dataSetId, organisationUnitId, periodId, dataDimension, id } =
        data;
      await this.unDoCompleteOnDataSetRegistrations(
        dataSetId,
        periodId,
        organisationUnitId,
        dataDimension,
        currentUser
      ).toPromise();
      await this.offlineCompletenessProvider
        .deleteOfflineCompletenessesByIds([id], currentUser)
        .toPromise();
    }
  }

  completeOnDataSetRegistrations(
    dataSetId: string,
    period: string,
    orgUnitId: string,
    dataDimension: any,
    currentUser: CurrentUser
  ): Observable<any> {
    let parameter = this.getDataSetCompletenessParameter(
      dataSetId,
      period,
      orgUnitId,
      dataDimension
    );
    return new Observable((observer) => {
      let data: any = {
        dataSet: dataSetId,
        period: period,
        organisationUnit: orgUnitId,
      };
      if (dataDimension.cp !== "") {
        data = {
          ...data,
          cc: dataDimension.cc,
          cp: dataDimension.cp,
        };
      }
      const url = `/api/completeDataSetRegistrations?${parameter}`;
      this.httpClient
        .post(
          url,
          {
            completeDataSetRegistrations: [data],
          },
          currentUser
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

  unDoCompleteOnDataSetRegistrations(
    dataSetId: string,
    period: string,
    orgUnitId: string,
    dataDimension: any,
    currentUser: CurrentUser
  ): Observable<any> {
    let parameter = this.getDataSetCompletenessParameter(
      dataSetId,
      period,
      orgUnitId,
      dataDimension
    );
    return new Observable((observer) => {
      const url = `/api/completeDataSetRegistrations?${parameter}`;
      this.httpClient.delete(url, currentUser).subscribe(
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

  getDataSetCompletenessInfo(
    dataSetId: string,
    period: string,
    orgUnitId: string,
    dataDimension: any,
    currentUser: CurrentUser
  ): Observable<any> {
    if (dataSetId && period && orgUnitId && currentUser) {
      const params = `dataSet=${dataSetId}&period=${period}&orgUnit=${orgUnitId}`;
      const url = "completeDataSetRegistrations.json?" + params;

      // ! START::: DEPRECATED: OLD WAY OF RETRIVING DATASET REGISTRATION INFO
      // let parameter = `periodId=${period}&dataSetId=${dataSetId}&organisationUnitId=${orgUnitId}`;
      // if (dataDimension.cp != "") {
      //   parameter += `&cc=${dataDimension.cc}&cp=${dataDimension.cp}`;
      // }
      // const url = "/dhis-web-dataentry/getDataValues.action?" + parameter;
      // ! END::: DEPRECATED: OLD WAY OF RETRIVING DATASET REGISTRATION INFO

      return new Observable((observer) => {
        this.httpClient.get(url, true, currentUser).subscribe(
          (dataSetRegistrationPayload: DataSetRegistrationPayload) => {
            const dataSetRegistrationPayloadKeys: string[] = _.keys(
              dataSetRegistrationPayload
            );

            if (
              dataSetRegistrationPayload &&
              dataSetRegistrationPayloadKeys &&
              dataSetRegistrationPayloadKeys.length
            ) {
              const completeRegistrations: CompleteDataSetRegistration[] =
                _.filter(
                  dataSetRegistrationPayload["completeDataSetRegistrations"],
                  (
                    completeDataSetRegistration: CompleteDataSetRegistration
                  ) => {
                    return (
                      completeDataSetRegistration.dataSet === dataSetId &&
                      completeDataSetRegistration.period === period &&
                      completeDataSetRegistration.organisationUnit === orgUnitId
                    );
                  }
                );

              if (completeRegistrations && completeRegistrations.length) {
                observer.next(_.head(completeRegistrations));
                observer.complete();
              } else {
                observer.next(
                  this.getDataseSetRegistrationsTemplate(
                    dataSetId,
                    orgUnitId,
                    period
                  )
                );
                observer.complete();
              }
            } else {
              observer.next(
                this.getDataseSetRegistrationsTemplate(
                  dataSetId,
                  orgUnitId,
                  period
                )
              );
              observer.complete();
            }
          },
          (error) => {
            observer.error(error);
          }
        );
      });
    }
  }

  getDataseSetRegistrationsTemplate = (
    dataSet: string,
    organisationUnit: string,
    period: string
  ) => {
    return {
      period,
      dataSet,
      organisationUnit,
      attributeOptionCombo: "uGIJ6IdkP7Q",
      date: new Date(),
      storedBy: "",
      completed: false,
    };
  };

  getUserCompletenessInformation(
    username: string,
    currentUser: CurrentUser
  ): Observable<any> {
    return new Observable((observer) => {
      const url = `/dhis-web-commons-ajax-json/getUser.action?username=${username}`;
      this.httpClient.get(url, true, currentUser).subscribe(
        (response: any) => {
          observer.next(response);
          observer.complete();
        },
        (error) => {
          observer.error(error);
        }
      );
    });
  }

  getDataSetCompletenessParameter(
    dataSetId: string,
    period: string,
    orgUnitId: string,
    dataDimension: any
  ): string {
    let parameter = "ds=" + dataSetId + "&pe=" + period + "&ou=" + orgUnitId;
    if (dataDimension.cp != "") {
      parameter += "&cc=" + dataDimension.cc + "&cp=" + dataDimension.cp;
    }
    return parameter;
  }
}
