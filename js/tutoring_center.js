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
    noteModal = document.getElementById('noteModal');
    noteModalContent = document.getElementById('noteModalContent');
    closeNoteModalBtn = document.getElementById('closeNoteModalBtn');
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
    const studentsPayload = selectedStudents.map(s => ({ studentName: s.StudentName, className: s.Class }));

    try {
        // --- START: MODIFIED LOGIC ---
        
        // 1. Send the data to the server as usual.
        await sendAuthenticatedRequest({ 
            action: 'logTutoringSession', 
            students: studentsPayload, 
            durationMinutes: duration, 
            notes, 
            teacherEmail: appState.currentUser.email 
        });

        showSuccessAlert(`Session logged for ${selectedStudents.length} student(s)!`);

        // 2. Create new log entry objects on the frontend.
        const baseDate = new Date(); // Get the starting time once.
        const newEntries = selectedStudents.map((student, index) => {
            // Create a new date object for each entry and add the index as milliseconds.
            const uniqueDate = new Date(baseDate.getTime() + index);
            return {
                Timestamp: uniqueDate.toISOString(), // This is now guaranteed to be unique.
                TeacherEmail: appState.currentUser.email,
                ClassName: student.Class,
                StudentName: student.StudentName,
                DurationMinutes: duration,
                Notes: notes
            };
        });

        // 3. Add the new entries to the beginning of our local log array.
        tutoringLog.unshift(...newEntries);

        // 4. Immediately re-render the history report with the new data.
        renderHistoryReport();

        // 5. Update the student filter dropdown with any new names.
        const uniqueStudentsInLog = [...new Set(tutoringLog.map(entry => entry.StudentName))].sort();
        populateDropdown('historyStudentFilter', uniqueStudentsInLog, "All Students", "all");

        // 6. Reset the form for the next entry.
        tutoringForm.reset();
        selectedStudents = [];
        renderSelectedStudents();

        // --- END: MODIFIED LOGIC ---

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
        studentName: editStudentName.value, // Add student name to the payload
        newDuration: editDuration.value,
        newNotes: editNotes.value
    };
    try {
        await sendAuthenticatedRequest(payload);

        const entryToUpdate = tutoringLog.find(e => e.Timestamp === currentEditTimestamp);
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
        await sendAuthenticatedRequest({ 
            action: 'deleteTutoringLogEntry', 
            entryTimestamp: currentEditTimestamp,
            studentName: editStudentName.value // Add student name to the payload
        });

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


// --- Main Initialization & Authorization ---
function showAccessDenied() {
    if (tutoringContainer) tutoringContainer.classList.add('hidden');
    if (pageHeader) pageHeader.textContent = "Access Denied";
    showErrorAlert("You are not authorized to use this tool.");
}

async function initializePageSpecificApp() {
    cacheDOMElements();

    try {
        const authResponse = await sendAuthenticatedRequest({ action: 'checkTutorAuthorization' });
        if (!authResponse.isAuthorized) {
            showAccessDenied();
            return;
        }

        switchTab('newLog');
        tutoringForm.classList.remove('hidden');

        const [studentsResponse, logResponse] = await Promise.all([
            sendAuthenticatedRequest({ action: 'getStudentMasterList' }),
            sendAuthenticatedRequest({ action: 'getTutoringLogForTutor' })
        ]);
        
        if (studentsResponse.result === 'success' && studentsResponse.students) {
            masterStudentList = studentsResponse.students.sort((a,b) => a.StudentName.localeCompare(b.StudentName));
        } else {
            throw new Error("Failed to process student master list.");
        }
        
        if (logResponse.result === 'success' && logResponse.log) {
            tutoringLog = logResponse.log;
        } else {
            throw new Error("Failed to process tutoring log.");
        }

        studentLookup.placeholder = "Start typing a student's name...";
        studentLookup.disabled = false;
        submitBtn.disabled = false;

        const uniqueStudentsInLog = [...new Set(tutoringLog.map(entry => entry.StudentName))].sort();
        populateDropdown('historyStudentFilter', uniqueStudentsInLog, "All Students", "all");
        historyDateFilter.value = 'all_time';

    } catch (error) {
        showAccessDenied();
        console.error("Initialization failed:", error);
    }

    // --- Event Listeners ---
    // --- START: ADD EVENT LISTENERS FOR NOTE MODAL ---
    historyTableBody.addEventListener('click', (event) => {
        const viewNoteButton = event.target.closest('.view-note-btn');
        const editButton = event.target.closest('.edit-btn');
        
        if (viewNoteButton) {
            const noteText = decodeURIComponent(viewNoteButton.dataset.note);
            noteModalContent.textContent = noteText;
            noteModal.classList.remove('hidden');
        } else if (editButton) {
            const timestamp = editButton.dataset.timestamp;
            const entry = tutoringLog.find(e => e.Timestamp === timestamp);
            if (entry) openEditModal(entry);
        }
    });

    closeNoteModalBtn.addEventListener('click', () => {
        noteModal.classList.add('hidden');
    });
    // --- END: ADD EVENT LISTENERS ---
    newLogTab.addEventListener('click', () => switchTab('newLog'));
    historyTab.addEventListener('click', () => switchTab('history'));
    historyStudentFilter.addEventListener('change', renderHistoryReport);
    historyDateFilter.addEventListener('change', renderHistoryReport);
    tutoringForm.addEventListener('submit', handleFormSubmit);
    saveEditBtn.addEventListener('click', saveEdit);
    cancelEditBtn.addEventListener('click', () => editModal.classList.add('hidden'));
    deleteEntryBtn.addEventListener('click', deleteEntry);
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
}

function resetPageSpecificAppState() {
    tutoringLog = [];
    masterStudentList = [];
    selectedStudents = [];
    if (tutoringForm) tutoringForm.reset();
    if (selectedStudentsList) renderSelectedStudents();
    if (pageHeader) pageHeader.textContent = "Tutoring Center";
}