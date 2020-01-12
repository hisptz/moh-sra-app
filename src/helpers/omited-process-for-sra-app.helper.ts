import * as _ from "lodash";

export function omitFromProcesses(processes: string[]) {
    const omittedProcesses = [
        "smsCommand",
        "programs",
        "programStageSections",
        "programRules",
        "programRuleActions",
        "programRuleVariables"
    ];
    if (processes) {
        return _.filter(processes, (process: string) =>
            !_.includes(omittedProcesses, process)
        );
    }
}
