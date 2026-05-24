import pandas as pd
import numpy as np
import os
import random
from datetime import datetime, timedelta

def generate_patient_data(num_patients=1000):
    np.random.seed(42)
    random.seed(42)

    # Base names
    first_names_m = ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles", 
                     "Christopher", "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven", "Paul", "Andrew", "Joshua"]
    first_names_f = ["Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen", 
                     "Lisa", "Nancy", "Betty", "Sandra", "Margaret", "Ashley", "Kimberly", "Emily", "Donna", "Michelle"]
    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Rodriguez", "Wilson", 
                  "Martinez", "Anderson", "Taylor", "Thomas", "Hernandez", "Moore", "Martin", "Jackson", "Thompson", "White"]

    diseases = ["Cardiovascular", "Diabetes", "Respiratory", "Oncology", "Neurological", "None"]
    disease_weights = [0.15, 0.20, 0.12, 0.08, 0.05, 0.40]

    data = []

    # Get standard start/end dates
    end_date = datetime.now()
    start_date = end_date - timedelta(days=365)

    for i in range(num_patients):
        patient_id = f"PAT-{1000 + i}"
        gender = random.choice(["Male", "Female", "Non-binary"])
        
        if gender == "Male":
            name = f"{random.choice(first_names_m)} {random.choice(last_names)}"
        elif gender == "Female":
            name = f"{random.choice(first_names_f)} {random.choice(last_names)}"
        else:
            name = f"{random.choice(first_names_m if random.random() > 0.5 else first_names_f)} {random.choice(last_names)}"

        age = int(np.clip(np.random.normal(52, 18), 18, 92))
        
        # Primary disease assignment biased by age
        if age > 60:
            adj_weights = [0.25, 0.25, 0.15, 0.12, 0.08, 0.15]
        elif age < 35:
            adj_weights = [0.05, 0.10, 0.10, 0.03, 0.02, 0.70]
        else:
            adj_weights = disease_weights
            
        disease = random.choices(diseases, weights=adj_weights, k=1)[0]
        
        # Physical metrics
        height = round(float(np.random.normal(170, 10 if gender == "Male" else 8)), 1)
        # Weight linked to height and disease
        bmi_base = np.random.normal(27, 5)
        if disease == "Diabetes" or disease == "Cardiovascular":
            bmi_base += np.random.uniform(2, 6)
        bmi_base = np.clip(bmi_base, 16, 45)
        
        baseline_weight = round(float(bmi_base * ((height / 100) ** 2)), 1)
        
        # Blood pressure baseline
        if disease == "Cardiovascular":
            base_sys = int(np.random.normal(148, 12))
            base_dia = int(np.random.normal(92, 8))
        elif disease == "Diabetes":
            base_sys = int(np.random.normal(136, 10))
            base_dia = int(np.random.normal(86, 6))
        else:
            base_sys = int(np.random.normal(122, 10))
            base_dia = int(np.random.normal(78, 6))
            
        baseline_sys = int(np.clip(base_sys, 90, 200))
        baseline_dia = int(np.clip(base_dia, 60, 120))

        # Sugar baseline (Fasting mg/dL)
        if disease == "Diabetes":
            base_sugar = int(np.random.normal(165, 30))
        else:
            base_sugar = int(np.random.normal(95, 12))
        baseline_sugar = int(np.clip(base_sugar, 65, 320))

        # Treatment effects (the "After" metrics)
        # If the patient has a disease or higher baseline metrics, they undergo treatment.
        # Otherwise, they stay roughly the same or have random slight drift.
        treatment_weeks = random.randint(4, 24) if disease != "None" else 0
        adherence = random.choice(["High", "Medium", "Low"]) if disease != "None" else "None"
        
        if disease != "None" and adherence == "High":
            weight_change = np.random.uniform(-4.0, -8.0)
            sys_change = np.random.uniform(-10, -22)
            dia_change = np.random.uniform(-6, -14)
            sugar_change = np.random.uniform(-20, -50) if disease == "Diabetes" else np.random.uniform(-5, -12)
        elif disease != "None" and adherence == "Medium":
            weight_change = np.random.uniform(-1.0, -4.0)
            sys_change = np.random.uniform(-4, -10)
            dia_change = np.random.uniform(-2, -6)
            sugar_change = np.random.uniform(-8, -22) if disease == "Diabetes" else np.random.uniform(-2, -6)
        else:
            # Low adherence or no disease
            weight_change = np.random.uniform(-1.0, 1.5)
            sys_change = np.random.uniform(-3, 3)
            dia_change = np.random.uniform(-2, 2)
            sugar_change = np.random.uniform(-5, 5)

        current_weight = round(max(40.0, baseline_weight + weight_change), 1)
        current_sys = int(np.clip(baseline_sys + sys_change, 85, 190))
        current_dia = int(np.clip(baseline_dia + dia_change, 55, 115))
        current_sugar = int(np.clip(baseline_sugar + sugar_change, 60, 300))

        # Visit Date
        random_days = random.randint(0, 364)
        visit_date = (start_date + timedelta(days=random_days)).strftime("%Y-%m-%d")

        # Composite Health Score (out of 100)
        # Higher score means better metrics and positive change
        bp_score = max(0, 100 - (abs(current_sys - 120) * 1.5 + abs(current_dia - 80) * 2))
        sugar_score = max(0, 100 - (abs(current_sugar - 90) * 0.8))
        current_bmi = current_weight / ((height / 100) ** 2)
        bmi_score = max(0, 100 - (abs(current_bmi - 21.7) * 3))
        
        improvement_bonus = 0
        if disease != "None":
            if sys_change < 0: improvement_bonus += 5
            if sugar_change < 0: improvement_bonus += 5
            if weight_change < 0: improvement_bonus += 5
            if adherence == "High": improvement_bonus += 5

        health_score = int(np.clip((bp_score * 0.35 + sugar_score * 0.35 + bmi_score * 0.3) + improvement_bonus, 30, 100))

        data.append({
            "Patient_ID": patient_id,
            "Name": name,
            "Age": age,
            "Gender": gender,
            "Height_cm": height,
            "Baseline_Weight_kg": baseline_weight,
            "Current_Weight_kg": current_weight,
            "Baseline_Systolic_BP": baseline_sys,
            "Baseline_Diastolic_BP": baseline_dia,
            "Current_Systolic_BP": current_sys,
            "Current_Diastolic_BP": current_dia,
            "Baseline_Fasting_Sugar": baseline_sugar,
            "Current_Fasting_Sugar": current_sugar,
            "Primary_Disease": disease,
            "Visit_Date": visit_date,
            "Treatment_Adherence": adherence,
            "Treatment_Duration_Weeks": treatment_weeks,
            "AI_Health_Score": health_score
        })

    df = pd.DataFrame(data)
    
    # Save the file
    os.makedirs(os.path.dirname(os.path.abspath(__file__)), exist_ok=True)
    csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "patients.csv")
    df.to_csv(csv_path, index=False)
    print(f"Dataset with {num_patients} patients generated successfully at {csv_path}")
    print(df.head())

if __name__ == "__main__":
    generate_patient_data()
