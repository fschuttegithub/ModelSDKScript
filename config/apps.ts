export interface AppConfiguration {
    /** The Mendix App (Project) ID. */
    appId: string;
    /** Optional branch to extract. Defaults to "main" when omitted. */
    branch?: string;
}

/** Configure the Mendix apps to extract. Each key is the app name. */
export const appConfigurations: Record<string, AppConfiguration> = {
    CalculatieEngine: {
        appId: "3eb2245d-77fe-401e-8bc1-476564642d7d",

    },
    PAM: {
        appId: "c1c7aaf1-21c8-4dd3-8a69-aca7eb5ad4f8",
    },
    COOL: {
        appId: "1eff99e0-3e32-46bd-9cb8-a45ad5c1c20b",
    },
    ASB: {
        appId: "0e891584-9b36-4d7b-b754-792856b0ff20",
        branch: "main"
    },
    PolisEngine: {
        appId: "8344c5e0-02e4-46f8-82eb-b7cd648004c4",
    }
};
