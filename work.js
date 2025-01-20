let students = [];
let currentStudentNumber = 20240001;
let schoolFees = {};
let db;
let currentTerm = '';
let currentYear = '';
let dbInitialized = false;

function initDB() {
    const request = indexedDB.open('EastBoundarySchool', 2);

    request.onerror = function(event) {
        console.error("IndexedDB error:", event.target.error);
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        console.log("Database ready");
        loadDataFromDB(); // Load existing data once DB is ready
    };

    request.onupgradeneeded = function(event) {
        db = event.target.result;
        
        if (!db.objectStoreNames.contains('students')) {
            const objectStore = db.createObjectStore('students', { keyPath: 'studentNumber' });
            objectStore.createIndex('grade', 'grade', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('schoolFees')) {
            db.createObjectStore('schoolFees', { keyPath: 'id' });
        }
    };
}

// Call initDB when the page loads
window.onload = function() {
    initDB();
    initializeDataPersistence();
};

function loadDataFromDB() {
    return new Promise((resolve, reject) => {
        try {
            if (!db) {
                throw new Error('Database not initialized');
            }

            const transaction = db.transaction(['students'], 'readonly');
            const objectStore = transaction.objectStore('students');
            const request = objectStore.getAll();

            request.onsuccess = function(event) {
                students = event.target.result || [];
                if (students.length > 0) {
                    currentStudentNumber = getNextStudentNumber();
                }
                updateStudentTable();
                updateDashboard();
                updateGradeSummary();
                resolve(students);
            };

            request.onerror = function(event) {
                reject(event.target.error);
            };
        } catch (error) {
            console.error("Error in loadDataFromDB:", error);
            reject(error);
        }
    });
}

function saveStudentToDB(student, callback) {
    const transaction = db.transaction(['students'], 'readwrite');
    const objectStore = transaction.objectStore('students');
    const request = objectStore.put(student);

    request.onsuccess = function(event) {
        console.log("Student saved to DB");
        if (callback) callback();
    };

    request.onerror = function(event) {
        console.error("Error saving student:", event.target.error);
    };
}

function deleteStudentFromDB(studentNumber) {
    if (!db) {
        console.error('Database not initialized');
        return;
    }

    const transaction = db.transaction(['students'], 'readwrite');
    const objectStore = transaction.objectStore('students');
    const request = objectStore.delete(studentNumber);

    request.onsuccess = function() {
        console.log('Student deleted from DB successfully');
    };

    request.onerror = function(event) {
        console.error('Error deleting student from DB:', event.target.error);
    };
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('studentForm');
    if (!form) {
        console.error('Student form not found!');
        return;
    }

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('Form submitted');

        // Get form values
        const studentName = document.getElementById('studentName').value.trim();
        const grade = document.getElementById('grade').value;
        const fees = parseFloat(document.getElementById('fees').value) || 0;
        const date = document.getElementById('date').value;
        const phoneNumber = document.getElementById('phoneNumber').value.trim();
        const gender = document.getElementById('gender').value;
        const address = document.getElementById('address').value.trim();
        const email = document.getElementById('email').value.trim();
        const term = document.getElementById('term').value;
        const year = document.getElementById('year').value;
        
        console.log('Form values:', { studentName, grade, fees, date });
        
        // Validate required fields
        if (!studentName || !grade || !date || !phoneNumber || !gender || !address || !term || !year) {
            alert('Please fill in all required fields');
            return;
        }

        // Get or generate student number
        let studentNumber = document.getElementById('studentNumber').value;
        if (!studentNumber) {
            studentNumber = generateStudentID().toString();
        }

        // Create student object
        const studentData = {
            studentNumber,
            studentName,
            grade,
            feesPaid: fees,
            balance: Math.max(0, (schoolFees[grade] || 0) - fees),
            date,
            phoneNumber,
            gender,
            address,
            email,
            term,
            year,
            paymentHistory: [{
                date,
                amount: fees,
                balance: Math.max(0, (schoolFees[grade] || 0) - fees)
            }]
        };

        console.log('Student data:', studentData);

        // Update students array first
        const existingIndex = students.findIndex(s => s.studentNumber === studentNumber);
        if (existingIndex !== -1) {
            students[existingIndex] = studentData;
        } else {
            students.push(studentData);
        }

        // Update UI immediately
        updateStudentTable();
        updateDashboard();
        updateGradeSummary();

        // Save to IndexedDB
        const transaction = db.transaction(['students'], 'readwrite');
        const objectStore = transaction.objectStore('students');
        const request = objectStore.put(studentData);

        request.onsuccess = function() {
            console.log('Student saved to DB successfully');
            showNotification('Student data has been saved successfully!');
            form.reset();
            document.getElementById('studentNumber').value = '';
        };

        request.onerror = function(event) {
            console.error('Error saving to DB:', event.target.error);
            alert('Error saving student data. Please try again.');
        };
    });
});

function generateStudentID() {
    currentStudentNumber = getNextStudentNumber();
    return currentStudentNumber;
}

function updatePaymentHistory(student, paymentDate, paidAmount) {
    const paymentHistory = student.paymentHistory || [];
    const newBalance = Math.max(0, student.balance - paidAmount);
    paymentHistory.push({
        date: paymentDate,
        amount: paidAmount,
        balance: newBalance
    });
    student.paymentHistory = paymentHistory;
}

function updateStudentTable(studentsToDisplay = students) {
    const gradeContainer = document.getElementById('gradeContainer');
    gradeContainer.innerHTML = '';

    if (studentsToDisplay.length === 0) {
        gradeContainer.innerHTML = '<p>No students found.</p>';
        return;
    }

    for (let grade = 1; grade <= 9; grade++) {
        const gradeStudents = studentsToDisplay.filter(student => student.grade == grade);
        if (gradeStudents.length > 0) {
            const gradeTable = document.createElement('div');
            gradeTable.classList.add('table-container');
            gradeTable.innerHTML = `
                <table>
                    <thead>
                        <tr>
                            <th colspan="11">Grade ${grade}</th>
                        </tr>
                        <tr>
                            <th>Student Number</th>
                            <th>Name</th>
                            <th>Grade</th>
                            <th>Fees Paid</th>
                            <th>Balance</th>
                            <th>Date</th>
                            <th>Phone</th>
                            <th>Gender</th>
                            <th>Address</th>
                            <th>Email</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            `;

            const tableBody = gradeTable.querySelector('tbody');
            gradeStudents.forEach(student => {
                const row = tableBody.insertRow();
                ['studentNumber', 'studentName', 'grade', 'feesPaid', 'balance', 'date', 'phoneNumber', 'gender', 'address', 'email'].forEach((key, index) => {
                    const cell = row.insertCell();
                    cell.textContent = student[key] !== undefined ? student[key] : 'N/A';
                    cell.setAttribute('data-label', ['Student Number', 'Name', 'Grade', 'Fees Paid', 'Balance', 'Date', 'Phone', 'Gender', 'Address', 'Email'][index]);
                });

                const actionsCell = row.insertCell();
                actionsCell.setAttribute('data-label', 'Actions');
                
                const editButton = document.createElement('button');
                editButton.textContent = 'Edit';
                editButton.onclick = () => editStudent(student);
                
                const invoiceButton = document.createElement('button');
                invoiceButton.textContent = 'Invoice';
                invoiceButton.onclick = () => showInvoice(student);
                
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.style.backgroundColor = '#dc3545';
                deleteButton.style.marginLeft = '5px';
                deleteButton.onclick = () => {
                    if (confirm('Are you sure you want to delete this student?')) {
                        deleteStudent(student.studentNumber);
                    }
                };
                
                actionsCell.appendChild(editButton);
                actionsCell.appendChild(invoiceButton);
                actionsCell.appendChild(deleteButton);

                // Apply color coding based on payment status
                if (student.feesPaid >= schoolFees[student.grade]) {
                    row.classList.add('paid-full');
                } else if (student.feesPaid > 0) {
                    row.classList.add('paid-partial');
                } else {
                    row.classList.add('paid-none');
                }
            });

            gradeContainer.appendChild(gradeTable);
        }
    }
    
    // Make sure the table is visible
    gradeContainer.style.display = 'block';
}

function editStudent(student) {
    document.getElementById('studentNumber').value = student.studentNumber;
    document.getElementById('studentName').value = student.studentName;
    document.getElementById('grade').value = student.grade;
    document.getElementById('fees').value = '';
    document.getElementById('date').value = student.date;
    document.getElementById('phoneNumber').value = student.phoneNumber;
    document.getElementById('gender').value = student.gender;
    document.getElementById('address').value = student.address;
    document.getElementById('email').value = student.email;
    document.getElementById('term').value = student.term;
    document.getElementById('year').value = student.year;
}

function updateDashboard() {
    const totalFees = students.reduce((sum, student) => sum + student.feesPaid, 0);
    document.getElementById('totalFees').textContent = totalFees.toFixed(2);

    const averageFees = students.length > 0 ? totalFees / students.length : 0;
    document.getElementById('averageFees').textContent = averageFees.toFixed(2);

    document.getElementById('totalStudents').textContent = students.length;
    
    updateGradeCounts();
    
    sendPaymentReminders();
}

function resetForm() {
    document.getElementById('studentForm').reset();
    document.getElementById('studentNumber').value = '';
}

function searchStudents() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const filteredStudents = students.filter(student => 
        student.studentName.toLowerCase().includes(searchInput) ||
        student.studentNumber.toLowerCase().includes(searchInput) ||
        student.grade.toString().includes(searchInput)
    );
    
    updateStudentTable(filteredStudents);
}

function checkGradePayments() {
    const grade = document.getElementById('gradeSelect').value;
    const term = document.getElementById('termSelect').value;
    const year = document.getElementById('yearInput').value;

    if (grade && term && year) {
        const gradeStudents = students.filter(student => student.grade === grade);
        const totalPaid = gradeStudents.reduce((sum, student) => sum + student.feesPaid, 0);
        const totalBalance = gradeStudents.reduce((sum, student) => sum + student.balance, 0);

        let studentsTable = `
            <h3>Grade ${grade} Students</h3>
            <table>
                <tr>
                    <th>Student Number</th>
                    <th>Name</th>
                    <th>Fees Paid</th>
                    <th>Balance</th>
                </tr>
                ${gradeStudents.map(student => `
                    <tr>
                        <td data-label="Student Number">${student.studentNumber}</td>
                        <td data-label="Name">${student.studentName}</td>
                        <td data-label="Fees Paid">${student.feesPaid}</td>
                        <td data-label="Balance">${student.balance}</td>
                    </tr>
                `).join('')}
            </table>
        `;

        const paymentSummary = `
            <h3>Payment Summary</h3>
            <p>Total Paid: ${totalPaid}</p>
            <p>Total Balance: ${totalBalance}</p>
        `;

        const gradeSummaryContainer = document.getElementById('gradeSummaryContainer');
        gradeSummaryContainer.classList.remove('hidden');
        document.getElementById('gradeSummary').innerHTML = studentsTable + paymentSummary;
    } else {
        alert('Please select a grade, term, and year to view payments.');
    }
}

function updateGradeSummary() {
    const gradeSummaryContainer = document.getElementById('gradeSummaryContainer');
    gradeSummaryContainer.classList.remove('hidden');
    const gradeSummary = document.getElementById('gradeSummary');
    gradeSummary.innerHTML = '';

    for (let grade = 1; grade <= 9; grade++) {
        const gradeStudents = students.filter(student => student.grade == grade);
        if (gradeStudents.length > 0) {
            const gradeTable = document.createElement('table');
            gradeTable.innerHTML = `
                <thead>
                    <tr>
                        <th colspan="4">Grade ${grade}</th>
                    </tr>
                    <tr>
                        <th>Student Number</th>
                        <th>Name</th>
                        <th>Fees Paid</th>
                        <th>Balance</th>
                    </tr>
                </thead>
                </tbody>
            `;

            const tableBody = gradeTable.querySelector('tbody');
            gradeStudents.forEach(student => {
                const row = tableBody.insertRow();
                ['studentNumber', 'studentName', 'feesPaid', 'balance'].forEach((key, index) => {
                    const cell = row.insertCell();
                    cell.textContent = student[key];
                    cell.setAttribute('data-label', ['Student Number', 'Name', 'Fees Paid', 'Balance'][index]);
                });

                if (student.feesPaid >= schoolFees[student.grade]) {
                    row.classList.add('paid-full');
                } else if (student.feesPaid > 0) {
                    row.classList.add('paid-partial');
                } else {
                    row.classList.add('paid-none');
                }
            });

            gradeSummary.appendChild(gradeTable);
        }
    }
}

function addSchoolFees() {
    const grade = document.getElementById('gradeSelect').value;
    const term = document.getElementById('termSelect').value;
    const year = document.getElementById('yearInput').value;
    const fees = parseFloat(prompt(`Enter school fees for Grade ${grade}, Term ${term}, Year ${year}`));

    if (!grade || !term || !year || isNaN(fees)) {
        alert('Please select grade, term, year, and enter a valid fees amount.');
        return;
    }

    schoolFees[grade] = fees;
    updateGradeSummary();
    alert(`School fees for Grade ${grade}, Term ${term}, Year ${year} set to ${fees}`);
}

function deleteSchoolFees() {
    const grade = document.getElementById('gradeSelect').value;

    if (grade) {
        delete schoolFees[grade];
        alert(`School fees for Grade ${grade} deleted.`);
        updateGradeSummary();
    } else {
        alert('Please select a grade to delete its fees.');
    }
}

function refreshDashboard() {
    updateDashboard();
}

