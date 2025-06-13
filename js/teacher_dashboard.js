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
const classTrendsTab = document.getElementById('classTrendsTab');
const signOutReportContent = document.getElementById('signOutReportContent');
const attendanceReportContent = document.getElementById('attendanceReportContent');
const classTrendsContent = document.getElementById('classTrendsContent');
const attendanceDateInput = document.getElementById('attendanceDate');
const attendanceReportMessageP = document.getElementById('attendanceReportMessage');
const attendanceReportTable = document.getElementById('attendanceReportTable');
const attendanceReportTableBody = document.getElementById('attendanceReportTableBody');
const trendsClassDropdown = document.getElementById('trendsClassDropdown');
const trendsDateFilterType = document.getElementById('trendsDateFilterType');
const trendsDateRangeInputs = document.getElementById('trendsDateRangeInputs');
const trendsStartDate = document.getElementById('trendsStartDate');
const trendsEndDate = document.getElementById('trendsEndDate');
const trendsReportMessage = document.getElementById('trendsReportMessage');
const trendsReportTable = document.getElementById('trendsReportTable');
const trendsReportTableBody = document.getElementById('trendsReportTableBody');
const editModal = document.getElementById('editModal');
const editStudentName = document.getElementById('editStudentName');
const editDurationDiv = document.getElementById('editDurationDiv');
const editMinutes = document.getElementById('editMinutes');
const editSeconds = document.getElementById('editSeconds');
const editTimeDiv = document.getElementById('editTimeDiv');
const editTimeInput = document.getElementById('editTimeInput');
const saveEditBtn = document.getElementById('saveEditBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const deleteEntryBtn = document.getElementById('deleteEntryBtn');
const dashboardContent = document.getElementById('dashboardContent');


// --- Helper & Formatting Functions ---
const DURATION_THRESHOLDS = {
    moderate: 300,   // 5 minutes
    high: 450,       // 7.5 minutes
    veryHigh: 600    // 10 minutes
};

const COLORS = {
    normal: 'bg-blue-200',
    late:   { moderate: 'bg-yellow-100', high: 'bg-yellow-200', veryHigh: 'bg-yellow-300' },
    long:   { moderate: 'bg-red-200', high: 'bg-red-300', veryHigh: 'bg-red-500' }
};

function formatSecondsToMMSS(totalSeconds) {
    if (isNaN(totalSeconds) || totalSeconds < 0) return "N/A";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatSecondsToHHMM(totalSeconds) {
    if (isNaN(totalSeconds) || totalSeconds <= 0) return "0m";
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    let result = '';
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0 || hours === 0) result += `${minutes}m`;
    return result.trim();
}

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
    specificDateInputDiv.classList.toggle('hidden', dateFilterType.value !== 'specificDate');
    dateRangeInputsDiv.classList.toggle('hidden', dateFilterType.value !== 'dateRange');
}

function toggleTrendsDateInputs() {
    trendsDateRangeInputs.classList.toggle('hidden', trendsDateFilterType.value !== 'dateRange');
}

