import { Component } from '@angular/core';
import { NavController,ToastController,ModalController } from 'ionic-angular';

import {User} from '../../providers/user/user';
import {AppProvider} from '../../providers/app-provider/app-provider';
import {HttpClient} from "../../providers/http-client/http-client";
import {SqlLite} from "../../providers/sql-lite/sql-lite";
import {OrganisationUnits} from "../organisation-units/organisation-units";
import {DataSetSelection} from "../data-set-selection/data-set-selection";
import {PeriodSelection} from "../period-selection/period-selection";
import {DataEntryForm} from "../data-entry-form/data-entry-form";
import {OrganisationUnit} from "../../providers/organisation-unit";
import {DataSets} from "../../providers/data-sets";

declare var dhis2: any;
/*
  Generated class for the DataEntryHome page.

  See http://ionicframework.com/docs/v2/components/#navigation for more info on
  Ionic pages and navigation.
*/
@Component({
  selector: 'page-data-entry-home',
  templateUrl: 'data-entry-home.html',
  providers : [User,AppProvider,HttpClient,SqlLite,OrganisationUnit,DataSets],
})
export class DataEntryHome {

  public loadingData : boolean = false;
  public loadingMessages : any = [];
  public currentUser : any;
  public organisationUnits : any;
  public selectedOrganisationUnit :any = {};
  public selectedOrganisationUnitLabel :string;
  public assignedDataSets : any;
  public selectedDataSet : any = {};
  public selectedDataSetLabel : string;
  public dataSetIdsByUserRoles : any;
  public selectedPeriod : any = {};
  public selectedPeriodLabel : string;
  public selectedDataDimension : any ;
  public currentPeriodOffset : number;
  public currentSelectionStatus :any = {};

  constructor(public modalCtrl: ModalController,public navCtrl: NavController,
              public OrganisationUnit : OrganisationUnit,public DataSets : DataSets,
              public toastCtrl: ToastController,public user : User,
              public appProvider : AppProvider,public sqlLite : SqlLite,
              public httpClient: HttpClient) {
    this.selectedDataDimension = [];

    this.user.getCurrentUser().then(currentUser=>{
      this.currentUser = currentUser;
      this.setDataSetIdsByUserRoles();
      this.loadOrganisationUnits();
      this.setDataEntrySelectionLabel();
    })
  }

  setDataSetIdsByUserRoles(){
    this.dataSetIdsByUserRoles = [];
    this.currentPeriodOffset = 0;
    this.user.getUserData().then((userData : any)=>{
      userData.userRoles.forEach((userRole:any)=>{
        if (userRole.dataSets) {
          userRole.dataSets.forEach((dataSet:any)=>{
            this.dataSetIdsByUserRoles.push(dataSet.id);
          });
        }
      });
    })
  }

  ionViewDidLoad() {
    this.currentSelectionStatus.orgUnit = true;
    this.currentSelectionStatus.isOrgUnitSelected = false;
    this.currentSelectionStatus.isOrgUnitLoaded = false;
    this.currentSelectionStatus.dataSet = false;
    this.currentSelectionStatus.isDataSetSelected = false;
    this.currentSelectionStatus.isDataSetLoaded = false;
    this.currentSelectionStatus.period = false;
    this.currentSelectionStatus.isPeriodSelected = false;
    this.currentSelectionStatus.allParameterSet = false;
    this.currentSelectionStatus.message = "";
  }

  setDataEntrySelectionLabel(){
    this.setOrganisationSelectLabel();
    this.setSelectedDataSetLabel();
    this.setSelectedPeriodLabel();
  }

  setOrganisationSelectLabel(){
    if(this.selectedOrganisationUnit.id){
      this.selectedOrganisationUnitLabel = this.selectedOrganisationUnit.name;
      this.currentSelectionStatus.isOrgUnitSelected = true;
      this.currentSelectionStatus.dataSet = true;
    }else{
      this.selectedOrganisationUnitLabel = "Touch to select Organisation Unit";
      this.currentSelectionStatus.dataSet = false;
      this.currentSelectionStatus.isOrgUnitSelected = false;
      this.currentSelectionStatus.allParameterSet = false;
      if (this.currentSelectionStatus.orgUnit && !this.currentSelectionStatus.dataSet) {
        this.currentSelectionStatus.message = "Please select organisation unit";
      }
    }
  }

  setSelectedDataSetLabel(){
    if(this.selectedDataSet.id){
      this.selectedDataSetLabel = this.selectedDataSet.name;
      this.currentSelectionStatus.period = true;
      this.currentSelectionStatus.isDataSetSelected = true;
    }else{
      this.selectedDataSetLabel = "Touch to select Entry Form";
      this.currentSelectionStatus.period = false;
      this.currentSelectionStatus.isDataSetSelected = false;
      this.currentSelectionStatus.allParameterSet = false;
      if (this.currentSelectionStatus.dataSet && !this.currentSelectionStatus.period) {
        this.currentSelectionStatus.message = "Please select entry form";
      }
    }
  }

  setSelectedPeriodLabel(){
    if(this.selectedPeriod.name){
      this.selectedPeriodLabel = this.selectedPeriod.name;
      this.currentSelectionStatus.isPeriodSelected = true;
      this.currentSelectionStatus.message = "";
      this.hasDataDimensionSet();
    }else{
      this.selectedPeriodLabel = "Touch to select Period";
      this.currentSelectionStatus.isPeriodSelected = false;
      if(this.currentSelectionStatus.period){
        this.currentSelectionStatus.message = "Please select period for entry form";
      }
      this.currentSelectionStatus.allParameterSet = false;
    }
  }

