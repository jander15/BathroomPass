// js/teacher_dashboard.js

// --- DOM Element Caching ---
const signOutClassDropdown = document.getElementById('signOutClassDropdown');
const attendanceClassDropdown = document.getElementById('attendanceClassDropdown');
const dateFilterType = document.getElementById('dateFilterType');
const specificDateInputDiv = document.getElementById('specificDateInput');
const reportDateInput = document.getElementById('reportDate');
const dateRangeInputsDiv = document.getElementById('dateRangeInputs');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const filterLongDurationsCheckbox = document.getElementById('filterLongDurations');
const generateReportBtn = document.getElementById('generateReportBtn');
const reportOutputDiv = document.getElementById('reportOutput');
const reportMessageP = document.getElementById('reportMessage');
const reportTable = document.getElementById('reportTable');
const reportTableBody = document.getElementById('reportTableBody');
const signOutReportTab = document.getElementById('signOutReportTab');
const attendanceReportTab = document.getElementById('attendanceReportTab');
const signOutReportContent = document.getElementById('signOutReportContent');
const attendanceReportContent = document.getElementById('attendanceReportContent');
const attendanceDateInput = document.getElementById('attendanceDate');
const generateAttendanceReportBtn = document.getElementById('generateAttendanceReportBtn');
const attendanceReportOutputDiv = document.getElementById('attendanceReportOutput');
const attendanceReportMessageP = document.getElementById('attendanceReportMessage');
const attendanceReportTable = document.getElementById('attendanceReportTable');
const attendanceReportTableBody = document.getElementById('attendanceReportTableBody');

// --- Helper & Formatting Functions ---

function normalizeName(name) {
    if (typeof name !== 'string') return '';
    const parenthesisIndex = name.indexOf('(');
    return parenthesisIndex > -1 ? name.substring(0, parenthesisIndex).trim() : name.trim();
}

function toggleDateInputs() {
    const selectedFilter = dateFilterType.value;
    specificDateInputDiv.classList.add('hidden');
    dateRangeInputsDiv.classList.add('hidden');
    if (selectedFilter === 'specificDate') specificDateInputDiv.classList.remove('hidden');
    else if (selectedFilter === 'dateRange') dateRangeInputsDiv.classList.remove('hidden');
}

function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

function formatDate(dateInput) {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
}

