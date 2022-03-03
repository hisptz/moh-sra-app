export interface CompletenessPayload {
  completeDataSetRegistrations: CompleteDataSetRegistration[];
}

export interface CompletenessResponse {
  responseType: string;
  status: string;
  importOptions: ImportOptions;
  description: string;
  importCount: ImportCount;
  conflicts: Conflict[];
}

export interface Conflict {
  object: string;
  value: string;
}

export interface ImportCount {
  imported: number;
  updated: number;
  ignored: number;
  deleted: number;
}

export interface ImportOptions {
  idSchemes: IDSchemes;
  dryRun: boolean;
  async: boolean;
  importStrategy: string;
  mergeMode: string;
  reportMode: string;
  skipExistingCheck: boolean;
  sharing: boolean;
  skipNotifications: boolean;
  skipAudit: boolean;
  datasetAllowsPeriods: boolean;
  strictPeriods: boolean;
  strictDataElements: boolean;
  strictCategoryOptionCombos: boolean;
  strictAttributeOptionCombos: boolean;
  strictOrganisationUnits: boolean;
  requireCategoryOptionCombo: boolean;
  requireAttributeOptionCombo: boolean;
  skipPatternValidation: boolean;
  ignoreEmptyCollection: boolean;
  force: boolean;
  firstRowIsHeader: boolean;
  skipLastUpdated: boolean;
  mergeDataValues: boolean;
  skipCache: boolean;
}

export interface IDSchemes {}

// export interface DataSetCompletenessInfo {
//   storedBy: string;
//   date: string;
//   complete: boolean;
// }

export interface DataSetCompletenessInfo {
  period: string;
  dataSet: string;
  organisationUnit: string;
  attributeOptionCombo: string;
  date: string;
  storedBy: string;
  completed: boolean;
}

export interface EntryFormParameter {
  orgUnit: DataSet;
  dataSet: DataSet;
  period: Period;
  isPeriodLocked: boolean;
  dataDimension: DataDimension;
}

export interface DataDimension {
  cc: string;
  cp: string;
}

export interface DataSet {
  id: string;
  name: string;
}

export interface Period {
  iso: string;
  name: string;
}

export interface CompletenessConfiguration {
  minMaxDataElements: any[];
  locked: boolean;
  complete: boolean;
  date: string;
  storedBy: string;
}

export interface ShortImportSummary {
  success: number;
  fail: number;
  errorMessages: any[];
}

export interface DataSetRegistrationPayload {
  completeDataSetRegistrations: CompleteDataSetRegistration[];
}

export interface CompleteDataSetRegistration {
  period: string;
  dataSet: string;
  organisationUnit: string;
  attributeOptionCombo?: string;
  date?: string;
  storedBy?: string;
  completed?: boolean;
  complete?: boolean;
}
