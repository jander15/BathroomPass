// js/tutoring_admin.js

// --- Global State ---
let allTutoringLogs = [];

// --- DOM Element Caching ---
let reportMessage, reportTable, reportTableBody;
let tutorFilter, studentFilter, periodFilter, dateFilter;
let adminContainer; // Add this

function cacheDOMElements() {
    reportMessage = document.getElementById('reportMessage');
    reportTable = document.getElementById('reportTable');
    reportTableBody = document.getElementById('reportTableBody');
    tutorFilter = document.getElementById('tutorFilter');
    studentFilter = document.getElementById('studentFilter');
    periodFilter = document.getElementById('periodFilter');
    dateFilter = document.getElementById('dateFilter');
    adminContainer = document.getElementById('adminContainer');
}

// --- Helper & Formatting Functions ---
function getWeekRange() {
    const now = new Date();
    const first = now.getDate() - now.getDay();
    const firstDay = new Date(new Date().setDate(first));
    const lastDay = new Date(new Date().setDate(first + 6));
    return { start: firstDay, end: lastDay };
}

function getMonthRange() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: firstDay, end: lastDay };
}


// --- Main Report Rendering Function ---
function renderAdminReport() {
    let filteredLogs = [...allTutoringLogs];

    // Apply all filters
    const selectedTutor = tutorFilter.value;
    if (selectedTutor !== 'all') {
        filteredLogs = filteredLogs.filter(entry => entry.TeacherEmail === selectedTutor);
    }

    const selectedStudent = studentFilter.value;
    if (selectedStudent !== 'all') {
        filteredLogs = filteredLogs.filter(entry => entry.StudentName === selectedStudent);
    }

    const selectedPeriod = periodFilter.value;
    if (selectedPeriod !== 'all') {
        filteredLogs = filteredLogs.filter(entry => entry.ClassName === selectedPeriod);
    }

    const selectedDate = dateFilter.value;
    if (selectedDate !== 'all_time') {
        let startDate, endDate;
        const today = new Date();

        if (selectedDate === 'today') {
            startDate = new Date(today.setHours(0, 0, 0, 0));
            endDate = new Date(new Date().setHours(23, 59, 59, 999));
        } else if (selectedDate === 'this_week') {
            const range = getWeekRange();
            startDate = new Date(range.start.setHours(0, 0, 0, 0));
            endDate = new Date(range.end.setHours(23, 59, 59, 999));
        } else if (selectedDate === 'this_month') {
            const range = getMonthRange();
            startDate = new Date(range.start.setHours(0, 0, 0, 0));
            endDate = new Date(range.end.setHours(23, 59, 59, 999));
        }
        
        if(startDate && endDate) {
            filteredLogs = filteredLogs.filter(entry => {
                const entryDate = new Date(entry.Timestamp);
                return entryDate >= startDate && entryDate <= endDate;
            });
        }
    }


    if (filteredLogs.length === 0) {
        reportMessage.textContent = "No log entries found for the selected criteria.";
        reportMessage.classList.remove('hidden');
        reportTable.classList.add('hidden');
        return;
    }
    
    reportTable.classList.remove('hidden');
    reportMessage.classList.add('hidden');
    reportTableBody.innerHTML = '';

    // Sort by most recent first
    filteredLogs.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));

    filteredLogs.forEach(entry => {
        const tr = document.createElement('tr');
        tr.className = 'border-t';
        
        const entryDate = new Date(entry.Timestamp);
        const formattedDate = !isNaN(entryDate) ? entryDate.toLocaleDateString() : "Invalid Date";
        
        tr.innerHTML = `
            <td class="p-2">${formattedDate}</td>
            <td class="p-2">${entry.TeacherEmail || 'N/A'}</td>
            <td class="p-2">${entry.StudentName || 'N/A'}</td>
            <td class="p-2">${entry.ClassName || 'N/A'}</td>
            <td class="p-2">${typeof entry.DurationMinutes === 'number' ? `${entry.DurationMinutes} min` : 'N/A'}</td>
            <td class="p-2 truncate" title="${entry.Notes || ''}">${entry.Notes || ''}</td>
        `;
        reportTableBody.appendChild(tr);
    });
}


// --- Main Initialization & Authorization ---
async function initializePageSpecificApp() {
    cacheDOMElements();

    try {
        // Step 1: Make a single call to get both authorization and data.
        const response = await sendAuthenticatedRequest({ action: 'getAdminDashboardData' });

        if (response.result !== 'success') {
            throw new Error(response.error || "Failed to get data from server.");
        }

        // Step 2: Check the authorization status from the single response.
        if (!response.isAuthorized) {
            adminContainer.classList.add('hidden');
            showErrorAlert("Access Denied: You are not authorized to view this page.");
            return;
        }

        // Step 3: If authorized, use the log data from the same response.
        allTutoringLogs = response.logs;
        
        // Step 4: Populate filter dropdowns based on the full log data.
        const uniqueTutors = [...new Set(allTutoringLogs.map(entry => entry.TeacherEmail))].sort();
        populateDropdown('tutorFilter', uniqueTutors, "All Tutors", "all");
        
        const uniqueStudents = [...new Set(allTutoringLogs.map(entry => entry.StudentName))].sort();
        populateDropdown('studentFilter', uniqueStudents, "All Students", "all");

        const uniquePeriods = [...new Set(allTutoringLogs.map(entry => entry.ClassName))].filter(p => p).sort(); // Filter out empty strings
        populateDropdown('periodFilter', uniquePeriods, "All Periods", "all");
        
        // Initial render of the report
        renderAdminReport();

        // Step 5: Add event listeners to all filters to re-render the report on change.
        tutorFilter.addEventListener('change', renderAdminReport);
        studentFilter.addEventListener('change', renderAdminReport);
        periodFilter.addEventListener('change', renderAdminReport);
        dateFilter.addEventListener('change', renderAdminReport);

    } catch (error) {
        console.error("Initialization failed:", error);
        reportMessage.textContent = `Error: ${error.message}`;
    }
}

function resetPageSpecificAppState() {
    allTutoringLogs = [];
    if(reportTableBody) reportTableBody.innerHTML = '';
    // Reset filters
    if(tutorFilter) tutorFilter.innerHTML = '';
    if(studentFilter) studentFilter.innerHTML = '';
    if(periodFilter) periodFilter.innerHTML = '';
    if(dateFilter) dateFilter.value = 'all_time';
}