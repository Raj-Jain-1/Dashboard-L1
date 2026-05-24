"""
Power BI Integration Service

This module provides helper code for authenticating against Azure AD
and generating Embed Tokens for embedding Power BI dashboards/reports
directly inside this custom Health Analytics web application.

Prerequisites:
1. Register an Application in Azure Active Directory (Azure AD).
2. Set up a Power BI Pro or Premium capacity workspace.
3. Import the Pandas-generated CSV dataset (`patients.csv`) into Power BI Desktop,
   publish the report to your Workspace, and note the Workspace ID and Report ID.
"""

import requests
import json
import msal

# Configuration Details (Replace with your Azure/Power BI settings)
CLIENT_ID = "YOUR_AZURE_AD_CLIENT_ID"
CLIENT_SECRET = "YOUR_AZURE_AD_CLIENT_SECRET"
TENANT_ID = "YOUR_AZURE_AD_TENANT_ID"
AUTHORITY_URL = f"https://login.microsoftonline.com/{TENANT_ID}"

# Scope required for Power BI service API
SCOPES = ["https://analysis.windows.net/powerbi/api/.default"]

# Power BI Workspace and Report IDs
WORKSPACE_ID = "YOUR_POWER_BI_WORKSPACE_ID"
REPORT_ID = "YOUR_POWER_BI_REPORT_ID"

class PowerBiEmbedService:
    def __init__(self):
        self.access_token = None

    def get_access_token(self):
        """
        Uses Microsoft MSAL library to authenticate using Client Credentials flow.
        """
        try:
            # Create a confidential client application
            app = msal.ConfidentialClientApplication(
                CLIENT_ID,
                authority=AUTHORITY_URL,
                client_credential=CLIENT_SECRET
            )
            
            # Request token from Azure AD
            result = app.acquire_token_for_client(scopes=SCOPES)
            
            if "access_token" in result:
                self.access_token = result["access_token"]
                return self.access_token
            else:
                error_desc = result.get("error_description")
                raise Exception(f"Failed to acquire token: {error_desc}")
                
        except Exception as e:
            print(f"Error authenticating with Azure AD: {str(e)}")
            return None

    def get_embed_token(self):
        """
        Calls the Power BI REST API to generate an Embed Token for a specific report.
        Allows the frontend to embed the dashboard securely without requiring users to sign in.
        """
        if not self.access_token:
            self.get_access_token()

        if not self.access_token:
            return {"error": "Authentication failed. Token not available."}

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.access_token}"
        }

        # URL for Power BI Generate Token API
        url = f"https://api.powerbi.com/v1.0/myorg/groups/{WORKSPACE_ID}/reports/{REPORT_ID}/GenerateToken"
        
        # AccessLevel: View (read-only), Edit, or Create
        body = {
            "accessLevel": "View"
        }

        try:
            response = requests.post(url, headers=headers, data=json.dumps(body))
            
            if response.status_code == 200:
                token_data = response.json()
                return {
                    "embedToken": token_data.get("token"),
                    "embedUrl": f"https://app.powerbi.com/reportEmbed?reportId={REPORT_ID}&groupId={WORKSPACE_ID}",
                    "reportId": REPORT_ID,
                    "expiration": token_data.get("expiration")
                }
            else:
                return {
                    "error": f"Failed to get embed token. Status Code: {response.status_code}",
                    "details": response.text
                }
        except Exception as e:
            return {"error": f"Request error: {str(e)}"}

# Mock function for local testing before Azure integration is fully set up
def get_mock_embed_config():
    """
    Returns a mock configuration that the UI uses to display a demonstration/placeholder
    of a Power BI interactive grid.
    """
    return {
        "embedToken": "mock_token_abc123xyz_healthcare_analytics",
        "embedUrl": "https://app.powerbi.com/view?r=eyJrIjoiOGZiNWNhOWQtMTlhMi00ZWM3LTg0NjQtZjdiNDQ3NTRkYWRiIiwidCI6IjQ5OWE4MTRlLTI3MjgtNDQ4Ni05NTZhLTgyOWI2OGYwNDNlNSIsImMiOjEwfQ%3D%3D",
        "reportId": "d98124b8-f1c5-4927-a02d-bc4832ff192d",
        "workspaceId": "e2920c81-83d8-4f81-8d26-663806fcf12a",
        "isMock": True
    }

if __name__ == "__main__":
    # Test script locally
    print("Mock Power BI Embed Configuration:")
    print(json.dumps(get_mock_embed_config(), indent=2))
