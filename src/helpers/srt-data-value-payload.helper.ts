import * as _ from "lodash";
import date from "date-and-time";
import { SQLITEDataValue } from "../models/data-value.model";

export const getStandardDataValuePayload = (
    sqliteDataValues: SQLITEDataValue[],
    orgUnit?: string,
    dataSetId?: string,
    period?: string
): any => {
    return period && dataSetId && orgUnit
        ? {
            period,
            completeDate: date.format(new Date(), "YYYY-MM-DD"),
            dataValues: _.map(
                sqliteDataValues,
                (sqliteDataValue: SQLITEDataValue) => {
                    return {
                        orgUnit: orgUnit,
                        dataElement: sqliteDataValue.de,
                        categoryOptionCombo: sqliteDataValue.co,
                        value: sqliteDataValue.value,
                        comment: "",
                        dataSet: dataSetId ? dataSetId : sqliteDataValue.dataSetId,
                    };
                }
            ),
        }
        : {
            dataValues: _.map(
                sqliteDataValues,
                (sqliteDataValue: SQLITEDataValue) => {
                    return {
                        period: sqliteDataValue.pe,
                        orgUnit: sqliteDataValue.ou,
                        dataElement: sqliteDataValue.de,
                        categoryOptionCombo: sqliteDataValue.co,
                        value: sqliteDataValue.value,
                    };
                }
            ),
        };
};