function getTodayDateString() { return new Date().toISOString().split('T')[0]; }
function formatDate(d) { return d ? new Date(d).toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' }) : ''; }
function formatTime(d) { return d ? new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''; }


// --- Sorting Logic ---
function updateSortIndicators() {
    // Logic for Sign Out Report
    const signOutState = appState.sortState.signOut;
    document.querySelectorAll('#reportTable th[data-column]').forEach(th => {
        const indicator = th.querySelector('.sort-indicator');
        if (indicator) {
            indicator.textContent = '▲'; 
            indicator.style.color = '#6b7280'; // Inactive color: medium-dark gray
            if (signOutState.column === th.dataset.column) {
                indicator.textContent = signOutState.direction === 'asc' ? '▲' : '▼';
                indicator.style.color = '#1f2937'; // Active color: black
            }
        }
    });

    // Logic for Class Trends Report
    const trendsState = appState.sortState.classTrends;
    document.querySelectorAll('#trendsReportTable [data-column]').forEach(el => {
        const indicator = el.querySelector('.sort-indicator');
        if (indicator) {
            indicator.textContent = '▲';
            indicator.style.color = '#d1d5db'; // Inactive color: light gray
            if (trendsState.column === el.dataset.column) {
                indicator.textContent = trendsState.direction === 'asc' ? ' ▲' : ' ▼';
                indicator.style.color = '#111827';
            }
        }
    });
}

function sortSignOutData(data) {
    const { column, direction } = appState.sortState.signOut;
    const multiplier = direction === 'asc' ? 1 : -1;

    data.sort((a, b) => {
        let valA, valB;
        switch (column) {
            case 'Date':
                valA = new Date(a.Date);
                valB = new Date(b.Date);
                break;
            case 'Duration':
                valA = a.Seconds || 0;
                valB = b.Seconds || 0;
                break;
            default:
                return 0;
        }
        if (valA < valB) return -1 * multiplier;
        if (valA > valB) return 1 * multiplier;
        return 0;
    });
    return data;
}

function sortClassTrendsData(data, studentTotals) {
    const { column, direction } = appState.sortState.classTrends;
    const multiplier = direction === 'asc' ? 1 : -1;

    data.sort((a, b) => {
        let valA, valB;
        switch (column) {
            case 'Entries':
                valA = a.records.length;
                valB = b.records.length;
                break;
            case 'TimeOut':
                valA = studentTotals[a.name] || 0;
                valB = studentTotals[b.name] || 0;
                break;
            default:
                valA = a.name;
                valB = b.name;
                return valA.localeCompare(valB) * multiplier;
        }
        if (valA < valB) return -1 * multiplier;
        if (valA > valB) return 1 * multiplier;
        return 0;
    });
    return data;
}


// --- Report Generation & UI Functions ---

function renderSignOutReport() {
    if (!appState.data.allSignOuts) {
        reportMessageP.textContent = "Data is loading or failed to load.";
        reportMessageP.classList.remove('hidden');
        return;
    }
    reportMessageP.classList.add('hidden');

    let filteredData = appState.data.allSignOuts.filter(record => !record.Deleted);

    const selectedClass = signOutClassDropdown.value;
    if (selectedClass !== "All Classes") {
        filteredData = filteredData.filter(r => r.Class === selectedClass);
    }
    const selectedStudent = studentFilterDropdown.value;
    if (!studentFilterDiv.classList.contains('hidden') && selectedStudent !== "All Students") {
        filteredData = filteredData.filter(r => normalizeName(r.Name) === selectedStudent);
    }
    const filterType = dateFilterType.value;
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
            filteredData = filteredData.filter(r => new Date(r.Date) >= start && new Date(r.Date) <= end);
        }
    }
    const showProblemsOnly = filterProblemsCheckbox.checked;
    if (showProblemsOnly) {
        const threshold = TARDY_THRESHOLD_MINUTES * 60;
        filteredData = filteredData.filter(r => r.Type === "late" || (r.Type === 'bathroom' && typeof r.Seconds === 'number' && r.Seconds > threshold));
    }

    filteredData = sortSignOutData(filteredData);

    reportTableBody.innerHTML = '';
    if (filteredData.length === 0) {
        reportMessageP.textContent = `No sign-out data found for the selected criteria.`;
        reportMessageP.classList.remove('hidden');
        reportTable.classList.add('hidden');
    } else {
        reportTable.classList.remove('hidden');
        filteredData.forEach(row => {
            const tr = document.createElement('tr');
            let typeDisplay = "Bathroom", durationDisplay = "N/A";

            if (typeof row.Seconds === 'number') {
                durationDisplay = formatSecondsToMMSS(row.Seconds);
            }

            if (row.Type === 'late') {
                typeDisplay = "Late Sign In";
                if (typeof row.Seconds === 'number') {
                    if (row.Seconds >= DURATION_THRESHOLDS.veryHigh) tr.classList.add(COLORS.late.veryHigh);
                    else if (row.Seconds >= DURATION_THRESHOLDS.high) tr.classList.add(COLORS.late.high);
                    else tr.classList.add(COLORS.late.moderate);
                } else {
                     tr.classList.add(COLORS.late.moderate);
                }
            } else if (typeof row.Seconds === 'number') {
                if (row.Seconds > DURATION_THRESHOLDS.moderate) {
                    typeDisplay = "Long Sign Out";
                    if (row.Seconds >= DURATION_THRESHOLDS.veryHigh) tr.classList.add(COLORS.long.veryHigh);
                    else if (row.Seconds >= DURATION_THRESHOLDS.high) tr.classList.add(COLORS.long.high);
                    else tr.classList.add(COLORS.long.moderate);
                } else {
                    typeDisplay = "Normal Sign Out";
                    tr.classList.add(COLORS.normal);
                }
            }

            const shortClassName = getShortClassName(row.Class);
            const editButton = `<button class="text-gray-500 hover:text-blue-600 edit-btn p-1" data-timestamp="${row.Date}" title="Edit Entry"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>`;
            tr.innerHTML = `<td class="p-2 border-b">${formatDate(row.Date)}</td><td class="p-2 border-b">${formatTime(row.Date)}</td><td class="p-2 border-b">${shortClassName}</td><td class="p-2 border-b">${normalizeName(row.Name)}</td><td class="p-2 border-b">${typeDisplay}</td><td class="p-2 border-b">${durationDisplay}</td><td class="p-2 border-b text-right">${editButton}</td>`;
            reportTableBody.appendChild(tr);
        });
    }
    updateSortIndicators();
}