function saveDashboard() {
    // Save students data
    students.forEach(saveStudentToDB);
    
    // Save school fees to IndexedDB
    const schoolFeesTransaction = db.transaction(['schoolFees'], 'readwrite');
    const schoolFeesStore = schoolFeesTransaction.objectStore('schoolFees');
    schoolFeesStore.put({ id: 'fees', data: schoolFees });
    
    // Create and show notification
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.backgroundColor = '#4CAF50';
    notification.style.color = 'white';
    notification.style.padding = '15px';
    notification.style.borderRadius = '5px';
    notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    notification.style.zIndex = '1000';
    notification.innerHTML = `
        <div style="display: flex; align-items: center;">
            <span style="margin-right: 10px;">✓</span>
            <div>
                <strong>Success!</strong><br>
                Dashboard data has been saved successfully!
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
}

function deleteDashboard() {
    if (confirm('Are you sure you want to delete all dashboard data? This action cannot be undone.')) {
        // Clear IndexedDB
        const transaction = db.transaction(['students'], 'readwrite');
        const objectStore = transaction.objectStore('students');
        const request = objectStore.clear();

        request.onsuccess = function() {
            // Clear all data
            students = [];
            schoolFees = {};
            
            // Clear localStorage
            localStorage.clear();
            
            // Update UI
            updateDashboard();
            updateStudentTable();
            updateGradeSummary();
            
            showNotification('All dashboard data deleted!', 'red');
        };
    }
}

function refreshGradeSummary() {
    updateGradeSummary();
}

// Update the QR code generation function
function generateQRCode(student) {
    const qrContainer = document.getElementById("qrcode");
    qrContainer.innerHTML = '';

    // Updated format with separators and vertical layout
    const qrData = `
RIVERDALE ACADEMY
====================

STUDENT DETAILS
Name: ${student.studentName}
Student No: ${student.studentNumber}
Grade: ${student.grade}

PAYMENT DETAILS
Date of Payment: ${student.date}
Amount to be Paid: K${schoolFees[student.grade] || 0}
Fees Paid: K${student.feesPaid}
Balance: K${student.balance}

CONTACT INFO
Tel: 0962299100
Developer: CHINYAMA RICHARD
`.trim();

    // Rest of the function remains the same
    new QRCode(qrContainer, {
        text: qrData,
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M,
        margin: 2,
        quietZone: 10
    });

    const qrImg = qrContainer.querySelector('img');
    if (qrImg) {
        qrImg.style.backgroundColor = '#ffffff';
        qrImg.style.padding = '10px';
    }
}

// Update the showInvoice function
function showInvoice(student) {
    const invoiceModal = document.getElementById('invoiceModal');
    const invoiceContent = document.getElementById('invoiceContent');
    
    invoiceContent.innerHTML = `
        <div class="invoice-wrapper" style="
            padding: 20px;
            background: white;
            max-width: 800px;
            margin: 0 auto;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            border-radius: 10px;
            position: relative;
        ">
            <!-- Elegant Header - Reduced spacing -->
            <div style="
                text-align: center;
                padding-bottom: 15px;
                margin-bottom: 15px;
                border-bottom: 2px solid #f0f0f0;
            ">
                <img src="images/eastlogo.jpg" alt="School Logo" style="
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    margin-bottom: 10px;
                ">
                <h1 style="
                    margin: 0;
                    font-size: 32px;
                    font-weight: 700;
                    color: #2c3e50;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                ">RIVERDALE ACADEMY</h1>
                <div style="
                    width: 60px;
                    height: 3px;
                    background: #2c3e50;
                    margin: 15px auto;
                "></div>
                <div style="
                    color: #dc3545;
                    font-size: 15px;
                    line-height: 1.6;
                    max-width: 500px;
                    margin: 0 auto;
                ">
                    21 PAIKANI PHIRI STREET RIVERSIDE, CHINGOLA<br>
                    <span style="color: #2c3e50; font-weight: 500;">
                        📞 0967182428 | ☎️ 0212 - 271983
                    </span>
                </div>
            </div>

            <!-- Invoice Title & Number -->
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 10px;
                border: 1px solid #eef2f7;
            ">
                <div>
                    <h2 style="
                        color: #2c3e50;
                        margin: 0;
                        font-size: 24px;
                        font-weight: 600;
                    ">OFFICIAL RECEIPT</h2>
                    <p style="
                        margin: 5px 0 0 0;
                        color: #666;
                        font-size: 14px;
                    ">Issue Date: ${student.date}</p>
                </div>
                <div style="
                    padding: 12px 25px;
                    background: #2c3e50;
                    border-radius: 8px;
                    color: white;
                ">
                    <p style="margin: 0; font-size: 12px; opacity: 0.9;">Receipt No.</p>
                    <p style="margin: 3px 0 0 0; font-weight: 600; font-size: 16px;">#${student.studentNumber}</p>
                </div>
            </div>

            <!-- Student Details Card -->
            <div style="
                background: #fafafa;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 15px;
            ">
                <h3 style="
                    margin: 0 0 20px 0;
                    color: #2c3e50;
                    font-size: 18px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                ">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#2c3e50">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                    Student Information
                </h3>
                <div style="
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                ">
                    ${['Name', 'Student Number', 'Grade', 'Term'].map((label, index) => `
                        <div style="
                            padding: 15px;
                            background: #f8f9fa;
                            border-radius: 8px;
                            border: 1px solid #eef2f7;
                        ">
                            <p style="
                                margin: 0;
                                color: #666;
                                font-size: 13px;
                                text-transform: uppercase;
                                letter-spacing: 0.5px;
                            ">${label}</p>
                            <p style="
                                margin: 5px 0 0 0;
                                color: #2c3e50;
                                font-weight: 600;
                                font-size: 15px;
                            ">${
                                index === 0 ? student.studentName :
                                index === 1 ? student.studentNumber :
                                index === 2 ? student.grade :
                                student.term
                            }</p>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Payment Details Table -->
            <div style="margin-bottom: 40px;">
                <table style="
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                    background: white;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.04);
                ">
                    <thead>
                        <tr style="background: #2c3e50;">
                            <th style="
                                padding: 20px 25px;
                                text-align: left;
                                color: white;
                                font-weight: 500;
                                font-size: 15px;
                                letter-spacing: 0.5px;
                            ">Description</th>
                            <th style="
                                padding: 20px 25px;
                                text-align: right;
                                color: white;
                                font-weight: 500;
                                font-size: 15px;
                                letter-spacing: 0.5px;
                            ">Amount (ZMW)</th>
                    </tr>
                    </thead>
                    <tbody>
                        ${[
                            {
                                label: 'Total Fees to be Paid',
                                value: (schoolFees[student.grade] || 0).toFixed(2),
                                color: '#2c3e50'
                            },
                            {
                                label: 'School Fees Paid',
                                value: student.feesPaid.toFixed(2),
                                color: '#2e7d32'
                            },
                            {
                                label: 'Balance',
                                value: student.balance.toFixed(2),
                                color: student.balance > 0 ? '#c62828' : '#2e7d32'
                            }
                        ].map((item, index) => `
                            <tr style="background: ${index % 2 === 0 ? '#fff' : '#f8f9fa'};">
                                <td style="
                                    padding: 18px 25px;
                                    border-bottom: 1px solid #eef2f7;
                                    color: #2c3e50;
                                    font-size: 14px;
                                ">${item.label}</td>
                                <td style="
                                    padding: 18px 25px;
                                    border-bottom: 1px solid #eef2f7;
                                    text-align: right;
                                    color: ${item.color};
                                    font-family: 'Courier New', monospace;
                                    font-size: 15px;
                                    letter-spacing: 0.5px;
                                ">K ${item.value}</td>
                    </tr>
                        `).join('')}
                        <tr style="background: #f8f9fa;">
                            <td style="
                                padding: 20px 25px;
                                font-weight: 600;
                                color: #2c3e50;
                                font-size: 16px;
                            ">Total Paid</td>
                            <td style="
                                padding: 20px 25px;
                                text-align: right;
                                font-weight: 600;
                                color: #2e7d32;
                                font-family: 'Courier New', monospace;
                                font-size: 16px;
                                letter-spacing: 0.5px;
                            ">K ${student.feesPaid.toFixed(2)}</td>
                    </tr>
                    </tbody>
                </table>
            </div>

            <!-- Verification Section -->
            <div class="verification-section" style="
                display: flex;
                justify-content: space-between;
                margin: 15px 0;
                padding: 10px 0;
            ">
                <!-- QR Code - Smaller size -->
                <div style="
                    background: white;
                    padding: 10px;
                    border-radius: 8px;
                ">
                    <div id="qrcode"></div>
                </div>

                <!-- Signature Section -->
                <div style="flex-grow: 1; margin: 0 20px;">
                    <div style="
                        width: 100%;
                        border-bottom: 2px solid #eef2f7;
                        margin-bottom: 10px;
                    "></div>
                    <p style="
                        margin: 0;
                        color: #666;
                        font-size: 14px;
                    ">Authorized Signature</p>
                </div>

                <!-- Date Stamp - Smaller size -->
                <div class="date-stamp" style="
                    width: 100px;
                    height: 100px;
                ">
                    <div style="
                        font-size: 12px;
                        color: #666;
                        margin-bottom: 5px;
                    ">DATE STAMP</div>
                    <div style="
                        font-size: 14px;
                        color: #2c3e50;
                        font-weight: 600;
                    ">${new Date().toLocaleDateString('en-GB')}</div>
                </div>
            </div>

            <!-- Footer - Reduced spacing -->
            <div class="footer-section" style="
                text-align: center;
                margin-top: 15px;
                padding-top: 15px;
                border-top: 1px solid #eee;
            ">
                <p style="
                    margin: 0 0 5px 0;
                    color: #2c3e50;
                    font-weight: 500;
                ">Thank you for your payment!</p>
                <div style="
                    margin-top: 15px;
                    padding-top: 15px;
                    border-top: 1px dashed #eef2f7;
                    font-size: 12px;
                    color: #666;
                ">
                    <p style="margin: 2px 0;">System developed by CHINYAMA RICHARD</p>
                    <p style="margin: 2px 0;">📞 0962299100, 0765099249</p>
                    <p style="margin: 2px 0;">✉️ chinyamarichardcr@gmail.com</p>
                </div>
            </div>

            <!-- Official Stamp - Adjusted size and position -->
            <div class="official-stamp" style="
                position: absolute;
                bottom: 80px;
                right: 40px;
                width: 100px;
                height: 100px;
            ">
                <div style="text-align: center;">
                    <p style="margin: 0;">OFFICIAL</p>
                    <p style="margin: 3px 0;">STAMP</p>
                </div>
            </div>
        </div>
    `;

    // Show modal
    invoiceModal.style.display = 'block';

    // Generate QR code after modal is shown
    setTimeout(() => generateQRCode(student), 100);

    // Close button functionality
    const closeBtn = invoiceModal.querySelector('.close');
    closeBtn.onclick = function() {
        invoiceModal.style.display = 'none';
        document.getElementById('qrcode').innerHTML = '';
    }
}

// Function to print invoice
function printInvoice() {
    const printContent = document.getElementById('invoiceContent').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Student Invoice</title>
                <style>
                    @page {
                        size: A4;
                        margin: 0.3cm;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 0;
                        font-size: 12px;
                    }
                    .invoice-wrapper {
                        padding: 15px !important;
                        max-width: none !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                    }
                    /* Compact header */
                    .invoice-wrapper > div:first-child {
                        padding-bottom: 10px !important;
                        margin-bottom: 10px !important;
                    }
                    .invoice-wrapper h1 {
                        font-size: 24px !important;
                        margin: 5px 0 !important;
                    }
                    /* Smaller logo */
                    .invoice-wrapper img {
                        width: 60px !important;
                        height: 60px !important;
                        margin-bottom: 5px !important;
                    }
                    /* Compact table */
                    table {
                        margin-bottom: 10px !important;
                    }
                    table th, table td {
                        padding: 6px 12px !important;
                        font-size: 11px !important;
                    }
                    /* Compact student details */
                    .student-details {
                        padding: 10px !important;
                        margin-bottom: 10px !important;
                    }
                    .student-details h3 {
                        font-size: 14px !important;
                        margin-bottom: 8px !important;
                    }
                    /* Smaller verification section */
                    .verification-section {
                        margin: 10px 0 !important;
                        padding: 5px 0 !important;
                    }
                    /* Smaller QR code */
                    #qrcode img {
                        width: 60px !important;
                        height: 60px !important;
                    }
                    /* Smaller stamps */
                    .date-stamp, .official-stamp {
                        width: 80px !important;
                        height: 80px !important;
                        font-size: 10px !important;
                    }
                    /* Compact footer */
                    .footer-section {
                        margin-top: 10px !important;
                        padding-top: 5px !important;
                        font-size: 10px !important;
                    }
                    /* Ensure no page breaks */
                    .invoice-wrapper {
                        page-break-inside: avoid !important;
                        page-break-before: auto !important;
                        page-break-after: auto !important;
                    }
                    /* Hide print button */
                    @media print {
                        button { display: none !important; }
                    }
                    /* Adjust grid layout */
                    .student-info-grid {
                        grid-template-columns: repeat(4, 1fr) !important;
                        gap: 8px !important;
                    }
                    /* Adjust spacing for all elements */
                    * {
                        margin-bottom: 0.3em !important;
                    }
                    /* Compact address and contact */
                    .contact-info {
                        font-size: 11px !important;
                        line-height: 1.2 !important;
                    }
                    /* Adjust receipt number section */
                    .receipt-number {
                        padding: 8px 15px !important;
                    }
                    /* Make verification section more compact */
                    .verification-section > div {
                        transform: scale(0.9) !important;
                    }
                </style>
            </head>
            <body>
                ${printContent}
            </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
}

function hideInvoice() {
    const invoiceModal = document.getElementById('invoiceModal');
    invoiceModal.style.display = 'none';
}

document.getElementById('viewSummaryBtn').addEventListener('click', () => {
    const gradeSummaryContainer = document.getElementById('gradeSummaryContainer');
    gradeSummaryContainer.classList.remove('hidden');
    document.getElementById('hideSummaryBtn').classList.remove('hidden');
    document.getElementById('viewSummaryBtn').classList.add('hidden');
});

document.getElementById('hideSummaryBtn').addEventListener('click', () => {
    const gradeSummaryContainer = document.getElementById('gradeSummaryContainer');
    gradeSummaryContainer.classList.add('hidden');
    document.getElementById('hideSummaryBtn').classList.add('hidden');
    document.getElementById('viewSummaryBtn').classList.remove('hidden');
});

document.querySelector('.close').addEventListener('click', hideInvoice);

// Load saved data
const savedStudents = localStorage.getItem('students');
if (savedStudents) {
    students = JSON.parse(savedStudents);
    updateStudentTable();
    updateDashboard();
}

const savedSchoolFees = localStorage.getItem('schoolFees');
if (savedSchoolFees) {
    schoolFees = JSON.parse(savedSchoolFees);
}

function hideTable() {
    document.getElementById('gradeContainer').style.display = 'none';
}

function viewTable() {
    document.getElementById('gradeContainer').style.display = 'block';
}

function deleteTable() {
    if (confirm('Are you sure you want to delete all student records? This action cannot be undone.')) {
        const transaction = db.transaction(['students'], 'readwrite');
        const objectStore = transaction.objectStore('students');
        const request = objectStore.clear();

        request.onsuccess = function() {
            students = [];
            updateStudentTable();
            updateDashboard();
            updateGradeSummary();
            showNotification('All student records deleted!', 'red');
        };
    }
}

function deleteGradeSummary() {
    if (confirm('Are you sure you want to delete the grade summary?')) {
        document.getElementById('gradeSummary').innerHTML = '';
        showNotification('Grade summary deleted!', 'red');
    }
}

function saveGradeSummaryToFile() {
    students.forEach(saveStudentToDB);
    alert('Grade summary saved.');
}

function sendPaymentReminders() {
const studentsWithOutstandingBalances = students.filter(student => student.balance > 0);
    studentsWithOutstandingBalances.forEach(student => {
        const reminderMessage = `Dear ${student.studentName}, you have an outstanding balance of ${student.balance}. Please make a payment to avoid penalties or late fees.`;
        // Send reminder message to student
    });
}

// Initialize the dashboard and tables
updateDashboard();
updateStudentTable();
updateGradeSummary();

// Add this function to handle the search
function searchStudents() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const filteredStudents = students.filter(student => 
        student.studentName.toLowerCase().includes(searchInput) ||
        student.studentNumber.toLowerCase().includes(searchInput) ||
        student.grade.toString().includes(searchInput)
    );
    
    updateStudentTable(filteredStudents);
}

// Add this event listener for real-time search
document.getElementById('searchInput').addEventListener('input', searchStudents);

// If there's a search button, you can also add this event listener
document.getElementById('searchButton').addEventListener('click', searchStudents);

document.getElementById('termSelect').addEventListener('change', function() {
    currentTerm = this.value;
    updateStudentTermAndYear();
});

document.getElementById('yearInput').addEventListener('input', function() {
    currentYear = this.value;
    updateStudentTermAndYear();
});

function updateStudentTermAndYear() {
    // Assuming you have a way to get the current student object
    if (currentStudent) { 
        currentStudent.term = currentTerm;
        currentStudent.year = currentYear;
    }
}

// Add this code to load the saved dashboard data when the page loads
window.addEventListener('load', function() {
    // Load school fees
    const savedSchoolFees = localStorage.getItem('schoolFees');
    if (savedSchoolFees) {
        schoolFees = JSON.parse(savedSchoolFees);
    }
    
    // Load current term and year
    const savedTerm = localStorage.getItem('currentTerm');
    if (savedTerm) {
        currentTerm = savedTerm;
        document.getElementById('termSelect').value = savedTerm;
    }
    
    const savedYear = localStorage.getItem('currentYear');
    if (savedYear) {
        currentYear = savedYear;
        document.getElementById('yearInput').value = savedYear;
    }
    
    // Load dashboard data
    const savedDashboardData = localStorage.getItem('dashboardData');
    if (savedDashboardData) {
        const dashboardData = JSON.parse(savedDashboardData);
        document.getElementById('totalFees').textContent = dashboardData.totalFees;
        document.getElementById('averageFees').textContent = dashboardData.averageFees;
        document.getElementById('totalStudents').textContent = dashboardData.totalStudents;
    }
});

// Add this function to update the grade counts
function updateGradeCounts() {
    // Initialize counts
    const gradeCounts = {
        1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 
        6: 0, 7: 0, 8: 0, 9: 0
    };
    
    // Count students in each grade
    students.forEach(student => {
        if (gradeCounts.hasOwnProperty(student.grade)) {
            gradeCounts[student.grade]++;
        }
    });
    
    // Update the display for each grade
    Object.keys(gradeCounts).forEach(grade => {
        document.getElementById(`grade${grade}Count`).textContent = gradeCounts[grade];
    });
    
    // Update total
    const total = Object.values(gradeCounts).reduce((sum, count) => sum + count, 0);
    document.getElementById('totalCount').textContent = total;
}

// Update the deleteStudent function
function deleteStudent(studentNumber) {
    // Delete from IndexedDB
    deleteStudentFromDB(studentNumber);
    
    // Remove from students array
    const index = students.findIndex(s => s.studentNumber === studentNumber);
    if (index !== -1) {
        students.splice(index, 1);
        
        // Save updated array to localStorage
        saveToLocalStorage();
        
        // Update UI
        updateStudentTable();
        updateDashboard();
        updateGradeSummary();
        
        // Show notification
        showNotification('Student deleted successfully!', '#dc3545');
    }
}

