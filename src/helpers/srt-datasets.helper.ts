import * as _ from "lodash";
import { DEFAULT_APP_METADATA } from "../constants";

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
    // ToDo: Filtering Datasets Specifically for SRA
    const SRTAllowedDatasets = DEFAULT_APP_METADATA.dataSets.defaultIds;
    return _.isArray(datasets)
        ? _.filter(datasets, (dataset: Dataset) =>
            _.includes(SRTAllowedDatasets, dataset.id)
        )
        : [];
}
