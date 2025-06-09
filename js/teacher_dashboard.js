// js/teacher_dashboard.js

// --- DOM Element Caching ---
const signOutClassDropdown = document.getElementById('signOutClassDropdown');
const attendanceClassDropdown = document.getElementById('attendanceClassDropdown');
const studentFilterDiv = document.getElementById('studentFilterDiv');
const studentFilterDropdown = document.getElementById('studentFilterDropdown');
const dateFilterType = document.getElementById('dateFilterType');
const specificDateInputDiv = document.getElementById('specificDateInput');
const reportDateInput = document.getElementById('reportDate');
const dateRangeInputsDiv = document.getElementById('dateRangeInputs');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const filterProblemsCheckbox = document.getElementById('filterProblemsCheckbox');
const reloadDataBtn = document.getElementById('reloadDataBtn');
const reportMessageP = document.getElementById('reportMessage');
const reportTable = document.getElementById('reportTable');
const reportTableBody = document.getElementById('reportTableBody');
const signOutReportTab = document.getElementById('signOutReportTab');
const attendanceReportTab = document.getElementById('attendanceReportTab');
const signOutReportContent = document.getElementById('signOutReportContent');
const attendanceReportContent = document.getElementById('attendanceReportContent');
const attendanceDateInput = document.getElementById('attendanceDate');
const attendanceReportMessageP = document.getElementById('attendanceReportMessage');
const attendanceReportTable = document.getElementById('attendanceReportTable');
const attendanceReportTableBody = document.getElementById('attendanceReportTableBody');
// New Edit/Delete Modal Elements
const editModal = document.getElementById('editModal');
const editStudentName = document.getElementById('editStudentName');
const editType = document.getElementById('editType');
const editDurationDiv = document.getElementById('editDurationDiv');
const editMinutes = document.getElementById('editMinutes');
const editSeconds = document.getElementById('editSeconds');
const saveEditBtn = document.getElementById('saveEditBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const deleteEntryBtn = document.getElementById('deleteEntryBtn');
const dashboardContent = document.getElementById('dashboardContent');

// --- Helper & Formatting Functions ---

function normalizeName(name) {
    if (typeof name !== 'string') return '';
    const idx = name.indexOf('(');
    return idx > -1 ? name.substring(0, idx).trim() : name.trim();
}

function getShortClassName(fullClassName) {
    if (typeof fullClassName !== 'string') return 'N/A';
    const match = fullClassName.match(/Period (\d+)/);
    return match ? `P${match[1]}` : fullClassName;
}

function getWeekRange() {
    const now = new Date();
    const first = now.getDate() - now.getDay();
    const firstDay = new Date(now.setDate(first));
    const lastDay = new Date(now.setDate(first + 6));
    return { start: firstDay.toISOString().split('T')[0], end: lastDay.toISOString().split('T')[0] };
}

function getMonthRange() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: firstDay.toISOString().split('T')[0], end: lastDay.toISOString().split('T')[0] };
}

function toggleDateInputs() {
    const filter = dateFilterType.value;
    specificDateInputDiv.classList.toggle('hidden', filter !== 'specificDate');
    dateRangeInputsDiv.classList.toggle('hidden', filter !== 'dateRange');
}

function getTodayDateString() { return new Date().toISOString().split('T')[0]; }
function formatDate(d) { return d ? new Date(d).toLocaleDateString() : ''; }
function formatTime(d) { return d ? new Date(d).toLocaleTimeString() : ''; }

// --- Report Generation & UI Functions ---

