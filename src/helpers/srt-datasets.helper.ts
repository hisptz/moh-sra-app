import * as _ from "lodash";

export interface CategoryOption {
    name: string;
    id: string;
    organisationUnits: any[];
}

export interface Category {
    name: string;
    id: string;
    categoryOptions: CategoryOption[];
}

export interface CategoryOption2 {
    id: string;
}

export interface CategoryOptionCombo {
    name: string;
    id: string;
    categoryOptions: CategoryOption2[];
}

export interface CategoryCombo {
    name: string;
    id: string;
    categories: Category[];
    categoryOptionCombos: CategoryOptionCombo[];
}

export interface Dataset {
    id: string;
    name: string;
    timelyDays: string;
    formType: string;
    periodType: string;
    openFuturePeriods: string;
    expiryDays: string;
    categoryCombo: CategoryCombo;
}

export function SRTDatasets(datasets: Dataset[]): any {
    const SRTAllowedDatasets = ["nqKkegk1y8U", "RixTh0Xs0A7", "fiDtcNUzKI6"];
    return _.isArray(datasets)
        ? _.filter(datasets, (dataset: Dataset) =>
            _.includes(SRTAllowedDatasets, dataset.id)
        )
        : [];
}
