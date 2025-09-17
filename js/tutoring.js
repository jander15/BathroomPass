// js/tutoring.js

// --- Global State ---
let masterStudentList = [];
let allTutoringLogs = [];
let selectedStudents = [];
let currentEditTimestamp = null;

// --- DOM Element Caching ---
let pageHeader, tutoringContainer;
let newLogTab, adminReportTab, newLogContent, adminReportContent;
// Center elements
let studentLookup, studentResults, durationInput, notesInput, tutoringForm, submitBtn, selectedStudentsList;
// Admin elements
let reportMessage, reportTable, reportTableBody, tutorFilter, studentFilter, periodFilter, dateFilter, reloadDataBtn;
// Modal elements
let noteModal, noteModalContent, closeNoteModalBtn;
let editModal, editStudentName, editDuration, editNotes, saveEditBtn, cancelEditBtn, deleteEntryBtn;


function cacheDOMElements() {
    pageHeader = document.querySelector('#appContent h1');
    tutoringContainer = document.getElementById('tutoringContainer');
    newLogTab = document.getElementById('newLogTab');
    adminReportTab = document.getElementById('adminReportTab');
    newLogContent = document.getElementById('newLogContent');
    adminReportContent = document.getElementById('adminReportContent');
    // Center
    studentLookup = document.getElementById('studentLookup');
    studentResults = document.getElementById('studentResults');
    durationInput = document.getElementById('durationInput');
    notesInput = document.getElementById('notesInput');
    tutoringForm = document.getElementById('tutoringForm');
    submitBtn = document.getElementById('submitBtn');
    selectedStudentsList = document.getElementById('selectedStudentsList');
    // Admin
    reportMessage = document.getElementById('reportMessage');
    reportTable = document.getElementById('reportTable');
    reportTableBody = document.getElementById('reportTableBody');
    tutorFilter = document.getElementById('tutorFilter');
    studentFilter = document.getElementById('studentFilter');
    periodFilter = document.getElementById('periodFilter');
    dateFilter = document.getElementById('dateFilter');
    reloadDataBtn = document.getElementById('reloadDataBtn');
    // Modals
    noteModal = document.getElementById('noteModal');
    noteModalContent = document.getElementById('noteModalContent');
    closeNoteModalBtn = document.getElementById('closeNoteModalBtn');
    editModal = document.getElementById('editModal');
    editStudentName = document.getElementById('editStudentName');
    editDuration = document.getElementById('editDuration');
    editNotes = document.getElementById('editNotes');
    saveEditBtn = document.getElementById('saveEditBtn');
    cancelEditBtn = document.getElementById('cancelEditBtn');
    deleteEntryBtn = document.getElementById('deleteEntryBtn');
}

// --- Tab Switching Logic ---
function switchTab(tab) {
    const isAdmin = tab === 'admin';
    newLogContent.classList.toggle('hidden', isAdmin);
    adminReportContent.classList.toggle('hidden', !isAdmin);
    newLogTab.classList.toggle('border-indigo-500', !isAdmin);
    newLogTab.classList.toggle('text-indigo-600', !isAdmin);
    newLogTab.classList.toggle('border-transparent', isAdmin);
    newLogTab.classList.toggle('text-gray-500', isAdmin);
    adminReportTab.classList.toggle('border-indigo-500', isAdmin);
    adminReportTab.classList.toggle('text-indigo-600', isAdmin);
    adminReportTab.classList.toggle('border-transparent', !isAdmin);
    adminReportTab.classList.toggle('text-gray-500', !isAdmin);
    if (isAdmin) {
        renderAdminReport();
    }
}

// --- Tutoring Center Functions (from tutoring_center.js) ---

function renderSelectedStudents() {
    if (!selectedStudentsList) return;
    selectedStudentsList.innerHTML = '';
    selectedStudents.forEach(student => {
        const pill = document.createElement('div');
        pill.className = 'bg-blue-500 text-white text-sm font-semibold px-3 py-1 rounded-full flex items-center';
        const nameSpan = document.createElement('span');
        nameSpan.textContent = student.StudentName;
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.className = 'ml-2 font-bold hover:text-red-300';
        removeBtn.type = 'button';
        removeBtn.onclick = () => {
            selectedStudents = selectedStudents.filter(s => s.StudentName !== student.StudentName);
            renderSelectedStudents();
        };
        pill.appendChild(nameSpan);
        pill.appendChild(removeBtn);
        selectedStudentsList.appendChild(pill);
    });
}