function renderSignOutReport() {
    if (!appState.data.allSignOuts) {
        reportMessageP.textContent = "Data is loading or failed to load.";
        reportMessageP.classList.remove('hidden');
        return;
    }
    reportMessageP.classList.add('hidden');

    const selectedClass = signOutClassDropdown.value;
    const selectedStudent = studentFilterDropdown.value;
    const filterType = dateFilterType.value;
    const isStudentFilterActive = !studentFilterDiv.classList.contains('hidden') && selectedStudent !== "All Students";
    const showProblemsOnly = filterProblemsCheckbox.checked;

    let filteredData = appState.data.allSignOuts.filter(record => !record.Deleted);

    if (selectedClass !== "All Classes") {
        filteredData = filteredData.filter(r => r.Class === selectedClass);
    }
    if (isStudentFilterActive) {
        filteredData = filteredData.filter(r => normalizeName(r.Name) === selectedStudent);
    }
    if (filterType !== 'all_time') {
        let startDateStr, endDateStr;
        if (filterType === 'today') { startDateStr = endDateStr = getTodayDateString(); }
        else if (filterType === 'this_week') { const r = getWeekRange(); startDateStr = r.start; endDateStr = r.end; }
        else if (filterType === 'this_month') { const r = getMonthRange(); startDateStr = r.start; endDateStr = r.end; }
        else if (filterType === 'specificDate') { startDateStr = endDateStr = reportDateInput.value; }
        else if (filterType === 'dateRange') { startDateStr = startDateInput.value; endDateStr = endDateInput.value; }
        
        if (startDateStr && endDateStr) {
            const start = new Date(startDateStr + 'T00:00:00');
            const end = new Date(endDateStr + 'T23:59:59');
            filteredData = filteredData.filter(r => {
                const recordDate = new Date(r.Date);
                return recordDate >= start && recordDate <= end;
            });
        }
    }
    if (showProblemsOnly) {
        const threshold = TARDY_THRESHOLD_MINUTES * 60;
        filteredData = filteredData.filter(r => r.Type === "late" || (r.Type === 'bathroom' && typeof r.Seconds === 'number' && r.Seconds > threshold));
    }

    reportTableBody.innerHTML = '';
    if (filteredData.length === 0) {
        reportMessageP.textContent = `No sign-out data found for the selected criteria.`;
        reportMessageP.classList.remove('hidden');
        reportTable.classList.add('hidden');
    } else {
        reportTable.classList.remove('hidden');
        filteredData.sort((a, b) => new Date(b.Date) - new Date(a.Date));
        filteredData.forEach(row => {
            const tr = document.createElement('tr');
            let typeDisplay = "Bathroom", durationDisplay = "N/A";
            if (row.Type === 'late') {
                typeDisplay = "Late Sign In";
                tr.classList.add('bg-yellow-200');
            } else if (typeof row.Seconds === 'number') {
                const minutes = Math.floor(row.Seconds / 60);
                const seconds = row.Seconds % 60;
                durationDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                if (row.Seconds > TARDY_THRESHOLD_MINUTES * 60) {
                    tr.classList.add('bg-red-200');
                }
            }
            const shortClassName = getShortClassName(row.Class);
            const editButton = `<button class="text-gray-500 hover:text-blue-600 edit-btn p-1" data-timestamp="${row.Date}" title="Edit Entry"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>`;
            tr.innerHTML = `<td class="p-2 border-b">${formatDate(row.Date)}</td><td class="p-2 border-b">${formatTime(row.Date)}</td><td class="p-2 border-b">${shortClassName}</td><td class="p-2 border-b">${normalizeName(row.Name)}</td><td class="p-2 border-b">${typeDisplay}</td><td class="p-2 border-b">${durationDisplay}</td><td class="p-2 border-b text-right">${editButton}</td>`;
            reportTableBody.appendChild(tr);
        });
    }
}

function switchTab(tab) {
    const isAttendance = tab === 'attendance';
    signOutReportContent.classList.toggle('hidden', isAttendance);
    attendanceReportContent.classList.toggle('hidden', !isAttendance);
    signOutReportTab.classList.toggle('border-indigo-500', !isAttendance);
    signOutReportTab.classList.toggle('text-indigo-600', !isAttendance);
    signOutReportTab.classList.toggle('border-transparent', isAttendance);
    signOutReportTab.classList.toggle('text-gray-500', isAttendance);
    attendanceReportTab.classList.toggle('border-indigo-500', isAttendance);
    attendanceReportTab.classList.toggle('text-indigo-600', isAttendance);
    attendanceReportTab.classList.toggle('border-transparent', !isAttendance);
    attendanceReportTab.classList.toggle('text-gray-500', !isAttendance);
}

