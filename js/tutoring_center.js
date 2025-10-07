// js/tutoring.js

// --- Global State ---
let masterStudentList = [];
let allTutoringLogs = []; // For Admin view
let personalTutoringLogs = []; // For personal History view
let selectedStudents = [];
let currentEditTimestamp = null;

// --- DOM Element Caching ---
let pageHeader, tutoringContainer;
let newLogTab, historyTab, adminReportTab, newLogContent, historyContent, adminReportContent;
// Center elements
let studentLookup, studentResults, durationInput, notesInput, tutoringForm, submitBtn, selectedStudentsList;
// History elements
let historyStudentFilter, historyDateFilter, historyMessage, historyTable, historyTableBody;
// Admin elements
let reportMessage, reportTable, reportTableBody, studentFilter, periodFilter, dateFilter, reloadDataBtn;
// Modal elements
let noteModal, noteModalContent, closeNoteModalBtn;
let editModal, editStudentName, editDuration, editNotes, saveEditBtn, cancelEditBtn, deleteEntryBtn;


function cacheDOMElements() {
    pageHeader = document.querySelector('#appContent h1');
    tutoringContainer = document.getElementById('tutoringContainer');
    newLogTab = document.getElementById('newLogTab');
    historyTab = document.getElementById('historyTab');
    adminReportTab = document.getElementById('adminReportTab');
    newLogContent = document.getElementById('newLogContent');
    historyContent = document.getElementById('historyContent');
    adminReportContent = document.getElementById('adminReportContent');
    // Center
    studentLookup = document.getElementById('studentLookup');
    studentResults = document.getElementById('studentResults');
    durationInput = document.getElementById('durationInput');
    notesInput = document.getElementById('notesInput');
    tutoringForm = document.getElementById('tutoringForm');
    submitBtn = document.getElementById('submitBtn');
    selectedStudentsList = document.getElementById('selectedStudentsList');
    // History
    historyStudentFilter = document.getElementById('historyStudentFilter');
    historyDateFilter = document.getElementById('historyDateFilter');
    historyMessage = document.getElementById('historyMessage');
    historyTable = document.getElementById('historyTable');
    historyTableBody = document.getElementById('historyTableBody');
    // Admin
    reportMessage = document.getElementById('reportMessage');
    reportTable = document.getElementById('reportTable');
    reportTableBody = document.getElementById('reportTableBody');
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
    const isNew = tab === 'new';
    const isHistory = tab === 'history';
    const isAdmin = tab === 'admin';

    newLogContent.classList.toggle('hidden', !isNew);
    historyContent.classList.toggle('hidden', !isHistory);
    adminReportContent.classList.toggle('hidden', !isAdmin);

    newLogTab.classList.toggle('border-indigo-500', isNew);
    newLogTab.classList.toggle('text-indigo-600', isNew);
    historyTab.classList.toggle('border-indigo-500', isHistory);
    historyTab.classList.toggle('text-indigo-600', isHistory);
    adminReportTab.classList.toggle('border-indigo-500', isAdmin);
    adminReportTab.classList.toggle('text-indigo-600', isAdmin);

    [newLogTab, historyTab, adminReportTab].forEach(t => {
        if (t.id.startsWith(tab)) {
             t.classList.add('border-indigo-500', 'text-indigo-600');
             t.classList.remove('border-transparent', 'text-gray-500');
        } else {
            t.classList.remove('border-indigo-500', 'text-indigo-600');
            t.classList.add('border-transparent', 'text-gray-500');
        }
    });

    if (isHistory) renderHistoryReport();
    if (isAdmin) renderAdminReport();
}

// --- All functions from tutoring_center.js and tutoring_admin.js go here ---
// (The full, unabridged functions are included below)

