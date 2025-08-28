// js/tutoring_center.js

// --- Global State ---
let masterStudentList = [];
let selectedStudents = [];
let tutoringLog = [];
let currentEditTimestamp = null;

// --- DOM Element Caching ---
let studentLookup, studentResults, durationInput, notesInput, tutoringForm, submitBtn, selectedStudentsList, pageHeader;
let newLogTab, historyTab, newLogContent, historyContent, tutoringContainer;
let historyStudentFilter, historyDateFilter, historyMessage, historyTable, historyTableBody;
let editModal, editStudentName, editDuration, editNotes, saveEditBtn, cancelEditBtn, deleteEntryBtn;

function cacheDOMElements() {
    studentLookup = document.getElementById('studentLookup');
    studentResults = document.getElementById('studentResults');
    durationInput = document.getElementById('durationInput');
    notesInput = document.getElementById('notesInput');
    tutoringForm = document.getElementById('tutoringForm');
    submitBtn = document.getElementById('submitBtn');
    selectedStudentsList = document.getElementById('selectedStudentsList');
    pageHeader = document.querySelector('#appContent h1');
    newLogTab = document.getElementById('newLogTab');
    historyTab = document.getElementById('historyTab');
    newLogContent = document.getElementById('newLogContent');
    historyContent = document.getElementById('historyContent');
    tutoringContainer = document.getElementById('tutoringContainer');
    historyStudentFilter = document.getElementById('historyStudentFilter');
    historyDateFilter = document.getElementById('historyDateFilter');
    historyMessage = document.getElementById('historyMessage');
    historyTable = document.getElementById('historyTable');
    historyTableBody = document.getElementById('historyTableBody');
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
    const isHistory = tab === 'history';
    newLogContent.classList.toggle('hidden', isHistory);
    historyContent.classList.toggle('hidden', !isHistory);
    newLogTab.classList.toggle('border-indigo-500', !isHistory);
    newLogTab.classList.toggle('text-indigo-600', !isHistory);
    newLogTab.classList.toggle('border-transparent', isHistory);
    newLogTab.classList.toggle('text-gray-500', isHistory);
    historyTab.classList.toggle('border-indigo-500', isHistory);
    historyTab.classList.toggle('text-indigo-600', isHistory);
    historyTab.classList.toggle('border-transparent', !isHistory);
    historyTab.classList.toggle('text-gray-500', !isHistory);
    if (isHistory) {
        renderHistoryReport();
    }
}

// --- "New Log" Specific Functions ---
function renderSelectedStudents() { /* (Unchanged) */ }
function renderStudentResults(filteredStudents) { /* (Unchanged) */ }
async function handleFormSubmit(event) { /* (Unchanged) */ }

// --- "History" Specific Functions ---
/**
 * MODIFIED: This version removes the filters for debugging purposes.
 */