function renderAttendanceReport() {
    if (!appState.data.allSignOuts) {
        attendanceReportMessageP.textContent = "Initial data is still loading. Please wait a moment...";
        attendanceReportMessageP.classList.remove('hidden');
        return;
    }
    const selectedClass = attendanceClassDropdown.value;
    const selectedDate = attendanceDateInput.value;
    if (selectedClass === "" || selectedClass === DEFAULT_CLASS_OPTION || !selectedDate) {
        attendanceReportMessageP.textContent = "Please select a class and a date.";
        attendanceReportMessageP.classList.remove('hidden');
        attendanceReportTable.classList.add('hidden');
        return;
    }
    attendanceReportMessageP.classList.add('hidden');
    attendanceReportTable.classList.remove('hidden');
    attendanceReportTableBody.innerHTML = '';
    
    const start = new Date(selectedDate + 'T00:00:00');
    const end = new Date(selectedDate + 'T23:59:59');
    
    const dailySignOuts = appState.data.allSignOuts.filter(record => {
        const recordDate = new Date(record.Date);
        return !record.Deleted && recordDate >= start && recordDate <= end && record.Class === selectedClass;
    });

    const allStudentsInClass = appState.data.allNamesFromSheet.filter(s => s.Class === selectedClass).map(s => s.Name).sort();
    
    let presentStudentIndex = 0;
    allStudentsInClass.forEach(studentFullName => {
        const normalizedStudentName = normalizeName(studentFullName);
        const studentRecords = dailySignOuts.filter(r => normalizeName(r.Name) === normalizedStudentName);
        let status = "Present", reason = "N/A", hasLong = false, hasLate = false;
        if (studentRecords.length > 0) {
            let longCount = 0, outCount = 0;
            studentRecords.forEach(r => {
                if (r.Type === "late") hasLate = true;
                else if (r.Type === 'bathroom' && typeof r.Seconds === 'number') {
                    outCount++;
                    if (r.Seconds > TARDY_THRESHOLD_MINUTES * 60) { hasLong = true; longCount++; }
                }
            });
            let reasons = [];
            if (hasLate) reasons.push("Late Sign In");
            if (outCount > 0) reasons.push(`${outCount} Sign Out(s)`);
            if (longCount > 0) reasons.push(`(${longCount} > 5 min)`);
            reason = reasons.join(' ');
            status = (hasLate || hasLong) ? "Needs Review" : "Activity Recorded";
        }
        const tr = document.createElement('tr');
        tr.className = 'border-t';
        if (studentRecords.length > 0) {
            tr.classList.add('cursor-pointer');
            tr.dataset.accordionToggle = "true";
            if (hasLate || hasLong) tr.classList.add('bg-red-200');
            else tr.classList.add('bg-blue-100');
        } else {
            if (presentStudentIndex % 2 !== 0) tr.classList.add('bg-gray-50');
            presentStudentIndex++;
        }
        const arrowSvg = studentRecords.length > 0 ? `<svg class="w-4 h-4 inline-block ml-2 transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>` : '';
        tr.innerHTML = `<td class="py-3 px-4">${normalizeName(studentFullName)}${arrowSvg}</td><td class="py-3 px-4">${status}</td><td class="py-3 px-4">${reason}</td>`;
        attendanceReportTableBody.appendChild(tr);
    });
}

async function handleDeleteEntry(timestamp) {
    const payload = { action: 'deleteEntry', entryTimestamp: timestamp, userEmail: appState.currentUser.email, idToken: appState.currentUser.idToken };
    try {
        const response = await sendAuthenticatedRequest(payload);
        if (response.result === 'success') {
            const entryIndex = appState.data.allSignOuts.findIndex(entry => entry.Date === timestamp);
            if (entryIndex > -1) {
                appState.data.allSignOuts[entryIndex].Deleted = true;
            }
            renderSignOutReport();
        } else { throw new Error(response.error || 'Failed to delete entry from server.'); }
    } catch (error) { console.error('Error deleting entry:', error); }
}

