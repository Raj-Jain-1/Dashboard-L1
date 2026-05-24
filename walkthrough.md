# AURA MedAI: System Architecture & Walkthrough

> [!NOTE]
> This document is structured as a comprehensive guide to help you present the **AURA MedAI** project to your teacher. It covers the core functionalities, the tech stack, the machine learning integration, and the overall system logic.

## 1. Project Overview
**AURA MedAI** is a futuristic, AI-assisted medical diagnostic dashboard. It is designed to act as an early-warning predictive engine that analyzes a patient's clinical vitals and outputs risk classifications for three major health areas:
1. **Diabetes**
2. **Cardiovascular (Heart) Disease**
3. **Nephrology (Kidney) Disease**

The goal of the system is not to replace a doctor, but to provide an automated, data-driven "pre-screening" clinical tool. 

---

## 2. Technology Stack & Architecture

The application uses a lightweight but powerful architecture, dividing responsibilities cleanly between the frontend interface and the backend processing engine.

### Frontend (Client-Side)
* **HTML5 & Vanilla JavaScript**: Handles the dynamic rendering of the holographic-style UI. 
* **Custom CSS (Glassmorphism & Neon Design)**: Provides a stunning, futuristic medical-grid aesthetic with smooth micro-animations.
* **Chart.js**: Used for rendering the timeline line-charts and the comparative radar charts on the dashboard.
* **html2pdf.js**: Used to capture medical scan results and instantly generate a downloadable, professionally formatted PDF medical report.

### Backend (Server-Side)
* **Python & Flask**: Serves the API endpoints and processes incoming JSON data from the frontend.
* **Scikit-Learn (Machine Learning)**: The core intelligence of the application. It runs `RandomForestClassifier` algorithms to process complex patient data.
* **Joblib & Numpy**: Used to serialize (save) and deserialize (load) the trained ML models and scalers into memory.
* **JSON-based Persistence**: Uses `data/history.json` as a lightweight database to store patient history, generate composite health scores over time, and allow historical tracking.

---

## 3. How the Machine Learning Engine Works
Before the application can make predictions, the models must be trained. This is handled by the `train_models.py` script.

1. **Synthetic Data Generation**: The system dynamically generates heavily correlated synthetic datasets containing thousands of patient records (balancing healthy vs. diseased samples).
2. **Training & Scaling**: It uses a `StandardScaler` to normalize the data, ensuring features like `Age` (e.g., 45) and `Glucose` (e.g., 180) are weighted appropriately by the algorithm. It then trains three separate Random Forest models.
3. **Predictive Probability**: When the Flask app receives new patient vitals via the `/api/predict` endpoint, the loaded model outputs a *probability score* (0% to 100%), which is then translated into LOW, MODERATE, or CRITICAL risk classifications.

---

## 4. Core System Features

### 🔍 1. Interactive Dashboard
* **Metrics & Analytics**: Displays total evaluations, average risk rates, and the active composite health score.
* **Symptom Analyzer**: An interactive tool where users can input symptoms (e.g., "chest pain", "fatigue"). The system uses a rule-based correlation engine to flag which biological panel (Cardio, Diabetes, Kidney) requires immediate scanning.

### 🧬 2. The Health Scanner (Diagnostic Forms)
This is where the user inputs live clinical parameters.
* **Slider-Based Inputs**: Beautiful neon sliders for continuous metrics (Age, Blood Pressure, Serum Creatinine).
* **Categorical Selectors**: Dropdowns for categorical data (e.g., Chest Pain Type, Urine Albumin grading).
* **Dynamic Suggestions**: Once the model calculates the risk percentage, a separate python function (`generate_suggestions()`) maps the specific clinical outliers (like a high BMI or high ST Depression) to custom, actionable lifestyle and medical interventions.

### 🚨 3. Emergency Flagging System
If a specific vital crosses a dangerous threshold (e.g., Blood Pressure >= 180, or Glucose >= 250), the system will immediately interrupt the UI flow and spawn a blinking **CRITICAL ALERT** banner, simulating a true ICU/Hospital triage system behavior.

### 📜 4. Diagnostic Logs & PDF Reporting
* **History Tab**: All assessments are appended to a JSON file. The dashboard charts automatically read this history to plot out the patient's risk trajectory over time.
* **PDF Dossier**: Teachers will love this feature! With one click, the system compiles the ML prediction, the specific vitals entered, and the AI interventions into a clean, printable Clinical PDF Report with security signatures.

### 🤖 5. AURA Cognitive Chatbot
The system includes an integrated clinical assistant. Instead of making network calls to OpenAI, the chatbot uses an intelligent pattern-matching engine built directly in the Flask backend (`/api/ai_chat`). It can parse user queries about medical terms (like "What is HbA1c?") and return structured, educational medical advice immediately.

---

## 5. Walkthrough Guide
*When presenting, follow this order to show off the system:*
1. **Show the Dashboard**: Mention the glowing animated background and the live tracking metrics. Show how the symptom scanner links "frequent urination" to the Diabetes and Kidney panels.
2. **Run a Mock Scan**: Go to the Health Scan tab, input some dangerously high stats for Cardiac or Diabetes, and hit Predict.
3. **Show the Results**: Explain how the Circular SVG Gauges instantly calculated the ML probabilities. Point out the dynamically generated medical advice in the lower right.
4. **Download the PDF**: Click the download button and open the PDF to demonstrate how clinical data is securely exported.
5. **Show the History & Chat**: Navigate to the logs to show data persistence, and finally, ask the Chatbot a question about "Cholesterol" to demonstrate the AI Assistant feature.