// --- TUTORING CENTER FUNCTIONS ---
// --- "New Log" Specific Functions ---
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

        // --- START FIX ---
        // Add the new entries to BOTH the personal and admin logs
        personalTutoringLogs.unshift(...response.newEntries);
        allTutoringLogs.unshift(...response.newEntries); // Also update admin log if visible
        
        renderHistoryReport();

        // Use the correct array to update the filter dropdown
        const uniqueStudentsInLog = [...new Set(personalTutoringLogs.map(entry => entry.StudentName))].sort();
        // --- END FIX ---
        
        populateDropdown('historyStudentFilter', uniqueStudentsInLog, "All Students", "all");

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


// --- "History" Specific Functions ---
function renderHistoryReport() {
    historyTable.classList.add('hidden');
    historyMessage.textContent = "Loading...";
    historyMessage.classList.remove('hidden');

    let filteredLog = [...tutoringLog];

    // Apply student filter
    const studentFilter = historyStudentFilter.value;
    if (studentFilter && studentFilter !== 'all') {
        filteredLog = filteredLog.filter(entry => entry.StudentName === studentFilter);
    }

    // Apply date filter
    const dateFilter = historyDateFilter.value;
    if (dateFilter !== 'all_time') {
        let startDate, endDate;
        const today = new Date();

        if (dateFilter === 'today') {
            startDate = new Date(today.setHours(0, 0, 0, 0));
            endDate = new Date(new Date().setHours(23, 59, 59, 999));
        } else if (dateFilter === 'this_week') {
            const range = getWeekRange();
            startDate = new Date(range.start.setHours(0, 0, 0, 0));
            endDate = new Date(range.end.setHours(23, 59, 59, 999));
        } else if (dateFilter === 'this_month') {
            const range = getMonthRange();
            startDate = new Date(range.start.setHours(0, 0, 0, 0));
            endDate = new Date(range.end.setHours(23, 59, 59, 999));
        }
        
        if(startDate && endDate) {
            filteredLog = filteredLog.filter(entry => {
                const entryDate = new Date(entry.Timestamp);
                return entryDate >= startDate && entryDate <= endDate;
            });
        }
    }


    if (filteredLog.length === 0) {
        historyMessage.textContent = "No log entries found for the selected filters.";
        return;
    }

    historyTableBody.innerHTML = '';
    filteredLog.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
    
    filteredLog.forEach((entry, index) => {
        if (!entry.Timestamp || !entry.StudentName) {
            console.warn(`Log entry at index ${index} is missing Timestamp or StudentName.`, entry);
            return; 
        }

        const tr = document.createElement('tr');
        tr.className = 'border-t';
        // --- START: MODIFIED NOTES LOGIC ---
        const hasNotes = entry.Notes && entry.Notes.trim() !== '';
        
        // Create a "View" button if there are notes, otherwise show "N/A"
        const notesCellHtml = hasNotes
            ? `<button class="text-blue-600 hover:underline view-note-btn" data-note="${encodeURIComponent(entry.Notes)}">View</button>`
            : '<span class="text-gray-400">N/A</span>';
        // --- END: MODIFIED NOTES LOGIC ---

        const entryDate = new Date(entry.Timestamp);
        const formattedDate = !isNaN(entryDate) ? entryDate.toLocaleDateString() : "Invalid Date";
        const studentName = entry.StudentName || 'N/A';
        const duration = typeof entry.DurationMinutes === 'number' ? `${entry.DurationMinutes} min` : 'N/A';
        const notes = entry.Notes || '';
        
        tr.innerHTML = `
            <td class="p-2">${formattedDate}</td>
            <td class="p-2">${studentName}</td>
            <td class="p-2">${duration}</td>
            <td class="p-2">${notesCellHtml}</td>
            <td class="p-2 text-right">
                <button class="text-gray-500 hover:text-blue-600 edit-btn" data-timestamp="${entry.Timestamp}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>
            </td>
        `;
        historyTableBody.appendChild(tr);
    });

    historyTable.classList.remove('hidden');
    historyMessage.classList.add('hidden');
}