async function handleEditEntry(originalTimestamp, newName, newSeconds, newType) {
    const payload = { action: 'editEntry', entryTimestamp: originalTimestamp, newName, newSeconds, newType, userEmail: appState.currentUser.email, idToken: appState.currentUser.idToken };
    try {
        const response = await sendAuthenticatedRequest(payload);
        if (response.result === 'success') {
            const entryIndex = appState.data.allSignOuts.findIndex(entry => entry.Date === originalTimestamp);
            if(entryIndex > -1) {
                appState.data.allSignOuts[entryIndex].Name = newName;
                appState.data.allSignOuts[entryIndex].Seconds = newSeconds;
                appState.data.allSignOuts[entryIndex].Type = newType;
            }
            renderSignOutReport();
        } else { throw new Error(response.error || 'Failed to edit entry on server.'); }
    } catch (error) { console.error('Error editing entry:', error); }
}

async function fetchAllSignOutData() {
    reportMessageP.textContent = "Loading all sign-out data...";
    reportMessageP.classList.remove('hidden');
    reportTable.classList.add('hidden');
    reloadDataBtn.disabled = true;
    reloadDataBtn.classList.add('opacity-50');
    try {
        const payload = { action: 'getAllSignOutsForTeacher', userEmail: appState.currentUser.email, idToken: appState.currentUser.idToken };
        const data = await sendAuthenticatedRequest(payload);
        if (data.result === 'success' && Array.isArray(data.report)) {
            appState.data.allSignOuts = data.report;
            renderSignOutReport();
            renderAttendanceReport();
        } else { throw new Error(data.error || "Failed to fetch all data."); }
    } catch (error) {
        console.error("Failed to fetch all sign out data:", error);
        reportMessageP.textContent = "Could not load all report data. Please try reloading.";
    } finally {
        reloadDataBtn.disabled = false;
        reloadDataBtn.classList.remove('opacity-50');
    }
}

async function initializePageSpecificApp() {
    [signOutClassDropdown, attendanceClassDropdown, studentFilterDropdown].forEach(dd => {
        if(dd) { populateDropdown(dd.id, [], LOADING_OPTION, ""); dd.setAttribute("disabled", "disabled"); }
    });
    dateFilterType.value = 'today';
    toggleDateInputs();
    reportDateInput.value = getTodayDateString(); 
    startDateInput.value = getTodayDateString();
    endDateInput.value = getTodayDateString();
    attendanceDateInput.value = getTodayDateString();
    if (appState.currentUser.email && appState.currentUser.idToken) {
        try {
            await fetchAllStudentData(); 
            await populateCourseDropdownFromData();
            populateDropdown('signOutClassDropdown', appState.data.courses, "All Classes", "All Classes");
            signOutClassDropdown.removeAttribute("disabled");
            populateDropdown('attendanceClassDropdown', appState.data.courses, DEFAULT_CLASS_OPTION, "");
            attendanceClassDropdown.removeAttribute("disabled");
            await fetchAllSignOutData();
        } catch (error) {
            console.error("Failed to initialize dashboard with data:", error);
            [signOutClassDropdown, attendanceClassDropdown].forEach(dd => populateDropdown(dd.id, [], "Error loading classes", ""));
        }
    } else {
        console.warn("User not authenticated.");
        [signOutClassDropdown, attendanceClassDropdown].forEach(dd => populateDropdown(dd.id, [], "Sign in to load classes", ""));
    }
    switchTab('signOut');
}

