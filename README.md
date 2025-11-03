# Mendix Model Extractor

Export Mendix domain models to an Excel workbook so teams can review entity metadata, validate data-classification rules, and provide compliance evidence.

---

## Features
- Connects to every Mendix app defined in `config/apps.ts` using the Mendix Platform SDK.
- Traverses each module, entity, and attribute for non-persistable entities (temporary data).
- Writes a single Excel file `results/mendix_model_export.xlsx` with one worksheet per app.
- Logs progress to stderr and fails fast when credentials or permissions are incorrect.
- Designed for recurring compliance checks and pipeline automation.

---

## Prerequisites
1. **Node.js 18+**  
   Verify with `node --version`. Install from <https://nodejs.org/> if needed (choose the LTS build).
2. **Mendix Personal Access Token** with `mx:modelrepository:repo:read` scope. Generate it at <https://user-settings.mendix.com/link/developersettings>.
3. Access to the Mendix projects you intend to scan.

---

## Project Setup
1. Clone or download this repository to a working folder (e.g., `C:\Users\<you>\Documents\ModelSDKScript`).
2. Open a terminal in that folder and install dependencies:
   ```bash
   npm install
   ```
3. Paste your Mendix token into `config/token.txt`. The file must contain only the token—no quotes or trailing spaces.
4. Review `config/apps.ts` and confirm the listed apps map to valid App IDs and branches. Add or remove entries as needed (see “Managing app configurations” below).

---

## Running the Extractor
```bash
npm run start
```
The command will:
1. Ensure the `results/` directory exists.
2. For each configured app, create a temporary working copy of the specified branch.
3. Load the domain model, inspect non-persistable entities, and append rows to that app’s worksheet.
4. Save or overwrite `results/mendix_model_export.xlsx`.
5. Print a success message on stderr when the workbook is written.

While the script runs, progress messages (app, module, entity, attribute) appear on stderr; stdout stays empty so you can pipe logs if required.

> **Note**: ExcelJS keeps all worksheets in memory until the file is written. Typical Mendix models are well within Node.js heap limits; for unusually large apps consider running scans per app or switching to the ExcelJS streaming writer.

---

## Output Format
- **File**: `results/mendix_model_export.xlsx`
- **Workbook structure**:
  - One worksheet per app.
  - Header row (bold): `moduleName`, `entityName`, `attributeName`, `attributeType`.
  - One row per attribute found on non-persistable entities in that app’s model.

Store this workbook in your GISG evidence repository after each run.

---

## Troubleshooting
- **Token file missing or empty**: Ensure `config/token.txt` exists and contains a valid PAT.
- **Forbidden errors when creating a working copy**: Regenerate the PAT with repository access and confirm you are a project member.
- **`ts-node` or dependencies not found**: Re-run `npm install` from the project root.

---

## Managing App Configurations
`config/apps.ts` exports the `appConfigurations` object. Each key/value pair looks like:
```ts
ExampleApp: {
  appId: "00000000-0000-0000-0000-000000000000",
  branch: "main"
}
```
To add an application:
1. Copy the App ID from the Mendix Developer Portal URL (`projectid=<GUID>`).
2. Add an entry following the pattern above. Omit `branch` or set it to `main` if you want the default branch.
3. Save the file and rerun `npm run start`.

To remove an app, delete its entry from the object.

