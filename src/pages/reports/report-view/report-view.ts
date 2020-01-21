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
import { Component, ElementRef, OnInit } from "@angular/core";
import { IonicPage, NavController, NavParams, Platform } from "ionic-angular";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { UserProvider } from "../../../providers/user/user";
import { DataSetsProvider } from "../../../providers/data-sets/data-sets";
import { AppProvider } from "../../../providers/app/app";
import { StandardReportProvider } from "../../../providers/standard-report/standard-report";
import { DATABASE_STRUCTURE } from "../../../models/database";
import { AppTranslationProvider } from "../../../providers/app-translation/app-translation";
import { Store } from "@ngrx/store";
import { State, getCurrentUserColorSettings } from "../../../store";
import { Observable } from "rxjs";
import { FileOpener } from "@ionic-native/file-opener/ngx";
import { File, IWriteOptions } from "@ionic-native/file";
import * as jsPDF from "jspdf";
// import domtoimage from "dom-to-image";
import domtoimage from "dom-to-image-improved";
import b64toBlob from "b64-to-blob";

/**
 * Generated class for the ReportViewPage page.
 *
 * See http://ionicframework.com/docs/components/#navigation for more info
 * on Ionic pages and navigation.
 */

declare var dhis2;
declare const cordova;
declare global {
  interface Window {
    AndroidWindow: any;
  }
}

window.AndroidWindow = window.AndroidWindow || {};

@IonicPage()
@Component({
  selector: "page-report-view",
  templateUrl: "report-view.html"
})
export class ReportViewPage implements OnInit {
  reportId: string;
  reportName: string;
  selectedPeriod: any;
  selectedOrganisationUnit: any;
  _htmlMarkup: SafeHtml;
  hasScriptSet: boolean = false;
  isLoading: boolean = false;
  isReportDownloaded: boolean = false;
  reportMessage: string = "";
  loadingMessage: string = "";
  currentUser: any;
  reportType: string = "";
  translationMapper: any;
  colorSettings$: Observable<any>;

  constructor(
    private store: Store<State>,
    private navCtrl: NavController,
    private params: NavParams,
    private user: UserProvider,
    private dataSetProvider: DataSetsProvider,
    private reportProvider: StandardReportProvider,
    private sanitizer: DomSanitizer,
    private appProvider: AppProvider,
    private elementRef: ElementRef,
    private appTranslation: AppTranslationProvider,
    private file: File,
    private fileOpener: FileOpener,
    private platform: Platform
  ) {
    this.colorSettings$ = this.store.select(getCurrentUserColorSettings);
    this.isLoading = true;
    this.translationMapper = {};
  }

  ngOnInit() {
    this.appTranslation.getTransalations(this.getValuesToTranslate()).subscribe(
      (data: any) => {
        this.translationMapper = data;
        this.loadingUserAndReportData();
      },
      error => {
        this.loadingUserAndReportData();
      }
    );
  }

  sharePDFReport() {
    this.isReportDownloaded = true;
    this.reportMessage = "Sharing Report...";

    //  Options for Sharing PDF
    let options = {
      documentSize: "A4",
      type: "share"
    };

    const printableReportMarkup = document.getElementById("printable-area")
      .innerHTML;

    cordova.plugins.pdf
      .fromData(printableReportMarkup, options)
      .then(response => {
        this.isReportDownloaded = false;
        console.log("SHARING SUCCESSFULLY LAUNCHED...", response);
      })
      .catch(err => {
        this.isReportDownloaded = false;
        console.log("ERROR::: " + err);
      });
  }

  downloadPDFReport() {
    this.reportMessage = "Downloading Report...";
    document.addEventListener("deviceready", () => {
      this.isReportDownloaded = true;
      // PDF File Name
      const fileName = `${this.selectedOrganisationUnit}_${this.selectedPeriod}.pdf`;

      // Options for Downloading PDF
      const options = {
        documentSize: "A4",
        type: "base64"
      };

      const printableReportMarkup = document.getElementById("printable-area")
        .innerHTML;

      cordova.plugins.pdf
        .fromData(printableReportMarkup, options)
        .then(response => {
          // To define the type of the Blob
          const contentType = "application/pdf";

          // if cordova.file is not available use instead :
          // var folderpath = "file:///storage/emulated/0/Download/";
          const folderpath = cordova.file.externalRootDirectory + "Download/"; //you can select other folders
          this.savebaseAsPDF(folderpath, fileName, response, contentType);
        })
        .catch(err => console.log("Error " + JSON.stringify(err)));
    });
  }

