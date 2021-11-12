export interface DBCompleteResponse {
    pager:    Pager;
    listGrid: ListGrid;
}

export interface ListGrid {
    metaData:    MetaData;
    headerWidth: number;
    subtitle:    string;
    width:       number;
    title:       string;
    height:      number;
    headers:     Header[];
    rows:        Array<string[]>;
}

export interface Header {
    hidden: boolean;
    meta:   boolean;
    name:   string;
    column: string;
    type:   string;
}

export interface MetaData {
}

export interface Pager {
    page:      number;
    pageCount: number;
    total:     number;
    pageSize:  number;
}