function switchTab(tab) {
    appState.ui.currentDashboardTab = tab;
    const isSignOut = tab === 'signOut';
    const isAttendance = tab === 'attendance';
    const isTrends = tab === 'classTrends';

    signOutReportContent.classList.toggle('hidden', !isSignOut);
    attendanceReportContent.classList.toggle('hidden', !isAttendance);
    classTrendsContent.classList.toggle('hidden', !isTrends);

    [signOutReportTab, attendanceReportTab, classTrendsTab].forEach(t => {
        t.classList.remove('border-indigo-500', 'text-indigo-600');
        t.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700');
    });

    if (isSignOut) signOutReportTab.classList.add('border-indigo-500', 'text-indigo-600');
    else if (isAttendance) attendanceReportTab.classList.add('border-indigo-500', 'text-indigo-600');
    else if (isTrends) classTrendsTab.classList.add('border-indigo-500', 'text-indigo-600');
}

function renderAttendanceReport() {
    if (!appState.data.allSignOuts) {
        attendanceReportMessageP.textContent = "Initial data is still loading...";
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
            tr.dataset.records = JSON.stringify(studentRecords);
            if (hasLong) tr.classList.add('bg-red-200', 'hover:bg-red-300');
            else if (hasLate) tr.classList.add('bg-yellow-200', 'hover:bg-yellow-300');
            else tr.classList.add('bg-blue-100', 'hover:bg-blue-200');
        }
        const arrowSvg = studentRecords.length > 0 ? `<svg class="w-4 h-4 inline-block ml-2 transform transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>` : '';
        tr.innerHTML = `<td class="py-3 px-4">${normalizeName(studentFullName)}${arrowSvg}</td><td class="py-3 px-4">${status}</td><td class="py-3 px-4">${reason}</td>`;
        attendanceReportTableBody.appendChild(tr);
    });
}