function renderHistoryReport() {
    historyTable.classList.add('hidden');
    historyMessage.textContent = "Loading...";
    historyMessage.classList.remove('hidden');

    // Filters have been removed for this test. We will render the entire log.
    let filteredLog = [...tutoringLog];

    if (filteredLog.length === 0) {
        historyMessage.textContent = "No log entries found.";
        return;
    }

    historyTableBody.innerHTML = '';
    filteredLog.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
    
    filteredLog.forEach(entry => {
        const tr = document.createElement('tr');
        tr.className = 'border-t';
        tr.innerHTML = `
            <td class="p-2">${new Date(entry.Timestamp).toLocaleDateString()}</td>
            <td class="p-2">${entry.StudentName}</td>
            <td class="p-2">${entry.ClassName || 'N/A'}</td>
            <td class="p-2">${entry.DurationMinutes} min</td>
            <td class="p-2 truncate" title="${entry.Notes}">${entry.Notes || ''}</td>
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

function openEditModal(entry) { /* (Unchanged) */ }
async function saveEdit() { /* (Unchanged) */ }
async function deleteEntry() { /* (Unchanged) */ }

// --- Main Initialization & Authorization ---
function showAccessDenied() {
    if (tutoringContainer) tutoringContainer.classList.add('hidden');
    if (pageHeader) pageHeader.textContent = "Access Denied";
    showErrorAlert("You are not authorized to use this tool.");
}

/**
 * MODIFIED: Added detailed console logging for debugging.
 */
async function initializePageSpecificApp() {
    cacheDOMElements();

    try {
        console.log("Step 1: Checking tutor authorization...");
        const authResponse = await sendAuthenticatedRequest({ action: 'checkTutorAuthorization' });
        if (!authResponse.isAuthorized) {
            console.error("Authorization check failed. User is not a tutor.");
            showAccessDenied();
            return;
        }
        console.log("Step 1 complete: User is authorized.");

        switchTab('newLog');
        tutoringForm.classList.remove('hidden'); // Show the form now

        console.log("Step 2: Fetching master student list and tutoring log...");
        const [studentsResponse, logResponse] = await Promise.all([
            sendAuthenticatedRequest({ action: 'getStudentMasterList' }),
            sendAuthenticatedRequest({ action: 'getTutoringLogForTutor' })
        ]);

        // --- DEBUGGING: Log the raw responses from the server ---
        console.log("Raw student list response:", studentsResponse);
        console.log("Raw tutoring log response:", logResponse);
        
        if (studentsResponse.result === 'success' && studentsResponse.students) {
            masterStudentList = studentsResponse.students.sort((a,b) => a.StudentName.localeCompare(b.StudentName));
            console.log("Step 2a complete: Master student list processed.", masterStudentList);
        } else {
            throw new Error("Failed to process student master list.");
        }
        
        if (logResponse.result === 'success' && logResponse.log) {
            tutoringLog = logResponse.log;
            console.log("Step 2b complete: Tutoring log processed.", tutoringLog);
        } else {
            throw new Error("Failed to process tutoring log.");
        }

        console.log("Step 3: Populating UI elements...");
        studentLookup.placeholder = "Start typing a student's name...";
        studentLookup.disabled = false;
        submitBtn.disabled = false;

        const uniqueStudentsInLog = [...new Set(tutoringLog.map(entry => entry.StudentName))].sort();
        populateDropdown('historyStudentFilter', uniqueStudentsInLog, "All Students", "all");
        console.log("Step 3 complete: UI is ready.");

    } catch (error) {
        showAccessDenied();
        console.error("Initialization failed:", error);
    }

    // --- Event Listeners ---
    newLogTab.addEventListener('click', () => switchTab('newLog'));
    historyTab.addEventListener('click', () => switchTab('history'));
    // Filter listeners are temporarily disabled by the renderHistoryReport changes
    tutoringForm.addEventListener('submit', handleFormSubmit);
    historyTableBody.addEventListener('click', (event) => {
        const editButton = event.target.closest('.edit-btn');
        if (editButton) {
            const timestamp = editButton.dataset.timestamp;
            const entry = tutoringLog.find(e => e.Timestamp === timestamp);
            if (entry) openEditModal(entry);
        }
    });
    saveEditBtn.addEventListener('click', saveEdit);
    cancelEditBtn.addEventListener('click', () => editModal.classList.add('hidden'));
    deleteEntryBtn.addEventListener('click', deleteEntry);
    studentLookup.addEventListener('input', () => { /* (Unchanged) */ });
    document.addEventListener('click', (event) => { /* (Unchanged) */ });
}

function resetPageSpecificAppState() {
    tutoringLog = [];
    masterStudentList = [];
    selectedStudents = [];
    if (tutoringForm) tutoringForm.reset();
    if (selectedStudentsList) renderSelectedStudents();
    if (pageHeader) pageHeader.textContent = "Tutoring Center";
}

// (Full content for helper functions is included below for completeness)
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
    if (selectedStudents.length === 0 || isNaN(duration) || duration <= 0) {
        showErrorAlert("Please select at least one student and enter a valid duration.");
        return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = "Logging...";
    const studentsPayload = selectedStudents.map(s => ({ studentName: s.StudentName, className: s.Class }));
    try {
        await sendAuthenticatedRequest({ action: 'logTutoringSession', students: studentsPayload, durationMinutes: duration, notes, teacherEmail: appState.currentUser.email });
        showSuccessAlert(`Session logged for ${selectedStudents.length} student(s)!`);
        tutoringForm.reset();
        selectedStudents = [];
        renderSelectedStudents();
        const logResponse = await sendAuthenticatedRequest({ action: 'getTutoringLogForTutor' });
        if (logResponse.result === 'success') {
            tutoringLog = logResponse.log;
            const uniqueStudentsInLog = [...new Set(tutoringLog.map(entry => entry.StudentName))].sort();
            populateDropdown('historyStudentFilter', uniqueStudentsInLog, "All Students", "all");
        }
    } catch (error) {
        showErrorAlert(`Error: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Log Session";
    }
}
function renderHistoryReport() {
    if (!historyTable) return;
    historyTable.classList.add('hidden');
    historyMessage.textContent = "Loading...";
    historyMessage.classList.remove('hidden');
    let filteredLog = [...tutoringLog];
    const studentFilter = historyStudentFilter.value;
    if (studentFilter && studentFilter !== 'all') {
        filteredLog = filteredLog.filter(entry => entry.StudentName === studentFilter);
    }
    const dateFilter = historyDateFilter.value;
    if (dateFilter) {
        const filterDateStr = new Date(dateFilter).toLocaleDateString();
        filteredLog = filteredLog.filter(entry => new Date(entry.Timestamp).toLocaleDateString() === filterDateStr);
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
        tr.innerHTML = `
            <td class="p-2">${new Date(entry.Timestamp).toLocaleDateString()}</td>
            <td class="p-2">${entry.StudentName}</td>
            <td class="p-2">${entry.ClassName || 'N/A'}</td>
            <td class="p-2">${entry.DurationMinutes} min</td>
            <td class="p-2 truncate" title="${entry.Notes}">${entry.Notes || ''}</td>
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
    const payload = {
        action: 'editTutoringLogEntry',
        entryTimestamp: currentEditTimestamp,
        newStudentName: editStudentName.value,
        newDuration: editDuration.value,
        newNotes: editNotes.value
    };
    try {
        await sendAuthenticatedRequest(payload);
        const logResponse = await sendAuthenticatedRequest({ action: 'getTutoringLogForTutor' });
        if (logResponse.result === 'success') tutoringLog = logResponse.log;
        renderHistoryReport();
        showSuccessAlert("Entry updated.");
    } catch (error) {
        showErrorAlert(`Update failed: ${error.message}`);
    } finally {
        editModal.classList.add('hidden');
    }
}
async function deleteEntry() {
    if (!confirm("Are you sure you want to delete this log entry? This cannot be undone.")) return;
    try {
        await sendAuthenticatedRequest({ action: 'deleteTutoringLogEntry', entryTimestamp: currentEditTimestamp });
        tutoringLog = tutoringLog.filter(entry => entry.Timestamp !== currentEditTimestamp);
        renderHistoryReport();
        showSuccessAlert("Entry deleted.");
    } catch (error) {
        showErrorAlert(`Delete failed: ${error.message}`);
    } finally {
        editModal.classList.add('hidden');
    }
}