// Add helper function for notifications
function showNotification(message, color = '#4CAF50') {
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.backgroundColor = color;
    notification.style.color = 'white';
    notification.style.padding = '15px';
    notification.style.borderRadius = '5px';
    notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    notification.style.zIndex = '1000';
    notification.innerHTML = `
        <div style="display: flex; align-items: center;">
            <span style="margin-right: 10px;">${color === 'red' ? '!' : '✓'}</span>
            <div>
                <strong>${color === 'red' ? 'Deleted!' : 'Success!'}</strong><br>
                ${message}
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
}

function getNextStudentNumber() {
    // Get the highest student number currently in use
    const highestNumber = students.reduce((highest, student) => {
        const studentNum = parseInt(student.studentNumber);
        return studentNum > highest ? studentNum : highest;
    }, currentStudentNumber - 1);
    
    // Set the next number to be one higher than the highest existing number
    return highestNumber + 1;
}

// Add this function to save data to localStorage as backup
function saveToLocalStorage() {
    try {
        localStorage.setItem('students', JSON.stringify(students));
        localStorage.setItem('currentStudentNumber', currentStudentNumber.toString());
        localStorage.setItem('schoolFees', JSON.stringify(schoolFees));
        localStorage.setItem('currentTerm', currentTerm);
        localStorage.setItem('currentYear', currentYear);
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

// Update loadDataFromDB to also check localStorage
function loadDataFromDB() {
    return new Promise((resolve, reject) => {
        try {
            // First try to load from IndexedDB
            if (!db) {
                // If IndexedDB is not available, try loading from localStorage
                const savedStudents = localStorage.getItem('students');
                if (savedStudents) {
                    students = JSON.parse(savedStudents);
                    currentStudentNumber = parseInt(localStorage.getItem('currentStudentNumber')) || 20240001;
                    schoolFees = JSON.parse(localStorage.getItem('schoolFees')) || {};
                    currentTerm = localStorage.getItem('currentTerm') || '';
                    currentYear = localStorage.getItem('currentYear') || '';
                    
                    updateStudentTable();
                    updateDashboard();
                    updateGradeSummary();
                    resolve(students);
                    return;
                }
                throw new Error('Database not initialized');
            }

            const transaction = db.transaction(['students'], 'readonly');
            const objectStore = transaction.objectStore('students');
            const request = objectStore.getAll();

            request.onsuccess = function(event) {
                students = event.target.result || [];
                if (students.length > 0) {
                    currentStudentNumber = getNextStudentNumber();
                }
                // Save to localStorage as backup
                saveToLocalStorage();
                
                updateStudentTable();
                updateDashboard();
                updateGradeSummary();
                resolve(students);
            };

            request.onerror = function(event) {
                // Try loading from localStorage if IndexedDB fails
                const savedStudents = localStorage.getItem('students');
                if (savedStudents) {
                    students = JSON.parse(savedStudents);
                    currentStudentNumber = parseInt(localStorage.getItem('currentStudentNumber')) || 20240001;
                    updateStudentTable();
                    updateDashboard();
                    updateGradeSummary();
                    resolve(students);
                } else {
                    reject(event.target.error);
                }
            };
        } catch (error) {
            console.error("Error in loadDataFromDB:", error);
            reject(error);
        }
    });
}

// Update the form submission handler to save to both IndexedDB and localStorage
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('studentForm');
    if (!form) {
        console.error('Student form not found!');
        return;
    }

    // Load saved data when page loads
    const savedStudents = localStorage.getItem('students');
    if (savedStudents) {
        students = JSON.parse(savedStudents);
        currentStudentNumber = parseInt(localStorage.getItem('currentStudentNumber')) || 20240001;
        schoolFees = JSON.parse(localStorage.getItem('schoolFees')) || {};
        currentTerm = localStorage.getItem('currentTerm') || '';
        currentYear = localStorage.getItem('currentYear') || '';
        
        updateStudentTable();
        updateDashboard();
        updateGradeSummary();
    }

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        // ... existing form validation code ...

        // Create student object
        const studentData = {
            studentNumber,
            studentName,
            grade,
            feesPaid: fees,
            balance: Math.max(0, (schoolFees[grade] || 0) - fees),
            date,
            phoneNumber,
            gender,
            address,
            email,
            term,
            year,
            paymentHistory: [{
                date,
                amount: fees,
                balance: Math.max(0, (schoolFees[grade] || 0) - fees)
            }]
        };

        // Update students array
        const existingIndex = students.findIndex(s => s.studentNumber === studentNumber);
        if (existingIndex !== -1) {
            students[existingIndex] = studentData;
        } else {
            students.push(studentData);
        }

        // Save to both IndexedDB and localStorage
        if (db) {
            const transaction = db.transaction(['students'], 'readwrite');
            const objectStore = transaction.objectStore('students');
            objectStore.put(studentData);
        }
        saveToLocalStorage();

        // Update UI
        updateStudentTable();
        updateDashboard();
        updateGradeSummary();

        showNotification('Student data has been saved successfully!');
        form.reset();
        document.getElementById('studentNumber').value = '';
    });
});

// Add this function to handle real-time data saving
function saveDataInRealTime() {
    // Save to IndexedDB
    if (db) {
        const transaction = db.transaction(['students'], 'readwrite');
        const objectStore = transaction.objectStore('students');
        
        // Clear existing data
        objectStore.clear().onsuccess = function() {
            // Save all students
            students.forEach(student => {
                objectStore.put(student);
            });
        };

        // Save school fees
        const feesTransaction = db.transaction(['schoolFees'], 'readwrite');
        const feesStore = feesTransaction.objectStore('schoolFees');
        feesStore.put({ id: 'fees', data: schoolFees });
    }

    // Save to localStorage as backup
    try {
        localStorage.setItem('students', JSON.stringify(students));
        localStorage.setItem('currentStudentNumber', currentStudentNumber.toString());
        localStorage.setItem('schoolFees', JSON.stringify(schoolFees));
        localStorage.setItem('currentTerm', currentTerm);
        localStorage.setItem('currentYear', currentYear);
        console.log('Data saved successfully');
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

// Update the form submission handler
document.addEventListener('DOMContentLoaded', function() {
    // Initialize data persistence first
    initializeDataPersistence();
    
    const form = document.getElementById('studentForm');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Get form values
        const studentName = document.getElementById('studentName').value.trim();
        const grade = document.getElementById('grade').value;
        const fees = parseFloat(document.getElementById('fees').value) || 0;
        const date = document.getElementById('date').value;
        const phoneNumber = document.getElementById('phoneNumber').value.trim();
        const gender = document.getElementById('gender').value;
        const address = document.getElementById('address').value.trim();
        const email = document.getElementById('email').value.trim();
        const term = document.getElementById('term').value;
        const year = document.getElementById('year').value;

        // Validate
        if (!studentName || !grade || !date || !phoneNumber || !gender || !address || !term || !year) {
            alert('Please fill in all required fields');
            return;
        }

        // Create student data
        const studentNumber = document.getElementById('studentNumber').value || generateStudentID().toString();
        const studentData = {
            studentNumber,
            studentName,
            grade,
            feesPaid: fees,
            balance: Math.max(0, (schoolFees[grade] || 0) - fees),
            date,
            phoneNumber,
            gender,
            address,
            email,
            term,
            year,
            paymentHistory: [{
                date,
                amount: fees,
                balance: Math.max(0, (schoolFees[grade] || 0) - fees)
            }]
        };

        // Update students array
        const existingIndex = students.findIndex(s => s.studentNumber === studentNumber);
        if (existingIndex !== -1) {
            students[existingIndex] = studentData;
        } else {
            students.push(studentData);
        }

        // Save immediately
        saveAllData();

        // Update UI
        updateStudentTable();
        updateDashboard();
        updateGradeSummary();

        // Reset form
        form.reset();
        document.getElementById('studentNumber').value = '';
        showNotification('Student data has been saved successfully!');
    });
});

// Update the deleteStudent function
function deleteStudent(studentNumber) {
    const index = students.findIndex(s => s.studentNumber === studentNumber);
    if (index !== -1) {
        students.splice(index, 1);
        saveAllData(); // Save immediately after deletion
        
        updateStudentTable();
        updateDashboard();
        updateGradeSummary();
        
        showNotification('Student deleted successfully!', '#dc3545');
    }
}

// Add auto-save functionality
let autoSaveInterval = setInterval(saveDataInRealTime, 30000); // Auto-save every 30 seconds

// Add event listener for page unload
window.addEventListener('beforeunload', function() {
    saveDataInRealTime(); // Save data before page closes
});

// Add event listener for page visibility change
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
        saveDataInRealTime(); // Save data when page is hidden/minimized
    }
});

// Update loadDataFromDB to use the new saving mechanism
function loadDataFromDB() {
    return new Promise((resolve, reject) => {
        try {
            if (!db) {
                const savedStudents = localStorage.getItem('students');
                if (savedStudents) {
                    students = JSON.parse(savedStudents);
                    currentStudentNumber = parseInt(localStorage.getItem('currentStudentNumber')) || 20240001;
                    schoolFees = JSON.parse(localStorage.getItem('schoolFees')) || {};
                    currentTerm = localStorage.getItem('currentTerm') || '';
                    currentYear = localStorage.getItem('currentYear') || '';
                    
                    updateStudentTable();
                    updateDashboard();
                    updateGradeSummary();
                    resolve(students);
                    return;
                }
            }

            const transaction = db.transaction(['students'], 'readonly');
            const objectStore = transaction.objectStore('students');
            const request = objectStore.getAll();

            request.onsuccess = function(event) {
                students = event.target.result || [];
                if (students.length > 0) {
                    currentStudentNumber = getNextStudentNumber();
                }
                saveDataInRealTime(); // Save immediately after loading
                
                updateStudentTable();
                updateDashboard();
                updateGradeSummary();
                resolve(students);
            };

            request.onerror = function(event) {
                reject(event.target.error);
            };
        } catch (error) {
            console.error("Error in loadDataFromDB:", error);
            reject(error);
        }
    });
}

// Add this function for robust data persistence
function initializeDataPersistence() {
    // First try to load from localStorage
    const savedStudents = localStorage.getItem('students');
    if (savedStudents) {
        try {
            students = JSON.parse(savedStudents);
            currentStudentNumber = parseInt(localStorage.getItem('currentStudentNumber')) || 20240001;
            schoolFees = JSON.parse(localStorage.getItem('schoolFees')) || {};
            currentTerm = localStorage.getItem('currentTerm') || '';
            currentYear = localStorage.getItem('currentYear') || '';
            
            console.log('Data loaded from localStorage:', students.length, 'students');
            updateStudentTable();
            updateDashboard();
            updateGradeSummary();
        } catch (error) {
            console.error('Error loading from localStorage:', error);
        }
    }

    // Set up automatic saving
    window.addEventListener('beforeunload', function() {
        saveAllData();
    });

    // Save periodically (every 30 seconds)
    setInterval(saveAllData, 30000);
}

// Add this function to save all data
function saveAllData() {
    try {
        // Save to localStorage
        localStorage.setItem('students', JSON.stringify(students));
        localStorage.setItem('currentStudentNumber', currentStudentNumber.toString());
        localStorage.setItem('schoolFees', JSON.stringify(schoolFees));
        localStorage.setItem('currentTerm', currentTerm);
        localStorage.setItem('currentYear', currentYear);

        // Save to IndexedDB if available
        if (db) {
            const transaction = db.transaction(['students'], 'readwrite');
            const objectStore = transaction.objectStore('students');
            
            // Clear existing data
            objectStore.clear().onsuccess = function() {
                // Save all students
                students.forEach(student => {
                    objectStore.put(student);
                });
            };
        }
        
        console.log('All data saved successfully');
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

// Update the form submission handler
document.addEventListener('DOMContentLoaded', function() {
    // Initialize data persistence first
    initializeDataPersistence();
    
    const form = document.getElementById('studentForm');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Get form values
        const studentName = document.getElementById('studentName').value.trim();
        const grade = document.getElementById('grade').value;
        const fees = parseFloat(document.getElementById('fees').value) || 0;
        const date = document.getElementById('date').value;
        const phoneNumber = document.getElementById('phoneNumber').value.trim();
        const gender = document.getElementById('gender').value;
        const address = document.getElementById('address').value.trim();
        const email = document.getElementById('email').value.trim();
        const term = document.getElementById('term').value;
        const year = document.getElementById('year').value;

        // Validate
        if (!studentName || !grade || !date || !phoneNumber || !gender || !address || !term || !year) {
            alert('Please fill in all required fields');
            return;
        }

        // Create student data
        const studentNumber = document.getElementById('studentNumber').value || generateStudentID().toString();
        const studentData = {
            studentNumber,
            studentName,
            grade,
            feesPaid: fees,
            balance: Math.max(0, (schoolFees[grade] || 0) - fees),
            date,
            phoneNumber,
            gender,
            address,
            email,
            term,
            year,
            paymentHistory: [{
                date,
                amount: fees,
                balance: Math.max(0, (schoolFees[grade] || 0) - fees)
            }]
        };

        // Update students array
        const existingIndex = students.findIndex(s => s.studentNumber === studentNumber);
        if (existingIndex !== -1) {
            students[existingIndex] = studentData;
        } else {
            students.push(studentData);
        }

        // Save immediately
        saveAllData();

        // Update UI
        updateStudentTable();
        updateDashboard();
        updateGradeSummary();

        // Reset form
        form.reset();
        document.getElementById('studentNumber').value = '';
        showNotification('Student data has been saved successfully!');
    });
});

// Update the deleteStudent function
function deleteStudent(studentNumber) {
    const index = students.findIndex(s => s.studentNumber === studentNumber);
    if (index !== -1) {
        students.splice(index, 1);
        saveAllData(); // Save immediately after deletion
        
        updateStudentTable();
        updateDashboard();
        updateGradeSummary();
        
        showNotification('Student deleted successfully!', '#dc3545');
    }
}

// Add this optimized print function
function optimizedPrintInvoice() {
    const invoiceContent = document.getElementById('invoiceContent');
    const printFrame = document.createElement('iframe');
    printFrame.style.display = 'none';
    document.body.appendChild(printFrame);

    printFrame.onload = function() {
        const doc = printFrame.contentDocument || printFrame.contentWindow.document;
        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice Print</title>
                <style>
                    @page { margin: 0.5cm; }
                    @media print {
                        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                        img { max-width: 100px !important; }
                        * { -webkit-print-color-adjust: exact !important; }
                    }
                    body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
                    .invoice-container { max-width: 800px; margin: 0 auto; }
                </style>
            </head>
            <body>
                <div class="invoice-container">${invoiceContent.innerHTML}</div>
            </body>
            </html>
        `);
        doc.close();

        // Use requestAnimationFrame for smoother printing
        requestAnimationFrame(() => {
            printFrame.contentWindow.print();
            // Remove frame after printing
            setTimeout(() => {
                document.body.removeChild(printFrame);
            }, 1000);
        });
    };
}

// Add event listener to use the new optimized print function
document.querySelector('button[onclick="printInvoice()"]').addEventListener('click', (e) => {
    e.preventDefault();
    optimizedPrintInvoice();
});

// Add payment search functionality
function addPaymentSearch() {
    // Create search container
    const searchContainer = document.createElement('div');
    searchContainer.style.marginBottom = '20px';
    searchContainer.innerHTML = `
        <div style="background: #fff; padding: 15px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-top: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #2c3e50;">Payment Search</h3>
            <div style="display: flex; gap: 15px; flex-wrap;">
                <select id="paymentStatusFilter" style="padding: 8px; border-radius: 4px; border: 1px solid #ddd; flex: 1;">
                    <option value="">Select Payment Status</option>
                    <option value="full">Full Payment</option>
                    <option value="partial">Partial Payment</option>
                    <option value="none">No Payment</option>
                </select>
                <select id="gradeFilter" style="padding: 8px; border-radius: 4px; border: 1px solid #ddd; flex: 1;">
                    <option value="">Select Grade</option>
                    <option value="1">Grade 1</option>
                    <option value="2">Grade 2</option>
                    <option value="3">Grade 3</option>
                    <option value="4">Grade 4</option>
                    <option value="5">Grade 5</option>
                    <option value="6">Grade 6</option>
                    <option value="7">Grade 7</option>
                    <option value="8">Grade 8</option>
                    <option value="9">Grade 9</option>
                </select>
                <button onclick="searchPayments()" style="padding: 8px 20px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">Search</button>
            </div>
            
            <!-- Results Container -->
            <div id="paymentSearchResults" style="margin-top: 20px;">
                <table id="paymentResultsTable" style="width: 100%; border-collapse: collapse; display: none;">
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: left;">Student Name</th>
                            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: left;">Grade</th>
                            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">Fees Paid</th>
                            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">Balance</th>
                            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: center;">Status</th>
                        </tr>
                    </thead>
                    <tbody id="paymentResultsBody"></tbody>
                </table>
                <div id="noResultsMessage" style="text-align: center; padding: 20px; display: none;">
                    No results found
                </div>
            </div>
        </div>
    `;

    // Insert the search container after the dashboard
    const dashboard = document.querySelector('.dashboard');
    dashboard.parentNode.insertBefore(searchContainer, dashboard.nextSibling);

    // Add the search function
    window.searchPayments = function() {
        const paymentStatus = document.getElementById('paymentStatusFilter').value;
        const grade = document.getElementById('gradeFilter').value;
        const resultsTable = document.getElementById('paymentResultsTable');
        const resultsBody = document.getElementById('paymentResultsBody');
        const noResults = document.getElementById('noResultsMessage');

        // Filter students based on criteria
        let filteredStudents = students.filter(student => {
            if (grade && student.grade.toString() !== grade) return false;

            const totalFees = schoolFees[student.grade] || 0;
            const paymentRatio = student.feesPaid / totalFees;

            switch(paymentStatus) {
                case 'full':
                    return student.balance <= 0;
                case 'partial':
                    return student.feesPaid > 0 && student.balance > 0;
                case 'none':
                    return student.feesPaid === 0;
                default:
                    return true;
            }
        });

        // Display results
        if (filteredStudents.length === 0) {
            resultsTable.style.display = 'none';
            noResults.style.display = 'block';
        } else {
            resultsTable.style.display = 'table';
            noResults.style.display = 'none';
            
            resultsBody.innerHTML = filteredStudents.map(student => {
                const totalFees = schoolFees[student.grade] || 0;
                let statusColor, statusText;
                
                if (student.balance <= 0) {
                    statusColor = '#27ae60';
                    statusText = 'PAID';
                } else if (student.feesPaid > 0) {
                    statusColor = '#f39c12';
                    statusText = 'PARTIAL';
                } else {
                    statusColor = '#e74c3c';
                    statusText = 'UNPAID';
                }

                return `
                    <tr>
                        <td style="padding: 12px; border: 1px solid #dee2e6;">${student.studentName}</td>
                        <td style="padding: 12px; border: 1px solid #dee2e6;">Grade ${student.grade}</td>
                        <td style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">K${student.feesPaid.toFixed(2)}</td>
                        <td style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">K${student.balance.toFixed(2)}</td>
                        <td style="padding: 12px; border: 1px solid #dee2e6; text-align: center;">
                            <span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                                ${statusText}
                            </span>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    };
}

// Initialize the payment search when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    addPaymentSearch();
});

// Add payment search functionality to the form
function addFormPaymentSearch() {
    // Create search fields container
    const searchFields = document.createElement('div');
    searchFields.style.marginBottom = '20px';
    searchFields.innerHTML = `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3 style="margin: 0 0 10px 0; color: #2c3e50; font-size: 16px;">Payment Status Search</h3>
            <div style="display: flex; gap: 10px; flex-wrap;">
                <select id="formPaymentStatus" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; min-width: 150px;">
                    <option value="">Select Payment Status</option>
                    <option value="full">Full Payment</option>
                    <option value="partial">Partial Payment</option>
                    <option value="none">No Payment</option>
                </select>
                <select id="formGradeFilter" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; min-width: 150px;">
                    <option value="">Select Grade</option>
                    <option value="1">Grade 1</option>
                    <option value="2">Grade 2</option>
                    <option value="3">Grade 3</option>
                    <option value="4">Grade 4</option>
                    <option value="5">Grade 5</option>
                    <option value="6">Grade 6</option>
                    <option value="7">Grade 7</option>
                    <option value="8">Grade 8</option>
                    <option value="9">Grade 9</option>
                </select>
                <button onclick="searchFormPayments()" style="padding: 8px 20px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Search Payments
                </button>
            </div>

            <!-- Search Results -->
            <div id="formSearchResults" style="margin-top: 15px; display: none;">
                <div style="background: white; border-radius: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f1f1f1;">
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Student Name</th>
                                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Grade</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Fees Paid</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Balance</th>
                                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Status</th>
                            </tr>
                        </thead>
                        <tbody id="formSearchResultsBody"></tbody>
                    </table>
                </div>
                <div id="formNoResults" style="text-align: center; padding: 20px; display: none;">
                    No matching records found
                </div>
            </div>
        </div>
    `;

    // Insert search fields before the form
    const studentForm = document.getElementById('studentForm');
    studentForm.parentNode.insertBefore(searchFields, studentForm);

    // Add search function to window object
    window.searchFormPayments = function() {
        const paymentStatus = document.getElementById('formPaymentStatus').value;
        const grade = document.getElementById('formGradeFilter').value;
        const resultsContainer = document.getElementById('formSearchResults');
        const resultsBody = document.getElementById('formSearchResultsBody');
        const noResults = document.getElementById('formNoResults');

        // Filter students
        let filteredStudents = students.filter(student => {
            if (grade && student.grade.toString() !== grade) return false;

            const totalFees = schoolFees[student.grade] || 0;
            
            switch(paymentStatus) {
                case 'full':
                    return student.balance <= 0;
                case 'partial':
                    return student.feesPaid > 0 && student.balance > 0;
                case 'none':
                    return student.feesPaid === 0;
                default:
                    return true;
            }
        });

        // Display results
        resultsContainer.style.display = 'block';
        
        if (filteredStudents.length === 0) {
            resultsContainer.querySelector('table').style.display = 'none';
            noResults.style.display = 'block';
        } else {
            resultsContainer.querySelector('table').style.display = 'table';
            noResults.style.display = 'none';
            
            resultsBody.innerHTML = filteredStudents.map(student => {
                let statusColor, statusText;
                
                if (student.balance <= 0) {
                    statusColor = '#27ae60';
                    statusText = 'PAID';
                } else if (student.feesPaid > 0) {
                    statusColor = '#f39c12';
                    statusText = 'PARTIAL';
                } else {
                    statusColor = '#e74c3c';
                    statusText = 'UNPAID';
                }

                return `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 12px;">${student.studentName}</td>
                        <td style="padding: 12px; text-align: center;">Grade ${student.grade}</td>
                        <td style="padding: 12px; text-align: right;">K${student.feesPaid.toFixed(2)}</td>
                        <td style="padding: 12px; text-align: right;">K${student.balance.toFixed(2)}</td>
                        <td style="padding: 12px; text-align: center;">
                            <span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                                ${statusText}
                            </span>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    };
}

// Initialize the form payment search when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('studentForm')) {
        addFormPaymentSearch();
    }
});

