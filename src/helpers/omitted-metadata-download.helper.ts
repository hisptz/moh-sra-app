import * as _ from "lodash";

export interface MetadataResouces {
    name: string;
    displayName: string;
    status: boolean;
    dependentTable: string[];
}

export function omitNONSRAMetadata(
    resources: MetadataResouces[]
): MetadataResouces[] {
    const omittedMetadata: string[] = [
        "dataStore",
        "programRuleActions",
        "programRuleVariable",
        "programRules",
        "programStageSections",
        "programs",
        "smsCommand"
    ];
    return _.filter(
        resources,
        (resource: MetadataResouces) => !_.includes(omittedMetadata, resource.name)
    );
}