function renderClassTrendsReport() {
    const getSeverity = (record) => {
        if (record.Type === 'late') {
            if (typeof record.Seconds !== 'number') return 5; 
            if (record.Seconds >= DURATION_THRESHOLDS.veryHigh) return 7;
            if (record.Seconds >= DURATION_THRESHOLDS.high) return 6;
            return 5;
        }
        if (typeof record.Seconds !== 'number') return 0;
        if (record.Seconds >= DURATION_THRESHOLDS.veryHigh) return 4;
        if (record.Seconds >= DURATION_THRESHOLDS.high) return 3;
        if (record.Seconds >= DURATION_THRESHOLDS.moderate) return 2;
        return 1;
    };

    if (!appState.data.allSignOuts) { trendsReportMessage.textContent = "Data is loading..."; return; }
    const selectedClass = trendsClassDropdown.value;
    if (!selectedClass || selectedClass === DEFAULT_CLASS_OPTION) { trendsReportMessage.textContent = "Please select a class."; trendsReportTable.classList.add('hidden'); return; }

    trendsReportMessage.classList.add('hidden');
    trendsReportTable.classList.remove('hidden');
    trendsReportTableBody.innerHTML = '';

    const filterType = trendsDateFilterType.value;
    let startDate, endDate;
    if (filterType !== 'all_time') {
        if (filterType === 'this_week') { const r = getWeekRange(); startDate = new Date(r.start); endDate = new Date(r.end); }
        else if (filterType === 'this_month') { const r = getMonthRange(); startDate = new Date(r.start); endDate = new Date(r.end); }
        else if (filterType === 'dateRange' && trendsStartDate.value && trendsEndDate.value) {
            startDate = new Date(trendsStartDate.value);
            endDate = new Date(trendsEndDate.value);
        }
    }
    
    let classPeriodData = appState.data.allSignOuts.filter(r => !r.Deleted && r.Class === selectedClass);
    if (startDate && endDate) {
        endDate.setHours(23, 59, 59);
        classPeriodData = classPeriodData.filter(r => new Date(r.Date) >= startDate && new Date(r.Date) <= endDate);
    }

    const allStudentsInClass = appState.data.allNamesFromSheet
        .filter(s => s.Class === selectedClass)
        .map(s => normalizeName(s.Name));
    
    const studentTotals = {};
    const studentDataForSorting = [];

    allStudentsInClass.forEach(name => {
        const records = classPeriodData.filter(r => normalizeName(r.Name) === name);
        if (records.length > 0) {
            const totalSeconds = records.filter(r => typeof r.Seconds === 'number').reduce((acc, r) => acc + r.Seconds, 0);
            studentTotals[name] = totalSeconds;
            studentDataForSorting.push({ name: name, records: records });
        }
    });

    const maxTotalSeconds = Math.max(...Object.values(studentTotals), 300);

    const sortedStudentData = sortClassTrendsData(studentDataForSorting, studentTotals);

    sortedStudentData.forEach(({ name: normalizedStudentName, records: studentRecords }) => {
        studentRecords.sort((a, b) => {
            const severityA = getSeverity(a);
            const severityB = getSeverity(b);
            if (severityA !== severityB) {
                return severityB - severityA;
            }
            return (b.Seconds || 0) - (a.Seconds || 0);
        });

        const totalSecondsOut = studentTotals[normalizedStudentName] || 0;
        
        let barSegmentsHtml = '';
        const recordsWithDuration = studentRecords.filter(r => typeof r.Seconds === 'number' && r.Seconds > 0);

        recordsWithDuration.forEach(record => {
            let colorClass = COLORS.normal;
            let typeText = "Sign Out";
            const durationInSeconds = record.Seconds;
            if (record.Type === 'late') {
                typeText = "Late";
                if (durationInSeconds >= DURATION_THRESHOLDS.veryHigh) colorClass = COLORS.late.veryHigh;
                else if (durationInSeconds >= DURATION_THRESHOLDS.high) colorClass = COLORS.late.high;
                else colorClass = COLORS.late.moderate;
            } else if (durationInSeconds > DURATION_THRESHOLDS.moderate) {
                typeText = "Long Sign Out";
                if (durationInSeconds >= DURATION_THRESHOLDS.veryHigh) colorClass = COLORS.long.veryHigh;
                else if (durationInSeconds >= DURATION_THRESHOLDS.high) colorClass = COLORS.long.high;
                else colorClass = COLORS.long.moderate;
            }
            const segmentWidthPercent = (totalSecondsOut > 0) ? (durationInSeconds / totalSecondsOut) * 100 : 0;
            const tooltipText = `${typeText}: ${formatSecondsToMMSS(durationInSeconds)} on ${formatDate(record.Date)}`;
            barSegmentsHtml += `<div class="h-full bar-segment ${colorClass}" style="width: ${segmentWidthPercent}%;" title="${tooltipText}"></div>`;
        });
        
        const tr = document.createElement('tr');
        tr.className = 'border-t hover:bg-gray-100 cursor-pointer';
        tr.dataset.accordionToggle = "true";
        tr.dataset.records = JSON.stringify(studentRecords);

        const totalBarWidthPercent = (totalSecondsOut / maxTotalSeconds) * 100;
        const arrowSvg = `<svg class="w-4 h-4 inline-block ml-2 transform transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>`;

        tr.innerHTML = `
            <td class="py-2 px-3 border-b font-medium">${normalizedStudentName}${arrowSvg}</td>
            <td class="py-2 px-3 border-b text-center">${studentRecords.length}</td>
            <td class="py-2 px-3 border-b align-middle">
                <div class="flex items-center w-full">
                    <div class="flex-grow h-5 bg-white">
                        <div class="flex h-full border border-black" style="width: ${totalBarWidthPercent}%;">
                           ${barSegmentsHtml}
                        </div>
                    </div>
                    <div class="w-20 text-right pl-2 font-semibold text-gray-700 text-sm">
                        ${formatSecondsToHHMM(totalSecondsOut)}
                    </div>
                </div>
            </td>
        `;
        trendsReportTableBody.appendChild(tr);
    });
    updateSortIndicators();
}


