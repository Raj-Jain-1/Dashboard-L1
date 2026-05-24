# Health Analytics Dashboard - Python Backend & Power BI Setup

This directory contains the Python backend ready structure for the Health Analytics Dashboard. It provides a synthetic dataset generator, a Pandas analysis processor, a Flask API, and scripts for Power BI integration.

## Installation

1. Create a Python Virtual Environment:
   ```bash
   python -m venv venv
   ```

2. Activate the Virtual Environment:
   - **Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux**:
     ```bash
     source venv/bin/activate
     ```

3. Install Dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Application

### 1. Generate Synthetic Data
Run the generator script. This uses Pandas to generate 1000 highly realistic patient metrics (`patients.csv`) including physical indicators, treatment adherence metrics, and baseline values:
```bash
python generate_data.py
```

### 2. Start the API Server
Start the Flask backend to expose API endpoints for the front-end dashboard:
```bash
python app.py
```
The server will start running at `http://localhost:5000`.

## API Endpoints

- `GET /api/health` - Check health status of backend and database.
- `GET /api/patients` - Query, search, and filter patients (supports `search`, `disease`, `age_group`, and `gender` query params).
- `GET /api/summary` - Get high-level KPI cards statistics.
- `GET /api/charts/disease-by-age` - Grouped disease cases by age brackets for Chart.js.
- `GET /api/charts/gender-dist` - Gender demographic proportions.
- `GET /api/charts/visit-trends` - Visit timeline aggregation.
- `GET /api/charts/before-after` - Before/After weight, blood pressure, and blood sugar comparative analysis.
- `GET /api/export` - Export current filtered view as CSV or Excel (`/api/export?type=xlsx`).

## Power BI Integration

The `powerbi_integration.py` file demonstrates how to embed interactive Power BI reports in your custom dashboard.

### Steps to publish:
1. Load `patients.csv` into Power BI Desktop.
2. Build interactive reports utilizing the fields: `Age`, `Gender`, `Current_BMI`, `BP_Category`, `Sugar_Category`, `Treatment_Adherence`, and `AI_Health_Score`.
3. Publish to a Workspace in Power BI Service.
4. Set up an Azure Active Directory App Registration and grant it permissions to the Power BI REST APIs (`Report.Read.All`).
5. Configure the client secrets in `powerbi_integration.py` and run it to retrieve secure Embed Tokens.
6. The frontend can render this report dynamically using the Power BI JavaScript SDK.