// Add payment search functionality below grade summary
function addGradeSummaryPaymentSearch() {
    // Create search container
    const searchContainer = document.createElement('div');
    searchContainer.style.marginTop = '20px';
    searchContainer.innerHTML = `
        <div style="background: #fff; padding: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 18px;">Payment Status Search</h2>
            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                <select id="summaryPaymentStatus" style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                    <option value="">Select Payment Status</option>
                    <option value="full">Full Payment</option>
                    <option value="partial">Partial Payment</option>
                    <option value="none">No Payment</option>
                </select>
                <select id="summaryGradeFilter" style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                    <option value="">Select Grade</option>
                    <option value="1">Grade 1</option>
                    <option value="2">Grade 2</option>
                    <option value="3">Grade 3</option>
                    <option value="4">Grade 4</option>
                    <option value="5">Grade 5</option>
                    <option value="6">Grade 6</option>
                    <option value="7">Grade 7</option>
                    <option value="8">Grade 8</option>
                    <option value="9">Grade 9</option>
                </select>
                <button onclick="searchSummaryPayments()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                    Search
                </button>
            </div>

            <!-- Results Table -->
            <div id="summarySearchResults" style="display: none; margin-top: 15px;">
                <div style="background: white; border-radius: 5px; overflow: hidden;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8f9fa;">
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Student Name</th>
                                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Grade</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Fees Paid</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Balance</th>
                                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Status</th>
                                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="summarySearchResultsBody"></tbody>
                    </table>
                </div>
                <div id="summaryNoResults" style="text-align: center; padding: 20px; display: none; color: #666;">
                    No matching records found
                </div>
            </div>
        </div>
    `;

    // Insert after grade summary
    const gradeSummary = document.querySelector('.grade-summary');
    gradeSummary.parentNode.insertBefore(searchContainer, gradeSummary.nextSibling);

    // Add search function
    window.searchSummaryPayments = function() {
        const paymentStatus = document.getElementById('summaryPaymentStatus').value;
        const grade = document.getElementById('summaryGradeFilter').value;
        const resultsContainer = document.getElementById('summarySearchResults');
        const resultsBody = document.getElementById('summarySearchResultsBody');
        const noResults = document.getElementById('summaryNoResults');

        // Filter students
        let filteredStudents = students.filter(student => {
            if (grade && student.grade.toString() !== grade) return false;

            const totalFees = schoolFees[student.grade] || 0;
            
            switch(paymentStatus) {
                case 'full':
                    return student.balance <= 0;
                case 'partial':
                    return student.feesPaid > 0 && student.balance > 0;
                case 'none':
                    return student.feesPaid === 0;
                default:
                    return true;
            }
        });

        // Display results
        resultsContainer.style.display = 'block';
        
        if (filteredStudents.length === 0) {
            resultsContainer.querySelector('table').style.display = 'none';
            noResults.style.display = 'block';
        } else {
            resultsContainer.querySelector('table').style.display = 'table';
            noResults.style.display = 'none';
            
            resultsBody.innerHTML = filteredStudents.map(student => {
                let statusColor, statusText;
                
                if (student.balance <= 0) {
                    statusColor = '#27ae60';
                    statusText = 'PAID';
                } else if (student.feesPaid > 0) {
                    statusColor = '#f39c12';
                    statusText = 'PARTIAL';
                } else {
                    statusColor = '#e74c3c';
                    statusText = 'UNPAID';
                }

                return `
                    <tr style="border-bottom: 1px solid #eee; background: white;">
                        <td style="padding: 12px;">${student.studentName}</td>
                        <td style="padding: 12px; text-align: center;">Grade ${student.grade}</td>
                        <td style="padding: 12px; text-align: right;">K${student.feesPaid.toFixed(2)}</td>
                        <td style="padding: 12px; text-align: right;">K${student.balance.toFixed(2)}</td>
                        <td style="padding: 12px; text-align: center;">
                            <span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                                ${statusText}
                            </span>
                        </td>
                        <td style="padding: 12px; text-align: center;">
                            <button onclick="showInvoice(${JSON.stringify(student).replace(/"/g, '&quot;')})" 
                                    style="background: #3498db; color: white; border: none; border-radius: 3px; padding: 4px 8px; cursor: pointer; margin-right: 5px;">
                                Invoice
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    };
}

// Initialize the grade summary payment search when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('.grade-summary')) {
        addGradeSummaryPaymentSearch();
    }
});

// Add payment search functionality below grade summary
function addMainFormPaymentSearch() {
    // Create search container
    const searchContainer = document.createElement('div');
    searchContainer.style.marginTop = '20px';
    searchContainer.innerHTML = `
        <div style="background: #fff; padding: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 18px;">Search Payment</h2>
            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                <select id="mainPaymentStatus" style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                    <option value="">Select Payment Status</option>
                    <option value="full">Full Payment</option>
                    <option value="partial">Partial Payment</option>
                    <option value="none">No Payment</option>
                </select>
                <select id="mainGradeFilter" style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                    <option value="">Select Grade</option>
                    <option value="1">Grade 1</option>
                    <option value="2">Grade 2</option>
                    <option value="3">Grade 3</option>
                    <option value="4">Grade 4</option>
                    <option value="5">Grade 5</option>
                    <option value="6">Grade 6</option>
                    <option value="7">Grade 7</option>
                    <option value="8">Grade 8</option>
                    <option value="9">Grade 9</option>
                </select>
                <button onclick="searchMainPayments()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                    Search
                </button>
            </div>

            <!-- Results Table -->
            <div id="mainSearchResults" style="display: none; margin-top: 15px;">
                <div style="background: white; border-radius: 5px; overflow: hidden;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8f9fa;">
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Student Name</th>
                                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Grade</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Fees Paid</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Balance</th>
                                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Status</th>
                                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="mainSearchResultsBody"></tbody>
                    </table>
                </div>
                <div id="mainNoResults" style="text-align: center; padding: 20px; display: none; color: #666;">
                    No matching records found
                </div>
            </div>
        </div>
    `;

    // Insert after grade summary
    const gradeSummary = document.querySelector('.grade-summary');
    const studentForm = document.getElementById('studentForm');
    studentForm.parentNode.insertBefore(searchContainer, studentForm);

    // Add search function
    window.searchMainPayments = function() {
        const paymentStatus = document.getElementById('mainPaymentStatus').value;
        const grade = document.getElementById('mainGradeFilter').value;
        const resultsContainer = document.getElementById('mainSearchResults');
        const resultsBody = document.getElementById('mainSearchResultsBody');
        const noResults = document.getElementById('mainNoResults');

        // Filter students
        let filteredStudents = students.filter(student => {
            if (grade && student.grade.toString() !== grade) return false;

            const totalFees = schoolFees[student.grade] || 0;
            
            switch(paymentStatus) {
                case 'full':
                    return student.balance <= 0;
                case 'partial':
                    return student.feesPaid > 0 && student.balance > 0;
                case 'none':
                    return student.feesPaid === 0;
                default:
                    return true;
            }
        });

        // Display results
        resultsContainer.style.display = 'block';
        
        if (filteredStudents.length === 0) {
            resultsContainer.querySelector('table').style.display = 'none';
            noResults.style.display = 'block';
        } else {
            resultsContainer.querySelector('table').style.display = 'table';
            noResults.style.display = 'none';
            
            resultsBody.innerHTML = filteredStudents.map(student => {
                let statusColor, statusText;
                
                if (student.balance <= 0) {
                    statusColor = '#27ae60';
                    statusText = 'PAID';
                } else if (student.feesPaid > 0) {
                    statusColor = '#f39c12';
                    statusText = 'PARTIAL';
                } else {
                    statusColor = '#e74c3c';
                    statusText = 'UNPAID';
                }

                return `
                    <tr style="border-bottom: 1px solid #eee; background: white;">
                        <td style="padding: 12px;">${student.studentName}</td>
                        <td style="padding: 12px; text-align: center;">Grade ${student.grade}</td>
                        <td style="padding: 12px; text-align: right;">K${student.feesPaid.toFixed(2)}</td>
                        <td style="padding: 12px; text-align: right;">K${student.balance.toFixed(2)}</td>
                        <td style="padding: 12px; text-align: center;">
                            <span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                                ${statusText}
                            </span>
                        </td>
                        <td style="padding: 12px; text-align: center;">
                            <button onclick="showInvoice(${JSON.stringify(student).replace(/"/g, '&quot;')})" 
                                    style="background: #3498db; color: white; border: none; border-radius: 3px; padding: 4px 8px; cursor: pointer; margin-right: 5px;">
                                Invoice
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    };
}

// Initialize the main form payment search when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('studentForm')) {
        addMainFormPaymentSearch();
    }
});

