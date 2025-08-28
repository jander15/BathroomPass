// js/tutoring_center.js

// --- Global State ---
let masterStudentList = [];
let selectedStudents = [];
let tutoringLog = [];
let currentEditTimestamp = null;

// --- DOM Element Caching ---
let studentLookup, studentResults, durationInput, notesInput, tutoringForm, submitBtn, selectedStudentsList, pageHeader, tutorAuthOverlay;
let newLogTab, historyTab, newLogContent, historyContent, tutoringContainer;
let historyStudentFilter, historyDateFilter, historyMessage, historyTable, historyTableBody;
let editModal, editStudentName, editDuration, editNotes, saveEditBtn, cancelEditBtn, deleteEntryBtn;

function cacheDOMElements() {
    // New Log Tab
    studentLookup = document.getElementById('studentLookup');
    studentResults = document.getElementById('studentResults');
    durationInput = document.getElementById('durationInput');
    notesInput = document.getElementById('notesInput');
    tutoringForm = document.getElementById('tutoringForm');
    submitBtn = document.getElementById('submitBtn');
    selectedStudentsList = document.getElementById('selectedStudentsList');
    
    // Page Structure
    pageHeader = document.querySelector('#appContent h1');
    tutorAuthOverlay = document.getElementById('tutorAuthOverlay'); // Corrected from authorizationOverlay
    newLogTab = document.getElementById('newLogTab');
    historyTab = document.getElementById('historyTab');
    newLogContent = document.getElementById('newLogContent');
    historyContent = document.getElementById('historyContent');
    tutoringContainer = document.getElementById('tutoringContainer');
    
    // History Tab
    historyStudentFilter = document.getElementById('historyStudentFilter');
    historyDateFilter = document.getElementById('historyDateFilter');
    historyMessage = document.getElementById('historyMessage');
    historyTable = document.getElementById('historyTable');
    historyTableBody = document.getElementById('historyTableBody');

    // Edit Modal
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
function renderSelectedStudents() {
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

// --- "History" Specific Functions ---
function renderHistoryReport() {
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
                    <svg class.name = 'w-5 h-5' fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
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

// --- Main Initialization & Authorization ---
function showAccessDenied() {
    if (tutoringContainer) tutoringContainer.classList.add('hidden');
    if (pageHeader) pageHeader.textContent = "Access Denied";
    showErrorAlert("You are not authorized to use this tool. Please contact an administrator.");
}

async function initializePageSpecificApp() {
    cacheDOMElements();
    tutorAuthOverlay.parentElement.classList.remove('hidden');

    try {
        const authResponse = await sendAuthenticatedRequest({ action: 'checkTutorAuthorization' });
        if (!authResponse.isAuthorized) {
            showAccessDenied();
            return;
        }

        switchTab('newLog');

        const [studentsResponse, logResponse] = await Promise.all([
            sendAuthenticatedRequest({ action: 'getStudentMasterList' }),
            sendAuthenticatedRequest({ action: 'getTutoringLogForTutor' })
        ]);

        if (studentsResponse.result === 'success' && studentsResponse.students) masterStudentList = studentsResponse.students.sort((a,b) => a.StudentName.localeCompare(b.StudentName));
        if (logResponse.result === 'success' && logResponse.log) tutoringLog = logResponse.log;

        studentLookup.placeholder = "Start typing a student's name...";
        studentLookup.disabled = false;
        submitBtn.disabled = false;

        const uniqueStudentsInLog = [...new Set(tutoringLog.map(entry => entry.StudentName))].sort();
        populateDropdown('historyStudentFilter', uniqueStudentsInLog, "All Students", "all");

    } catch (error) {
        showAccessDenied();
        console.error("Initialization failed:", error);
    } finally {
        tutorAuthOverlay.parentElement.classList.add('hidden');
    }

    // --- Event Listeners ---
    newLogTab.addEventListener('click', () => switchTab('newLog'));
    historyTab.addEventListener('click', () => switchTab('history'));
    historyStudentFilter.addEventListener('change', renderHistoryReport);
    historyDateFilter.addEventListener('change', renderHistoryReport);
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
    studentLookup.addEventListener('input', () => {
        const query = studentLookup.value.toLowerCase();
        if (query.length === 0) { studentResults.classList.add('hidden'); return; }
        const selectedNames = selectedStudents.map(s => s.StudentName);
        const filtered = masterStudentList.filter(student => student.StudentName.toLowerCase().includes(query) && !selectedNames.includes(student.StudentName));
        renderStudentResults(filtered.slice(0, 10));
    });
    document.addEventListener('click', (event) => {
        if (studentLookup && !studentLookup.contains(event.target)) {
            studentResults.classList.add('hidden');
        }
    });
}

function resetPageSpecificAppState() {
    tutoringLog = [];
    masterStudentList = [];
    selectedStudents = [];
    if (tutoringForm) tutoringForm.reset();
    if (selectedStudentsList) renderSelectedStudents();
    if (pageHeader) pageHeader.textContent = "Tutoring Center";
}