// --- Data & State Management Functions ---
async function handleEditEntry(originalTimestamp, newName, newSeconds, newType, newTimestamp) {
    const payload = { action: 'editEntry', entryTimestamp: originalTimestamp, newName, newSeconds, newType, newTimestamp, userEmail: appState.currentUser.email, idToken: appState.currentUser.idToken };
    try {
        const response = await sendAuthenticatedRequest(payload);
        if (response.result === 'success') {
            const entryIndex = appState.data.allSignOuts.findIndex(entry => entry.Date === originalTimestamp);
            if(entryIndex > -1) {
                appState.data.allSignOuts[entryIndex].Name = newName;
                appState.data.allSignOuts[entryIndex].Seconds = newSeconds;
                appState.data.allSignOuts[entryIndex].Type = newType;
                if (newTimestamp) appState.data.allSignOuts[entryIndex].Date = newTimestamp;
            }
            const activeTab = appState.ui.currentDashboardTab;
            if (activeTab === 'signOut') renderSignOutReport();
            else if (activeTab === 'attendance') renderAttendanceReport();
            else if (activeTab === 'classTrends') renderClassTrendsReport();
        } else { throw new Error(response.error || 'Failed to edit entry.'); }
    } catch (error) { console.error('Error editing entry:', error); }
}