  savebaseAsPDF(folderpath, filename, content, contentType) {
    // Convert the base64 string in a Blob
    const DataBlob = b64toBlob(content, contentType);
    this.file
      .createFile(folderpath, filename, true)
      .then(createFileResponse => {
        console.log("SUCCESSFULLY CREATING FILE::: " + createFileResponse);
        this.file
          .writeFile(folderpath, filename, DataBlob, {
            replace: true,
            append: true
          })
          .then(writeFileResponse => {
            this.isReportDownloaded = false;
            console.log(
              "WRITTING CONTENT SUCCESSFULLY::: " + writeFileResponse
            );
          })
          .catch(err => {
            this.isReportDownloaded = false;
            console.log("ERROR IN WRITTING IN THE FILE " + err);
          });
      })
      .catch(err => {
        this.isReportDownloaded = false;
        console.log("ERROR CREATING:::" + err);
      });
  }

  Base64ToBlob(b64Data: any, contentType: string, sliceSize?: any) {
    contentType = contentType || "";
    sliceSize = sliceSize || 512;

    var byteCharacters = atob(b64Data);
    var byteArrays = [];

    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      var slice = byteCharacters.slice(offset, offset + sliceSize);

      var byteNumbers = new Array(slice.length);
      for (var i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      var byteArray = new Uint8Array(byteNumbers);

      byteArrays.push(byteArray);
    }

    var blob = new Blob(byteArrays, { type: contentType });
    return blob;
  }

  loadingUserAndReportData() {
    let key = "Discovering user information";
    this.loadingMessage = this.translationMapper[key]
      ? this.translationMapper[key]
      : key;
    this.user.getCurrentUser().subscribe((user: any) => {
      this.currentUser = user;
      dhis2.database = user.currentDatabase;
      this.reportId = this.params.get("id");
      this.reportName = this.params.get("name");
      this.reportType = this.params.get("reportType");
      this.isLoading = false;
      if (this.params.get("period")) {
        this.selectedPeriod = this.params.get("period");
        this.selectedOrganisationUnit = this.params.get("organisationUnit");
        let ids = [];
        let organisationUnitHierarchy = [];
        let periods = [];
        let date = "";
        let period = "";
        if (this.selectedPeriod && this.selectedPeriod.name) {
          periods.push(this.selectedPeriod.iso);
          date = this.selectedPeriod.startDate;
          period = this.selectedPeriod.iso;
        }
        if (this.selectedOrganisationUnit && this.selectedOrganisationUnit.id) {
          this.selectedOrganisationUnit["dataSets"] = [];
          let organisationUnitHierarchy = this.getOrganisationUnitHierarchy(
            this.params.get("organisationUnit")
          );
          this.dataSetProvider
            .getDataSetSourceDataSetIds(this.selectedOrganisationUnit.id, user)
            .subscribe(
              (dataSetIds: any) => {
                ids = dataSetIds;
                this.dataSetProvider.getDataSetsByIds(ids, user).subscribe(
                  (DataSets: any) => {
                    let dataSets = [];
                    for (let dataSet of DataSets) {
                      dataSets.push({ id: dataSet.id, name: dataSet.name });
                    }
                    this.selectedOrganisationUnit.dataSets = dataSets;
                    dhis2.report = {
                      organisationUnit: this.selectedOrganisationUnit,
                      organisationUnitChildren: this.params.get(
                        "organisationUnitChildren"
                      ),
                      organisationUnitHierarchy: organisationUnitHierarchy,
                      periods: periods,
                      period: period,
                      date: date,
                      dataSets: dataSets
                    };
                    dhis2.dataBaseStructure = DATABASE_STRUCTURE;
                    this.loadReportDesignContent(this.reportId);
                  },
                  error => {
                    this.isLoading = false;
                    this.appProvider.setNormalNotification(
                      "Failed to discover organisation units information"
                    );
                  }
                );
              },
              error => {
                this.isLoading = false;
                this.appProvider.setNormalNotification(
                  "Failed to discover organisation units information"
                );
              }
            );
        } else {
          dhis2.report = {
            organisationUnit: this.selectedOrganisationUnit,
            organisationUnitChildren: this.params.get(
              "organisationUnitChildren"
            ),
            organisationUnitHierarchy: organisationUnitHierarchy,
            periods: periods,
            period: period,
            date: date,
            dataSets: []
          };
          this.loadReportDesignContent(this.reportId);
        }
      } else {
        this.loadReportDesignContent(this.reportId);
      }
    });
  }