  loadOrganisationUnits():void{
    this.currentSelectionStatus.isDataSetLoaded = true;
    this.currentSelectionStatus.isOrgUnitLoaded = false;
    this.OrganisationUnit.getOrganisationUnits(this.currentUser).then((organisationUnits : any)=>{
      this.organisationUnits = organisationUnits;
      this.currentSelectionStatus.isOrgUnitLoaded = true;
      if(organisationUnits.length > 0){
        this.selectedOrganisationUnit = organisationUnits[0];
        this.setDataEntrySelectionLabel();
        this.loadingDataSets();
        this.setDataEntrySelectionLabel();
      }
    },error=>{
      this.setToasterMessage('Fail to load organisation units : ' + JSON.stringify(error));
    });
  }

  openOrganisationUnitModal(){
    this.loadingMessages = [];
    this.loadingData = true;
    let modal = this.modalCtrl.create(OrganisationUnits,{data : this.organisationUnits,selectedOrganisationUnit:this.selectedOrganisationUnit});
    modal.onDidDismiss((selectedOrganisationUnit:any) => {
      if(selectedOrganisationUnit.id){
        if(selectedOrganisationUnit.id != this.selectedOrganisationUnit.id){
          this.selectedOrganisationUnit = selectedOrganisationUnit;
          this.selectedDataSet = {};
          this.selectedPeriod = {};
          this.loadingDataSets();
          this.setDataEntrySelectionLabel();
        }else{
          this.loadingData = false;
        }
      }else{
        this.loadingData = false;
      }
    });
    modal.present();
  }

  loadingDataSets(){
    this.currentSelectionStatus.isDataSetLoaded = false;
    this.assignedDataSets = [];
    this.currentPeriodOffset = 0;
    this.DataSets.getAssignedDataSetsByOrgUnit(this.selectedOrganisationUnit,this.dataSetIdsByUserRoles,this.currentUser).then((dataSets : any)=>{
      this.assignedDataSets = dataSets;
      if(this.assignedDataSets.length == 1){
        this.selectedDataSet =this.assignedDataSets[0];
        this.setDataEntrySelectionLabel();
      }
      this.currentSelectionStatus.isDataSetLoaded = true;
    },error=>{
      this.setToasterMessage('Fail to load assigned forms : ' + JSON.stringify(error));
    });
  }

  openDataSetsModal(){
    if(this.currentSelectionStatus.dataSet){
      let modal = this.modalCtrl.create(DataSetSelection,{data : this.assignedDataSets,selectedDataSet : this.selectedDataSet});
      modal.onDidDismiss((selectedDataSet:any) => {
        if(selectedDataSet.id){
          if(selectedDataSet.id != this.selectedDataSet.id){
            this.selectedDataDimension = [];
            this.selectedDataSet = selectedDataSet;
            this.selectedPeriod = {};
            this.setDataEntrySelectionLabel();
          }
        }
      });
      modal.present();
    }else{
      this.setToasterMessage("Please select organisation first");
    }
  }

  openPeriodModal(){
    if(this.currentSelectionStatus.period){
      let modal = this.modalCtrl.create(PeriodSelection,{selectedDataSet : this.selectedDataSet,currentPeriodOffset : this.currentPeriodOffset});
      modal.onDidDismiss((selectedPeriodResponse:any) => {
        if(selectedPeriodResponse.selectedPeriod){
          if(selectedPeriodResponse.selectedPeriod.name){
            this.selectedPeriod = selectedPeriodResponse.selectedPeriod;
            this.currentPeriodOffset = selectedPeriodResponse.currentPeriodOffset;
            this.setDataEntrySelectionLabel();
          }
        }
      });
      modal.present();
    }else{
      this.setToasterMessage("Please select entry form first");
    }
  }

  hasDataDimensionSet(){
    let result = true;
    if(this.selectedDataSet.categoryCombo.name != 'default'){
      if(this.selectedDataDimension.length > 0){
        this.selectedDataDimension.forEach((dimension : any)=>{
          if(dimension == null){
            result = false;
          }
        });
      }else{
        result = false;
      }
    }
    this.currentSelectionStatus.allParameterSet = (result && (this.selectedPeriodLabel.indexOf("Touch to select Period") < 0 ))?true:false;
    return result;
  }

  goToEntryForm(){
    let data = {
      orgUnit : {id :this.selectedOrganisationUnit.id,name :this.selectedOrganisationUnitLabel },
      period : {iso : this.selectedPeriod.iso,name : this.selectedPeriod.name },
      formId : this.selectedDataSet.id,
      dataDimension : {}
    };
    if(this.hasDataDimensionSet()){
      data.dataDimension = this.getDataDimension();
    }
    this.navCtrl.push(DataEntryForm,{data : data});
  }

  getDataDimension(){
    let cc = this.selectedDataSet.categoryCombo.id;
    let cp = "";
    this.selectedDataDimension.forEach((dimension : any,index:any)=>{
      if(index == 0){
        cp +=dimension;
      }else{
        cp += ";" + dimension;
      }
    });
    return {cc : cc,cp:cp};
  }

  setLoadingMessages(message){
    this.loadingMessages.push(message);
  }

  setToasterMessage(message){
    let toast = this.toastCtrl.create({
      message: message,
      duration: 3000
    });
    toast.present();
  }

  setStickToasterMessage(message){
    let toast = this.toastCtrl.create({
      message: message,
      showCloseButton : true
    });
    toast.present();
  }

}
