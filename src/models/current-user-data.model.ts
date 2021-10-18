export interface CurrentUserData {
    Name:                      string;
    Employer:                  string;
    "Job Title":               string;
    Gender:                    string;
    Birthday:                  string;
    Nationality:               string;
    Interests:                 string;
    userRoles:                 UserRole[];
    organisationUnits:         OrganisationUnit[];
    dataViewOrganisationUnits: OrganisationUnit[];
    dataSets:                  string[];
    programs:                  string[];
}

export interface OrganisationUnit {
    name: string;
    id:   string;
}

export interface UserRole {
    name: string;
}
