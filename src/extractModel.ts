/**
 * Mendix Data Model Extractor
 *
 * This script connects to Mendix applications using the Mendix SDKs,
 * traverses their complete domain models, and exports the structures
 * (modules, entities, attributes, and types) to structured JSON files.
 */

import ExcelJS from "exceljs";
import { MendixPlatformClient, setPlatformConfig } from "mendixplatformsdk";
import { domainmodels } from "mendixmodelsdk";
import * as fs from "fs";
import * as path from "path";
import { appConfigurations, AppConfiguration } from "../config/apps";

const DEFAULT_BRANCH = "main";
const CONFIG_DIR = path.resolve("config");
const TOKEN_FILE = path.join(CONFIG_DIR, "token.txt");
const RESULTS_DIR = path.resolve("results");
const OUTPUT_FILENAME = "mendix_model_export.xlsx";

async function main() {
    console.warn("Starting Mendix model extraction process...");
    ensureDirectory(RESULTS_DIR);

    const platformToken = readPlatformToken();

    setPlatformConfig({ mendixToken: platformToken });

    const failures: string[] = [];
    const workbook = new ExcelJS.Workbook();
    const usedWorksheetNames = new Set<string>();

    for (const [appName, config] of Object.entries(appConfigurations)) {
        try {
            await extractApplication(appName, config, workbook, usedWorksheetNames);
        } catch (error) {
            failures.push(appName);
            reportExtractionFailure(appName, config, error);
        }
    }

    const outputPath = path.join(RESULTS_DIR, OUTPUT_FILENAME);

    try {
        await workbook.xlsx.writeFile(outputPath);
    } catch (error) {
        console.error(`Failed to write Excel workbook to '${outputPath}':`, error);
        process.exit(1);
    }

    if (failures.length > 0) {
        console.error(`\nExtraction finished with failures for: ${failures.join(", ")}`);
        process.exit(1);
    }

    console.warn(`Successfully generated ${OUTPUT_FILENAME} at ${outputPath}`);
}

async function extractApplication(
    appName: string,
    config: AppConfiguration,
    workbook: ExcelJS.Workbook,
    usedWorksheetNames: Set<string>
): Promise<void> {
    const appId = config.appId;
    const branchName = config.branch ?? DEFAULT_BRANCH;

    console.warn(`\nTargeting App: ${appName} (ID: ${appId}), Branch: ${branchName}`);
    console.warn("Creating a temporary working copy of the model. This may take a few moments...");

    const client = new MendixPlatformClient();
    const app = client.getApp(appId);

    const workingCopy = await app.createTemporaryWorkingCopy(branchName);

    console.warn("Opening the model via the Model SDK...");
    const model = await workingCopy.openModel();

    const worksheetName = generateUniqueWorksheetName(appName, usedWorksheetNames);
    const worksheet = workbook.addWorksheet(worksheetName);
    worksheet.columns = [
        { header: "moduleName", key: "moduleName", width: 30 },
        { header: "entityName", key: "entityName", width: 30 },
        { header: "attributeName", key: "attributeName", width: 30 },
        { header: "attributeType", key: "attributeType", width: 20 }
    ];
    worksheet.getRow(1).font = { bold: true };

    const allDomainModels = model.allDomainModels();

    for (const dm of allDomainModels) {
        const moduleName = dm.containerAsModule.name;
        console.warn(`\nProcessing Module: ${moduleName}`);

        const domainModel = await dm.load();

        for (const entity of domainModel.entities) {
            if (!isNonPersistableEntity(entity)) {
                continue;
            }
            console.warn(`-- Found Entity: ${entity.name}`);

            for (const attribute of entity.attributes) {
                const attributeName = attribute.name;
                const attributeType = getAttributeType(attribute);

                console.warn(`---- Found Attribute: ${attributeName} (Type: ${attributeType})`);

                worksheet.addRow({
                    moduleName,
                    entityName: entity.name,
                    attributeName,
                    attributeType
                });
            }
        }
    }
    console.warn(`\nExtraction complete for ${appName}.`);
}

function getAttributeType(attribute: domainmodels.Attribute): string {
    const type = attribute.type;
    if (type instanceof domainmodels.StringAttributeType) return "String";
    if (type instanceof domainmodels.IntegerAttributeType) return "Integer";
    if (type instanceof domainmodels.LongAttributeType) return "Long";
    if (type instanceof domainmodels.DecimalAttributeType) return "Decimal";
    if (type instanceof domainmodels.BooleanAttributeType) return "Boolean";
    if (type instanceof domainmodels.DateTimeAttributeType) return "DateTime";
    if (type instanceof domainmodels.EnumerationAttributeType) return "Enumeration";
    if (type instanceof domainmodels.BinaryAttributeType) return "Binary";
    if (type instanceof domainmodels.HashedStringAttributeType) return "HashedString";
    if (type instanceof domainmodels.AutoNumberAttributeType) return "AutoNumber";
    return "Unknown";
}

function isNonPersistableEntity(entity: domainmodels.Entity): boolean {
    const generalization = entity.generalization;
    if (generalization instanceof domainmodels.NoGeneralization) {
        return generalization.persistable === false;
    }
    return false;
}

function reportExtractionFailure(appName: string, config: AppConfiguration, error: unknown): void {
    console.error(`\nAn error occurred during the extraction process for '${appName}':`, error);
    console.error("\nPlease check the following:");
    console.error("1. The 'MENDIX_TOKEN' environment variable is set and includes 'mx:modelrepository:repo:read'.");
    console.error(`2. The App ID '${config.appId}' and Branch '${config.branch ?? DEFAULT_BRANCH}' are correct and you have access.`);
}

function ensureDirectory(directoryPath: string): void {
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
    }
}

function readPlatformToken(): string {
    if (!fs.existsSync(TOKEN_FILE)) {
        console.error(`Token file not found at '${TOKEN_FILE}'. Please create the file and place your Mendix PAT inside.`);
        process.exit(1);
    }

    const token = fs.readFileSync(TOKEN_FILE, "utf8").trim();
    if (!token) {
        console.error(`Token file '${TOKEN_FILE}' is empty. Please paste your Mendix PAT into the file.`);
        process.exit(1);
    }

    return token;
}

function generateUniqueWorksheetName(appName: string, usedNames: Set<string>): string {
    const invalidChars = /[\\\/\*\[\]\:\?]/g;
    let sanitized = appName.trim().replace(invalidChars, "_");
    if (sanitized.length === 0) {
        sanitized = "Sheet";
    }
    sanitized = sanitized.slice(0, 31);

    let candidate = sanitized;
    let counter = 1;

    while (usedNames.has(candidate)) {
        const suffix = `_${counter}`;
        const baseLength = Math.min(31 - suffix.length, sanitized.length);
        candidate = `${sanitized.slice(0, baseLength)}${suffix}`;
        counter++;
    }

    usedNames.add(candidate);
    return candidate;
}

main().catch(error => {
    console.error("A critical unhandled error occurred:", error);
    process.exit(1);
});
