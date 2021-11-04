// export interface SQLITEDataValue {
//     de:    string;
//     co:    string;
//     pe:    string;
//     ou:    string;
//     cc:    string;
//     cp:    string;
//     value: string;
// }

export interface SQLITEDataValue {
    id?: string;
    de: string;
    co: string;
    pe: string;
    ou: string;
    cc: string;
    cp: string;
    value: string | number;
    period?: string;
    orgUnit?: string;
    syncStatus?: string;
    dataSetId?: string;
    comment?: string;
}

export interface SynchronizationDataValuePayload {
    dataValues: DataValue[];
}

export interface OfflineCompleteDataValuePayload {
    dataValues: DataValue[];
}

export interface DataValue {
    period: string;
    orgUnit: string;
    dataElement: string;
    categoryOptionCombo: string;
    value: string;
}

export interface OfflineSQLITEDataValue {
    id:     string;
    value:  string;
    status: string;
    comment?: string;
}

