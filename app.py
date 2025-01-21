from flask import Flask, request, jsonify, send_from_directory
from supabase import create_client
import os
from datetime import datetime

app = Flask(__name__, static_folder='.')

# Initialize Supabase client
supabase_url = "https://liuwhsumfxznzjyfhbfe.supabase.co"
supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpdXdoc3VtZnh6bnpqeWZoYmZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc0MDM3MTYsImV4cCI6MjA1Mjk3OTcxNn0.utFOu_kjRltZcroLlyZ9YGoE2vcU47FGJZVXOqWUHfs"
supabase = create_client(supabase_url, supabase_key)

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/work')
def serve_work():
    return send_from_directory('.', 'work.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

@app.route('/api/employees', methods=['GET'])
def get_employees():
    try:
        response = supabase.from_('employees').select("*").execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/employees', methods=['POST'])
def add_employee():
    try:
        data = request.json
        response = supabase.from_('employees').insert([data]).execute()
        return jsonify(response.data[0])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/payslips', methods=['GET'])
def get_payslips():
    try:
        response = supabase.from_('payslips').select("*").execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/payslips', methods=['POST'])
def add_payslip():
    try:
        data = request.json
        data['date'] = datetime.now().isoformat()
        response = supabase.from_('payslips').insert([data]).execute()
        return jsonify(response.data[0])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
