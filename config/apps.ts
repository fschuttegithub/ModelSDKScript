export interface AppConfiguration {
    /** The Mendix App (Project) ID. */
    appId: string;
    /** Optional branch to extract. Defaults to "main" when omitted. */
    branch?: string;
}

/** Configure the Mendix apps to extract. Each key is the app name. */
export const appConfigurations: Record<string, AppConfiguration> = {
    AppName: {
        appId: "Your-App-GUID-Here",

    },

};
