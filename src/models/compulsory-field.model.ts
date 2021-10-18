export interface CompulsoryField {
    name: string;
    dimensionItem: string;
}

export interface CompulsoryDataValue {
    id:     string;
    value:  string;
    status: string;
    lookUp?: string;
}


export interface CompulsoryDataElementOperand {
    name:          string;
    dimensionItem: string;
}