  backToPreviousView() {
    this.isLoading = true;
    this.loadingMessage = "Closing report";
    this.navCtrl.pop();
  }

  getOrganisationUnitHierarchy(organisationUnit) {
    let organisationUnitHierarchy = [];
    organisationUnitHierarchy.push({
      id: organisationUnit.id,
      name: organisationUnit.name
    });
    if (organisationUnit.ancestors) {
      let length = organisationUnit.ancestors.length;
      for (let index = length - 1; index >= 0; index--) {
        organisationUnitHierarchy.push(organisationUnit.ancestors[index]);
      }
    }
    return organisationUnitHierarchy;
  }

  loadReportDesignContent(reportId) {
    this.isLoading = true;
    let key = "Discovering report metadata";
    this.loadingMessage = this.translationMapper[key]
      ? this.translationMapper[key]
      : key;
    //for standard reports
    if (this.reportType && this.reportType == "standardReport") {
      this.reportProvider.getReportDesign(reportId, this.currentUser).subscribe(
        (report: any) => {
          if (report && report.designContent) {
            try {
              let scriptsContents = this.getScriptsContents(
                report.designContent
              );
              this.setScriptsOnHtmlContent(scriptsContents);
              this._htmlMarkup = this.sanitizer.bypassSecurityTrustHtml(
                report.designContent
              );
              this.isLoading = false;
            } catch (e) {
              console.log(JSON.stringify(e));
              this.isLoading = false;
            }
          }
        },
        error => {
          this.isLoading = false;
          this.appProvider.setNormalNotification(
            "Failed to discover report metadata"
          );
        }
      );
    } else if (this.reportType && this.reportType == "dataSetReport") {
      //for data set reports
      this.isLoading = false;
    } else {
      this.appProvider.setNormalNotification(
        "Report type has not set,please contact system administrator"
      );
      this.isLoading = false;
    }
  }

  getScriptsContents(html) {
    let scriptsWithClosingScript = [];
    if (html.match(/<script[^>]*>([\w|\W]*)<\/script>/im)) {
      if (
        html.match(/<script[^>]*>([\w|\W]*)<\/script>/im)[0].split("<script>")
          .length > 0
      ) {
        html
          .match(/<script[^>]*>([\w|\W]*)<\/script>/im)[0]
          .split("<script>")
          .forEach((scriptFunctionWithCLosingScriptTag: any) => {
            if (scriptFunctionWithCLosingScriptTag != "") {
              scriptsWithClosingScript.push(
                scriptFunctionWithCLosingScriptTag.split("</script>")[0]
              );
            }
          });
      }
    }
    return scriptsWithClosingScript;
  }

  setScriptsOnHtmlContent(scriptsContentsArray) {
    if (!this.hasScriptSet) {
      scriptsContentsArray.forEach(scriptsContents => {
        if (scriptsContents.indexOf("<script") > -1) {
          try {
            let srcUrl = this.getScriptUrl(scriptsContents);
            let script = document.createElement("script");
            script.src = srcUrl;
            this.elementRef.nativeElement.appendChild(script);
          } catch (e) {
            console.log("error : " + JSON.stringify(e));
            let script = document.createElement("script");
            script.type = "text/javascript";
            script.innerHTML = scriptsContents;
            this.elementRef.nativeElement.appendChild(script);
          }
        } else {
          let script = document.createElement("script");
          script.type = "text/javascript";
          script.innerHTML = scriptsContents;
          this.elementRef.nativeElement.appendChild(script);
        }
      });
      this.hasScriptSet = true;
    }
  }

  getScriptUrl(scriptsContents) {
    let url = "";
    if (scriptsContents && scriptsContents.split("<script").length > 0) {
      scriptsContents.split("<script").forEach((scriptsContent: any) => {
        if (scriptsContent != "") {
          url = scriptsContent.split("src=")[1].split(">")[0];
        }
      });
    }
    return url;
  }

  getValuesToTranslate() {
    return ["Discovering user information", "Discovering report metadata"];
  }
}
