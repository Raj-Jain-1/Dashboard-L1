from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from data_processor import MedicalDataProcessor
import os
import tempfile

app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing

# Initialize data processor
DATA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "patients.csv")
processor = MedicalDataProcessor(DATA_PATH)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "database": "connected", "records": len(processor.df)})

@app.route('/api/patients', methods=['GET'])
def get_patients():
    search = request.args.get('search', '')
    disease = request.args.get('disease', 'all')
    age_group = request.args.get('age_group', 'all')
    gender = request.args.get('gender', 'all')
    
    # Filter using data processor
    filtered_df = processor.filter_patients(search, disease, age_group, gender)
    
    # Return first 100 for performance, but return total count
    total_records = len(filtered_df)
    subset = filtered_df.head(100).to_dict(orient='records')
    
    return jsonify({
        "total": total_records,
        "count_returned": len(subset),
        "patients": subset
    })

@app.route('/api/patient/<patient_id>', methods=['GET'])
def get_patient(patient_id):
    df = processor.df
    patient = df[df["Patient_ID"] == patient_id]
    if patient.empty:
        return jsonify({"error": "Patient not found"}), 404
        
    return jsonify(patient.iloc[0].to_dict())

@app.route('/api/summary', methods=['GET'])
def get_summary():
    search = request.args.get('search', '')
    disease = request.args.get('disease', 'all')
    age_group = request.args.get('age_group', 'all')
    gender = request.args.get('gender', 'all')
    
    filtered_df = processor.filter_patients(search, disease, age_group, gender)
    kpis = processor.get_summary_kpis(filtered_df)
    
    return jsonify(kpis)

@app.route('/api/charts/disease-by-age', methods=['GET'])
def get_disease_by_age():
    search = request.args.get('search', '')
    disease = request.args.get('disease', 'all')
    age_group = request.args.get('age_group', 'all')
    gender = request.args.get('gender', 'all')
    
    filtered_df = processor.filter_patients(search, disease, age_group, gender)
    chart_data = processor.get_disease_by_age_dist(filtered_df)
    return jsonify(chart_data)

@app.route('/api/charts/gender-dist', methods=['GET'])
def get_gender_dist():
    search = request.args.get('search', '')
    disease = request.args.get('disease', 'all')
    age_group = request.args.get('age_group', 'all')
    gender = request.args.get('gender', 'all')
    
    filtered_df = processor.filter_patients(search, disease, age_group, gender)
    chart_data = processor.get_gender_distribution(filtered_df)
    return jsonify(chart_data)

@app.route('/api/charts/visit-trends', methods=['GET'])
def get_visit_trends():
    search = request.args.get('search', '')
    disease = request.args.get('disease', 'all')
    age_group = request.args.get('age_group', 'all')
    gender = request.args.get('gender', 'all')
    
    filtered_df = processor.filter_patients(search, disease, age_group, gender)
    chart_data = processor.get_visit_trends(filtered_df)
    return jsonify(chart_data)

@app.route('/api/charts/before-after', methods=['GET'])
def get_before_after():
    search = request.args.get('search', '')
    disease = request.args.get('disease', 'all')
    age_group = request.args.get('age_group', 'all')
    gender = request.args.get('gender', 'all')
    
    filtered_df = processor.filter_patients(search, disease, age_group, gender)
    chart_data = processor.get_before_after_comparison(filtered_df)
    return jsonify(chart_data)

@app.route('/api/export', methods=['GET'])
def export_data():
    search = request.args.get('search', '')
    disease = request.args.get('disease', 'all')
    age_group = request.args.get('age_group', 'all')
    gender = request.args.get('gender', 'all')
    export_type = request.args.get('type', 'csv')
    
    filtered_df = processor.filter_patients(search, disease, age_group, gender)
    
    if export_type == 'xlsx':
        # Generate temporary Excel file
        temp_dir = tempfile.gettempdir()
        file_path = os.path.join(temp_dir, "patient_health_report.xlsx")
        processor.export_excel(filtered_df, file_path)
        return send_file(
            file_path, 
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
            as_attachment=True, 
            download_name="patient_health_report.xlsx"
        )
    else:
        # Default CSV export
        temp_dir = tempfile.gettempdir()
        file_path = os.path.join(temp_dir, "patient_health_report.csv")
        filtered_df.to_csv(file_path, index=False)
        return send_file(
            file_path, 
            mimetype="text/csv", 
            as_attachment=True, 
            download_name="patient_health_report.csv"
        )

if __name__ == '__main__':
    # Reload dataset on startup
    processor.load_data()
    app.run(host='0.0.0.0', port=5000, debug=True)