function renderStudentResults(filteredStudents) {
    if (!studentResults) return;
    studentResults.innerHTML = '';
    if (filteredStudents.length === 0) {
        studentResults.classList.add('hidden');
        return;
    }
    filteredStudents.forEach(student => {
        const item = document.createElement('div');
        item.textContent = student.StudentName;
        item.className = 'px-4 py-2 hover:bg-gray-100 cursor-pointer';
        item.addEventListener('click', () => {
            if (!selectedStudents.some(s => s.StudentName === student.StudentName)) {
                selectedStudents.push(student);
                renderSelectedStudents();
            }
            studentLookup.value = '';
            studentResults.classList.add('hidden');
        });
        studentResults.appendChild(item);
    });
    studentResults.classList.remove('hidden');
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const duration = parseInt(durationInput.value, 10);
    const notes = notesInput.value.trim();

    if (selectedStudents.length === 0 || isNaN(duration) || duration < 0) {
        showErrorAlert("Please select at least one student and enter a valid, non-negative duration.");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Logging...";
    const studentsPayload = selectedStudents.map(s => ({ studentName: s.StudentName, className: s.ClassName }));

    try {
        const response = await sendAuthenticatedRequest({ 
            action: 'logTutoringSession', 
            students: studentsPayload, 
            durationMinutes: duration, 
            notes, 
            teacherEmail: appState.currentUser.email 
        });

        if (response.result !== 'success' || !response.newEntries) {
            throw new Error(response.error || "Server did not return the new entries.");
        }

        showSuccessAlert(`Session logged for ${selectedStudents.length} student(s)!`);
        
        // Add the new entries to the master log for the admin view
        allTutoringLogs.unshift(...response.newEntries);
        
        // Re-render admin report if it's the active view
        if (!adminReportContent.classList.contains('hidden')) {
            renderAdminReport();
        }
        
        tutoringForm.reset();
        selectedStudents = [];
        renderSelectedStudents();

    } catch (error) {
        showErrorAlert(`Error: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Log Session";
    }
}

// --- Admin Dashboard Functions (from tutoring_admin.js) ---

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

async function reloadData() {
    reloadDataBtn.disabled = true;
    reloadDataBtn.textContent = "Reloading...";
    reportMessage.textContent = "Loading fresh data from the server...";
    reportMessage.classList.remove('hidden');
    reportTable.classList.add('hidden');

    try {
        const response = await sendAuthenticatedRequest({ action: 'getAdminDashboardData' });
        if (response.result !== 'success' || !response.isAuthorized) {
            throw new Error(response.error || "Failed to get admin data.");
        }
        
        allTutoringLogs = response.logs;

        // Repopulate filters
        const uniqueTutors = [...new Set(allTutoringLogs.map(entry => entry.TeacherEmail))].sort();
        populateDropdown('tutorFilter', uniqueTutors, "All Tutors", "all");
        
        const uniqueStudents = [...new Set(allTutoringLogs.map(entry => entry.StudentName))].sort();
        populateDropdown('studentFilter', uniqueStudents, "All Students", "all");

        const uniquePeriods = [...new Set(allTutoringLogs.map(entry => entry.ClassName))].filter(p => p).sort();
        populateDropdown('periodFilter', uniquePeriods, "All Periods", "all");
        
        renderAdminReport();
        showSuccessAlert("Data successfully reloaded.");

    } catch (error) {
        showErrorAlert(`Failed to reload data: ${error.message}`);
        console.error("Data reload failed:", error);
    } finally {
        reloadDataBtn.disabled = false;
        reloadDataBtn.textContent = "Reload Data";
    }
}

function renderAdminReport() {
    let filteredLogs = [...allTutoringLogs];

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
            filteredLogs = filteredLogs.filter(entry => new Date(entry.Timestamp) >= startDate && new Date(entry.Timestamp) <= endDate);
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

    filteredLogs.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));

    filteredLogs.forEach(entry => {
        const tr = document.createElement('tr');
        tr.className = 'border-t';
        const entryDate = new Date(entry.Timestamp);
        const formattedDate = !isNaN(entryDate) ? entryDate.toLocaleDateString() : "Invalid Date";
        const hasNotes = entry.Notes && entry.Notes.trim() !== '';
        const notesCellHtml = hasNotes ? `<button class="text-blue-600 hover:underline view-note-btn" data-note="${encodeURIComponent(entry.Notes)}">View</button>` : '<span class="text-gray-400">N/A</span>';

        tr.innerHTML = `
            <td class="p-2">${formattedDate}</td>
            <td class="p-2">${entry.TeacherEmail || 'N/A'}</td>
            <td class="p-2">${entry.StudentName || 'N/A'}</td>
            <td class="p-2">${entry.ClassName || 'N/A'}</td>
            <td class="p-2">${typeof entry.DurationMinutes === 'number' ? `${entry.DurationMinutes} min` : 'N/A'}</td>
            <td class="p-2">${notesCellHtml}</td>
        `;
        reportTableBody.appendChild(tr);
    });
}

// --- Main Initialization & Authorization ---
function showAccessDenied() {
    tutoringContainer.classList.add('hidden');
    pageHeader.textContent = "Access Denied";
    showErrorAlert("You are not authorized to use this tool.");
}

async function initializePageSpecificApp() {
    cacheDOMElements();
    
    try {
        const [tutorAuth, adminAuth] = await Promise.all([
            sendAuthenticatedRequest({ action: 'checkTutorAuthorization' }),
            sendAuthenticatedRequest({ action: 'checkAdminAuthorization' })
        ]);

        if (!tutorAuth.isAuthorized) {
            showAccessDenied();
            return;
        }

        tutoringContainer.classList.remove('hidden');
        switchTab('newLog');

        if (adminAuth.isAuthorized) {
            adminReportTab.classList.remove('hidden');
            newLogTab.addEventListener('click', () => switchTab('newLog'));
            adminReportTab.addEventListener('click', () => switchTab('admin'));
            tutorFilter.addEventListener('change', renderAdminReport);
            studentFilter.addEventListener('change', renderAdminReport);
            periodFilter.addEventListener('change', renderAdminReport);
            dateFilter.addEventListener('change', renderAdminReport);
            reloadDataBtn.addEventListener('click', reloadData);
        }

        const studentsResponse = await sendAuthenticatedRequest({ action: 'getStudentMasterList' });
        if (studentsResponse.result === 'success' && studentsResponse.students) {
            masterStudentList = studentsResponse.students.sort((a,b) => a.StudentName.localeCompare(b.StudentName));
            studentLookup.placeholder = "Start typing a student's name...";
            studentLookup.disabled = false;
            submitBtn.disabled = false;
        } else {
            throw new Error("Failed to process student master list.");
        }
        
        if (adminAuth.isAuthorized) {
            await reloadData();
        }

    } catch (error) {
        showAccessDenied();
        console.error("Initialization failed:", error);
    }

    tutoringForm.addEventListener('submit', handleFormSubmit);
    studentLookup.addEventListener('input', () => {
        const searchTerm = studentLookup.value.toLowerCase();
        if (searchTerm.length < 2) {
            studentResults.classList.add('hidden');
            return;
        }
        const filtered = masterStudentList.filter(s => 
            s.StudentName.toLowerCase().includes(searchTerm) && 
            !selectedStudents.some(sel => sel.StudentName === s.StudentName)
        );
        renderStudentResults(filtered);
    });
    document.addEventListener('click', (event) => {
        if (!studentLookup.contains(event.target) && !studentResults.contains(event.target)) {
            studentResults.classList.add('hidden');
        }
    });
}

function resetPageSpecificAppState() {
    masterStudentList = [];
    allTutoringLogs = [];
    selectedStudents = [];
    if (tutoringForm) tutoringForm.reset();
    if (selectedStudentsList) selectedStudentsList.innerHTML = '';
    if (pageHeader) pageHeader.textContent = "Tutoring Center";
}