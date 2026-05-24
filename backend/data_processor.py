import pandas as pd
import numpy as np
import os

class MedicalDataProcessor:
    def __init__(self, csv_path=None):
        if csv_path is None:
            csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "patients.csv")
        self.csv_path = csv_path
        self.load_data()

    def load_data(self):
        if not os.path.exists(self.csv_path):
            raise FileNotFoundError(f"Data file not found at {self.csv_path}. Please run generate_data.py first.")
        self.df = pd.read_csv(self.csv_path)
        self.preprocess()

    def preprocess(self):
        # Calculate current BMI
        self.df["Current_BMI"] = self.df["Current_Weight_kg"] / ((self.df["Height_cm"] / 100) ** 2)
        self.df["Baseline_BMI"] = self.df["Baseline_Weight_kg"] / ((self.df["Height_cm"] / 100) ** 2)
        
        # Categorize BMI
        def get_bmi_category(bmi):
            if bmi < 18.5: return "Underweight"
            elif bmi < 25.0: return "Normal"
            elif bmi < 30.0: return "Overweight"
            else: return "Obese"
            
        self.df["BMI_Category"] = self.df["Current_BMI"].apply(get_bmi_category)
        
        # Categorize Blood Pressure (Based on AHA guidelines)
        def get_bp_category(row):
            sys = row["Current_Systolic_BP"]
            dia = row["Current_Diastolic_BP"]
            if sys < 120 and dia < 80: return "Normal"
            elif 120 <= sys < 130 and dia < 80: return "Elevated"
            elif (130 <= sys < 140) or (80 <= dia < 90): return "Hypertension Stage 1"
            else: return "Hypertension Stage 2"
            
        self.df["BP_Category"] = self.df.apply(get_bp_category, axis=1)

        # Categorize Fasting Blood Sugar
        def get_sugar_category(sugar):
            if sugar < 100: return "Normal"
            elif sugar < 126: return "Prediabetes"
            else: return "Diabetes Alert"
            
        self.df["Sugar_Category"] = self.df["Current_Fasting_Sugar"].apply(get_sugar_category)

        # Age Groups
        bins = [0, 30, 45, 60, 75, 120]
        labels = ["18-30", "31-45", "46-60", "61-75", "75+"]
        self.df["Age_Group"] = pd.cut(self.df["Age"], bins=bins, labels=labels)

    def get_summary_kpis(self, filtered_df=None):
        df = filtered_df if filtered_df is not None else self.df
        total_patients = len(df)
        if total_patients == 0:
            return {
                "total_patients": 0, "avg_bmi": 0.0, "critical_bp_pct": 0.0,
                "sugar_alert_pct": 0.0, "avg_health_score": 0.0
            }
        
        avg_bmi = round(df["Current_BMI"].mean(), 1)
        
        # Critical BP: Hypertension Stage 2 (Sys >= 140 or Dia >= 90)
        critical_bp_count = len(df[(df["Current_Systolic_BP"] >= 140) | (df["Current_Diastolic_BP"] >= 90)])
        critical_bp_pct = round((critical_bp_count / total_patients) * 100, 1)
        
        # Sugar Alert: Fasting Sugar >= 126 mg/dL (diabetic range)
        sugar_alert_count = len(df[df["Current_Fasting_Sugar"] >= 126])
        sugar_alert_pct = round((sugar_alert_count / total_patients) * 100, 1)
        
        avg_health_score = round(df["AI_Health_Score"].mean(), 1)
        
        return {
            "total_patients": total_patients,
            "avg_bmi": avg_bmi,
            "critical_bp_pct": critical_bp_pct,
            "sugar_alert_pct": sugar_alert_pct,
            "avg_health_score": avg_health_score
        }

    def get_disease_by_age_dist(self, filtered_df=None):
        df = filtered_df if filtered_df is not None else self.df
        # Pivot table for Age Group vs Primary Disease
        pivot = pd.crosstab(df["Age_Group"], df["Primary_Disease"])
        # Format for ChartJS
        categories = list(pivot.index)
        diseases = list(pivot.columns)
        
        datasets = []
        for d in diseases:
            datasets.append({
                "label": d,
                "data": [int(x) for x in pivot[d].values]
            })
            
        return {
            "labels": categories,
            "datasets": datasets
        }

    def get_gender_distribution(self, filtered_df=None):
        df = filtered_df if filtered_df is not None else self.df
        dist = df["Gender"].value_counts().to_dict()
        # Clean defaults if missing
        for g in ["Male", "Female", "Non-binary"]:
            if g not in dist: dist[g] = 0
        return {
            "labels": list(dist.keys()),
            "data": list(dist.values())
        }

    def get_visit_trends(self, filtered_df=None):
        df = filtered_df if filtered_df is not None else self.df
        
        # Parse visits monthly
        df["Visit_Month"] = pd.to_datetime(df["Visit_Date"]).dt.to_period("M")
        monthly_visits = df.groupby("Visit_Month").size().sort_index()
        
        labels = [str(x) for x in monthly_visits.index]
        data = [int(x) for x in monthly_visits.values]
        
        # Breakdown by key diseases
        disease_trends = {}
        for d in ["Cardiovascular", "Diabetes", "Respiratory", "None"]:
            subset = df[df["Primary_Disease"] == d]
            if len(subset) > 0:
                d_monthly = subset.groupby(pd.to_datetime(subset["Visit_Date"]).dt.to_period("M")).size().sort_index()
                # Reindex to match full labels
                d_monthly = d_monthly.reindex(monthly_visits.index, fill_value=0)
                disease_trends[d] = [int(x) for x in d_monthly.values]
            else:
                disease_trends[d] = [0] * len(labels)
                
        return {
            "labels": labels,
            "overall_visits": data,
            "disease_trends": disease_trends
        }

    def get_before_after_comparison(self, filtered_df=None):
        df = filtered_df if filtered_df is not None else self.df
        # Only compare patients who have some disease (under treatment)
        treatment_df = df[df["Primary_Disease"] != "None"]
        if len(treatment_df) == 0:
            return {
                "before": {"weight": 0, "systolic": 0, "diastolic": 0, "sugar": 0},
                "after": {"weight": 0, "systolic": 0, "diastolic": 0, "sugar": 0},
                "adherence": {"High": 0, "Medium": 0, "Low": 0}
            }

        before_weight = round(treatment_df["Baseline_Weight_kg"].mean(), 1)
        after_weight = round(treatment_df["Current_Weight_kg"].mean(), 1)

        before_sys = round(treatment_df["Baseline_Systolic_BP"].mean(), 1)
        after_sys = round(treatment_df["Current_Systolic_BP"].mean(), 1)
        before_dia = round(treatment_df["Baseline_Diastolic_BP"].mean(), 1)
        after_dia = round(treatment_df["Current_Diastolic_BP"].mean(), 1)

        before_sugar = round(treatment_df["Baseline_Fasting_Sugar"].mean(), 1)
        after_sugar = round(treatment_df["Current_Fasting_Sugar"].mean(), 1)

        adherence_counts = treatment_df["Treatment_Adherence"].value_counts().to_dict()
        for key in ["High", "Medium", "Low"]:
            if key not in adherence_counts:
                adherence_counts[key] = 0

        return {
            "before": {
                "weight": before_weight,
                "systolic": before_sys,
                "diastolic": before_dia,
                "sugar": before_sugar
            },
            "after": {
                "weight": after_weight,
                "systolic": after_sys,
                "diastolic": after_dia,
                "sugar": after_sugar
            },
            "adherence": adherence_counts
        }

    def filter_patients(self, search="", disease="all", age_group="all", gender="all"):
        filtered = self.df.copy()
        
        if search:
            search = search.lower()
            filtered = filtered[
                filtered["Name"].str.lower().str.contains(search) | 
                filtered["Patient_ID"].str.lower().str.contains(search)
            ]
            
        if disease != "all":
            filtered = filtered[filtered["Primary_Disease"] == disease]
            
        if age_group != "all":
            filtered = filtered[filtered["Age_Group"] == age_group]
            
        if gender != "all":
            filtered = filtered[filtered["Gender"] == gender]
            
        return filtered

    def export_excel(self, filtered_df=None, output_path=None):
        df = filtered_df if filtered_df is not None else self.df
        if output_path is None:
            output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "health_report.xlsx")
            
        # Write to excel with multiple sheets using Pandas
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            # Sheet 1: Patient Details
            df.to_excel(writer, sheet_name='Patient Data', index=False)
            
            # Sheet 2: Summary Metrics
            summary_kpis = self.get_summary_kpis(df)
            summary_df = pd.DataFrame(list(summary_kpis.items()), columns=['Metric', 'Value'])
            summary_df.to_excel(writer, sheet_name='Executive Summary', index=False)
            
            # Sheet 3: Disease Breakdown
            disease_dist = df["Primary_Disease"].value_counts().reset_index()
            disease_dist.columns = ['Disease', 'Patient Count']
            disease_dist.to_excel(writer, sheet_name='Disease Stats', index=False)

        return output_path

if __name__ == "__main__":
    processor = MedicalDataProcessor()
    kpis = processor.get_summary_kpis()
    print("KPIs:", kpis)
    before_after = processor.get_before_after_comparison()
    print("Before/After Weight:", before_after["before"]["weight"], "->", before_after["after"]["weight"])
