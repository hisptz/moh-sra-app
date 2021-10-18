export interface ReportConfig {
  id: string;
  reportType: string;
  name: string;
  openFuturePeriods: number;
  reportParams: ReportParams;
  relativePeriods: { [key: string]: boolean };
}

export interface ReportParams {
  paramGrandParentOrganisationUnit?: boolean;
  paramReportingPeriod?: boolean;
  paramOrganisationUnit?: boolean;
  paramParentOrganisationUnit?: boolean;
  parentOrganisationUnit?: boolean;
  reportingPeriod?: boolean;
  organisationUnit?: boolean;
  grandParentOrganisationUnit?: boolean;
}
