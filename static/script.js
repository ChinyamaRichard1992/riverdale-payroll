// API functions
const API = {
    async getEmployees() {
        const response = await fetch('/api/employees');
        return response.json();
    },
    async createEmployee(data) {
        const response = await fetch('/api/employees', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        return response.json();
    },
    async getPayslips() {
        const response = await fetch('/api/payslips');
        return response.json();
    },
    async createPayslip(data) {
        const response = await fetch('/api/payslips', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        return response.json();
    }
};

// Store employee data in API
let employeeData = [];
let currentEmployeeId = 1000;
let payslipsData = [];

// Function to generate employee ID
function generateEmployeeId() {
    const year = new Date().getFullYear().toString().substr(-2);
    currentEmployeeId++;
    return `EMP${year}${currentEmployeeId}`;
}

// Function to check if NRC already exists
async function isNRCRegistered(nrc) {
    try {
        const employees = await API.getEmployees();
        return employees.some(emp => emp.nrc === nrc);
    } catch (error) {
        console.error('Error checking NRC:', error);
    }
}

// Function to get employee ID by NRC
async function getEmployeeIdByNRC(nrc) {
    try {
        const employees = await API.getEmployees();
        const employee = employees.find(emp => emp.nrc === nrc);
        return employee ? employee.id : null;
    } catch (error) {
        console.error('Error getting employee ID by NRC:', error);
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    const nrcInput = document.getElementById('nrc');
    
    nrcInput.addEventListener('input', async function(e) {
        let value = e.target.value.replace(/\D/g, ''); // Remove all non-digits
        
        // Format the number as it's being typed
        if (value.length > 0) {
            // Add first slash after 6 digits
            if (value.length >= 6) {
                value = value.slice(0, 6) + '/' + value.slice(6);
            }
            // Add second slash after 2 more digits
            if (value.length >= 9) {
                value = value.slice(0, 9) + '/' + value.slice(9);
            }
            // Limit to correct format (######/##/#)
            if (value.length > 11) {
                value = value.slice(0, 11);
            }
        }
        
        e.target.value = value;
        
        // Check for existing employee when NRC is complete
        if (value.length === 11) {
            const existingEmpId = await getEmployeeIdByNRC(value);
            if (existingEmpId) {
                document.getElementById('employeeId').value = existingEmpId;
                await loadEmployeeData(existingEmpId);
            } else {
                document.getElementById('employeeId').value = generateEmployeeId();
            }
        }
    });

    // Add keydown event to prevent unwanted characters
    nrcInput.addEventListener('keydown', function(e) {
        // Allow: backspace, delete, tab, escape, enter and numbers
        if ([46, 8, 9, 27, 13].indexOf(e.keyCode) !== -1 ||
            // Allow: Ctrl+A, Ctrl+C, Ctrl+V
            (e.keyCode === 65 && e.ctrlKey === true) ||
            (e.keyCode === 67 && e.ctrlKey === true) ||
            (e.keyCode === 86 && e.ctrlKey === true) ||
            // Allow: home, end, left, right
            (e.keyCode >= 35 && e.keyCode <= 39) ||
            // Allow numbers
            (e.keyCode >= 48 && e.keyCode <= 57) ||
            (e.keyCode >= 96 && e.keyCode <= 105)) {
            return;
        }
        e.preventDefault();
    });

    // Display saved payslips when page loads
    await displaySavedPayslips();
});

// Function to load existing employee data
async function loadEmployeeData(employeeId) {
    try {
        const employees = await API.getEmployees();
        const employee = employees.find(emp => emp.id === employeeId);
        if (employee) {
            document.getElementById('employeeName').value = employee.name;
            document.getElementById('department').value = employee.department;
            document.getElementById('position').value = employee.position;
            document.getElementById('employmentType').value = employee.employmentType;
            document.getElementById('gradeLevel').value = employee.gradeLevel;
            document.getElementById('dateJoined').value = employee.dateJoined;
            document.getElementById('qualifications').value = employee.qualifications;
            document.getElementById('workingHours').value = employee.workingHours;
            document.getElementById('gradeTaught').value = employee.gradeTaught;
        }
    } catch (error) {
        console.error('Error loading employee data:', error);
    }
}

function calculateSalary() {
    try {
        // Get all salary-related values and convert to numbers, default to 0 if empty
        const basicSalary = parseFloat(document.getElementById('basicSalary').value) || 0;
        const housingAllowance = parseFloat(document.getElementById('housingAllowance').value) || 0;
        const transportAllowance = parseFloat(document.getElementById('transportAllowance').value) || 0;
        const responsibilityAllowance = parseFloat(document.getElementById('responsibilityAllowance').value) || 0;
        const overtime = parseFloat(document.getElementById('overtime').value) || 0;
        const napsa = parseFloat(document.getElementById('napsa').value) || 5; // Default to 5%
        const loan = parseFloat(document.getElementById('loan').value) || 0;
        const salaryAdvance = parseFloat(document.getElementById('salaryAdvance').value) || 0;

        // Basic validation for essential fields
        if (basicSalary <= 0) {
            throw new Error('Basic Salary must be greater than 0');
        }

        // Calculate overtime pay
        const hourlyRate = basicSalary / 176; // Assuming 22 working days * 8 hours
        const overtimePay = overtime * hourlyRate * 1.5;

        // Calculate gross salary
        const grossSalary = basicSalary + housingAllowance + transportAllowance + 
                           responsibilityAllowance + overtimePay;

        // Calculate deductions
        const napsaAmount = (grossSalary * napsa) / 100;
        const totalDeductions = napsaAmount + loan + salaryAdvance;

        // Calculate net salary
        const netSalary = grossSalary - totalDeductions;

        // Validate final calculations
        if (netSalary < 0) {
            throw new Error('Net salary cannot be negative. Please check deductions.');
        }

        return {
            basicSalary,
            housingAllowance,
            transportAllowance,
            responsibilityAllowance,
            overtimePay,
            grossSalary,
            napsaAmount,
            loan,
            salaryAdvance,
            totalDeductions,
            netSalary
        };
    } catch (error) {
        console.error('Calculation error:', error);
        throw new Error(`Calculation error: ${error.message}`);
    }
}

// Function to save payslip
async function savePayslip(payslipData) {
    try {
        await API.createPayslip(payslipData);
        await displaySavedPayslips();
    } catch (error) {
        console.error('Error saving payslip:', error);
    }
}

// Function to display saved payslips list
async function displaySavedPayslips() {
    try {
        const payslips = await API.getPayslips();
        const savedPayslipsDiv = document.getElementById('savedPayslips');
        savedPayslipsDiv.innerHTML = `
            <h3>Saved Payslips</h3>
            <div class="saved-payslips-list">
                ${payslips.map(payslip => `
                    <div class="saved-payslip-item" data-id="${payslip.id}">
                        <div class="payslip-info">
                            <span>${payslip.employeeName}</span>
                            <span>${new Date(payslip.date).toLocaleDateString()}</span>
                        </div>
                        <div class="payslip-actions">
                            <button onclick="viewSavedPayslip('${payslip.id}')" class="btn-view">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button onclick="deleteSavedPayslip('${payslip.id}')" class="btn-delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error displaying payslips:', error);
    }
}

// Function to view a saved payslip
async function viewSavedPayslip(payslipId) {
    try {
        const payslips = await API.getPayslips();
        const payslip = payslips.find(p => p.id === payslipId);
        if (payslip) {
            document.getElementById('payslipDetails').innerHTML = payslip.html;
            viewPayslip();
        }
    } catch (error) {
        console.error('Error viewing payslip:', error);
    }
}

// Function to delete a saved payslip
async function deleteSavedPayslip(payslipId) {
    if (confirm('Are you sure you want to delete this payslip?')) {
        try {
            // TO DO: Implement delete API endpoint
            await displaySavedPayslips();
            hidePayslip();
        } catch (error) {
            console.error('Error deleting payslip:', error);
        }
    }
}

// Update the QR code data formatting
function formatQRData(data) {
    return `
RIVERDALE ACADEMY PAYSLIP
---
EMPLOYEE DETAILS
ID: ${data.employeeId}
Name: ${data.employeeName}
Position: ${data.position}
Department: ${data.department}
---
SALARY DETAILS
Basic Pay: K${data.salary.basic.toFixed(2)}
Gross Pay: K${data.salary.gross.toFixed(2)}
Net Pay: K${data.salary.net.toFixed(2)}
---
Developed by: CHINYAMA RICHARD
Contact: 0962299100
`.trim();
}

// Update the QR code generation part in generatePayslip function
function generatePayslip() {
    try {
        // Get all required values
        const employeeId = document.getElementById('employeeId').value;
        const employeeName = document.getElementById('employeeName').value;
        const position = document.getElementById('position').value;
        const nrc = document.getElementById('nrc').value;
        const basicSalary = document.getElementById('basicSalary').value;
        const department = document.getElementById('department').value;
        const dateJoined = document.getElementById('dateJoined').value;
        const gradeTaughtSelect = document.getElementById('gradeTaught');

        // Basic validation
        if (!employeeId || !employeeName || !position || !nrc || !basicSalary || !department || !dateJoined) {
            throw new Error('Please fill in all required fields');
        }

        // Get grade taught text
        const gradeTaughtText = gradeTaughtSelect.options[gradeTaughtSelect.selectedIndex]?.text || '';

        // Calculate salary
        const calculations = calculateSalary();

        // Generate payslip HTML
        const payslipHTML = `
            <div class="payslip-header">
                <img src="zra.png" alt="ZRA Logo" class="logo logo-left">
                <div class="payslip-title">
                    <h2>RIVERDALE ACADEMY AND DAY CARE</h2>
                    <p class="school-address">21 PAIKANI PHIRI STREET RIVERSIDE, CHINGOLA</p>
                    <p class="school-contacts">📞 0967182428 | ☎️ 0212 - 271983</p>
                    <p class="payslip-month">${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                </div>
                <img src="eastlogo.jpg" alt="East Logo" class="logo logo-right">
            </div>

            <div class="payslip-section">
                <h3>Employee Information</h3>
                <div class="payslip-row"><strong>Employee ID:</strong> ${employeeId}</div>
                <div class="payslip-row"><strong>Full Name:</strong> ${employeeName}</div>
                <div class="payslip-row"><strong>Position:</strong> ${position}</div>
                <div class="payslip-row"><strong>Department:</strong> ${department}</div>
                <div class="payslip-row"><strong>Date Joined:</strong> ${dateJoined}</div>
                <div class="payslip-row"><strong>Grade Taught:</strong> ${gradeTaughtText}</div>
            </div>

            <div style="display: flex; gap: 20px;">
                <div class="payslip-section" style="flex: 1;">
                    <h3>Earnings</h3>
                    <div class="payslip-row"><strong>Basic Salary:</strong> K${calculations.basicSalary.toFixed(2)}</div>
                    <div class="payslip-row"><strong>Housing Allowance:</strong> K${calculations.housingAllowance.toFixed(2)}</div>
                    <div class="payslip-row"><strong>Transport Allowance:</strong> K${calculations.transportAllowance.toFixed(2)}</div>
                    <div class="payslip-row"><strong>Responsibility Allowance:</strong> K${calculations.responsibilityAllowance.toFixed(2)}</div>
                    <div class="payslip-row"><strong>Overtime Pay:</strong> K${calculations.overtimePay.toFixed(2)}</div>
                    <div class="payslip-row"><strong>Gross Salary:</strong> K${calculations.grossSalary.toFixed(2)}</div>
                </div>

                <div class="payslip-section" style="flex: 1;">
                    <h3>Deductions</h3>
                    <div class="payslip-row"><strong>NAPSA (5%):</strong> K${calculations.napsaAmount.toFixed(2)}</div>
                    <div class="payslip-row"><strong>Loan:</strong> K${calculations.loan.toFixed(2)}</div>
                    <div class="payslip-row"><strong>Salary Advance:</strong> K${calculations.salaryAdvance.toFixed(2)}</div>
                    <div class="payslip-row"><strong>Total Deductions:</strong> K${calculations.totalDeductions.toFixed(2)}</div>
                </div>
            </div>

            <div class="total-section">
                <div class="total-row">
                    <strong>NET SALARY:</strong>
                    <span>K${calculations.netSalary.toFixed(2)}</span>
                </div>
            </div>

            <div class="payslip-footer">
                <div class="qr-section">
                    <div id="qrcode"></div>
                </div>
                <div class="developer-info">
                    <p>System Developed By</p>
                    <h4>CHINYAMA RICHARD</h4>
                    <div class="contact-details">
                        <span><i class="fas fa-phone"></i> 0962299100</span>
                        <span><i class="fas fa-envelope"></i> chinyamarichardcr@gmail.com</span>
                    </div>
                </div>
            </div>
        `;

        // Update the payslip content
        const payslipDiv = document.getElementById('payslipDetails');
        if (payslipDiv) {
            payslipDiv.innerHTML = payslipHTML;
        }

        // Generate QR code
        setTimeout(() => {
            const qrcodeDiv = document.getElementById("qrcode");
            if (qrcodeDiv) {
                // Clear existing QR code
                qrcodeDiv.innerHTML = '';

                // Create QR code
                const qrData = {
                    employeeId,
                    employeeName,
                    position,
                    department,
                    salary: {
                        basic: calculations.basicSalary,
                        gross: calculations.grossSalary,
                        net: calculations.netSalary
                    }
                };

                new QRCode(qrcodeDiv, {
                    text: formatQRData(qrData),
                    width: 200,
                    height: 200,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.L
                });
            }
        }, 100);

        // Save and show the payslip
        savePayslip({
            employeeId,
            employeeName,
            position,
            nrc,
            department,
            dateJoined,
            gradeTaught: gradeTaughtText,
            calculations,
            generatedDate: new Date().toISOString()
        });

        viewPayslip();
    } catch (error) {
        console.error('Error details:', error);
        alert(error.message || 'There was an error generating the payslip. Please check all inputs and try again.');
    }
}

// Add print function
function printPayslip() {
    window.print();
}

function resetForm() {
    document.querySelectorAll('input:not([readonly])').forEach(input => {
        if (input.id === 'napsa') {
            input.value = '5';  // Reset NAPSA to default 5%
        } else {
            input.value = '';
        }
    });
    document.querySelectorAll('select').forEach(select => select.value = '');
    document.getElementById('payslip').classList.add('hidden');
}

// Add these new functions
function viewPayslip() {
    const payslip = document.getElementById('payslip');
    if (payslip) {
        payslip.classList.remove('hidden');
        payslip.scrollIntoView({ behavior: 'smooth' });
    }
}

function hidePayslip() {
    document.getElementById('payslip').classList.add('hidden');
}

function deletePayslip() {
    if (confirm('Are you sure you want to delete this payslip?')) {
        const payslip = document.getElementById('payslip');
        payslip.classList.add('hidden');
        document.getElementById('payslipDetails').innerHTML = '';
        // Don't need to remove from storage here as this just hides the current view
    }
}

// Add this helper function to validate numbers
function validateNumber(value) {
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
}

function validateRequiredFields() {
    const requiredFields = {
        'employeeId': 'Employee ID',
        'employeeName': 'Employee Name',
        'position': 'Position',
        'nrc': 'NRC Number',
        'basicSalary': 'Basic Salary',
        'department': 'Department',
        'dateJoined': 'Date Joined',
        'gradeTaught': 'Grade Taught'
    };

    for (const [fieldId, fieldName] of Object.entries(requiredFields)) {
        const field = document.getElementById(fieldId);
        if (!field.value) {
            throw new Error(`${fieldName} is required`);
        }
    }
}