function resetPageSpecificAppState() {
    appState.data = { allNamesFromSheet: [], courses: [], allSignOuts: [] }; 
    [signOutClassDropdown, attendanceClassDropdown, studentFilterDropdown].forEach(dd => {
        if(dd) { populateDropdown(dd.id, [], DEFAULT_CLASS_OPTION, ""); dd.setAttribute("disabled", "disabled"); }
    });
    studentFilterDiv.classList.add('hidden');
    dateFilterType.value = 'today';
    toggleDateInputs();
    reportTable.classList.add('hidden');
    reportMessageP.textContent = "Select filters to view data.";
    attendanceReportTable.classList.add('hidden');
    attendanceReportMessageP.textContent = "Select a class and date to generate the attendance report.";
    switchTab('signOut');
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', initGoogleSignIn);
reloadDataBtn.addEventListener('click', fetchAllSignOutData);
[signOutClassDropdown, studentFilterDropdown, dateFilterType, reportDateInput, startDateInput, endDateInput, filterProblemsCheckbox].forEach(el => {
    if(el) el.addEventListener('change', renderSignOutReport);
});
dateFilterType.addEventListener('change', toggleDateInputs);
signOutReportTab.addEventListener('click', () => switchTab('signOut'));
attendanceReportTab.addEventListener('click', () => { switchTab('attendance'); renderAttendanceReport(); });
attendanceClassDropdown.addEventListener('change', renderAttendanceReport);
attendanceDateInput.addEventListener('change', renderAttendanceReport);

dashboardContent.addEventListener('click', (event) => {
    const editButton = event.target.closest('.edit-btn');
    if (editButton) {
        event.stopPropagation();
        const timestamp = editButton.dataset.timestamp;
        const record = appState.data.allSignOuts.find(r => r.Date === timestamp);
        if (record) {
            const studentsInClass = appState.data.allNamesFromSheet
                .filter(student => student.Class === record.Class)
                .map(student => student.Name) 
                .sort();
            
            const uniqueStudents = [...new Set(studentsInClass)];
            
            editStudentName.innerHTML = ''; 
            uniqueStudents.forEach(studentFullName => {
                const option = document.createElement('option');
                option.value = studentFullName; 
                option.textContent = normalizeName(studentFullName); 
                editStudentName.appendChild(option);
            });
            // This ensures the correct option is selected even if the log name is clean
            editStudentName.value = record.Name; 
            
            editType.value = record.Type || 'bathroom';
            editDurationDiv.classList.toggle('hidden', editType.value === 'late');

            if (record.Type === 'bathroom' && typeof record.Seconds === 'number') {
                editMinutes.value = Math.floor(record.Seconds / 60);
                editSeconds.value = record.Seconds % 60;
            } else {
                editMinutes.value = '';
                editSeconds.value = '';
            }
            editModal.classList.remove('hidden');
            saveEditBtn.dataset.timestamp = timestamp;
            deleteEntryBtn.dataset.timestamp = timestamp;
        }
    }
});

editType.addEventListener('change', () => {
    editDurationDiv.classList.toggle('hidden', editType.value === 'late');
});

cancelEditBtn.addEventListener('click', () => editModal.classList.add('hidden'));

saveEditBtn.addEventListener('click', () => {
    const timestamp = saveEditBtn.dataset.timestamp;
    // **THE FIX**: The value of the dropdown is the full name, which is what we want to save
    const newName = editStudentName.value;
    
    const newType = editType.value;
    
    let newSeconds;
    if (newType === 'late') {
        newSeconds = 'Late Sign In';
    } else {
        const minutes = parseInt(editMinutes.value) || 0;
        const seconds = parseInt(editSeconds.value) || 0;
        newSeconds = (minutes * 60) + seconds;
    }

    if (timestamp && newName) {
        handleEditEntry(timestamp, newName, newSeconds, newType);
    }
    editModal.classList.add('hidden');
});

deleteEntryBtn.addEventListener('click', () => {
    const timestamp = deleteEntryBtn.dataset.timestamp;
    if (timestamp) {
        if (confirm("Are you sure you want to delete this entry? This cannot be undone.")) {
            handleDeleteEntry(timestamp);
        }
    }
    editModal.classList.add('hidden');
});

signOutClassDropdown.addEventListener('change', () => {
    const selectedClass = signOutClassDropdown.value;
    if (selectedClass && selectedClass !== "All Classes") {
        const studentsInClass = appState.data.allNamesFromSheet
            .filter(student => student.Class === selectedClass)
            .map(student => student.Name)
            .sort();
        
        const uniqueStudents = [...new Set(studentsInClass)];
        
        studentFilterDropdown.innerHTML = '';
        const allStudentsOption = document.createElement('option');
        allStudentsOption.value = "All Students";
        allStudentsOption.textContent = "All Students";
        studentFilterDropdown.appendChild(allStudentsOption);

        uniqueStudents.forEach(studentFullName => {
            const option = document.createElement('option');
            // **THE FIX**: Use the clean name for both value and text content in this filter
            const cleanName = normalizeName(studentFullName);
            option.value = cleanName; 
            option.textContent = cleanName;
            studentFilterDropdown.appendChild(option);
        });
        
        studentFilterDropdown.removeAttribute('disabled');
        studentFilterDiv.classList.remove('hidden');
    } else {
        studentFilterDiv.classList.add('hidden');
    }
    renderSignOutReport();
});