function openEditModal(entry) {
    currentEditTimestamp = entry.Timestamp;
    editStudentName.value = entry.StudentName;
    editDuration.value = entry.DurationMinutes;
    editNotes.value = entry.Notes || '';
    editModal.classList.remove('hidden');
}
async function saveEdit() {
    saveEditBtn.disabled = true;
    deleteEntryBtn.disabled = true;
    cancelEditBtn.disabled = true;
    saveEditBtn.textContent = "Saving...";

    const payload = {
        action: 'editTutoringLogEntry',
        entryTimestamp: currentEditTimestamp,
        studentName: editStudentName.value,
        newDuration: editDuration.value,
        newNotes: editNotes.value
    };
    try {
        // --- START: MODIFIED LOGIC ---
        const response = await sendAuthenticatedRequest(payload);

        // Check for and display any logs from the server
        if (response.logs && response.logs.length > 0) {
            console.group("Server Logs for 'saveEdit'");
            response.logs.forEach(log => console.log(log));
            console.groupEnd();
        }

        if(response.result !== 'success') {
            throw new Error(response.error || "Server rejected the edit.");
        }
        // --- END: MODIFIED LOGIC ---

        const entryToUpdate = personalTutoringLogs.find(e => e.Timestamp === currentEditTimestamp);
        if (entryToUpdate) {
            entryToUpdate.DurationMinutes = parseInt(editDuration.value, 10);
            entryToUpdate.Notes = editNotes.value;
        }
        
        renderHistoryReport();
        showSuccessAlert("Entry updated.");

    } catch (error) {
        showErrorAlert(`Update failed: ${error.message}`);
    } finally {
        saveEditBtn.disabled = false;
        deleteEntryBtn.disabled = false;
        cancelEditBtn.disabled = false;
        saveEditBtn.textContent = "Save";
        editModal.classList.add('hidden');
    }
}