function formatTime(dateInput) {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

// --- Report Generation & UI Functions ---

function applyDurationFilter() {
    const showLongDurationsOnly = filterLongDurationsCheckbox.checked;
    const thresholdSeconds = TARDY_THRESHOLD_MINUTES * 60;
    Array.from(reportTableBody.rows).forEach(row => {
        const typeCell = row.cells[4];
        const durationCell = row.cells[5];
        let isLongDuration = false;
        let isSignOut = typeCell.textContent === "Sign Out";
        if (isSignOut && durationCell.textContent !== "N/A") {
            let totalSeconds = 0;
            if (durationCell.textContent.includes(':')) {
                const parts = durationCell.textContent.split(':');
                totalSeconds = parseInt(parts[0] || '0') * 60 + parseInt(parts[1] || '0');
            } else {
                totalSeconds = parseFloat(durationCell.textContent || '0');
            }
            isLongDuration = totalSeconds > thresholdSeconds;
        }
        if (isSignOut && isLongDuration) row.classList.add('bg-red-200');
        else if (typeCell.textContent !== "Late Sign In") row.classList.remove('bg-red-200');
        if (showLongDurationsOnly) row.classList.toggle('hidden', !(isSignOut && isLongDuration));
        else row.classList.remove('hidden');
    });
}

async function generateReport() {
    reportMessageP.textContent = "Generating report...";
    reportTable.classList.add('hidden');
    reportTableBody.innerHTML = '';
    showErrorAlert('');
    showSuccessAlert('');

    const selectedClass = signOutClassDropdown.value;
    const filterType = dateFilterType.value;
    let startDate = null, endDate = null;

    if (!selectedClass) { showErrorAlert("Please select a class."); return; }
    
    if (filterType === 'today') startDate = endDate = getTodayDateString();
    else if (filterType === 'specificDate') {
        startDate = endDate = reportDateInput.value;
        if (!startDate) { showErrorAlert("Please select a specific date."); return; }
    } else if (filterType === 'dateRange') {
        startDate = startDateInput.value;
        endDate = endDateInput.value;
        if (!startDate || !endDate) { showErrorAlert("Please select both start and end dates."); return; }
        if (new Date(startDate) > new Date(endDate)) { showErrorAlert("Start date cannot be after end date."); return; }
    }

    generateReportBtn.disabled = true;
    generateReportBtn.classList.add('opacity-50', 'cursor-not-allowed');
    generateReportBtn.textContent = "Loading Report...";

    try {
        // **THE FIX**: Omit the class property if "All Classes" is selected.
        const payload = { 
            action: ACTION_GET_REPORT_DATA, 
            startDate, 
            endDate, 
            userEmail: appState.currentUser.email 
        };
        if (selectedClass !== "All Classes") {
            payload.class = selectedClass;
        }

        const data = await sendAuthenticatedRequest(payload);
        if (data.result === 'success' && Array.isArray(data.report)) {
            if (data.report.length === 0) {
                reportMessageP.textContent = `No sign-out data found for the selected criteria.`;
                reportTable.classList.add('hidden');
            } else {
                reportMessageP.classList.add('hidden');
                reportTable.classList.remove('hidden');
                reportTableBody.innerHTML = '';
                data.report.forEach(row => {
                    const tr = document.createElement('tr');
                    let type = "Sign Out", durationDisplay = "N/A";
                    if (row.Seconds === "Late Sign In") {
                        type = "Late Sign In";
                        tr.classList.add('bg-yellow-200');
                    } else if (typeof row.Seconds === 'number') {
                        const minutes = Math.floor(row.Seconds / 60);
                        const seconds = row.Seconds % 60;
                        durationDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    }
                    tr.innerHTML = `
                        <td class="py-2 px-4 border-b">${formatDate(row.Date)}</td>
                        <td class="py-2 px-4 border-b">${formatTime(row.Date)}</td>
                        <td class="py-2 px-4 border-b">${row.Class || 'N/A'}</td>
                        <td class="py-2 px-4 border-b">${row.Name || 'N/A'}</td>
                        <td class="py-2 px-4 border-b">${type}</td>
                        <td class="py-2 px-4 border-b">${durationDisplay}</td>`;
                    reportTableBody.appendChild(tr);
                });
                applyDurationFilter();
            }
        } else {
            showErrorAlert(`Error generating report: ${data.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error fetching report data:', error);
        showErrorAlert("Failed to generate report. Network or authentication issue.");
    } finally {
        generateReportBtn.disabled = false;
        generateReportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        generateReportBtn.textContent = "Generate Report";
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

async function generateAttendanceReport() {
    attendanceReportMessageP.textContent = "Generating attendance report...";
    attendanceReportTable.classList.add('hidden');
    attendanceReportTableBody.innerHTML = '';
    showErrorAlert('');
    showSuccessAlert('');
    const selectedClass = attendanceClassDropdown.value;
    const selectedDate = attendanceDateInput.value;
    if (selectedClass === "" || selectedClass === DEFAULT_CLASS_OPTION || !selectedDate) {
        showErrorAlert("Please select a class and a date.");
        attendanceReportMessageP.textContent = "Select a class and date to generate the attendance report.";
        return;
    }
    generateAttendanceReportBtn.disabled = true;
    generateAttendanceReportBtn.classList.add('opacity-50', 'cursor-not-allowed');
    generateAttendanceReportBtn.textContent = "Loading...";
    try {
        const payload = { action: ACTION_GET_REPORT_DATA, class: selectedClass, startDate: selectedDate, endDate: selectedDate, userEmail: appState.currentUser.email };
        const reportData = await sendAuthenticatedRequest(payload);
        if (reportData.result !== 'success' || !Array.isArray(reportData.report)) {
            throw new Error(reportData.error || 'Failed to fetch report data.');
        }
        const allStudentsInClass = appState.data.allNamesFromSheet.filter(s => s.Class === selectedClass).map(s => s.Name).sort();
        if (allStudentsInClass.length === 0) {
            attendanceReportMessageP.textContent = `No students found for class ${selectedClass}.`;
            return;
        }
        attendanceReportMessageP.classList.add('hidden');
        attendanceReportTable.classList.remove('hidden');
        attendanceReportTableBody.innerHTML = '';
        
        let presentStudentIndex = 0; // Counter for zebra striping

        allStudentsInClass.forEach(studentName => {
            const normalizedStudentName = normalizeName(studentName);
            const studentRecords = reportData.report.filter(record => normalizeName(record.Name) === normalizedStudentName);
            let attendanceStatus = "Present", reason = "N/A", hasLongSignOut = false, hasLateSignIn = false;
            if (studentRecords.length > 0) {
                let longSignOutCount = 0, signOutCount = 0;
                studentRecords.forEach(record => {
                    if (record.Seconds === "Late Sign In") hasLateSignIn = true;
                    else if (typeof record.Seconds === 'number') {
                        signOutCount++;
                        if (record.Seconds > (TARDY_THRESHOLD_MINUTES * 60)) {
                            hasLongSignOut = true;
                            longSignOutCount++;
                        }
                    }
                });
                let reasons = [];
                if (hasLateSignIn) reasons.push("Late Sign In");
                if (signOutCount > 0) reasons.push(`${signOutCount} Sign Out(s)`);
                if (longSignOutCount > 0) reasons.push(`(${longSignOutCount} > 5 min)`);
                reason = reasons.join(' ');
                attendanceStatus = (hasLateSignIn || hasLongSignOut) ? "Needs Review" : "Activity Recorded";
            }
            const tr = document.createElement('tr');
            tr.className = 'border-t';
            if (studentRecords.length > 0) {
                tr.classList.add('cursor-pointer');
                tr.dataset.accordionToggle = "true";
                if (hasLateSignIn || hasLongSignOut) {
                    tr.classList.add('bg-red-200'); // Red for "Needs Review"
                } else {
                    tr.classList.add('bg-blue-100'); // Blue for normal activity
                }
            } else {
                // Zebra striping for "Present" students
                if (presentStudentIndex % 2 !== 0) {
                    tr.classList.add('bg-gray-50');
                }
                presentStudentIndex++;
            }
            const arrowSvg = studentRecords.length > 0 ? `<svg class="w-4 h-4 inline-block ml-2 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>` : '';
            tr.innerHTML = `<td class="py-3 px-4">${studentName} ${arrowSvg}</td><td class="py-3 px-4">${attendanceStatus}</td><td class="py-3 px-4">${reason}</td>`;
            attendanceReportTableBody.appendChild(tr);
            if (studentRecords.length > 0) {
                const detailsTr = document.createElement('tr');
                detailsTr.className = 'hidden';
                detailsTr.classList.add((hasLateSignIn || hasLongSignOut) ? 'bg-red-50' : 'bg-blue-50');
                const detailsTd = document.createElement('td');
                detailsTd.colSpan = 3;
                detailsTd.className = 'p-0';
                let detailsTableHtml = `<div class="p-4"><table class="min-w-full bg-white"><thead><tr class="bg-gray-200"><th class="py-2 px-4 border-b text-left">Date</th><th class="py-2 px-4 border-b text-left">Time</th><th class="py-2 px-4 border-b text-left">Type</th><th class="py-2 px-4 border-b text-left">Duration (min:sec)</th></tr></thead><tbody>`;
                studentRecords.forEach(record => {
                    let type = "Sign Out", durationDisplay = "N/A", detailRowClass = '';
                    if (record.Seconds === "Late Sign In") {
                        type = "Late Sign In";
                        detailRowClass = 'bg-yellow-200';
                    } else if (typeof record.Seconds === 'number') {
                        const minutes = Math.floor(record.Seconds / 60);
                        const seconds = record.Seconds % 60;
                        durationDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                        if (record.Seconds > (TARDY_THRESHOLD_MINUTES * 60)) detailRowClass = 'bg-red-100';
                    }
                    detailsTableHtml += `<tr class="border-t ${detailRowClass}"><td class="py-2 px-4">${formatDate(record.Date)}</td><td class="py-2 px-4">${formatTime(record.Date)}</td><td class="py-2 px-4">${type}</td><td class="py-2 px-4">${durationDisplay}</td></tr>`;
                });
                detailsTd.innerHTML = detailsTableHtml + '</tbody></table></div>';
                detailsTr.appendChild(detailsTd);
                attendanceReportTableBody.appendChild(detailsTr);
            }
        });
    } catch (error) {
        console.error('Error generating attendance report:', error);
        showErrorAlert(`Failed to generate attendance report: ${error.message}`);
        attendanceReportMessageP.classList.remove('hidden');
    } finally {
        generateAttendanceReportBtn.disabled = false;
        generateAttendanceReportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        generateAttendanceReportBtn.textContent = "Generate Attendance Report";
    }
}

async function initializePageSpecificApp() {
    alertDiv.classList.add("hidden");
    errorAlertDiv.classList.add("hidden");
    [signOutClassDropdown, attendanceClassDropdown].forEach(dd => {
        populateDropdown(dd.id, [], LOADING_OPTION, "");
        dd.setAttribute("disabled", "disabled");
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
            populateCourseDropdownFromData();
            populateDropdown('signOutClassDropdown', appState.data.courses, "All Classes", "All Classes");
            signOutClassDropdown.removeAttribute("disabled");
            populateDropdown('attendanceClassDropdown', appState.data.courses, DEFAULT_CLASS_OPTION, "");
            attendanceClassDropdown.removeAttribute("disabled");
        } catch (error) {
            console.error("Failed to initialize dashboard with data:", error);
            [signOutClassDropdown, attendanceClassDropdown].forEach(dd => populateDropdown(dd.id, [], "Error loading classes", ""));
        }
    } else {
        console.warn("User not authenticated for dashboard. Cannot fetch data.");
        [signOutClassDropdown, attendanceClassDropdown].forEach(dd => populateDropdown(dd.id, [], "Sign in to load classes", ""));
    }
    switchTab('signOut');
}

function resetPageSpecificAppState() {
    appState.data = { allNamesFromSheet: [], courses: [], namesForSelectedCourse: [], currentReportData: [] }; 
    [signOutClassDropdown, attendanceClassDropdown].forEach(dd => {
        populateDropdown(dd.id, [], DEFAULT_CLASS_OPTION, "");
        dd.setAttribute("disabled", "disabled");
    });
    dateFilterType.value = 'today';
    toggleDateInputs();
    reportDateInput.value = '';
    startDateInput.value = '';
    endDateInput.value = '';
    filterLongDurationsCheckbox.checked = false; 
    reportTableBody.innerHTML = '';
    reportTable.classList.add('hidden');
    reportMessageP.textContent = "Select filters and click 'Generate Report'.";
    attendanceDateInput.value = '';
    attendanceReportTableBody.innerHTML = '';
    attendanceReportTable.classList.add('hidden');
    attendanceReportMessageP.textContent = "Select a class and date to generate the attendance report.";
    switchTab('signOut');
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', initGoogleSignIn);
dateFilterType.addEventListener('change', toggleDateInputs);
generateReportBtn.addEventListener('click', generateReport);
filterLongDurationsCheckbox.addEventListener('change', applyDurationFilter);
signOutReportTab.addEventListener('click', () => switchTab('signOut'));
attendanceReportTab.addEventListener('click', () => switchTab('attendance'));
generateAttendanceReportBtn.addEventListener('click', generateAttendanceReport);

attendanceReportTableBody.addEventListener('click', (event) => {
    const headerRow = event.target.closest('tr[data-accordion-toggle="true"]');
    if (headerRow) {
        const detailsRow = headerRow.nextElementSibling;
        if (detailsRow) {
            detailsRow.classList.toggle('hidden');
            const arrow = headerRow.querySelector('svg');
            if (arrow) arrow.classList.toggle('rotate-180');
        }
    }
});

function clearReportOnChange(reportTableEl, messageEl, messageText) {
    reportTableEl.classList.add('hidden');
    messageEl.textContent = messageText;
    messageEl.classList.remove('hidden');
}

signOutClassDropdown.addEventListener('change', () => clearReportOnChange(reportTable, reportMessageP, "Filters changed. Click 'Generate Report' to see new data."));
attendanceClassDropdown.addEventListener('change', () => clearReportOnChange(attendanceReportTable, attendanceReportMessageP, "Class changed. Click 'Generate Attendance Report' to see new data."));