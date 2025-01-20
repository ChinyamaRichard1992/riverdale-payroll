from flask import Flask, request, jsonify, send_from_directory
from dotenv import load_dotenv
from supabase import create_client, Client
import os

load_dotenv()

app = Flask(__name__, static_folder='.')

# Initialize Supabase client
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/api/employees', methods=['GET'])
def get_employees():
    try:
        response = supabase.table('employees').select("*").execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/employees', methods=['POST'])
def create_employee():
    try:
        data = request.json
        response = supabase.table('employees').insert(data).execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/payslips', methods=['GET'])
def get_payslips():
    try:
        response = supabase.table('payslips').select("*").execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/payslips', methods=['POST'])
def create_payslip():
    try:
        data = request.json
        response = supabase.table('payslips').insert(data).execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