// Add search payment functionality
function searchPaymentStatus() {
    const paymentStatus = document.getElementById('paymentStatusSearch').value;
    const grade = document.getElementById('gradeSearch').value;
    const term = document.getElementById('termSearch').value;
    const year = document.getElementById('yearSearch').value;
    const resultsContainer = document.getElementById('paymentSearchResults');
    const resultsBody = document.getElementById('paymentSearchBody');
    const noResults = document.getElementById('noPaymentResults');

    // Validate all fields are selected
    if (!paymentStatus || !grade || !term || !year) {
        alert('Please select all fields: Payment Status, Grade, Term, and Year');
        return;
    }

    // Filter students based on all criteria
    let filteredStudents = students.filter(student => {
        if (student.grade.toString() !== grade) return false;
        if (student.term.toString() !== term) return false;
        if (student.year.toString() !== year) return false;

        const totalFees = schoolFees[student.grade] || 0;
        
        switch(paymentStatus) {
            case 'full':
                return student.balance <= 0;
            case 'partial':
                return student.feesPaid > 0 && student.balance > 0;
            case 'none':
                return student.feesPaid === 0;
            default:
                return true;
        }
    });

    // Display results
    resultsContainer.style.display = 'block';
    
    if (filteredStudents.length === 0) {
        resultsContainer.querySelector('table').style.display = 'none';
        noResults.style.display = 'block';
    } else {
        resultsContainer.querySelector('table').style.display = 'table';
        noResults.style.display = 'none';
        
        resultsBody.innerHTML = filteredStudents.map(student => {
            let statusColor, statusText;
            
            if (student.balance <= 0) {
                statusColor = '#27ae60';
                statusText = 'PAID';
            } else if (student.feesPaid > 0) {
                statusColor = '#f39c12';
                statusText = 'PARTIAL';
            } else {
                statusColor = '#e74c3c';
                statusText = 'UNPAID';
            }

            return `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px;">${student.studentName}</td>
                    <td style="padding: 12px; text-align: center;">Grade ${student.grade}</td>
                    <td style="padding: 12px; text-align: right;">K${student.feesPaid.toFixed(2)}</td>
                    <td style="padding: 12px; text-align: right;">K${student.balance.toFixed(2)}</td>
                    <td style="padding: 12px; text-align: center;">
                        <span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                            ${statusText}
                        </span>
                    </td>
                    <td style="padding: 12px; text-align: center;">
                        <button onclick="showInvoice(${JSON.stringify(student).replace(/"/g, '&quot;')})" 
                                style="background: #3498db; color: white; border: none; border-radius: 3px; padding: 4px 8px; cursor: pointer;">
                            Invoice
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

// Add these functions for view/hide payment search
function viewPaymentSearch() {
    document.getElementById('paymentSearchResults').style.display = 'block';
    document.getElementById('viewPaymentBtn').style.display = 'none';
    document.getElementById('hidePaymentBtn').style.display = 'inline-block';
}

function hidePaymentSearch() {
    document.getElementById('paymentSearchResults').style.display = 'none';
    document.getElementById('hidePaymentBtn').style.display = 'none';
    document.getElementById('viewPaymentBtn').style.display = 'inline-block';
}

// Add data analytics function
function analyzePaymentData() {
    // Get all saved data
    const savedStudents = students;
    const totalStudents = savedStudents.length;

    // Create analytics container
    const analyticsContainer = document.createElement('div');
    analyticsContainer.className = 'analytics-container';
    analyticsContainer.style.cssText = 'background: white; padding: 20px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1); margin: 20px 0;';

    // Calculate analytics
    const analytics = {
        totalStudents,
        totalFeesPaid: savedStudents.reduce((sum, student) => sum + student.feesPaid, 0),
        totalBalance: savedStudents.reduce((sum, student) => sum + student.balance, 0),
        paymentStatus: {
            full: savedStudents.filter(student => student.balance <= 0).length,
            partial: savedStudents.filter(student => student.feesPaid > 0 && student.balance > 0).length,
            none: savedStudents.filter(student => student.feesPaid === 0).length
        },
        gradeDistribution: {},
        termAnalytics: {}
    };

    // Calculate grade distribution
    for (let grade = 1; grade <= 9; grade++) {
        const gradeStudents = savedStudents.filter(student => student.grade == grade);
        analytics.gradeDistribution[grade] = {
            total: gradeStudents.length,
            feesPaid: gradeStudents.reduce((sum, student) => sum + student.feesPaid, 0),
            balance: gradeStudents.reduce((sum, student) => sum + student.balance, 0)
        };
    }

    // Calculate term-wise analytics
    savedStudents.forEach(student => {
        const termKey = `${student.term}-${student.year}`;
        if (!analytics.termAnalytics[termKey]) {
            analytics.termAnalytics[termKey] = {
                feesPaid: 0,
                balance: 0,
                students: 0
            };
        }
        analytics.termAnalytics[termKey].feesPaid += student.feesPaid;
        analytics.termAnalytics[termKey].balance += student.balance;
        analytics.termAnalytics[termKey].students++;
    });

    // Create analytics display
    analyticsContainer.innerHTML = `
        <h2 style="color: #333; margin-bottom: 20px;">Payment Analytics</h2>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; border: 1px solid #dee2e6;">
                <h3 style="margin: 0 0 10px 0; color: #2c3e50;">Overall Summary</h3>
                <p>Total Students: ${totalStudents}</p>
                <p>Total Fees Paid: K${analytics.totalFeesPaid.toFixed(2)}</p>
                <p>Total Outstanding: K${analytics.totalBalance.toFixed(2)}</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; border: 1px solid #dee2e6;">
                <h3 style="margin: 0 0 10px 0; color: #2c3e50;">Payment Status</h3>
                <p>Fully Paid: ${analytics.paymentStatus.full} students</p>
                <p>Partial Payment: ${analytics.paymentStatus.partial} students</p>
                <p>No Payment: ${analytics.paymentStatus.none} students</p>
            </div>
        </div>

        <div style="margin-bottom: 30px;">
            <h3 style="color: #2c3e50; margin-bottom: 15px;">Grade-wise Analysis</h3>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="padding: 12px; border: 1px solid #dee2e6;">Grade</th>
                            <th style="padding: 12px; border: 1px solid #dee2e6;">Students</th>
                            <th style="padding: 12px; border: 1px solid #dee2e6;">Fees Paid</th>
                            <th style="padding: 12px; border: 1px solid #dee2e6;">Balance</th>
                            <th style="padding: 12px; border: 1px solid #dee2e6;">Collection Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(analytics.gradeDistribution).map(([grade, data]) => `
                            <tr>
                                <td style="padding: 12px; border: 1px solid #dee2e6;">Grade ${grade}</td>
                                <td style="padding: 12px; border: 1px solid #dee2e6;">${data.total}</td>
                                <td style="padding: 12px; border: 1px solid #dee2e6;">K${data.feesPaid.toFixed(2)}</td>
                                <td style="padding: 12px; border: 1px solid #dee2e6;">K${data.balance.toFixed(2)}</td>
                                <td style="padding: 12px; border: 1px solid #dee2e6;">
                                    ${data.total ? ((data.feesPaid / (data.feesPaid + data.balance)) * 100).toFixed(1) : '0'}%
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div>
            <h3 style="color: #2c3e50; margin-bottom: 15px;">Term-wise Analysis</h3>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="padding: 12px; border: 1px solid #dee2e6;">Term-Year</th>
                            <th style="padding: 12px; border: 1px solid #dee2e6;">Students</th>
                            <th style="padding: 12px; border: 1px solid #dee2e6;">Fees Paid</th>
                            <th style="padding: 12px; border: 1px solid #dee2e6;">Balance</th>
                            <th style="padding: 12px; border: 1px solid #dee2e6;">Collection Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(analytics.termAnalytics).map(([termKey, data]) => `
                            <tr>
                                <td style="padding: 12px; border: 1px solid #dee2e6;">Term ${termKey}</td>
                                <td style="padding: 12px; border: 1px solid #dee2e6;">${data.students}</td>
                                <td style="padding: 12px; border: 1px solid #dee2e6;">K${data.feesPaid.toFixed(2)}</td>
                                <td style="padding: 12px; border: 1px solid #dee2e6;">K${data.balance.toFixed(2)}</td>
                                <td style="padding: 12px; border: 1px solid #dee2e6;">
                                    ${((data.feesPaid / (data.feesPaid + data.balance)) * 100).toFixed(1)}%
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Insert analytics after grade summary
    const gradeSummary = document.querySelector('.grade-summary');
    gradeSummary.parentNode.insertBefore(analyticsContainer, gradeSummary.nextSibling);
}

// Call analytics function when page loads
document.addEventListener('DOMContentLoaded', function() {
    analyzePaymentData();
});

// Add data visualization function
function visualizeData() {
    // Create visualization container
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    chartContainer.style.cssText = 'background: white; padding: 20px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1); margin: 20px 0;';
    chartContainer.innerHTML = `
        <h2 style="color: #333; margin-bottom: 20px;">Data Visualization</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
            <!-- Gender Distribution Pie Chart -->
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; border: 1px solid #dee2e6;">
                <h3 style="margin: 0 0 15px 0; color: #2c3e50;">Gender Distribution</h3>
                <canvas id="genderChart" width="300" height="300"></canvas>
            </div>
            
            <!-- Grade Distribution Bar Chart -->
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; border: 1px solid #dee2e6;">
                <h3 style="margin: 0 0 15px 0; color: #2c3e50;">Grade Distribution</h3>
                <canvas id="gradeChart" width="300" height="300"></canvas>
            </div>
            
            <!-- Term Distribution Bar Chart -->
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; border: 1px solid #dee2e6;">
                <h3 style="margin: 0 0 15px 0; color: #2c3e50;">Term Distribution</h3>
                <canvas id="termChart" width="300" height="300"></canvas>
            </div>
        </div>
    `;

    // Insert charts after dashboard
    const dashboard = document.querySelector('.dashboard');
    dashboard.parentNode.insertBefore(chartContainer, dashboard.nextSibling);

    // Calculate data for charts
    const genderData = {
        male: students.filter(s => s.gender === 'Male').length,
        female: students.filter(s => s.gender === 'Female').length
    };

    const gradeData = Array(9).fill(0);
    students.forEach(s => {
        gradeData[s.grade - 1]++;
    });

    const termData = {
        1: students.filter(s => s.term === '1').length,
        2: students.filter(s => s.term === '2').length,
        3: students.filter(s => s.term === '3').length
    };

    // Create Gender Pie Chart
    const genderCtx = document.getElementById('genderChart').getContext('2d');
    new Chart(genderCtx, {
        type: 'pie',
        data: {
            labels: ['Male', 'Female'],
            datasets: [{
                data: [genderData.male, genderData.female],
                backgroundColor: ['#3498db', '#e74c3c'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = genderData.male + genderData.female;
                            const percentage = ((context.raw / total) * 100).toFixed(1);
                            return `${context.label}: ${context.raw} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    // Create Grade Bar Chart
    const gradeCtx = document.getElementById('gradeChart').getContext('2d');
    new Chart(gradeCtx, {
        type: 'bar',
        data: {
            labels: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'],
            datasets: [{
                label: 'Number of Students',
                data: gradeData,
                backgroundColor: '#3498db',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });

    // Create Term Bar Chart
    const termCtx = document.getElementById('termChart').getContext('2d');
    new Chart(termCtx, {
        type: 'bar',
        data: {
            labels: ['Term 1', 'Term 2', 'Term 3'],
            datasets: [{
                label: 'Number of Students',
                data: [termData[1], termData[2], termData[3]],
                backgroundColor: '#2ecc71',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Call visualization function when data changes
function updateVisualizations() {
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
        chartContainer.remove();
    }
    visualizeData();
}

// Add Chart.js library to Work.html
document.addEventListener('DOMContentLoaded', function() {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = function() {
        visualizeData();
    };
    document.head.appendChild(script);
});

// Update visualizations when data changes 
// ... existing code ...

// Replace all originalUpdateDashboard declarations with a single one at the top
// ... existing code ...
 originalUpdateDashboard = window.updateDashboard;

window.updateDashboard = function() {
    if (originalUpdateDashboard) originalUpdateDashboard();
    updateDataCharts();
    updateDataVisuals();
};
// Add this function to update charts
function updateDataCharts() {
    // Calculate gender distribution
    const genderData = {
        male: students.filter(s => s.gender === 'Male').length,
        female: students.filter(s => s.gender === 'Female').length
    };
    const totalStudents = genderData.male + genderData.female;

    // Calculate grade distribution
    const gradeData = Array(9).fill(0);
    students.forEach(s => {
        gradeData[s.grade - 1]++;
    });

    // Calculate term distribution
    const termData = {
        1: students.filter(s => s.term === '1').length,
        2: students.filter(s => s.term === '2').length,
        3: students.filter(s => s.term === '3').length
    };

    // Update Gender Pie Chart
    const genderCtx = document.getElementById('genderChart').getContext('2d');
    if (window.genderChart) window.genderChart.destroy();
    window.genderChart = new Chart(genderCtx, {
        type: 'pie',
        data: {
            labels: ['Male', 'Female'],
            datasets: [{
                data: [genderData.male, genderData.female],
                backgroundColor: ['#3498db', '#e74c3c']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const percentage = ((value / totalStudents) * 100).toFixed(1);
                            return `${context.label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    // Update Grade Bar Chart
    const gradeCtx = document.getElementById('gradeChart').getContext('2d');
    if (window.gradeChart) window.gradeChart.destroy();
    window.gradeChart = new Chart(gradeCtx, {
        type: 'bar',
        data: {
            labels: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'],
            datasets: [{
                label: 'Number of Students',
                data: gradeData,
                backgroundColor: '#3498db'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });

    // Update Term Bar Chart
    const termCtx = document.getElementById('termChart').getContext('2d');
    if (window.termChart) window.termChart.destroy();
    window.termChart = new Chart(termCtx, {
        type: 'bar',
        data: {
            labels: ['Term 1', 'Term 2', 'Term 3'],
            datasets: [{
                label: 'Number of Students',
                data: [termData[1], termData[2], termData[3]],
                backgroundColor: '#2ecc71'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
} // Close the updateCharts function

// Update the existing updateDashboard function to include chart updates
if (typeof updateDashboard === 'function') {
    const originalUpdateDashboard = updateDashboard;
    window.updateDashboard = function() {
        originalUpdateDashboard();
        updateChartsRealTime(); // Using the correct function name
    };
}

// Real-time chart updates
function updateChartsRealTime() {
    // Get current data
    const genderData = {
        male: students.filter(s => s.gender === 'Male').length,
        female: students.filter(s => s.gender === 'Female').length
    };

    const gradeData = Array(9).fill(0);
    students.forEach(s => {
        if (s.grade >= 1 && s.grade <= 9) {
            gradeData[s.grade - 1]++;
        }
    });

    const termData = {
        1: students.filter(s => s.term === '1').length,
        2: students.filter(s => s.term === '2').length,
        3: students.filter(s => s.term === '3').length
    };

    // Update Gender Pie Chart
    if (window.genderChart) {
        window.genderChart.data.datasets[0].data = [genderData.male, genderData.female];
        window.genderChart.update('show');
    }

    // Update Grade Bar Chart
    if (window.gradeChart) {
        window.gradeChart.data.datasets[0].data = gradeData;
        window.gradeChart.update('show');
    }

    // Update Term Bar Chart
    if (window.termChart) {
        window.termChart.data.datasets[0].data = [termData[1], termData[2], termData[3]];
        window.termChart.update('show');
    }
}

// Add this to the existing form submit handler
const originalFormSubmit = document.getElementById('studentForm').onsubmit;
document.getElementById('studentForm').onsubmit = function(e) {
    if (originalFormSubmit) {
        originalFormSubmit.call(this, e);
    }
    setTimeout(updateChartsRealTime, 100); // Update charts after data is processed
};

// Add to the deleteStudent function

// Update charts when dashboard refreshes



// Real-time chart updates
function initializeAndUpdateCharts() {
    // Get current data
    const genderData = {
        male: students.filter(s => s.gender === 'Male').length,
        female: students.filter(s => s.gender === 'Female').length
    };

    const gradeData = Array(9).fill(0);
    students.forEach(s => {
        if (s.grade >= 1 && s.grade <= 9) {
            gradeData[s.grade - 1]++;
        }
    });

    const termData = {
        1: students.filter(s => s.term === '1').length,
        2: students.filter(s => s.term === '2').length,
        3: students.filter(s => s.term === '3').length
    };

    // Initialize or update Gender Pie Chart
    const genderCtx = document.getElementById('genderChart')?.getContext('2d');
    if (genderCtx) {
        if (window.genderChart) window.genderChart.destroy();
        window.genderChart = new Chart(genderCtx, {
            type: 'pie',
            data: {
                labels: ['Male', 'Female'],
                datasets: [{
                    data: [genderData.male, genderData.female],
                    backgroundColor: ['#3498db', '#e74c3c'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = genderData.male + genderData.female;
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: ${context.raw} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Initialize or update Grade Bar Chart
    const gradeCtx = document.getElementById('gradeChart')?.getContext('2d');
    if (gradeCtx) {
        if (window.gradeChart) window.gradeChart.destroy();
        window.gradeChart = new Chart(gradeCtx, {
            type: 'bar',
            data: {
                labels: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'],
                datasets: [{
                    label: 'Number of Students',
                    data: gradeData,
                    backgroundColor: '#3498db',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: { size: 12 }
                        }
                    },
                    x: {
                        ticks: {
                            font: { size: 12 }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    // Initialize or update Term Bar Chart
    const termCtx = document.getElementById('termChart')?.getContext('2d');
    if (termCtx) {
        if (window.termChart) window.termChart.destroy();
        window.termChart = new Chart(termCtx, {
            type: 'bar',
            data: {
                labels: ['Term 1', 'Term 2', 'Term 3'],
                datasets: [{
                    label: 'Number of Students',
                    data: [termData[1], termData[2], termData[3]],
                    backgroundColor: '#2ecc71',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: { size: 12 }
                        }
                    },
                    x: {
                        ticks: {
                            font: { size: 12 }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
}

// Update charts after form submission
document.getElementById('studentForm').addEventListener('submit', function(e) {
    setTimeout(initializeAndUpdateCharts, 100);
});



// Initialize charts when page loads
document.addEventListener('DOMContentLoaded', initializeAndUpdateCharts);

// Real-time chart updates
function initializeAndUpdateChartsRealTime() {
    // Get current data
    const genderData = {
        male: students.filter(s => s.gender === 'Male').length,
        female: students.filter(s => s.gender === 'Female').length
    };

    const gradeData = Array(9).fill(0);
    students.forEach(s => {
        if (s.grade >= 1 && s.grade <= 9) {
            gradeData[s.grade - 1]++;
        }
    });

    const termData = {
        1: students.filter(s => s.term === '1').length,
        2: students.filter(s => s.term === '2').length,
        3: students.filter(s => s.term === '3').length
    };

    // Update Gender Pie Chart
    if (window.genderChart) {
        window.genderChart.data.datasets[0].data = [genderData.male, genderData.female];
        window.genderChart.update('none');
    } else {
        const genderCtx = document.getElementById('genderChart')?.getContext('2d');
        if (genderCtx) {
            window.genderChart = new Chart(genderCtx, {
                type: 'pie',
                data: {
                    labels: ['Male', 'Female'],
                    datasets: [{
                        data: [genderData.male, genderData.female],
                        backgroundColor: ['#3498db', '#e74c3c']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 500
                    }
                }
            });
        }
    }

    // Update Grade Bar Chart
    if (window.gradeChart) {
        window.gradeChart.data.datasets[0].data = gradeData;
        window.gradeChart.update('none');
    } else {
        const gradeCtx = document.getElementById('gradeChart')?.getContext('2d');
        if (gradeCtx) {
            window.gradeChart = new Chart(gradeCtx, {
                type: 'bar',
                data: {
                    labels: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9'],
                    datasets: [{
                        data: gradeData,
                        backgroundColor: '#3498db'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 500
                    }
                }
            });
        }
    }

    // Update Term Bar Chart
    if (window.termChart) {
        window.termChart.data.datasets[0].data = [termData[1], termData[2], termData[3]];
        window.termChart.update('none');
    } else {
        const termCtx = document.getElementById('termChart')?.getContext('2d');
        if (termCtx) {
            window.termChart = new Chart(termCtx, {
                type: 'bar',
                data: {
                    labels: ['Term 1', 'Term 2', 'Term 3'],
                    datasets: [{
                        data: [termData[1], termData[2], termData[3]],
                        backgroundColor: '#2ecc71'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 500
                    }
                }
            });
        }
    }
}

// Update charts after form submission
document.getElementById('studentForm').addEventListener('submit', function(e) {
    setTimeout(initializeAndUpdateChartsRealTime, 100);
});

// Update charts after student deletion
const originalDeleteStudent = window.deleteStudent;
window.deleteStudent = function(studentNumber) {
    if (originalDeleteStudent) originalDeleteStudent(studentNumber);
    setTimeout(initializeAndUpdateChartsRealTime, 100);
};

// Update charts when dashboard refreshes
const originalRefreshDashboard = window.refreshDashboard;
window.refreshDashboard = function() {
    if (originalRefreshDashboard) originalRefreshDashboard();
    setTimeout(initializeAndUpdateChartsRealTime, 100);
};

// Initialize charts when page loads
document.addEventListener('DOMContentLoaded', initializeAndUpdateChartsRealTime);

// Update charts every 5 seconds to ensure real-time data
setInterval(initializeAndUpdateChartsRealTime, 5000);

// Initialize charts when data changes
function updateDataVisuals() {
    // Get current data
    const genderData = {
        male: students.filter(s => s.gender === 'Male').length,
        female: students.filter(s => s.gender === 'Female').length
    };

    const gradeData = Array(9).fill(0);
    students.forEach(s => {
        if (s.grade >= 1 && s.grade <= 9) {
            gradeData[s.grade - 1]++;
        }
    });

    const termData = {
        1: students.filter(s => s.term === '1').length,
        2: students.filter(s => s.term === '2').length,
        3: students.filter(s => s.term === '3').length
    };

    // Update Gender Chart
    const genderCtx = document.getElementById('genderChart').getContext('2d');
    if (window.genderChart) window.genderChart.destroy();
    window.genderChart = new Chart(genderCtx, {
        type: 'pie',
        data: {
            labels: ['Male', 'Female'],
            datasets: [{
                data: [genderData.male, genderData.female],
                backgroundColor: ['#36A2EB', '#FF6384']
            }]
        }
    });

    // Update Grade Chart
    const gradeCtx = document.getElementById('gradeChart').getContext('2d');
    if (window.gradeChart) window.gradeChart.destroy();
    window.gradeChart = new Chart(gradeCtx, {
        type: 'bar',
        data: {
            labels: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9'],
            datasets: [{
                data: gradeData,
                backgroundColor: '#36A2EB'
            }]
        }
    });

    // Update Term Chart
    const termCtx = document.getElementById('termChart').getContext('2d');
    if (window.termChart) window.termChart.destroy();
    window.termChart = new Chart(termCtx, {
        type: 'bar',
        data: {
            labels: ['Term 1', 'Term 2', 'Term 3'],
            datasets: [{
                data: [termData[1], termData[2], termData[3]],
                backgroundColor: '#4CAF50'
            }]
        }
    });
}

// Update charts when data changes
document.addEventListener('DOMContentLoaded', updateDataVisuals);
const originalUpdateDashboard = window.updateDashboard;
window.updateDashboard = function() {
    if (originalUpdateDashboard) originalUpdateDashboard();
    updateDataVisuals();
};

// Add this helper function at the top of your work.js file:
function getBase64Image(imgUrl) {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    
    return new Promise((resolve, reject) => {
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/jpeg"));
        };
        img.onerror = reject;
        img.src = imgUrl;
    });
}

// Add these functions at the appropriate location in work.js

// Generate unique employee number based on NRC and name
function generateEmployeeNumber(name, nrc) {
    // Remove spaces and special characters from name
    const cleanName = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
    // Extract numbers from NRC
    const nrcNumbers = nrc.replace(/[^0-9]/g, '');
    
    // Create a unique hash combining first 3 letters of name and last 4 digits of NRC
    const namePrefix = cleanName.substring(0, 3);
    const nrcSuffix = nrcNumbers.slice(-4);
    const year = new Date().getFullYear().toString().slice(-2);
    
    return `${namePrefix}${year}${nrcSuffix}`;
}

// Calculate next payment date
function calculateNextPaymentDate(currentDate) {
    const date = new Date(currentDate);
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
}

// Add event listeners
document.addEventListener('DOMContentLoaded', function() {
    const payrollForm = document.getElementById('payrollForm');
    const nrcInput = document.getElementById('nrcNumber');
    const employeeNameInput = document.getElementById('employeeName');
    const paymentDateInput = document.getElementById('paymentDate');
    const nextPaymentSpan = document.querySelector('#nextPaymentDate span');

    // Generate employee number when NRC and name are entered
    function updateEmployeeNumber() {
        const name = employeeNameInput.value;
        const nrc = nrcInput.value;
        if (name && nrc) {
            const employeeNumber = generateEmployeeNumber(name, nrc);
            document.getElementById('employeeNumber').value = employeeNumber;
        }
    }

    // Update next payment date when payment date changes
    paymentDateInput.addEventListener('change', function() {
        const nextDate = calculateNextPaymentDate(this.value);
        nextPaymentSpan.textContent = new Date(nextDate).toLocaleDateString();
    });

    employeeNameInput.addEventListener('input', updateEmployeeNumber);
    nrcInput.addEventListener('input', updateEmployeeNumber);

    // Format NRC number as user types
    nrcInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/[^0-9]/g, '');
        if (value.length > 6) {
            value = value.slice(0,6) + '/' + value.slice(6);
        }
        if (value.length > 9) {
            value = value.slice(0,9) + '/' + value.slice(9);
        }
        e.target.value = value;
    });
});

// Add this function to store employee payment data
function saveEmployeePayment(employeeData) {
    const transaction = db.transaction(['employees'], 'readwrite');
    const store = transaction.objectStore('employees');
    store.put(employeeData);
}

// Add this function to generate payslip
function generatePayslip(employee) {
    const payslipModal = document.createElement('div');
    payslipModal.className = 'modal';
    payslipModal.style.display = 'block';

    // Calculate deductions
    const napsa = Math.min(employee.basicSalary * 0.05, 1073.20); // 5% up to maximum
    const paye = calculatePAYE(employee.basicSalary);
    const netSalary = employee.basicSalary - (napsa + paye);

    const payslipContent = `
        <div class="payslip-content">
            <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
                <!-- Header with Logo -->
                <div style="display: flex; justify-content: space-between; align-items: top; margin-bottom: 20px;">
                    <div>
                        <h2 style="margin: 0; color: #2c3e50;">RIVERDALE ACADEMY AND DAY CARE</h2>
                        <p style="margin: 5px 0; font-size: 14px;">PAIKANI PHIRI STREET <br> RIVERDALE, ACADEMY AND DAY CARE, CHINGOLA <br> | CALL: 0967182428, 0212 - 271983</p>
                        <p style="margin: 5px 0; font-size: 14px;"></p>
                    </div>
                    <div style="text-align: right;">
                        <img src="images/eastlogo.jpg" alt="School Logo" style="width: 100px; height: auto;">
                    </div>
                </div>

                <!-- Payslip Title -->
                <div style="text-align: center; margin: 20px 0; padding: 10px; background: #f8f9fa;">
                    <h2 style="margin: 0; color: #2c3e50;">PAYSLIP</h2>
                    <p>Payment Date: ${employee.paymentDate}</p>
                    <p>Next Payment: ${new Date(employee.nextPaymentDate).toLocaleDateString()}</p>
                </div>

                <!-- Employee Details -->
                <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
                    <h3 style="margin: 0 0 10px 0; color: #2c3e50;">Employee Information</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <p style="margin: 5px 0;"><strong>Name:</strong> ${employee.name}</p>
                        <p style="margin: 5px 0;"><strong>Employee No:</strong> ${employee.employeeNumber}</p>
                        <p style="margin: 5px 0;"><strong>NRC:</strong> ${employee.nrcNumber}</p>
                        <p style="margin: 5px 0;"><strong>Role:</strong> ${employee.role}</p>
                    </div>
                </div>

                <!-- Payment Details -->
                <div style="margin-bottom: 20px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr style="background: #f8f9fa;">
                            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Description</th>
                            <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Amount (ZMW)</th>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;">Basic Salary</td>
                            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${employee.basicSalary.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;">NAPSA (5%)</td>
                            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">-${napsa.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;">PAYE</td>
                            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">-${paye.toFixed(2)}</td>
                        </tr>
                        <tr style="font-weight: bold;">
                            <td style="padding: 10px; border: 1px solid #ddd;">Net Salary</td>
                            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${netSalary.toFixed(2)}</td>
                        </tr>
                    </table>
                </div>

                <!-- Footer -->
                <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #666;">
                    <p>This is a computer generated payslip and does not require signature.</p>
                    <p>Generated on: ${new Date().toLocaleString()}</p>
                </div>

                <!-- Print Button -->
                <div style="text-align: center; margin-top: 20px;">
                    <button onclick="window.print()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">Print Payslip</button>
                </div>
            </div>
        </div>
    `;

    payslipModal.innerHTML = payslipContent;
    document.body.appendChild(payslipModal);
}

// Calculate PAYE (Zambian Tax Brackets)
function calculatePAYE(basicSalary) {
    if (basicSalary <= 4800) {
        return 0;
    } else if (basicSalary <= 6400) {
        return (basicSalary - 4800) * 0.25;
    } else if (basicSalary <= 8400) {
        return 400 + (basicSalary - 6400) * 0.30;
    } else {
        return 1000 + (basicSalary - 8400) * 0.375;
    }
}

// Add event listener for payroll form submission
document.getElementById('payrollForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const employeeData = {
        name: document.getElementById('employeeName').value,
        nrcNumber: document.getElementById('nrcNumber').value,
        employeeNumber: document.getElementById('employeeNumber').value,
        role: document.getElementById('employeeRole').value,
        basicSalary: parseFloat(document.getElementById('basicSalary').value),
        paymentDate: document.getElementById('paymentDate').value,
        nextPaymentDate: calculateNextPaymentDate(document.getElementById('paymentDate').value)
    };

    // Save employee data
    saveEmployeePayment(employeeData);

    // Generate payslip
    generatePayslip(employeeData);
});

// Add payslip generation and printing functionality
function showPayslipModal(employee) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'payslipModal';
    modal.style.display = 'block';

    // Calculate deductions
    const napsa = Math.min(employee.basicSalary * 0.05, 1073.20);
    const paye = calculatePAYE(employee.basicSalary);
    const netSalary = employee.basicSalary - (napsa + paye);

    modal.innerHTML = `
        <div class="modal-content payslip-content">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <div class="payslip-body">
                <!-- Header with Logo -->
                <div style="display: flex; justify-content: space-between; align-items: top;">
                    <div>
                        <h2>RIVERDALE ACADEMY AND DAY CARE</h2>
                        <p>P.O BOX | CALL: 0967724444</p>
                        <p>EMAIL: mwansamapipo46@gmail.com</p>
                    </div>
                    <div>
                        <img src="images/eastlogo.jpg" alt="School Logo" style="width: 100px; height: auto;">
                    </div>
                </div>

                <div class="payslip-header">
                    <h2>PAYSLIP</h2>
                    <p><strong>Payment Date:</strong> ${employee.paymentDate}</p>
                    <p><strong>Next Payment:</strong> ${employee.nextPaymentDate}</p>
                </div>

                <div class="employee-details">
                    <h3>Employee Information</h3>
                    <div class="details-grid">
                        <p><strong>Name:</strong> ${employee.name}</p>
                        <p><strong>Employee No:</strong> ${employee.employeeNumber}</p>
                        <p><strong>NRC:</strong> ${employee.nrcNumber}</p>
                        <p><strong>Role:</strong> ${employee.role}</p>
                    </div>
                </div>

                <div class="salary-details">
                    <h3>Payment Details</h3>
                    <table>
                        <tr>
                            <th>Description</th>
                            <th>Amount (ZMW)</th>
                        </tr>
                        <tr>
                            <td>Basic Salary</td>
                            <td class="amount">${employee.basicSalary.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td>NAPSA (5%)</td>
                            <td class="amount">-${napsa.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td>PAYE</td>
                            <td class="amount">-${paye.toFixed(2)}</td>
                        </tr>
                        <tr class="total">
                            <td>Net Salary</td>
                            <td class="amount">${netSalary.toFixed(2)}</td>
                        </tr>
                    </table>
                </div>

                <div class="payslip-footer">
                    <p>This is a computer generated payslip and does not require signature.</p>
                    <p>Generated on: ${new Date().toLocaleString()}</p>
                </div>

                <div class="action-buttons">
                    <button onclick="printPayslip()" class="print-button">Print Payslip</button>
                    <button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" class="close-button">Close</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Function to print payslip
function printPayslip() {
    const printContent = document.querySelector('.payslip-body').innerHTML;
    const originalContent = document.body.innerHTML;

    document.body.innerHTML = `
        <div class="payslip-print">
            ${printContent}
        </div>
    `;

    window.print();
    document.body.innerHTML = originalContent;
    
    // Reattach event listeners after restoring content
    attachPayrollEventListeners();
}

// Update the payroll form submission to use the new modal
function attachPayrollEventListeners() {
    const payrollForm = document.getElementById('payrollForm');
    if (payrollForm) {
        payrollForm.removeEventListener('submit', handlePayrollSubmit);
        payrollForm.addEventListener('submit', handlePayrollSubmit);
    }
}

function handlePayrollSubmit(e) {
    e.preventDefault();
    
    const employeeData = {
        name: document.getElementById('employeeName').value,
        nrcNumber: document.getElementById('nrcNumber').value,
        employeeNumber: document.getElementById('employeeNumber').value,
        role: document.getElementById('employeeRole').value,
        basicSalary: parseFloat(document.getElementById('basicSalary').value),
        paymentDate: document.getElementById('paymentDate').value,
        nextPaymentDate: calculateNextPaymentDate(document.getElementById('paymentDate').value)
    };

    // Save employee data
    saveEmployeePayment(employeeData);

    // Show payslip modal
    showPayslipModal(employeeData);
}

// Initialize event listeners when the page loads
document.addEventListener('DOMContentLoaded', attachPayrollEventListeners);

// Update the NRC input handling
document.addEventListener('DOMContentLoaded', function() {
    const nrcInput = document.getElementById('nrcNumber');
    if (!nrcInput) return;

    // Clear any existing event listeners
    const newNrcInput = nrcInput.cloneNode(true);
    nrcInput.parentNode.replaceChild(newNrcInput, nrcInput);
    
    // Add placeholder and pattern
    newNrcInput.placeholder = "Format: 123456/12/1";
    newNrcInput.pattern = "\\d{6}/\\d{2}/\\d{1}";
    newNrcInput.title = "Enter NRC in format: 123456/12/1";
    
    // Format NRC as user types
    newNrcInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/[^\d/]/g, '');
        
        // Auto-format
        if (value.length > 6 && !value.includes('/')) {
            value = value.slice(0,6) + '/' + value.slice(6);
        }
        if (value.length > 9 && value.split('/').length < 3) {
            value = value.slice(0,9) + '/' + value.slice(9);
        }
        
        // Limit length
        if (value.length > 11) {
            value = value.slice(0, 11);
        }
        
        e.target.value = value;
    });
    
    // Validate on blur
    newNrcInput.addEventListener('blur', function() {
        const nrcPattern = /^\d{6}\/\d{2}\/\d{1}$/;
        if (!nrcPattern.test(this.value) && this.value !== '') {
            alert('Please enter NRC in correct format: 123456/12/1');
            this.focus();
        }
    });
});

// Update the form submission handler
const payrollForm = document.getElementById('payrollForm');
if (payrollForm) {
    payrollForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const nrcValue = document.getElementById('nrcNumber').value;
        const nrcPattern = /^\d{6}\/\d{2}\/\d{1}$/;
        
        if (!nrcPattern.test(nrcValue)) {
            alert('Please enter a valid NRC number in format: 123456/12/1');
            return;
        }
        
        // Continue with form submission if NRC is valid
        const employeeData = {
            name: document.getElementById('employeeName').value,
            nrcNumber: nrcValue,
            employeeNumber: document.getElementById('employeeNumber').value,
            role: document.getElementById('employeeRole').value,
            basicSalary: parseFloat(document.getElementById('basicSalary').value),
            paymentDate: document.getElementById('paymentDate').value,
            nextPaymentDate: calculateNextPaymentDate(document.getElementById('paymentDate').value)
        };

        // Save and show payslip
        saveEmployeePayment(employeeData);
        showPayslipModal(employeeData);
    });
}

// Add this function to handle payroll modal
document.addEventListener('DOMContentLoaded', function() {
    const showPayrollBtn = document.getElementById('showPayrollBtn');
    if (showPayrollBtn) {
        showPayrollBtn.addEventListener('click', function() {
            // Create the modal HTML
            const modalHTML = `
                <div id="payrollModal" class="modal">
                    <div class="modal-content">
                        <h2>Payment Details</h2>
                        <div class="form-group">
                            <label for="basicSalary">Basic Salary (ZMW)</label>
                            <input type="number" id="basicSalary" required>
                            
                            <!-- Deductions section will be added here -->
                            <div id="deductionsSection"></div>
                        </div>
                    </div>
                </div>
            `;
            
            // Add modal to document
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            // Initialize deductions
            setTimeout(addDeductionsToPayrollForm, 100);
        });
    }
});

function addDeductionsToPayrollForm() {
    const paymentDetailsDiv = document.querySelector('.form-group:nth-child(2)');
    if (!paymentDetailsDiv) return;

    // Create deductions section
    const deductionsDiv = document.createElement('div');
    deductionsDiv.innerHTML = `
        <div class="form-group" style="margin-top: 15px;">
            <h3>Deductions</h3>
            <button type="button" 
                onclick="toggleDeductionsMenu()" 
                style="
                    background: #2c3e50;
                    color: white;
                    border: none;
                    padding: 8px 15px;
                    border-radius: 4px;
                    cursor: pointer;
                "
            >Add Deduction</button>
            
            <div id="deductionsMenu" style="
                display: none;
                background: white;
                border: 1px solid #ddd;
                border-radius: 4px;
                margin-top: 5px;
                position: absolute;
                z-index: 1000;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            ">
                <div onclick="addDeductionItem('advance')" 
                    style="padding: 8px; cursor: pointer;">Salary Advance</div>
                <div onclick="addDeductionItem('charge')" 
                    style="padding: 8px; cursor: pointer;">Other Charge</div>
            </div>
            
            <div id="deductionItems"></div>
            <div id="deductionsTotal"></div>
        </div>
    `;

    // Add to form
    paymentDetailsDiv.appendChild(deductionsDiv);
}

function toggleDeductionsMenu() {
    const menu = document.getElementById('deductionsMenu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

function addDeductionItem(type) {
    const itemsContainer = document.getElementById('deductionItems');
    const itemId = Date.now();

    const itemHTML = `
        <div id="deduction-${itemId}" style="
            margin-top: 10px;
            padding: 10px;
            background: #f8f9fa;
            border: 1px solid #ddd;
            border-radius: 4px;
        ">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>${type === 'advance' ? 'Salary Advance' : 'Other Charge'}</span>
                <button onclick="removeDeductionItem(${itemId})" 
                    style="border: none; background: none; color: #dc3545; cursor: pointer;">×</button>
            </div>
            ${type === 'charge' ? `
                <input type="text" 
                    placeholder="Enter charge description" 
                    style="
                        width: 100%;
                        padding: 8px;
                        margin-bottom: 8px;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                    "
                >
            ` : ''}
            <input type="number" 
                placeholder="Enter amount" 
                class="deduction-amount"
                onchange="calculateTotal()"
                style="
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                "
            >
        </div>
    `;

    itemsContainer.insertAdjacentHTML('beforeend', itemHTML);
    toggleDeductionsMenu();
    calculateTotal();
}

function removeDeductionItem(id) {
    const item = document.getElementById(`deduction-${id}`);
    if (item) {
        item.remove();
        calculateTotal();
    }
}

function calculateTotal() {
    const basicSalary = parseFloat(document.getElementById('basicSalary').value) || 0;
    let totalDeductions =0;

    document.querySelectorAll('.deduction-amount').forEach(input => {
        totalDeductions += parseFloat(input.value) || 0;
    });

    const netSalary = basicSalary - totalDeductions;
    const totalDiv = document.getElementById('deductionsTotal');

    if (totalDeductions > 0) {
        totalDiv.innerHTML = `
            <div style="
                margin-top: 10px;
                padding: 10px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 4px;
            ">
                <div style="color: #dc3545; margin-bottom: 5px;">
                    Total Deductions: K${totalDeductions.toFixed(2)}
                </div>
                <div style="color: #2e7d32; font-weight: bold;">
                    Net Salary: K${netSalary.toFixed(2)}
                </div>
            </div>
        `;
    } else {
        totalDiv.innerHTML = '';
    }
}

// Add this to your existing payroll form event listener
document.addEventListener('DOMContentLoaded', function() {
    // Wait for the payroll modal to be shown
    const showPayrollBtn = document.getElementById('showPayrollBtn');
    if (showPayrollBtn) {
        showPayrollBtn.addEventListener('click', function() {
            setTimeout(function() {
                // Find the Payment Details section
                const basicSalaryInput = document.getElementById('basicSalary');
                if (basicSalaryInput) {
                    // Add deductions button after basic salary input
                    const deductionsButton = document.createElement('div');
                    deductionsButton.innerHTML = `
                        <button type="button" 
                            id="addDeductionBtn" 
                            style="
                                background: #2c3e50;
                                color: white;
                                border: none;
                                padding: 8px 15px;
                                border-radius: 4px;
                                cursor: pointer;
                                margin-top: 10px;
                            "
                        >Add Deduction</button>
                        <div id="deductionsDropdown" style="
                            display: none;
                            background: white;
                            border: 1px solid #ddd;
                            border-radius: 4px;
                            padding: 10px;
                            margin-top: 5px;
                            position: absolute;
                            z-index: 1000;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        ">
                            <div onclick="addDeductionItem('advance')" style="padding: 8px; cursor: pointer;">
                                Salary Advance
                            </div>
                            <div onclick="addDeductionItem('charge')" style="padding: 8px; cursor: pointer;">
                                Other Charge
                            </div>
                        </div>
                        <div id="deductionsList"></div>
                        <div id="deductionsTotal"></div>
                    `;
                    
                    basicSalaryInput.parentNode.insertBefore(deductionsButton, basicSalaryInput.nextSibling);

                    // Add click handler for deductions button
                    document.getElementById('addDeductionBtn').onclick = function(e) {
                        e.stopPropagation();
                        const dropdown = document.getElementById('deductionsDropdown');
                        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                    };

                    // Close dropdown when clicking outside
                    document.addEventListener('click', function(e) {
                        if (!e.target.closest('#addDeductionBtn')) {
                            const dropdown = document.getElementById('deductionsDropdown');
                            if (dropdown) dropdown.style.display = 'none';
                        }
                    });
                }
            }, 100);
        });
    }
});

function addDeductionItem(type) {
    const deductionsList = document.getElementById('deductionsList');
    const itemId = Date.now();

    const deductionHTML = `
        <div id="deduction-${itemId}" style="
            margin-top: 10px;
            padding: 10px;
            background: #f8f9fa;
            border: 1px solid #ddd;
            border-radius: 4px;
        ">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>${type === 'advance' ? 'Salary Advance' : 'Other Charge'}</span>
                <button onclick="removeDeductionItem(${itemId})" style="
                    border: none;
                    background: none;
                    color: #dc3545;
                    cursor: pointer;
                ">×</button>
            </div>
            ${type === 'charge' ? `
                <input type="text" 
                    placeholder="Enter charge description" 
                    style="
                        width: 100%;
                        padding: 8px;
                        margin-bottom: 8px;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                    "
                >
            ` : ''}
            <input type="number" 
                placeholder="Enter amount" 
                class="deduction-amount"
                onchange="calculateDeductions()"
                style="
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                "
            >
        </div>
    `;

    deductionsList.insertAdjacentHTML('beforeend', deductionHTML);
    document.getElementById('deductionsDropdown').style.display = 'none';
    calculateDeductions();
}

function removeDeductionItem(id) {
    const element = document.getElementById(`deduction-${id}`);
    if (element) {
        element.remove();
        calculateDeductions();
    }
}

function calculateDeductions() {
    const basicSalary = parseFloat(document.getElementById('basicSalary').value) || 0;
    let totalDeductions = 0;

    document.querySelectorAll('.deduction-amount').forEach(input => {
        totalDeductions += parseFloat(input.value) || 0;
    });

    const netSalary = basicSalary - totalDeductions;
    const totalDiv = document.getElementById('deductionsTotal');

    totalDiv.innerHTML = `
        <div style="
            margin-top: 10px;
            padding: 10px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
        ">
            <div style="color: #dc3545; margin-bottom: 5px;">
                Total Deductions: K${totalDeductions.toFixed(2)}
            </div>
            <div style="color: #2e7d32; font-weight: bold;">
                Net Salary: K${netSalary.toFixed(2)}
            </div>
        </div>
    `;
}

// Add this test code
document.getElementById('showPayrollBtn').addEventListener('click', function() {
    setTimeout(() => {
        console.log('Modal opened');
        const basicSalaryInput = document.querySelector('input[placeholder="Basic Salary (ZMW)"]');
        if (basicSalaryInput) {
            console.log('Found basic salary input');
            // Test button
            const testBtn = document.createElement('button');
            testBtn.textContent = 'Test Deductions';
            testBtn.style.cssText = 'margin-top: 10px; padding: 8px 15px; background: #2c3e50; color: white; border: none; border-radius: 4px;';
            basicSalaryInput.parentNode.insertBefore(testBtn, basicSalaryInput.nextSibling);
        } else {
            console.log('Could not find basic salary input');
        }
    }, 500);
});

// Update the existing payroll form event listener
document.addEventListener('DOMContentLoaded', function() {
    const payrollForm = document.getElementById('payrollForm');
    if (payrollForm) {
        // Add deductions section after basic salary input
        const basicSalaryInput = document.getElementById('basicSalary');
        if (basicSalaryInput) {
            const deductionsSection = document.createElement('div');
            deductionsSection.innerHTML = `
                <div class="form-group">
                    <h3>Deductions</h3>
                    <button type="button" 
                        onclick="toggleDeductionsMenu()" 
                        style="
                            background: #87CEEB;
                            color: #000;
                            border: none;
                            padding: 8px 15px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-weight: bold;
                            margin-top: 10px;
                        "
                    >Add Deduction</button>
                    
                    <div id="deductionsMenu" style="
                        display: none;
                        background: white;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        margin-top: 5px;
                        position: absolute;
                        z-index: 1000;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    ">
                        <div onclick="addDeductionItem('advance')" 
                            style="padding: 8px; cursor: pointer; hover: background-color: #f5f5f5;">
                            Salary Advance
                        </div>
                        <div onclick="addDeductionItem('charge')" 
                            style="padding: 8px; cursor: pointer; hover: background-color: #f5f5f5;">
                            Other Charge
                        </div>
                    </div>
                    
                    <div id="deductionItems"></div>
                    <div id="deductionsTotal"></div>
                </div>
            `;
            
            basicSalaryInput.parentNode.insertBefore(deductionsSection, basicSalaryInput.nextSibling);
        }
    }
});

// Add these functions to handle deductions
function toggleDeductionsMenu() {
    const menu = document.getElementById('deductionsMenu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

function addDeductionItem(type) {
    const itemsContainer = document.getElementById('deductionItems');
    const itemId = Date.now();

    const itemHTML = `
        <div id="deduction-${itemId}" style="
            margin-top: 10px;
            padding: 10px;
            background: #f8f9fa;
            border: 1px solid #ddd;
            border-radius: 4px;
        ">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>${type === 'advance' ? 'Salary Advance' : 'Other Charge'}</span>
                <button onclick="removeDeductionItem(${itemId})" 
                    style="border: none; background: none; color: #dc3545; cursor: pointer;">×</button>
            </div>
            ${type === 'charge' ? `
                <input type="text" 
                    placeholder="Enter charge description" 
                    style="
                        width: 100%;
                        padding: 8px;
                        margin-bottom: 8px;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                    "
                >
            ` : ''}
            <input type="number" 
                placeholder="Enter amount" 
                class="deduction-amount"
                onchange="calculateDeductions()"
                style="
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                "
            >
        </div>
    `;

    itemsContainer.insertAdjacentHTML('beforeend', itemHTML);
    toggleDeductionsMenu();
    calculateDeductions();
}

function removeDeductionItem(id) {
    const item = document.getElementById(`deduction-${id}`);
    if (item) {
        item.remove();
        calculateDeductions();
    }
}

function calculateDeductions() {
    const basicSalary = parseFloat(document.getElementById('basicSalary').value) || 0;
    let totalDeductions = 0;

    // Calculate NAPSA and PAYE first
    const napsa = Math.min(basicSalary * 0.05, 1073.20);
    const paye = calculatePAYE(basicSalary);

    // Add other deductions
    document.querySelectorAll('.deduction-amount').forEach(input => {
        totalDeductions += parseFloat(input.value) || 0;
    });

    // Calculate final net salary
    const netSalary = basicSalary - (napsa + paye + totalDeductions);
    const totalDiv = document.getElementById('deductionsTotal');

    totalDiv.innerHTML = `
        <div style="
            margin-top: 10px;
            padding: 10px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
        ">
            <div style="margin-bottom: 5px;">
                <span style="color: #666;">NAPSA (5%): </span>
                <span style="color: #dc3545;">K${napsa.toFixed(2)}</span>
            </div>
            <div style="margin-bottom: 5px;">
                <span style="color: #666;">PAYE: </span>
                <span style="color: #dc3545;">K${paye.toFixed(2)}</span>
            </div>
            ${totalDeductions > 0 ? `
                <div style="margin-bottom: 5px;">
                    <span style="color: #666;">Other Deductions: </span>
                    <span style="color: #dc3545;">K${totalDeductions.toFixed(2)}</span>
                </div>
            ` : ''}
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
                <span style="color: #666;">Total Deductions: </span>
                <span style="color: #dc3545;">K${(napsa + paye + totalDeductions).toFixed(2)}</span>
            </div>
            <div style="margin-top: 5px; font-weight: bold;">
                <span style="color: #666;">Net Salary: </span>
                <span style="color: #2e7d32;">K${netSalary.toFixed(2)}</span>
            </div>
        </div>
    `;
}

// Add event listener for other deductions type
document.getElementById('otherDeductionType').addEventListener('change', function() {
    const descriptionField = document.getElementById('otherDeductionDescription');
    if (this.value === 'other') {
        descriptionField.style.display = 'block';
        descriptionField.required = true;
    } else {
        descriptionField.style.display = 'none';
        descriptionField.required = false;
    }
});

// Update the calculate deductions function
function calculateDeductions() {
    const basicSalary = parseFloat(document.getElementById('basicSalary').value) || 0;
    const salaryAdvance = parseFloat(document.getElementById('salaryAdvance').value) || 0;
    const otherDeductionAmount = parseFloat(document.getElementById('otherDeductionAmount').value) || 0;
    
    // Calculate NAPSA and PAYE
    const napsa = Math.min(basicSalary * 0.05, 1073.20);
    const paye = calculatePAYE(basicSalary);
    
    // Total all deductions
    const totalDeductions = napsa + paye + salaryAdvance + otherDeductionAmount;
    const netSalary = basicSalary - totalDeductions;

    // Update readonly fields
    document.getElementById('napsaDeduction').value = napsa.toFixed(2);
    document.getElementById('payeDeduction').value = paye.toFixed(2);

    // Update deductions summary
    const totalDiv = document.getElementById('deductionsTotal');
    totalDiv.innerHTML = `
        <div class="deductions-summary">
            <div>
                <span>Basic Salary:</span>
                <span>K${basicSalary.toFixed(2)}</span>
            </div>
            <div>
                <span>NAPSA (5%):</span>
                <span class="deduction">-K${napsa.toFixed(2)}</span>
            </div>
            <div>
                <span>PAYE:</span>
                <span class="deduction">-K${paye.toFixed(2)}</span>
            </div>
            ${salaryAdvance > 0 ? `
            <div>
                <span>Salary Advance:</span>
                <span class="deduction">-K${salaryAdvance.toFixed(2)}</span>
            </div>
            ` : ''}
            ${otherDeductionAmount > 0 ? `
            <div>
                <span>${getOtherDeductionLabel()}:</span>
                <span class="deduction">-K${otherDeductionAmount.toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="total">
                <span>Total Deductions:</span>
                <span class="deduction">K${totalDeductions.toFixed(2)}</span>
            </div>
            <div class="net-salary">
                <span>Net Salary:</span>
                <span>K${netSalary.toFixed(2)}</span>
            </div>
        </div>
    `;
}

// Helper function to get the other deduction label
function getOtherDeductionLabel() {
    const select = document.getElementById('otherDeductionType');
    if (select.value === 'other') {
        return document.getElementById('otherDeductionDescription').value || 'Other Deduction';
    }
    return select.options[select.selectedIndex].text;
}

// Update the payslip generation to include deductions
function generatePayslip(employeeData) {
    // Get all deduction values
    const napsa = Math.min(employeeData.basicSalary * 0.05, 1073.20);
    const paye = calculatePAYE(employeeData.basicSalary);
    const salaryAdvance = parseFloat(document.getElementById('salaryAdvance').value) || 0;
    const otherDeductionAmount = parseFloat(document.getElementById('otherDeductionAmount').value) || 0;
    const otherDeductionType = document.getElementById('otherDeductionType').value;
    const otherDeductionDescription = document.getElementById('otherDeductionDescription').value;

    // Add deductions to employee data
    employeeData.deductions = {
        napsa,
        paye,
        salaryAdvance,
        otherDeductions: otherDeductionAmount,
        otherDeductionType,
        otherDeductionDescription
    };

    // Calculate total deductions and net salary
    const totalDeductions = napsa + paye + salaryAdvance + otherDeductionAmount;
    employeeData.totalDeductions = totalDeductions;
    employeeData.netSalary = employeeData.basicSalary - totalDeductions;

    // Continue with existing payslip generation...
}

// Update the payslip generation function
function generatePayslip(employeeData) {
    try {
        // Calculate all deductions
        const basicSalary = parseFloat(employeeData.basicSalary);
        const napsa = Math.min(basicSalary * 0.05, 1073.20);
        const paye = calculatePAYE(basicSalary);
        const salaryAdvance = parseFloat(document.getElementById('salaryAdvance').value) || 0;
        const otherDeductionAmount = parseFloat(document.getElementById('otherDeductionAmount').value) || 0;
        const otherDeductionType = document.getElementById('otherDeductionType').value;
        const otherDeductionDescription = document.getElementById('otherDeductionDescription').value;

        // Calculate total deductions and net salary
        const totalDeductions = napsa + paye + salaryAdvance + otherDeductionAmount;
        const netSalary = basicSalary - totalDeductions;

        // Create payslip HTML
        const payslipModal = document.createElement('div');
        payslipModal.className = 'modal';
        payslipModal.id = 'payslipDisplayModal';
        payslipModal.style.display = 'block';

        payslipModal.innerHTML = `
            <div class="modal-content payslip-content" style="background: white; padding: 30px; max-width: 800px; margin: 20px auto;">
                <!-- Header with Logos and School Info -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #87CEEB; padding-bottom: 20px;">
                    <img src="images/ZRA.png" alt="ZRA Logo" style="width: 100px; height: auto;">
                    <div style="text-align: center;">
                        <h2 style="margin: 0; font-size: 24px; color: #2c3e50;">RIVERDALE ACADEMY AND DAY CARE</h2>
                        <p style="margin: 5px 0; color: #666;">P.O BOX 510245 | CHIPATA</p>
                        <p style="margin: 5px 0; color: #666;">TEL: 0967724444 | EMAIL: mwansamapipo46@gmail.com</p>
                        <h3 style="margin: 10px 0; color: #2c3e50;">PAYSLIP</h3>
                        <p style="margin: 5px 0; color: #666;">For the month of ${new Date(employeeData.paymentDate).toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                    </div>
                    <img src="images/eastlogo.jpg" alt="School Logo" style="width: 100px; height: auto;">
                </div>

                <!-- Employee Information -->
                <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                        <div>
                            <p style="margin: 5px 0;"><strong>Employee Name:</strong> ${employeeData.name}</p>
                            <p style="margin: 5px 0;"><strong>Employee No:</strong> ${employeeData.employeeNumber}</p>
                            <p style="margin: 5px 0;"><strong>NRC Number:</strong> ${employeeData.nrcNumber}</p>
                        </div>
                        <div>
                            <p style="margin: 5px 0;"><strong>Role:</strong> ${employeeData.role}</p>
                            <p style="margin: 5px 0;"><strong>Payment Date:</strong> ${new Date(employeeData.paymentDate).toLocaleDateString()}</p>
                            <p style="margin: 5px 0;"><strong>Next Payment:</strong> ${new Date(employeeData.nextPaymentDate).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>

                <!-- Salary Details Table -->
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <tr style="background: #87CEEB;">
                        <th colspan="2" style="padding: 10px; color: #000; font-size: 16px; text-align: left;">
                            EARNINGS & DEDUCTIONS
                        </th>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">Basic Salary</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">
                            K${basicSalary.toFixed(2)}
                        </td>
                    </tr>
                    
                    <!-- Deductions -->
                    <tr style="background: #f8f9fa;">
                        <td colspan="2" style="padding: 10px; border: 1px solid #ddd;">
                            <strong>Deductions</strong>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">NAPSA (5%)</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #dc3545;">
                            -K${napsa.toFixed(2)}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">PAYE</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #dc3545;">
                            -K${paye.toFixed(2)}
                        </td>
                    </tr>
                    ${salaryAdvance > 0 ? `
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;">Salary Advance</td>
                            <td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #dc3545;">
                                -K${salaryAdvance.toFixed(2)}
                            </td>
                        </tr>
                    ` : ''}
                    ${otherDeductionAmount > 0 ? `
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;">
                                ${otherDeductionType === 'other' ? otherDeductionDescription : otherDeductionType}
                            </td>
                            <td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #dc3545;">
                                -K${otherDeductionAmount.toFixed(2)}
                            </td>
                        </tr>
                    ` : ''}
                    
                    <!-- Totals -->
                    <tr style="background: #f8f9fa;">
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Total Deductions</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #dc3545;">
                            <strong>K${totalDeductions.toFixed(2)}</strong>
                        </td>
                    </tr>
                    <tr style="background: #e8f5e9;">
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>NET SALARY</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #2e7d32;">
                            <strong>K${netSalary.toFixed(2)}</strong>
                        </td>
                    </tr>
                </table>

                <!-- Bottom Section with QR Code and Additional Info -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 20px;">
                    <div id="qrCodeContainer" style="background: white; padding: 10px; border: 1px solid #ddd;"></div>
                    <div style="text-align: right;">
                        <p style="margin: 5px 0;"><strong>Payslip No:</strong> ${generatePayslipReference()}</p>
                        <p style="margin: 5px 0;"><strong>Generated On:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                </div>

                <!-- Footer -->
                <div style="margin-top: 30px; text-align: center; border-top: 1px solid #ddd; padding-top: 20px;">
                    <p style="margin: 5px 0; color: #666;">This is a computer generated payslip and does not require signature.</p>
                    <p style="margin: 5px 0; color: #666;">System Developed By Chinyama Richard</p>
                    <p style="margin: 5px 0; color: #666;">Call: 0962299100, 0765099249 | Email: chinyamarichardcr@gmail.com</p>
                </div>

                <!-- Print/Close Buttons -->
                <div class="no-print" style="text-align: center; margin-top: 20px;">
                    <button onclick="window.print()" 
                            style="background: #87CEEB; color: #000; border: none; padding: 10px 20px; 
                                   border-radius: 4px; cursor: pointer; margin-right: 10px; font-weight: bold;">
                        Print Payslip
                    </button>
                    <button onclick="closePayslipModal()" 
                            style="background: #dc3545; color: white; border: none; padding: 10px 20px; 
                                   border-radius: 4px; cursor: pointer;">
                        Close
                    </button>
                </div>
            </div>
        `;

        // Add to document
        document.body.appendChild(payslipModal);

        // Generate QR Code with comprehensive information
        const qrContent = `
RIVERDALE ACADEMY PAYSLIP
------------------------
Employee: ${employeeData.name}
Employee No: ${employeeData.employeeNumber}
NRC: ${employeeData.nrcNumber}
Role: ${employeeData.role}
Payment Date: ${new Date(employeeData.paymentDate).toLocaleDateString()}
Basic Salary: K${basicSalary.toFixed(2)}
NAPSA: K${napsa.toFixed(2)}
PAYE: K${paye.toFixed(2)}
${salaryAdvance > 0 ? `Salary Advance: K${salaryAdvance.toFixed(2)}\n` : ''}
${otherDeductionAmount > 0 ? `${otherDeductionType}: K${otherDeductionAmount.toFixed(2)}\n` : ''}
Total Deductions: K${totalDeductions.toFixed(2)}
Net Salary: K${netSalary.toFixed(2)}
Reference: ${generatePayslipReference()}
        `.trim();

        new QRCode(document.getElementById("qrCodeContainer"), {
            text: qrContent,
            width: 100,
            height: 100,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

    } catch (error) {
        console.error('Error generating payslip:', error);
        alert('Error generating payslip. Please try again.');
    }
}

// Helper function to generate payslip reference
function generatePayslipReference() {
    return 'PS' + Date.now().toString().slice(-8);
}

// Function to close payslip modal
function closePayslipModal() {
    const modal = document.getElementById('payslipDisplayModal');
    if (modal) {
        modal.remove();
    }
}

// Add event listener for the payroll form
document.addEventListener('DOMContentLoaded', function() {
    const payrollForm = document.getElementById('payrollForm');
    if (payrollForm) {
        payrollForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validate all required fields
            const requiredFields = {
                'employeeName': 'Employee Name',
                'nrcNumber': 'NRC Number',
                'employeeRole': 'Employee Role',
                'basicSalary': 'Basic Salary',
                'paymentDate': 'Payment Date'
            };

            let missingFields = [];
            for (let [id, label] of Object.entries(requiredFields)) {
                if (!document.getElementById(id).value) {
                    missingFields.push(label);
                }
            }

            if (missingFields.length > 0) {
                alert('Please fill in the following required fields:\n' + missingFields.join('\n'));
                return;
            }

            // Collect employee data
            const employeeData = {
                name: document.getElementById('employeeName').value,
                employeeNumber: document.getElementById('employeeNumber').value || 'EMP' + Date.now(),
                nrcNumber: document.getElementById('nrcNumber').value,
                role: document.getElementById('employeeRole').value,
                basicSalary: parseFloat(document.getElementById('basicSalary').value),
                paymentDate: document.getElementById('paymentDate').value,
                nextPaymentDate: calculateNextPaymentDate(document.getElementById('paymentDate').value),
                salaryAdvance: parseFloat(document.getElementById('salaryAdvance').value) || 0,
                otherDeductionAmount: parseFloat(document.getElementById('otherDeductionAmount').value) || 0,
                otherDeductionType: document.getElementById('otherDeductionType').value,
                otherDeductionDescription: document.getElementById('otherDeductionDescription').value
            };

            // Hide the payroll modal
            document.getElementById('payrollModal').style.display = 'none';

            // Generate and print the payslip
            generatePayslip(employeeData);
        });
    }
});

// Update the generatePayslip function
function generatePayslip(employeeData) {
    try {
        // Calculate all deductions
        const basicSalary = parseFloat(employeeData.basicSalary);
        const napsa = Math.min(basicSalary * 0.05, 1073.20);
        const paye = calculatePAYE(basicSalary);
        const salaryAdvance = employeeData.salaryAdvance;
        const otherDeductionAmount = employeeData.otherDeductionAmount;

        // Calculate total deductions and net salary
        const totalDeductions = napsa + paye + salaryAdvance + otherDeductionAmount;
        const netSalary = basicSalary - totalDeductions;

        // Create payslip modal
        const payslipModal = document.createElement('div');
        payslipModal.className = 'modal';
        payslipModal.id = 'payslipDisplayModal';
        payslipModal.style.display = 'block';

        // Create payslip content
        payslipModal.innerHTML = `
            <div class="modal-content payslip-content">
                <!-- Header with Logos -->
                <div class="payslip-header">
                    <div class="logo-container">
                        <img src="images/ZRA.png" alt="ZRA Logo" class="logo">
                        <div class="school-info">
                            <h2>RIVERDALE ACADEMY</h2>
                            <h3>PAYSLIP</h3>
                            <p>21 PAIKANI PHIRI STREET RIVERSIDE, CHINGOLA</p>
                            <p>📞 0967182428 | ☎️ 0212 - 271983</p>
                            <p>For the month of ${new Date(employeeData.paymentDate).toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                        </div>
                        <img src="images/eastlogo.jpg" alt="School Logo" class="logo">
                    </div>
                </div>

                <!-- Employee Information -->
                <div class="employee-info">
                    <div class="info-row">
                        <p><strong>Employee Name:</strong> ${employeeData.name}</p>
                        <p><strong>Employee No:</strong> ${employeeData.employeeNumber}</p>
                    </div>
                    <div class="info-row">
                        <p><strong>NRC Number:</strong> ${employeeData.nrcNumber}</p>
                        <p><strong>Role:</strong> ${employeeData.role}</p>
                    </div>
                </div>

                <!-- Salary Details -->
                <table class="salary-table">
                    <tr>
                        <th>Description</th>
                        <th>Amount (ZMW)</th>
                    </tr>
                    <tr>
                        <td>Basic Salary</td>
                        <td class="amount">K${basicSalary.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td colspan="2"><strong>Deductions</strong></td>
                    </tr>
                    <tr>
                        <td>NAPSA (5%)</td>
                        <td class="amount deduction">-K${napsa.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>PAYE</td>
                        <td class="amount deduction">-K${paye.toFixed(2)}</td>
                    </tr>
                    ${salaryAdvance > 0 ? `
                        <tr>
                            <td>Salary Advance</td>
                            <td class="amount deduction">-K${salaryAdvance.toFixed(2)}</td>
                        </tr>
                    ` : ''}
                    ${otherDeductionAmount > 0 ? `
                        <tr>
                            <td>${employeeData.otherDeductionType === 'other' ? employeeData.otherDeductionDescription : employeeData.otherDeductionType}</td>
                            <td class="amount deduction">-K${otherDeductionAmount.toFixed(2)}</td>
                        </tr>
                    ` : ''}
                    <tr class="total-row">
                        <td>Total Deductions</td>
                        <td class="amount deduction">K${totalDeductions.toFixed(2)}</td>
                    </tr>
                    <tr class="net-salary">
                        <td><strong>NET SALARY</strong></td>
                        <td class="amount"><strong>K${netSalary.toFixed(2)}</strong></td>
                    </tr>
                </table>

                <!-- Payment Information -->
                <div class="payment-info">
                    <div>
                        <p><strong>Payment Date:</strong> ${new Date(employeeData.paymentDate).toLocaleDateString()}</p>
                        <p><strong>Next Payment:</strong> ${new Date(employeeData.nextPaymentDate).toLocaleDateString()}</p>
                    </div>
                    <div id="qrCodeContainer"></div>
                </div>

                <!-- Footer -->
                <div class="payslip-footer">
                    <p>This is a computer generated payslip and does not require signature.</p>
                    <p>System Developed By Chinyama Richard</p>
                    <p>Call: 0962299100, 0765099249 | Email: chinyamarichardcr@gmail.com</p>
                </div>

                <!-- Action Buttons -->
                <div class="action-buttons no-print">
                    <button onclick="window.print()" class="print-btn">Print Payslip</button>
                    <button onclick="closePayslipModal()" class="close-btn">Close</button>
                </div>
            </div>
        `;

        // Add to document
        document.body.appendChild(payslipModal);

        // Generate QR Code
        new QRCode(document.getElementById("qrCodeContainer"), {
            text: `
                RIVERDALE ACADEMY AND DAY CARE
                Employee: ${employeeData.name}
                Employee No: ${employeeData.employeeNumber}
                NRC: ${employeeData.nrcNumber}
                Basic Salary: K${basicSalary}
                Net Salary: K${netSalary}
                Payment Date: ${employeeData.paymentDate}
            `,
            width: 100,
            height: 100
        });

        // Automatically trigger print after a short delay
        setTimeout(() => {
            window.print();
        }, 500);

    } catch (error) {
        console.error('Error generating payslip:', error);
        alert('Error generating payslip. Please try again.');
    }
}

// Add this function to calculate deductions in real-time
function calculateDeductions() {
    const basicSalary = parseFloat(document.getElementById('basicSalary').value) || 0;
    const salaryAdvance = parseFloat(document.getElementById('salaryAdvance').value) || 0;
    const otherDeductionAmount = parseFloat(document.getElementById('otherDeductionAmount').value) || 0;
    
    const napsa = Math.min(basicSalary * 0.05, 1073.20);
    const paye = calculatePAYE(basicSalary);
    
    // Update readonly fields
    document.getElementById('napsaDeduction').value = napsa.toFixed(2);
    document.getElementById('payeDeduction').value = paye.toFixed(2);
    
    const totalDeductions = napsa + paye + salaryAdvance + otherDeductionAmount;
    const netSalary = basicSalary - totalDeductions;

    // Update deductions summary
    const totalDiv = document.getElementById('deductionsTotal');
    totalDiv.innerHTML = `
        <div class="deductions-summary">
            <div>Total Deductions: K${totalDeductions.toFixed(2)}</div>
            <div>Net Salary: K${netSalary.toFixed(2)}</div>
        </div>
    `;
}

// Add these event listeners at the top of your work.js file
document.addEventListener('DOMContentLoaded', function() {
    // Add event listener for basic salary input
    const basicSalaryInput = document.getElementById('basicSalary');
    if (basicSalaryInput) {
        basicSalaryInput.addEventListener('input', calculateDeductions);
    }

    // Add event listener for salary advance input
    const salaryAdvanceInput = document.getElementById('salaryAdvance');
    if (salaryAdvanceInput) {
        salaryAdvanceInput.addEventListener('input', calculateDeductions);
    }

    // Add event listener for other deduction amount
    const otherDeductionInput = document.getElementById('otherDeductionAmount');
    if (otherDeductionInput) {
        otherDeductionInput.addEventListener('input', calculateDeductions);
    }

    // Add event listener for other deduction type
    const otherDeductionType = document.getElementById('otherDeductionType');
    if (otherDeductionType) {
        otherDeductionType.addEventListener('change', function() {
            const descriptionField = document.getElementById('otherDeductionDescription');
            if (descriptionField) {
                descriptionField.style.display = this.value === 'other' ? 'block' : 'none';
            }
        });
    }

    // Add event listener for the form submission
    const payrollForm = document.getElementById('payrollForm');
    if (payrollForm) {
        payrollForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Form submitted'); // Debug log

            // Collect all form data
            const employeeData = {
                name: document.getElementById('employeeName').value,
                employeeNumber: document.getElementById('employeeNumber').value || 'EMP' + Date.now(),
                nrcNumber: document.getElementById('nrcNumber').value,
                role: document.getElementById('employeeRole').value,
                basicSalary: parseFloat(document.getElementById('basicSalary').value),
                paymentDate: document.getElementById('paymentDate').value,
                nextPaymentDate: calculateNextPaymentDate(document.getElementById('paymentDate').value),
                salaryAdvance: parseFloat(document.getElementById('salaryAdvance').value) || 0,
                otherDeductionAmount: parseFloat(document.getElementById('otherDeductionAmount').value) || 0,
                otherDeductionType: document.getElementById('otherDeductionType').value,
                otherDeductionDescription: document.getElementById('otherDeductionDescription').value
            };

            console.log('Employee Data:', employeeData); // Debug log

            // Generate and print payslip
            generatePayslip(employeeData);
        });
    }
});

// Update the calculateDeductions function
function calculateDeductions() {
    console.log('Calculating deductions'); // Debug log
    const basicSalary = parseFloat(document.getElementById('basicSalary').value) || 0;
    const salaryAdvance = parseFloat(document.getElementById('salaryAdvance').value) || 0;
    const otherDeductionAmount = parseFloat(document.getElementById('otherDeductionAmount').value) || 0;
    
    const napsa = Math.min(basicSalary * 0.05, 1073.20);
    const paye = calculatePAYE(basicSalary);
    
    // Update readonly fields
    document.getElementById('napsaDeduction').value = napsa.toFixed(2);
    document.getElementById('payeDeduction').value = paye.toFixed(2);
    
    const totalDeductions = napsa + paye + salaryAdvance + otherDeductionAmount;
    const netSalary = basicSalary - totalDeductions;

    // Update deductions summary
    const totalDiv = document.getElementById('deductionsTotal');
    if (totalDiv) {
        totalDiv.innerHTML = `
            <div class="deductions-summary" style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                <div style="margin-bottom: 5px;">
                    <strong>Basic Salary:</strong> K${basicSalary.toFixed(2)}
                </div>
                <div style="margin-bottom: 5px;">
                    <strong>Total Deductions:</strong> K${totalDeductions.toFixed(2)}
                </div>
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
                    <strong>Net Salary:</strong> K${netSalary.toFixed(2)}
                </div>
            </div>
        `;
    }
    
    console.log('Deductions calculated:', { napsa, paye, totalDeductions, netSalary }); // Debug log
}

function generatePayslip(employeeData) {
    try {
        // Calculate all deductions
        const basicSalary = parseFloat(employeeData.basicSalary);
        const napsa = Math.min(basicSalary * 0.05, 1073.20);
        const paye = calculatePAYE(basicSalary);
        const salaryAdvance = employeeData.salaryAdvance;
        const otherDeductionAmount = employeeData.otherDeductionAmount;

        // Calculate total deductions and net salary
        const totalDeductions = napsa + paye + salaryAdvance + otherDeductionAmount;
        const netSalary = basicSalary - totalDeductions;

        // Create payslip modal
        const payslipModal = document.createElement('div');
        payslipModal.className = 'modal';
        payslipModal.id = 'payslipDisplayModal';
        payslipModal.style.display = 'block';

        // Create payslip content with additional information
        payslipModal.innerHTML = `
            <div class="modal-content payslip-content">
                <!-- Header with Logos -->
                <div class="payslip-header">
                    <div class="logo-container">
                        <img src="images/ZRA.png" alt="ZRA Logo" class="logo">
                        <div class="school-info">
                            <h2>RIVERDALE ACADEMY</h2>
                            <h3>PAYSLIP</h3>
                            <p>21 PAIKANI PHIRI STREET RIVERSIDE, CHINGOLA</p>
                            <p>📞 0967182428 | ☎️ 0212 - 271983</p>
                            <p>For the month of ${new Date(employeeData.paymentDate).toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                        </div>
                        <img src="images/eastlogo.jpg" alt="School Logo" class="logo">
                    </div>
                </div>

                <!-- Employee Information with Additional Details -->
                <div class="employee-info">
                    <div class="info-row">
                        <p><strong>Employee Name:</strong> ${employeeData.name}</p>
                        <p><strong>Employee No:</strong> ${employeeData.employeeNumber}</p>
                    </div>
                    <div class="info-row">
                        <p><strong>NRC Number:</strong> ${employeeData.nrcNumber}</p>
                        <p><strong>Role:</strong> ${employeeData.role}</p>
                    </div>
                    <div class="info-row">
                        <p><strong>Department:</strong> ${employeeData.role === 'teaching' ? 'Academic Staff' : 'Support Staff'}</p>
                        <p><strong>Pay Period:</strong> Monthly</p>
                    </div>
                </div>

                <!-- Salary Details with Additional Information -->
                <table class="salary-table">
                    <tr>
                        <th colspan="2">EARNINGS & DEDUCTIONS</th>
                    </tr>
                    <tr>
                        <td colspan="2" class="sub-header">Earnings</td>
                    </tr>
                    <tr>
                        <td>Basic Salary</td>
                        <td class="amount">K${basicSalary.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>Housing Allowance</td>
                        <td class="amount">K0.00</td>
                    </tr>
                    <tr>
                        <td>Transport Allowance</td>
                        <td class="amount">K0.00</td>
                    </tr>
                    <tr>
                        <td><strong>Gross Pay</strong></td>
                        <td class="amount"><strong>K${basicSalary.toFixed(2)}</strong></td>
                    </tr>
                    <tr>
                        <td colspan="2" class="sub-header">Deductions</td>
                    </tr>
                    <tr>
                        <td>NAPSA (5%)</td>
                        <td class="amount deduction">-K${napsa.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>PAYE</td>
                        <td class="amount deduction">-K${paye.toFixed(2)}</td>
                    </tr>
                    ${salaryAdvance > 0 ? `
                        <tr>
                            <td>Salary Advance</td>
                            <td class="amount deduction">-K${salaryAdvance.toFixed(2)}</td>
                        </tr>
                    ` : ''}
                    ${otherDeductionAmount > 0 ? `
                        <tr>
                            <td>${employeeData.otherDeductionType === 'other' ? employeeData.otherDeductionDescription : employeeData.otherDeductionType}</td>
                            <td class="amount deduction">-K${otherDeductionAmount.toFixed(2)}</td>
                        </tr>
                    ` : ''}
                    <tr class="total-row">
                        <td>Total Deductions</td>
                        <td class="amount deduction">K${totalDeductions.toFixed(2)}</td>
                    </tr>
                    <tr class="net-salary">
                        <td><strong>NET SALARY</strong></td>
                        <td class="amount"><strong>K${netSalary.toFixed(2)}</strong></td>
                    </tr>
                </table>

                <!-- Payment Information with Additional Details -->
                <div class="payment-info">
                    <div class="payment-details">
                        <p><strong>Payment Date:</strong> ${new Date(employeeData.paymentDate).toLocaleDateString()}</p>
                        <p><strong>Next Payment:</strong> ${new Date(employeeData.nextPaymentDate).toLocaleDateString()}</p>
                        <p><strong>Payment Method:</strong> Bank Transfer</p>
                        <p><strong>Payslip No:</strong> ${generatePayslipReference()}</p>
                    </div>
                    <div id="qrCodeContainer"></div>
                </div>

                <!-- Additional Notes -->
                <div class="additional-notes">
                    <p><strong>Notes:</strong></p>
                    <ul>
                        <li>NAPSA is calculated at 5% of basic salary (max: K1,073.20)</li>
                        <li>PAYE is calculated according to current tax bands</li>
                        <li>This payslip is computer generated and valid without signature</li>
                    </ul>
                </div>

                <!-- Action Buttons -->
                <div class="action-buttons no-print">
                    <button onclick="window.print()" class="print-btn">Print Payslip</button>
                    <button onclick="closePayslipModal()" class="close-btn">Close</button>
                </div>
            </div>
        `;

        // Add to document
        document.body.appendChild(payslipModal);

        // Generate QR Code with additional information
        new QRCode(document.getElementById("qrCodeContainer"), {
            text: `
                RIVERDALE ACADEMY PAYSLIP
                ------------------------
                Employee: ${employeeData.name}
                Employee No: ${employeeData.employeeNumber}
                NRC: ${employeeData.nrcNumber}
                Department: ${employeeData.role === 'teaching' ? 'Academic Staff' : 'Support Staff'}
                Basic Salary: K${basicSalary.toFixed(2)}
                Total Deductions: K${totalDeductions.toFixed(2)}
                Net Salary: K${netSalary.toFixed(2)}
                Payment Date: ${new Date(employeeData.paymentDate).toLocaleDateString()}
                Payslip No: ${generatePayslipReference()}
            `,
            width: 100,
            height: 100
        });

        // Automatically trigger print after a short delay
        setTimeout(() => {
            window.print();
        }, 500);

    } catch (error) {
        console.error('Error generating payslip:', error);
        alert('Error generating payslip. Please try again.');
    }
}

// Payroll functionality
document.addEventListener('DOMContentLoaded', function() {
    // Show/Hide Payroll Modal
    const payrollBtn = document.getElementById('showPayrollBtn');
    const payrollModal = document.getElementById('payrollModal');
    const closeBtn = payrollModal.querySelector('.close');

    payrollBtn.onclick = function() {
        payrollModal.style.display = "block";
    }

    closeBtn.onclick = function() {
        payrollModal.style.display = "none";
    }

    // Calculate deductions when any salary component changes
    const salaryInputs = [
        'basicSalary',
        'housingAllowance',
        'transportAllowance',
        'responsibilityAllowance',
        'overtimeRate',
        'overtimeHours',
        'salaryAdvance',
        'otherDeductionAmount'
    ];

    salaryInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', calculateTotalSalary);
        }
    });

    // Handle other deduction type change
    const otherDeductionType = document.getElementById('otherDeductionType');
    if (otherDeductionType) {
        otherDeductionType.addEventListener('change', function() {
            const descriptionGroup = document.getElementById('otherDeductionDescriptionGroup');
            descriptionGroup.style.display = this.value === 'other' ? 'block' : 'none';
        });
    }

    // Handle form submission
    const payrollForm = document.getElementById('payrollForm');
    if (payrollForm) {
        payrollForm.addEventListener('submit', handlePayrollSubmission);
    }
});

function calculateTotalSalary() {
    // Get all salary components
    const basicSalary = parseFloat(document.getElementById('basicSalary').value) || 0;
    const housingAllowance = parseFloat(document.getElementById('housingAllowance').value) || 0;
    const transportAllowance = parseFloat(document.getElementById('transportAllowance').value) || 0;
    const responsibilityAllowance = parseFloat(document.getElementById('responsibilityAllowance').value) || 0;
    
    // Calculate overtime
    const overtimeRate = parseFloat(document.getElementById('overtimeRate').value) || 0;
    const overtimeHours = parseFloat(document.getElementById('overtimeHours').value) || 0;
    const overtimePay = overtimeRate * overtimeHours;

    // Calculate gross salary
    const grossSalary = basicSalary + housingAllowance + transportAllowance + 
                       responsibilityAllowance + overtimePay;

    // Calculate deductions
    const napsa = Math.min(basicSalary * 0.05, 1073.20); // 5% of basic salary, max K1,073.20
    const paye = calculatePAYE(basicSalary);
    const nhima = calculateNHIMA(basicSalary); // 1% of basic salary
    const salaryAdvance = parseFloat(document.getElementById('salaryAdvance').value) || 0;
    const otherDeductionAmount = parseFloat(document.getElementById('otherDeductionAmount').value) || 0;

    // Calculate total deductions
    const totalDeductions = napsa + paye + nhima + salaryAdvance + otherDeductionAmount;

    // Calculate net salary
    const netSalary = grossSalary - totalDeductions;

    // Update readonly fields
    document.getElementById('napsaDeduction').value = napsa.toFixed(2);
    document.getElementById('payeDeduction').value = paye.toFixed(2);
    document.getElementById('nhima').value = nhima.toFixed(2);

    // Update salary summary
    const totalDiv = document.getElementById('deductionsTotal');
    if (totalDiv) {
        totalDiv.innerHTML = `
            <div><span>Gross Salary:</span> <span>K${grossSalary.toFixed(2)}</span></div>
            <div><span>Basic Salary:</span> <span>K${basicSalary.toFixed(2)}</span></div>
            <div><span>Housing Allowance:</span> <span>K${housingAllowance.toFixed(2)}</span></div>
            <div><span>Transport Allowance:</span> <span>K${transportAllowance.toFixed(2)}</span></div>
            <div><span>Responsibility Allowance:</span> <span>K${responsibilityAllowance.toFixed(2)}</span></div>
            <div><span>Overtime Pay:</span> <span>K${overtimePay.toFixed(2)}</span></div>
            <div style="border-top: 1px solid #ddd; margin-top: 10px; padding-top: 10px;">
                <span>Total Deductions:</span> <span>K${totalDeductions.toFixed(2)}</span>
            </div>
            <div style="font-weight: bold; color: #28a745; margin-top: 10px;">
                <span>Net Salary:</span> <span>K${netSalary.toFixed(2)}</span>
            </div>
        `;
    }

    return { grossSalary, totalDeductions, netSalary };
}

function calculatePAYE(basicSalary) {
    let paye = 0;
    if (basicSalary > 4800) {
        paye = (basicSalary - 4800) * 0.30 + 960;
    } else if (basicSalary > 3300) {
        paye = (basicSalary - 3300) * 0.25 + 435;
    } else if (basicSalary > 0) {
        paye = basicSalary * 0.15;
    }
    return paye;
}

function calculateNHIMA(basicSalary) {
    return basicSalary * 0.01; // 1% of basic salary
}

function handlePayrollSubmission(e) {
    e.preventDefault();
    
    const { grossSalary, totalDeductions, netSalary } = calculateTotalSalary();
    
    const employeeData = {
        // Personal Information
        name: document.getElementById('employeeName').value,
        employeeNumber: document.getElementById('employeeNumber').value,
        nrcNumber: document.getElementById('nrcNumber').value,
        phoneNumber: document.getElementById('phoneNumber').value,
        email: document.getElementById('email').value,
        address: document.getElementById('address').value,

        // Employment Details
        role: document.getElementById('employeeRole').value,
        department: document.getElementById('department').value,
        joinDate: document.getElementById('joinDate').value,

        // Salary Details
        basicSalary: parseFloat(document.getElementById('basicSalary').value),
        housingAllowance: parseFloat(document.getElementById('housingAllowance').value) || 0,
        transportAllowance: parseFloat(document.getElementById('transportAllowance').value) || 0,
        responsibilityAllowance: parseFloat(document.getElementById('responsibilityAllowance').value) || 0,
        overtimeRate: parseFloat(document.getElementById('overtimeRate').value) || 0,
        overtimeHours: parseFloat(document.getElementById('overtimeHours').value) || 0,

        // Payment Information
        bankName: document.getElementById('bankName').value,
        accountNumber: document.getElementById('accountNumber').value,
        branchName: document.getElementById('branchName').value,
        paymentDate: document.getElementById('paymentDate').value,

        // Calculated Values
        grossSalary,
        totalDeductions,
        netSalary
    };

    generatePayslip(employeeData);
}

function generatePayslip(employeeData) {
    // ... (keep your existing generatePayslip function and update it to include new fields)
}

// Add this at the beginning of your work.js file
document.addEventListener('DOMContentLoaded', function() {
    // Payroll Modal functionality
    const payrollBtn = document.getElementById('showPayrollBtn');
    const payrollModal = document.getElementById('payrollModal');
    
    if (payrollBtn && payrollModal) {
        // Show modal when button is clicked
        payrollBtn.addEventListener('click', function() {
            payrollModal.style.display = 'block';
            console.log('Payroll button clicked'); // Debug log
        });

        // Close modal when X is clicked
        const closeBtn = payrollModal.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                payrollModal.style.display = 'none';
            });
        }

        // Close modal when clicking outside
        window.addEventListener('click', function(event) {
            if (event.target == payrollModal) {
                payrollModal.style.display = 'none';
            }
        });

        // Initialize salary calculations
        const basicSalaryInput = document.getElementById('basicSalary');
        if (basicSalaryInput) {
            basicSalaryInput.addEventListener('input', calculateTotalSalary);
        }

        // Handle form submission
        const payrollForm = document.getElementById('payrollForm');
        if (payrollForm) {
            payrollForm.addEventListener('submit', function(e) {
                e.preventDefault();
                handlePayrollSubmission(e);
            });
        }
    } else {
        console.error('Payroll button or modal not found!');
    }
});

// Make sure these styles are in your work.css
// .modal {
//     display: none;
//     position: fixed;
//     z-index: 1000;
//     left: 0;
//     top: 0;
//     width: 100%;
//     height: 100%;
//     background-color: rgba(0,0,0,0.5);
// }

// Also verify this HTML exists in your work.html
// <div class="button-container">
//     <button id="showPayrollBtn" class="action-button">Payment of Salaries</button>
// </div>

// Remove all previous payroll event listeners and add this at the beginning of work.js
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded'); // Debug log

    // Get the button and modal
    const payrollBtn = document.getElementById('showPayrollBtn');
    const payrollModal = document.getElementById('payrollModal');
    
    console.log('Payroll Button:', payrollBtn); // Debug log
    console.log('Payroll Modal:', payrollModal); // Debug log

    if (payrollBtn) {
        payrollBtn.addEventListener('click', function() {
            console.log('Button clicked'); // Debug log
            if (payrollModal) {
                payrollModal.style.display = 'block';
            }
        });
    }

    // Close button functionality
    const closeBtn = document.querySelector('#payrollModal .close');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            payrollModal.style.display = 'none';
        });
    }

    // Close when clicking outside the modal
    window.addEventListener('click', function(event) {
        if (event.target === payrollModal) {
            payrollModal.style.display = 'none';
        }
    });

    // Initialize salary calculations
    const basicSalaryInput = document.getElementById('basicSalary');
    if (basicSalaryInput) {
        basicSalaryInput.addEventListener('input', calculateTotalSalary);
    }

    // Handle form submission
    const payrollForm = document.getElementById('payrollForm');
    if (payrollForm) {
        payrollForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handlePayrollSubmission(e);
        });
    }
});

// Make sure these styles are in your CSS
const modalStyles = `
.modal {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.5);
}

.modal-content {
    background-color: white;
    margin: 5% auto;
    padding: 20px;
    width: 80%;
    max-width: 800px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
`;

// Add styles programmatically
const styleSheet = document.createElement('style');
styleSheet.textContent = modalStyles;
document.head.appendChild(styleSheet);

