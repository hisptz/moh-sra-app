export interface ImportResponse {
  status: number;
  url: string;
  headers: { [key: string]: string };
  data: string;
}

export interface ImportSummary {
  responseType: string;
  status: string;
  importOptions: ImportOptions;
  description: string;
  importCount: ImportCount;
  dataSetComplete: string;
  conflicts: ImportConflict[];
}

export interface ImportCount {
  imported: number;
  updated: number;
  ignored: number;
  deleted: number;
}

export interface ImportConflict {
  object: string;
  value: string;
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
  skipLastUpdated: boolean;
}

export interface IDSchemes {}