async function deleteEntry() {
    if (!confirm("Are you sure you want to delete this log entry? This cannot be undone.")) return;

    saveEditBtn.disabled = true;
    deleteEntryBtn.disabled = true;
    cancelEditBtn.disabled = true;
    deleteEntryBtn.textContent = "Deleting...";
    
    try {
        // --- START: MODIFIED LOGIC ---
        const response = await sendAuthenticatedRequest({ 
            action: 'deleteTutoringLogEntry', 
            entryTimestamp: currentEditTimestamp,
            studentName: editStudentName.value
        });

        // Check for and display any logs from the server
        if (response.logs && response.logs.length > 0) {
            console.group("Server Logs for 'deleteEntry'");
            response.logs.forEach(log => console.log(log));
            console.groupEnd();
        }

        if(response.result !== 'success') {
            throw new Error(response.error || "Server rejected the deletion.");
        }
        // --- END: MODIFIED LOGIC ---

        tutoringLog = tutoringLog.filter(entry => entry.Timestamp !== currentEditTimestamp);
        renderHistoryReport();
        showSuccessAlert("Entry deleted.");
    } catch (error) {
        showErrorAlert(`Delete failed: ${error.message}`);
    } finally {
        saveEditBtn.disabled = false;
        deleteEntryBtn.disabled = false;
        cancelEditBtn.disabled = false;
        deleteEntryBtn.textContent = "Delete";
        editModal.classList.add('hidden');
    }
}
// --- ADMIN DASHBOARD FUNCTIONS ---
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

    // Apply all filters
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
        
        const hasNotes = entry.Notes && entry.Notes.trim() !== '';
        const notesCellHtml = hasNotes
            ? `<button class="text-blue-600 hover:underline view-note-btn" data-note="${encodeURIComponent(entry.Notes)}">View</button>`
            : '<span class="text-gray-400">N/A</span>';

        tr.innerHTML = `
    <td class="p-2">${formattedDate}</td>
    <td class="p-2">${entry.TeacherEmail || 'N/A'}</td>
    <td class="p-2">${entry.StudentName || 'N/A'}</td>
    <td class="p-2">${entry.ClassName || 'N/A'}</td>
    <td class="p-2">${typeof entry.DurationMinutes === 'number' ? `${entry.DurationMinutes} min` : 'N/A'}</td>
    <td class="p-2">${notesCellHtml}</td>`;
    reportTableBody.appendChild(tr);
    });

}
// --- HELPER FUNCTIONS (shared) ---
function getWeekRange() { const now = new Date(); const first = now.getDate() - now.getDay(); return { start: new Date(new Date().setDate(first)), end: new Date(new Date().setDate(first + 6)) }; }
function getMonthRange() { const now = new Date(); return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0) }; }

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
        switchTab('new');

        // Event listeners for tabs
        newLogTab.addEventListener('click', () => switchTab('new'));
        historyTab.addEventListener('click', () => switchTab('history'));

        if (adminAuth.isAuthorized) {
            adminReportTab.classList.remove('hidden');
            adminReportTab.addEventListener('click', () => switchTab('admin'));
            studentFilter.addEventListener('change', renderAdminReport);
            periodFilter.addEventListener('change', renderAdminReport);
            dateFilter.addEventListener('change', renderAdminReport);
            reloadDataBtn.addEventListener('click', reloadData);
        }

        const [studentsResponse, personalLogResponse] = await Promise.all([
            sendAuthenticatedRequest({ action: 'getStudentMasterList' }),
            sendAuthenticatedRequest({ action: 'getTutoringLogForTutor' })
        ]);
        
        if (studentsResponse.result === 'success') masterStudentList = studentsResponse.students.sort((a,b) => a.StudentName.localeCompare(b.StudentName));
        if (personalLogResponse.result === 'success') personalTutoringLogs = personalLogResponse.log;

        studentLookup.placeholder = "Start typing a student's name...";
        studentLookup.disabled = false;
        submitBtn.disabled = false;
        
        const uniqueStudentsInLog = [...new Set(personalTutoringLogs.map(e => e.StudentName))].sort();
        populateDropdown('historyStudentFilter', uniqueStudentsInLog, "All Students", "all");
        historyDateFilter.value = 'all_time';
        
        if (adminAuth.isAuthorized) {
            await reloadData(); // This will fetch all logs for the admin view
        }

    } catch (error) {
        showAccessDenied();
        console.error("Initialization failed:", error);
    }

    // Event listeners for New Log Form
    tutoringForm.addEventListener('submit', handleFormSubmit);
    studentLookup.addEventListener('input', () => {
        const searchTerm = studentLookup.value.toLowerCase();
        if (searchTerm.length < 2) {
            studentResults.classList.add('hidden');
            return;
        }
        const filteredStudents = masterStudentList.filter(student =>
            student.StudentName.toLowerCase().includes(searchTerm) &&
            !selectedStudents.some(s => s.StudentName === student.StudentName)
        );
        renderStudentResults(filteredStudents);
    });
    document.addEventListener('click', (event) => {
        if (!studentLookup.contains(event.target) && !studentResults.contains(event.target)) {
            studentResults.classList.add('hidden');
        }
    });

    
    // Event listeners for Modals (shared)
    historyTableBody.addEventListener('click', (event) => {
        const viewNoteButton = event.target.closest('.view-note-btn');
        const editButton = event.target.closest('.edit-btn');
        
        if (viewNoteButton) {
            const noteText = decodeURIComponent(viewNoteButton.dataset.note);
            noteModalContent.textContent = noteText;
            noteModal.classList.remove('hidden');
        } else if (editButton) {
            const timestamp = editButton.dataset.timestamp;
            const entry = personalTutoringLogs.find(e => e.Timestamp === timestamp);
            if (entry) openEditModal(entry);
        }
    });    
    reportTableBody.addEventListener('click', (event) => {
            const viewNoteButton = event.target.closest('.view-note-btn');
            if (viewNoteButton) {
                const noteText = decodeURIComponent(viewNoteButton.dataset.note);
                noteModalContent.textContent = noteText;
                noteModal.classList.remove('hidden');
            }
    });    
    closeNoteModalBtn.addEventListener('click', () => noteModal.classList.add('hidden'));
    saveEditBtn.addEventListener('click', saveEdit);
    cancelEditBtn.addEventListener('click', () => editModal.classList.add('hidden'));
    deleteEntryBtn.addEventListener('click', deleteEntry);
}

