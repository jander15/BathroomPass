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

function getWeekRange() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const firstDay = new Date(now.setDate(now.getDate() - dayOfWeek));
    const lastDay = new Date(now.setDate(now.getDate() + 6));
    return { start: firstDay.toISOString().split('T')[0], end: lastDay.toISOString().split('T')[0] };
}

function getMonthRange() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: firstDay.toISOString().split('T')[0], end: lastDay.toISOString().split('T')[0] };
}

function toggleDateInputs() {
    const selectedFilter = dateFilterType.value;
    specificDateInputDiv.classList.toggle('hidden', selectedFilter !== 'specificDate');
    dateRangeInputsDiv.classList.toggle('hidden', selectedFilter !== 'dateRange');
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

    // 1. Get all filter values
    const selectedClass = signOutClassDropdown.value;
    const selectedStudent = studentFilterDropdown.value;
    const filterType = dateFilterType.value;
    const isStudentFilterActive = !studentFilterDiv.classList.contains('hidden') && selectedStudent !== "All Students";
    const showProblemsOnly = filterProblemsCheckbox.checked;

    // 2. Start with the full local dataset
    let filteredData = [...appState.data.allSignOuts];

    // 3. Apply filters sequentially
    if (selectedClass !== "All Classes") {
        filteredData = filteredData.filter(record => record.Class === selectedClass);
    }
    if (isStudentFilterActive) {
        const normalizedSelectedStudent = normalizeName(selectedStudent);
        filteredData = filteredData.filter(record => normalizeName(record.Name) === normalizedSelectedStudent);
    }
    if (filterType !== 'all_time') {
        let startDate, endDate;
        if (filterType === 'today') { startDate = endDate = getTodayDateString(); }
        else if (filterType === 'this_week') { const r = getWeekRange(); startDate = r.start; endDate = r.end; }
        else if (filterType === 'this_month') { const r = getMonthRange(); startDate = r.start; endDate = r.end; }
        else if (filterType === 'specificDate') { startDate = endDate = reportDateInput.value; }
        else if (filterType === 'dateRange') { startDate = startDateInput.value; endDate = endDateInput.value; }
        
        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filteredData = filteredData.filter(record => {
                const recordDate = new Date(record.Date);
                return recordDate >= start && recordDate <= end;
            });
        }
    }
    if (showProblemsOnly) {
        const threshold = TARDY_THRESHOLD_MINUTES * 60;
        filteredData = filteredData.filter(record => record.Seconds === "Late Sign In" || (typeof record.Seconds === 'number' && record.Seconds > threshold));
    }

    // 4. Render the `filteredData` to the table
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
            let type = "Sign Out", durationDisplay = "N/A";
            if (row.Seconds === "Late Sign In") {
                type = "Late Sign In";
                tr.classList.add('bg-yellow-200');
            } else if (typeof row.Seconds === 'number') {
                const minutes = Math.floor(row.Seconds / 60);
                const seconds = row.Seconds % 60;
                durationDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                if (row.Seconds > TARDY_THRESHOLD_MINUTES * 60) {
                    tr.classList.add('bg-red-200');
                }
            }
            tr.innerHTML = `<td class="py-2 px-4 border-b">${formatDate(row.Date)}</td><td class="py-2 px-4 border-b">${formatTime(row.Date)}</td><td class="py-2 px-4 border-b">${row.Class || 'N/A'}</td><td class="py-2 px-4 border-b">${row.Name || 'N/A'}</td><td class="py-2 px-4 border-b">${type}</td><td class="py-2 px-4 border-b">${durationDisplay}</td>`;
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

