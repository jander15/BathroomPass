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
const generateAttendanceReportBtn = document.getElementById('generateAttendanceReportBtn');
const attendanceReportMessageP = document.getElementById('attendanceReportMessage');
const attendanceReportTable = document.getElementById('attendanceReportTable');
const attendanceReportTableBody = document.getElementById('attendanceReportTableBody');
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

function applyProblemFilter() {
    if (!reportTableBody) return;
    const showProblemsOnly = filterProblemsCheckbox.checked;

    Array.from(reportTableBody.rows).forEach(row => {
        if (!showProblemsOnly) {
            row.classList.remove('hidden');
            return;
        }
        const typeCell = row.cells[4];
        const isLate = typeCell.textContent === "Late Sign In";
        const isLong = row.classList.contains('bg-red-200');
        row.classList.toggle('hidden', !(isLate || isLong));
    });
}

async function generateReport() {
    reportMessageP.textContent = "Generating report...";
    reportTable.classList.add('hidden');
    reportTableBody.innerHTML = '';
    reportMessageP.classList.add('hidden');

    const selectedClass = signOutClassDropdown.value;
    const filterType = dateFilterType.value;
    let startDate = null, endDate = null;

    if (!selectedClass) {
        reportMessageP.textContent = "Please select a class.";
        reportMessageP.classList.remove('hidden');
        return;
    }

    if (filterType === 'today') { startDate = endDate = getTodayDateString(); }
    else if (filterType === 'this_week') { const r = getWeekRange(); startDate = r.start; endDate = r.end; }
    else if (filterType === 'this_month') { const r = getMonthRange(); startDate = r.start; endDate = r.end; }
    else if (filterType === 'all_time') { startDate = null; endDate = null; }
    else if (filterType === 'specificDate') {
        startDate = endDate = reportDateInput.value;
        if (!startDate) { reportMessageP.textContent = "Please select a specific date."; reportMessageP.classList.remove('hidden'); return; }
    } else if (filterType === 'dateRange') {
        startDate = startDateInput.value;
        endDate = endDateInput.value;
        if (!startDate || !endDate) { reportMessageP.textContent = "Please select both start and end dates."; reportMessageP.classList.remove('hidden'); return; }
        if (new Date(startDate) > new Date(endDate)) { reportMessageP.textContent = "Start date cannot be after end date."; reportMessageP.classList.remove('hidden'); return; }
    }

    generateReportBtn.disabled = true;
    generateReportBtn.classList.add('opacity-50', 'cursor-not-allowed');
    generateReportBtn.textContent = "Loading...";

    try {
        const classesToFetch = selectedClass === "All Classes" ? appState.data.courses : [selectedClass];
        const promises = classesToFetch.map(className => {
            const payload = { action: 'getReportData', userEmail: appState.currentUser.email, class: className, idToken: appState.currentUser.idToken };
            if (startDate && endDate) {
                payload.startDate = startDate;
                payload.endDate = endDate;
            }
            return sendAuthenticatedRequest(payload);
        });

        const results = await Promise.allSettled(promises);
        let allReports = [];
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value.result === 'success' && Array.isArray(result.value.report)) {
                allReports.push(...result.value.report);
            } else {
                console.error("Report fetch failed for one class:", result);
            }
        });
        
        const selectedStudent = studentFilterDropdown.value;
        if (!studentFilterDiv.classList.contains('hidden') && selectedStudent !== "All Students") {
             allReports = allReports.filter(record => normalizeName(record.Name) === selectedStudent);
        }

        if (allReports.length === 0) {
            reportMessageP.textContent = `No sign-out data found for the selected criteria.`;
            reportMessageP.classList.remove('hidden');
            reportTable.classList.add('hidden');
        } else {
            reportTable.classList.remove('hidden');
            reportTableBody.innerHTML = '';
            allReports.sort((a, b) => new Date(b.Date) - new Date(a.Date));
            allReports.forEach(row => {
                const tr = document.createElement('tr');
                let typeDisplay = "Bathroom", durationDisplay = "N/A";
                if (row.Type === 'late' || row.Seconds === 'Late Sign In') {
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
            applyProblemFilter();
        }
    } catch (error) {
        console.error('Error fetching report data:', error);
        reportMessageP.textContent = "Failed to generate report. Check console for details.";
        reportMessageP.classList.remove('hidden');
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
    attendanceReportMessageP.classList.add('hidden');
    const selectedClass = attendanceClassDropdown.value;
    const selectedDate = attendanceDateInput.value;
    if (selectedClass === "" || selectedClass === DEFAULT_CLASS_OPTION || !selectedDate) {
        attendanceReportMessageP.textContent = "Please select a class and a date.";
        attendanceReportMessageP.classList.remove('hidden');
        return;
    }
    generateAttendanceReportBtn.disabled = true;
    generateAttendanceReportBtn.classList.add('opacity-50');
    try {
        const payload = { action: 'getReportData', class: selectedClass, startDate: selectedDate, endDate: selectedDate, userEmail: appState.currentUser.email, idToken: appState.currentUser.idToken };
        const reportData = await sendAuthenticatedRequest(payload);
        if (reportData.result !== 'success' || !Array.isArray(reportData.report)) {
            throw new Error(reportData.error || 'Failed to fetch report data.');
        }
        const allStudentsInClass = appState.data.allNamesFromSheet.filter(s => s.Class === selectedClass).map(s => normalizeName(s.Name)).sort();
        if (allStudentsInClass.length === 0) {
            attendanceReportMessageP.textContent = `No students found for class ${selectedClass}.`;
            attendanceReportMessageP.classList.remove('hidden');
            return;
        }
        attendanceReportTable.classList.remove('hidden');
        attendanceReportTableBody.innerHTML = '';
        let presentStudentIndex = 0;
        [...new Set(allStudentsInClass)].forEach(studentName => {
            const studentRecords = reportData.report.filter(r => normalizeName(r.Name) === studentName);
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
            tr.innerHTML = `<td class="py-3 px-4">${studentName}${arrowSvg}</td><td class="py-3 px-4">${status}</td><td class="py-3 px-4">${reason}</td>`;
            attendanceReportTableBody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error generating attendance report:', error);
        attendanceReportMessageP.textContent = "Failed to generate attendance report. Check console for details.";
        attendanceReportMessageP.classList.remove('hidden');
    } finally {
        generateAttendanceReportBtn.disabled = false;
        generateAttendanceReportBtn.classList.remove('opacity-50');
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
    appState.data = { allNamesFromSheet: [], courses: [] }; 
    [signOutClassDropdown, attendanceClassDropdown, studentFilterDropdown].forEach(dd => {
        if(dd) { populateDropdown(dd.id, [], DEFAULT_CLASS_OPTION, ""); dd.setAttribute("disabled", "disabled"); }
    });
    studentFilterDiv.classList.add('hidden');
    dateFilterType.value = 'today';
    toggleDateInputs();
    reportTable.classList.add('hidden');
    reportMessageP.textContent = "Select filters and click 'Generate Report'.";
    attendanceReportTable.classList.add('hidden');
    attendanceReportMessageP.textContent = "Select a class and date to generate the attendance report.";
    switchTab('signOut');
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', initGoogleSignIn);
generateReportBtn.addEventListener('click', generateReport);
filterProblemsCheckbox.addEventListener('change', applyProblemFilter);
signOutReportTab.addEventListener('click', () => switchTab('signOut'));
attendanceReportTab.addEventListener('click', () => { switchTab('attendance'); renderAttendanceReport(); });
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
            .map(student => normalizeName(student.Name))
            .sort();
        const uniqueStudents = [...new Set(studentsInClass)];
        populateDropdown('studentFilterDropdown', uniqueStudents, "All Students", "All Students");
        studentFilterDropdown.removeAttribute('disabled');
        studentFilterDiv.classList.remove('hidden');
    } else {
        studentFilterDiv.classList.add('hidden');
    }
    clearReportOnChange(reportTable, reportMessageP, "Filters changed. Click 'Generate Report' to see new data.");
});

function clearReportOnChange(reportTableEl, messageEl, messageText) {
    reportTableEl.classList.add('hidden');
    messageEl.textContent = messageText;
    messageEl.classList.remove('hidden');
}

[dateFilterType, studentFilterDropdown, attendanceClassDropdown, attendanceDateInput].forEach(el => {
    if(el) el.addEventListener('change', () => {
        if (el === attendanceClassDropdown || el === attendanceDateInput) {
             clearReportOnChange(attendanceReportTable, attendanceReportMessageP, "Filters changed. Click 'Generate Attendance Report' to see new data.");
        } else {
            clearReportOnChange(reportTable, reportMessageP, "Filters changed. Click 'Generate Report' to see new data.");
        }
    });
});