function resetPageSpecificAppState() {
    masterStudentList = [];
    allTutoringLogs = [];
    personalTutoringLogs = [];
    selectedStudents = [];
    if (tutoringForm) tutoringForm.reset();
    if (selectedStudentsList) selectedStudentsList.innerHTML = '';
    if (pageHeader) pageHeader.textContent = "Tutoring Center";
}

// --- FULL UNABRIDGED FUNCTIONS ---
// (The full code for these functions is pasted below)

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
        personalTutoringLogs.unshift(...response.newEntries);
        allTutoringLogs.unshift(...response.newEntries); // Also add to admin log if applicable
        renderHistoryReport();
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
function renderHistoryReport() {
    historyTable.classList.add('hidden');
    historyMessage.textContent = "Loading...";
    historyMessage.classList.remove('hidden');
    let filteredLog = [...personalTutoringLogs];
    const studentFilter = historyStudentFilter.value;
    if (studentFilter && studentFilter !== 'all') {
        filteredLog = filteredLog.filter(entry => entry.StudentName === studentFilter);
    }
    const dateFilter = historyDateFilter.value;
    if (dateFilter !== 'all_time') {
        let startDate, endDate;
        const today = new Date();
        if (dateFilter === 'today') {
            startDate = new Date(today.setHours(0, 0, 0, 0));
            endDate = new Date(new Date().setHours(23, 59, 59, 999));
        } else if (dateFilter === 'this_week') {
            const range = getWeekRange();
            startDate = new Date(range.start.setHours(0, 0, 0, 0));
            endDate = new Date(range.end.setHours(23, 59, 59, 999));
        } else if (dateFilter === 'this_month') {
            const range = getMonthRange();
            startDate = new Date(range.start.setHours(0, 0, 0, 0));
            endDate = new Date(range.end.setHours(23, 59, 59, 999));
        }
        if(startDate && endDate) {
            filteredLog = filteredLog.filter(entry => new Date(entry.Timestamp) >= startDate && new Date(entry.Timestamp) <= endDate);
        }
    }
    if (filteredLog.length === 0) {
        historyMessage.textContent = "No log entries found for the selected filters.";
        return;
    }
    historyTableBody.innerHTML = '';
    filteredLog.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
    filteredLog.forEach(entry => {
        const tr = document.createElement('tr');
        tr.className = 'border-t';
        const hasNotes = entry.Notes && entry.Notes.trim() !== '';
        const notesCellHtml = hasNotes ? `<button class="text-blue-600 hover:underline view-note-btn" data-note="${encodeURIComponent(entry.Notes)}">View</button>` : '<span class="text-gray-400">N/A</span>';
        const entryDate = new Date(entry.Timestamp);
        const formattedDate = !isNaN(entryDate) ? entryDate.toLocaleDateString() : "Invalid Date";
        tr.innerHTML = `
            <td class="p-2">${formattedDate}</td>
            <td class="p-2">${entry.StudentName || 'N/A'}</td>
            <td class="p-2">${typeof entry.DurationMinutes === 'number' ? `${entry.DurationMinutes} min` : 'N/A'}</td>
            <td class="p-2">${notesCellHtml}</td>
            <td class="p-2 text-right">
                <button class="text-gray-500 hover:text-blue-600 edit-btn" data-timestamp="${entry.Timestamp}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>
            </td>
        `;
        historyTableBody.appendChild(tr);
    });
    historyTable.classList.remove('hidden');
    historyMessage.classList.add('hidden');
}
function openEditModal(entry) {
    currentEditTimestamp = entry.Timestamp;
    editStudentName.value = entry.StudentName;
    editDuration.value = entry.DurationMinutes;
    editNotes.value = entry.Notes || '';
    editModal.classList.remove('hidden');
}
async function saveEdit() {
    saveEditBtn.disabled = true;
    deleteEntryBtn.disabled = true;
    cancelEditBtn.disabled = true;
    saveEditBtn.textContent = "Saving...";
    const payload = {
        action: 'editTutoringLogEntry',
        entryTimestamp: currentEditTimestamp,
        studentName: editStudentName.value,
        newDuration: editDuration.value,
        newNotes: editNotes.value
    };
    try {
        const response = await sendAuthenticatedRequest(payload);
        if(response.result !== 'success') throw new Error(response.error || "Server rejected the edit.");
        const entryToUpdate = personalTutoringLogs.find(e => e.Timestamp === currentEditTimestamp);
        if (entryToUpdate) {
            entryToUpdate.DurationMinutes = parseInt(editDuration.value, 10);
            entryToUpdate.Notes = editNotes.value;
        }
        renderHistoryReport();
        showSuccessAlert("Entry updated.");
    } catch (error) {
        showErrorAlert(`Update failed: ${error.message}`);
    } finally {
        saveEditBtn.disabled = false;
        deleteEntryBtn.disabled = false;
        cancelEditBtn.disabled = false;
        saveEditBtn.textContent = "Save";
        editModal.classList.add('hidden');
    }
}
async function deleteEntry() {
    if (!confirm("Are you sure you want to delete this log entry? This cannot be undone.")) return;
    saveEditBtn.disabled = true;
    deleteEntryBtn.disabled = true;
    cancelEditBtn.disabled = true;
    deleteEntryBtn.textContent = "Deleting...";
    try {
        const response = await sendAuthenticatedRequest({ 
            action: 'deleteTutoringLogEntry', 
            entryTimestamp: currentEditTimestamp,
            studentName: editStudentName.value
        });
        if(response.result !== 'success') throw new Error(response.error || "Server rejected the deletion.");
        personalTutoringLogs = personalTutoringLogs.filter(entry => entry.Timestamp !== currentEditTimestamp);
        renderHistoryReport();
        showSuccessAlert("Entry deleted.");
    } catch (error) {
        showErrorAlert(`Delete failed: ${error.message}`);
    } finally {
        saveEditBtn.disabled = false;
        deleteEntryBtn.disabled = false;
        cancelEditBtn.disabled = false;
        deleteEntryBtn.textContent = "Delete";
        editModal.classList.add('hidden');
    }
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
        const uniqueStudents = [...new Set(allTutoringLogs.map(entry => entry.StudentName))].sort();
        populateDropdown('studentFilter', uniqueStudents, "All Students", "all");
        const uniquePeriods = [...new Set(allTutoringLogs.map(entry => entry.ClassName))].filter(p => p).sort();
        populateDropdown('periodFilter', uniquePeriods, "All Periods", "all");
        renderAdminReport();
        showSuccessAlert("Data successfully reloaded.");
    } catch (error) {
        showErrorAlert(`Failed to reload data: ${error.message}`);
    } finally {
        reloadDataBtn.disabled = false;
        reloadDataBtn.textContent = "Reload Data";
    }
}
function renderAdminReport() {
    let filteredLogs = [...allTutoringLogs];
    const selectedStudent = studentFilter.value;
    if (selectedStudent !== 'all') filteredLogs = filteredLogs.filter(entry => entry.StudentName === selectedStudent);
    const selectedPeriod = periodFilter.value;
    if (selectedPeriod !== 'all') filteredLogs = filteredLogs.filter(entry => entry.ClassName === selectedPeriod);
    const selectedDate = dateFilter.value;
    if (selectedDate !== 'all_time') {
        let startDate, endDate;
        const today = new Date();
        if (selectedDate === 'today') {
            startDate = new Date(today.setHours(0,0,0,0));
            endDate = new Date(new Date().setHours(23,59,59,999));
        } else if (selectedDate === 'this_week') {
            const range = getWeekRange();
            startDate = new Date(range.start.setHours(0,0,0,0));
            endDate = new Date(range.end.setHours(23,59,59,999));
        } else if (selectedDate === 'this_month') {
            const range = getMonthRange();
            startDate = new Date(range.start.setHours(0,0,0,0));
            endDate = new Date(range.end.setHours(23,59,59,999));
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