async function generateAttendanceReport() {
    attendanceReportMessageP.textContent = "Generating attendance report...";
    attendanceReportTable.classList.add('hidden');
    attendanceReportTableBody.innerHTML = '';
    attendanceReportMessageP.classList.add('hidden');
    const selectedClass = attendanceClassDropdown.value;
    const selectedDate = attendanceDateInput.value;
    if (selectedClass === "" || selectedClass === DEFAULT_CLASS_OPTION || !selectedDate) {
        attendanceReportMessageP.textContent = "Please select a class and a date.";
        attendanceReportMessageP.classList.remove('hidden');
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
            attendanceReportMessageP.classList.remove('hidden');
            return;
        }
        attendanceReportTable.classList.remove('hidden');
        attendanceReportTableBody.innerHTML = '';
        let presentStudentIndex = 0;
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
                if (hasLateSignIn || hasLongSignOut) tr.classList.add('bg-red-200');
                else tr.classList.add('bg-blue-100');
            } else {
                if (presentStudentIndex % 2 !== 0) tr.classList.add('bg-gray-50');
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
        attendanceReportMessageP.textContent = "Failed to generate attendance report. Check console for details.";
        attendanceReportMessageP.classList.remove('hidden');
    } finally {
        generateAttendanceReportBtn.disabled = false;
        generateAttendanceReportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        generateAttendanceReportBtn.textContent = "Generate Attendance Report";
    }
}

async function fetchAllSignOuts() {
    reportMessageP.textContent = "Loading all sign-out data for the year...";
    reportMessageP.classList.remove('hidden');
    reportTable.classList.add('hidden');
    try {
        const classList = appState.data.courses;
        const promises = classList.map(className => {
            const payload = { action: ACTION_GET_REPORT_DATA, userEmail: appState.currentUser.email, class: className };
            return sendAuthenticatedRequest(payload);
        });
        const results = await Promise.allSettled(promises);
        let allReports = [];
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value.result === 'success' && Array.isArray(result.value.report)) {
                allReports.push(...result.value.report);
            }
        });
        appState.data.allSignOuts = allReports;
        renderSignOutReport();
    } catch (error) {
        console.error("Failed to fetch all sign out data:", error);
        reportMessageP.textContent = "Could not load all report data. Please try reloading.";
    }
}

async function initializePageSpecificApp() {
    [signOutClassDropdown, attendanceClassDropdown, studentFilterDropdown].forEach(dd => {
        if(dd) {
            populateDropdown(dd.id, [], LOADING_OPTION, "");
            dd.setAttribute("disabled", "disabled");
        }
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

            await fetchAllSignOuts(); // Fetch all data on load

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
    appState.data = { allNamesFromSheet: [], courses: [], namesForSelectedCourse: [], currentReportData: [], allSignOuts: [] }; 
    [signOutClassDropdown, attendanceClassDropdown, studentFilterDropdown].forEach(dd => {
        if(dd) {
            populateDropdown(dd.id, [], DEFAULT_CLASS_OPTION, "");
            dd.setAttribute("disabled", "disabled");
        }
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
reloadDataBtn.addEventListener('click', fetchAllSignOuts);
[signOutClassDropdown, studentFilterDropdown, dateFilterType, reportDateInput, startDateInput, endDateInput, filterProblemsCheckbox].forEach(el => {
    if(el) el.addEventListener('change', renderSignOutReport);
});
dateFilterType.addEventListener('change', toggleDateInputs);
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

signOutClassDropdown.addEventListener('change', () => {
    const selectedClass = signOutClassDropdown.value;
    if (selectedClass && selectedClass !== "All Classes") {
        const studentsInClass = appState.data.allNamesFromSheet
            .filter(student => student.Class === selectedClass)
            .map(student => student.Name)
            .sort();
        populateDropdown('studentFilterDropdown', studentsInClass, "All Students", "All Students");
        studentFilterDropdown.removeAttribute('disabled');
        studentFilterDiv.classList.remove('hidden');
    } else {
        studentFilterDiv.classList.add('hidden');
    }
    renderSignOutReport();
});

attendanceClassDropdown.addEventListener('change', () => {
    attendanceReportTable.classList.add('hidden');
    attendanceReportMessageP.textContent = "Class changed. Click 'Generate Attendance Report' to see new data.";
    attendanceReportMessageP.classList.remove('hidden');
});