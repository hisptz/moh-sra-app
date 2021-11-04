export interface DataUploadPayload {
    events:             any[];
    dataValuesToUpload: any[];
    dataValues:         DataValue[];
    eventsForTracker:   any[];
    Enrollments:        any[];
    dataStore:          any[];
}

export interface DataValue {
    id:         string;
    de:         string;
    co:         string;
    pe:         string;
    ou:         string;
    cc:         string;
    cp:         string;
    value:      string;
    period:     string;
    orgUnit:    string;
    syncStatus: string;
    dataSetId:  string;
    comment?:    string;
}