async function handleDeleteEntry(timestamp) {
    const payload = { action: 'deleteEntry', entryTimestamp: timestamp, userEmail: appState.currentUser.email, idToken: appState.currentUser.idToken };
    try {
        const response = await sendAuthenticatedRequest(payload);
        if (response.result === 'success') {
            const entryIndex = appState.data.allSignOuts.findIndex(entry => entry.Date === timestamp);
            if (entryIndex > -1) appState.data.allSignOuts[entryIndex].Deleted = true;
            
            const activeTab = appState.ui.currentDashboardTab;
            if (activeTab === 'signOut') renderSignOutReport();
            else if (activeTab === 'attendance') renderAttendanceReport();
            else if (activeTab === 'classTrends') renderClassTrendsReport();
        } else { throw new Error(response.error || 'Failed to delete entry.'); }
    } catch (error) { console.error('Error deleting entry:', error); }
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
    [signOutClassDropdown, attendanceClassDropdown, trendsClassDropdown, studentFilterDropdown].forEach(dd => {
        if(dd) { populateDropdown(dd.id, [], LOADING_OPTION, ""); dd.setAttribute("disabled", "disabled"); }
    });
    dateFilterType.value = 'today';
    toggleDateInputs();
    reportDateInput.value = getTodayDateString(); 
    startDateInput.value = getTodayDateString();
    endDateInput.value = getTodayDateString();
    attendanceDateInput.value = getTodayDateString();
    trendsDateFilterType.value = 'this_week';
    toggleTrendsDateInputs();

    // Add All Event Listeners Here
    reloadDataBtn.addEventListener('click', async () => {
        await fetchAllSignOutData();
        const activeTab = appState.ui.currentDashboardTab;
        if (activeTab === 'signOut') renderSignOutReport();
        else if (activeTab === 'attendance') renderAttendanceReport();
        else if (activeTab === 'classTrends') renderClassTrendsReport();
    });

    [signOutClassDropdown, studentFilterDropdown, dateFilterType, reportDateInput, startDateInput, endDateInput, filterProblemsCheckbox].forEach(el => {
        if(el) el.addEventListener('change', renderSignOutReport);
    });
    dateFilterType.addEventListener('change', toggleDateInputs);

    reportTable.querySelector('thead').addEventListener('click', (event) => {
        const header = event.target.closest('th[data-column]');
        if (!header) return;
        const newColumn = header.dataset.column;
        const currentSort = appState.sortState.signOut;
        if (currentSort.column === newColumn) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.column = newColumn;
            currentSort.direction = 'desc';
        }
        renderSignOutReport();
    });

    trendsReportTable.querySelector('thead').addEventListener('click', (event) => {
        const header = event.target.closest('[data-column]');
        if (!header) return;
        const newColumn = header.dataset.column;
        const currentSort = appState.sortState.classTrends;
        if (currentSort.column === newColumn) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.column = newColumn;
            currentSort.direction = 'desc';
        }
        renderClassTrendsReport();
    });

    attendanceClassDropdown.addEventListener('change', renderAttendanceReport);
    attendanceDateInput.addEventListener('change', renderAttendanceReport);

    trendsClassDropdown.addEventListener('change', renderClassTrendsReport);
    trendsDateFilterType.addEventListener('change', () => {
        toggleTrendsDateInputs();
        renderClassTrendsReport();
    });
    [trendsStartDate, trendsEndDate].forEach(el => el.addEventListener('change', renderClassTrendsReport));

    signOutReportTab.addEventListener('click', () => { switchTab('signOut'); renderSignOutReport(); });
    attendanceReportTab.addEventListener('click', () => { switchTab('attendance'); renderAttendanceReport(); });
    classTrendsTab.addEventListener('click', () => { switchTab('classTrends'); renderClassTrendsReport(); });

    dashboardContent.addEventListener('click', (event) => {
        const editButton = event.target.closest('.edit-btn');
        if (editButton) {
            event.stopPropagation();
            const timestamp = editButton.dataset.timestamp;
            const record = appState.data.allSignOuts.find(r => r.Date === timestamp);
            if (record) {
                const studentsInClass = appState.data.allNamesFromSheet.filter(s => s.Class === record.Class).map(s => s.Name).sort();
                const uniqueStudents = [...new Set(studentsInClass)];
                editStudentName.innerHTML = '';
                uniqueStudents.forEach(name => {
                    const option = document.createElement('option');
                    option.value = normalizeName(name);
                    option.textContent = normalizeName(name);
                    editStudentName.appendChild(option);
                });
                editStudentName.value = record.Name;
                const isLateSignIn = record.Type === 'late';
                editDurationDiv.classList.toggle('hidden', isLateSignIn);
                editTimeDiv.classList.toggle('hidden', !isLateSignIn);
                if (isLateSignIn) {
                    const d = new Date(record.Date);
                    editTimeInput.value = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                } else if (typeof record.Seconds === 'number') {
                    editMinutes.value = Math.floor(record.Seconds / 60);
                    editSeconds.value = record.Seconds % 60;
                } else {
                    editMinutes.value = ''; editSeconds.value = '';
                }
                editModal.classList.remove('hidden');
                saveEditBtn.dataset.timestamp = timestamp;
                deleteEntryBtn.dataset.timestamp = timestamp;
            }
        } else if (event.target.closest('[data-accordion-toggle="true"]')) {
            const accordionRow = event.target.closest('[data-accordion-toggle="true"]');
            event.stopPropagation();
            const nextElement = accordionRow.nextElementSibling;
            
            accordionRow.classList.toggle('bg-blue-50');
            const arrow = accordionRow.querySelector('svg');
            if (arrow) arrow.classList.toggle('rotate-180');
    
            if (nextElement && nextElement.classList.contains('details-wrapper-row')) {
                nextElement.classList.toggle('hidden');
                return;
            }
    
            const records = JSON.parse(accordionRow.dataset.records || '[]');
            if (records.length === 0) return;
    
            const wrapperRow = document.createElement('tr');
            wrapperRow.className = 'details-wrapper-row';
            const wrapperCell = document.createElement('td');
            wrapperCell.colSpan = accordionRow.cells.length;
            wrapperCell.className = 'p-2';
            const detailsTable = document.createElement('table');
            detailsTable.className = 'min-w-full';
            const detailsHead = document.createElement('thead');
            detailsHead.innerHTML = `
                <tr class="bg-gray-200 text-sm">
                    <th class="py-1 px-2 border-b text-left">Date</th><th class="py-1 px-2 border-b text-left">Time</th>
                    <th class="py-1 px-2 border-b text-left">Class</th><th class="py-1 px-2 border-b text-left">Name</th>
                    <th class="py-1 px-2 border-b text-left">Type</th><th class="py-1 px-2 border-b text-left">Duration</th>
                    <th class="py-1 px-2 border-b text-right w-12">Edit</th>
                </tr>`;
            detailsTable.appendChild(detailsHead);
            const detailsBody = document.createElement('tbody');
            records.forEach(row => {
                const detailTr = document.createElement('tr');
                let typeDisplay = "Bathroom", durationDisplay = "N/A";
                
                if (typeof row.Seconds === 'number') {
                    durationDisplay = formatSecondsToMMSS(row.Seconds);
                }
    
                if (row.Type === 'late') {
                    typeDisplay = "Late Sign In";
                    if (typeof row.Seconds === 'number') {
                        if (row.Seconds >= DURATION_THRESHOLDS.veryHigh) detailTr.classList.add(COLORS.late.veryHigh);
                        else if (row.Seconds >= DURATION_THRESHOLDS.high) detailTr.classList.add(COLORS.late.high);
                        else detailTr.classList.add(COLORS.late.moderate);
                    } else {
                         detailTr.classList.add(COLORS.late.moderate);
                    }
                } else if (typeof row.Seconds === 'number') {
                    if (row.Seconds > DURATION_THRESHOLDS.moderate) {
                        typeDisplay = "Long Sign Out";
                        if (row.Seconds >= DURATION_THRESHOLDS.veryHigh) detailTr.classList.add(COLORS.long.veryHigh);
                        else if (row.Seconds >= DURATION_THRESHOLDS.high) detailTr.classList.add(COLORS.long.high);
                        else detailTr.classList.add(COLORS.long.moderate);
                    } else {
                        typeDisplay = "Normal Sign Out";
                        detailTr.classList.add(COLORS.normal);
                    }
                }
    
                const editButtonHtml = `<button class="text-gray-500 hover:text-blue-600 edit-btn p-1" data-timestamp="${row.Date}" title="Edit Entry"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>`;
                detailTr.innerHTML = `
                    <td class="py-2 px-2 border-b">${formatDate(row.Date)}</td><td class="py-2 px-2 border-b">${formatTime(row.Date)}</td>
                    <td class="py-2 px-2 border-b">${getShortClassName(row.Class)}</td><td class="py-2 px-2 border-b">${normalizeName(row.Name)}</td>
                    <td class="py-2 px-2 border-b">${typeDisplay}</td><td class="py-2 px-2 border-b">${durationDisplay}</td>
                    <td class="py-2 px-2 border-b text-right">${editButtonHtml}</td>`;
                detailsBody.appendChild(detailTr);
            });
            detailsTable.appendChild(detailsBody);
            wrapperCell.appendChild(detailsTable);
            wrapperRow.appendChild(wrapperCell);
            accordionRow.insertAdjacentElement('afterend', wrapperRow);
        }
    });

    cancelEditBtn.addEventListener('click', () => editModal.classList.add('hidden'));
    deleteEntryBtn.addEventListener('click', () => {
        const timestamp = deleteEntryBtn.dataset.timestamp;
        if (timestamp && confirm("Are you sure you want to delete this entry? This cannot be undone.")) {
            handleDeleteEntry(timestamp);
        }
        editModal.classList.add('hidden');
    });
    saveEditBtn.addEventListener('click', () => {
        const timestamp = saveEditBtn.dataset.timestamp;
        const record = appState.data.allSignOuts.find(r => r.Date === timestamp);
        if (!record) { editModal.classList.add('hidden'); return; }

        const newName = editStudentName.value;
        const newType = record.Type;
        let newSeconds, newTimestamp = null;

        if (newType === 'late') {
            newSeconds = 'Late Sign In';
            const newTime = editTimeInput.value;
            if (newTime) {
                const originalDate = new Date(record.Date);
                const [hours, minutes] = newTime.split(':');
                originalDate.setHours(parseInt(hours, 10));
                originalDate.setMinutes(parseInt(minutes, 10));
                originalDate.setSeconds(0);
                newTimestamp = originalDate.toISOString();
            }
        } else {
            newSeconds = (parseInt(editMinutes.value) || 0) * 60 + (parseInt(editSeconds.value) || 0);
        }
        if (timestamp && newName) handleEditEntry(timestamp, newName, newSeconds, newType, newTimestamp);
        editModal.classList.add('hidden');
    });

    signOutClassDropdown.addEventListener('change', () => {
        const selectedClass = signOutClassDropdown.value;
        if (selectedClass && selectedClass !== "All Classes") {
            const studentsInClass = appState.data.allNamesFromSheet
                .filter(student => student.Class === selectedClass)
                .map(student => student.Name).sort();
            const uniqueStudents = [...new Set(studentsInClass)];
            studentFilterDropdown.innerHTML = '';
            const allStudentsOption = document.createElement('option');
            allStudentsOption.value = "All Students";
            allStudentsOption.textContent = "All Students";
            studentFilterDropdown.appendChild(allStudentsOption);
            uniqueStudents.forEach(studentFullName => {
                const option = document.createElement('option');
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
    
    // --- Initial Data Load ---
    if (appState.currentUser.email && appState.currentUser.idToken) {
        try {
            await fetchAllStudentData(); 
            await populateCourseDropdownFromData();
            populateDropdown('signOutClassDropdown', appState.data.courses, "All Classes", "All Classes");
            signOutClassDropdown.removeAttribute("disabled");
            populateDropdown('attendanceClassDropdown', appState.data.courses, DEFAULT_CLASS_OPTION, "");
            attendanceClassDropdown.removeAttribute("disabled");
            populateDropdown('trendsClassDropdown', appState.data.courses, DEFAULT_CLASS_OPTION, "");
            trendsClassDropdown.removeAttribute("disabled");
            await fetchAllSignOutData();
            // Initial renders after data is loaded
            renderSignOutReport();
            renderAttendanceReport();
            renderClassTrendsReport();
        } catch (error) {
            console.error("Failed to initialize dashboard with data:", error);
            [signOutClassDropdown, attendanceClassDropdown, trendsClassDropdown].forEach(dd => populateDropdown(dd.id, [], "Error loading classes", ""));
        }
    } else {
        console.warn("User not authenticated.");
        [signOutClassDropdown, attendanceClassDropdown, trendsClassDropdown].forEach(dd => populateDropdown(dd.id, [], "Sign in to load classes", ""));
    }
    switchTab('signOut');
}

function resetPageSpecificAppState() {
    appState.data = { allNamesFromSheet: [], courses: [], allSignOuts: [] }; 
    [signOutClassDropdown, attendanceClassDropdown, trendsClassDropdown, studentFilterDropdown].forEach(dd => {
        if(dd) { populateDropdown(dd.id, [], DEFAULT_CLASS_OPTION, ""); dd.setAttribute("disabled", "disabled"); }
    });
    studentFilterDiv.classList.add('hidden');
    dateFilterType.value = 'today';
    toggleDateInputs();
    reportTable.classList.add('hidden');
    reportMessageP.textContent = "Select filters to view data.";
    attendanceReportTable.classList.add('hidden');
    attendanceReportMessageP.textContent = "Select a class and date to generate the attendance report.";
    trendsReportTable.classList.add('hidden');
    trendsReportMessage.textContent = "Select a class to view trends.";
    switchTab('signOut');
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', initGoogleSignIn);