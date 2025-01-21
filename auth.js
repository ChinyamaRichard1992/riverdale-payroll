// Check if user is logged in
async function checkAuth() {
    try {
        const response = await fetch('/api/employees');
        if (response.status === 401) {
            window.location.href = '/login';
            return false;
        }
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        return false;
    }
}

// Handle employee data persistence
async function saveEmployee(employeeData) {
    try {
        const response = await fetch('/api/employees', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(employeeData)
        });
        
        if (response.status === 403) {
            alert('Only administrators can add or modify employee data');
            return null;
        }
        
        const data = await response.json();
        if (response.ok) {
            return data;
        } else {
            throw new Error(data.error || 'Failed to save employee');
        }
    } catch (error) {
        console.error('Save failed:', error);
        alert('Failed to save employee data: ' + error.message);
        return null;
    }
}

// Load all employees
async function loadEmployees() {
    try {
        const response = await fetch('/api/employees');
        if (!response.ok) {
            throw new Error('Failed to load employees');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Load failed:', error);
        alert('Failed to load employee data: ' + error.message);
        return [];
    }
}

// Update employee
async function updateEmployee(employeeId, employeeData) {
    try {
        const response = await fetch('/api/employees', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: employeeId, ...employeeData })
        });
        
        if (response.status === 403) {
            alert('Only administrators can modify employee data');
            return null;
        }
        
        const data = await response.json();
        if (response.ok) {
            return data;
        } else {
            throw new Error(data.error || 'Failed to update employee');
        }
    } catch (error) {
        console.error('Update failed:', error);
        alert('Failed to update employee data: ' + error.message);
        return null;
    }
}

// Delete employee
async function deleteEmployee(employeeId) {
    try {
        const response = await fetch(`/api/employees?id=${employeeId}`, {
            method: 'DELETE'
        });
        
        if (response.status === 403) {
            alert('Only administrators can delete employee data');
            return false;
        }
        
        if (response.ok) {
            return true;
        } else {
            const data = await response.json();
            throw new Error(data.error || 'Failed to delete employee');
        }
    } catch (error) {
        console.error('Delete failed:', error);
        alert('Failed to delete employee: ' + error.message);
        return false;
    }
}

// Logout function
function logout() {
    window.location.href = '/logout';
}
