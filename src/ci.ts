import ci from "ci-info";

export const isCI: boolean = ci.isCI;
export const ciName: string | null = ci.name;
