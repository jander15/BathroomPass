// js/teacher_dashboard.js

// --- DOM Element Caching ---
const classOverrideDropdown = document.getElementById('classOverrideDropdown');
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
const passStatusToggle = document.getElementById('passStatusToggle');
const passStatusLabel = document.getElementById('passStatusLabel');
const queueSortToggle = document.getElementById('queueSortToggle'); // NEW
const queueSortLabel = document.getElementById('queueSortLabel'); // NEW



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
            indicator.style.color = '#6b7280';
            if (signOutState.column === th.dataset.column) {
                indicator.textContent = signOutState.direction === 'asc' ? '▲' : '▼';
                indicator.style.color = '#1f2937';
            }
        }
    });

    // Logic for Class Trends Report
    const trendsState = appState.sortState.classTrends;
    document.querySelectorAll('#trendsReportTable [data-column]').forEach(el => {
        const indicator = el.querySelector('.sort-indicator');
        if (indicator) {
            indicator.textContent = '▲';
            indicator.style.color = '#d1d5db';
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
            let typeDisplay = "N/A", durationDisplay = "N/A", classDisplay = getShortClassName(row.Class);

            if (typeof row.Seconds === 'number') {
                durationDisplay = formatSecondsToMMSS(row.Seconds);
            }

            if (row.Type === 'late') {
                typeDisplay = "Late Sign In";
                tr.classList.add(COLORS.late.moderate);
            } else if (row.Type === 'travel') {
                tr.classList.add('bg-cyan-100');
                classDisplay = getShortClassName(row.Class);
                typeDisplay = `Travel <span class="info-icon" 
                                data-departing="${row.DepartingTeacher}" 
                                data-arriving="${row.ArrivingTeacher}">i</span>`;
            } else if (row.Type === 'bathroom') {
                if (typeof row.Seconds === 'number' && row.Seconds > DURATION_THRESHOLDS.moderate) {
                    typeDisplay = "Long Sign Out";
                    if (row.Seconds >= DURATION_THRESHOLDS.veryHigh) tr.classList.add(COLORS.long.veryHigh);
                    else if (row.Seconds >= DURATION_THRESHOLDS.high) tr.classList.add(COLORS.long.high);
                    else tr.classList.add(COLORS.long.moderate);
                } else {
                    typeDisplay = "Normal Sign Out";
                    tr.classList.add(COLORS.normal);
                }
            }

            const editButton = `<button class="text-gray-500 hover:text-blue-600 edit-btn p-1" data-timestamp="${row.Date}" title="Edit Entry"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>`;
            tr.innerHTML = `<td class="p-2 border-b">${formatDate(row.Date)}</td><td class="p-2 border-b">${formatTime(row.Date)}</td><td class="p-2 border-b">${classDisplay}</td><td class="p-2 border-b">${normalizeName(row.Name)}</td><td class="p-2 border-b">${typeDisplay}</td><td class="p-2 border-b">${durationDisplay}</td><td class="p-2 border-b text-right">${editButton}</td>`;
            reportTableBody.appendChild(tr);
        });
    }
    updateSortIndicators();
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
        
        // ** START: MODIFIED LOGIC **
        let status = "Present", reason = "N/A", hasLong = false, hasLate = false, hasTravel = false;

        if (studentRecords.length > 0) {
            let longCount = 0, outCount = 0, travelCount = 0;
            studentRecords.forEach(r => {
                if (r.Type === "late") {
                    hasLate = true;
                } else if (r.Type === 'travel') {
                    hasTravel = true;
                    travelCount++;
                } else if (r.Type === 'bathroom' && typeof r.Seconds === 'number') {
                    outCount++;
                    if (r.Seconds > DURATION_THRESHOLDS.moderate) { // Use moderate threshold for "long"
                        hasLong = true;
                        longCount++;
                    }
                }
            });

            let reasons = [];
            if (hasLate) reasons.push("Late Sign In");
            if (travelCount > 0) reasons.push(`${travelCount} Travel(s)`);
            if (outCount > 0) reasons.push(`${outCount} Sign Out(s)`);
            if (longCount > 0) reasons.push(`(${longCount} > 5 min)`);
            
            reason = reasons.join('; ');
            status = (hasLate || hasLong || hasTravel) ? "Activity Recorded" : "Present";
            if (hasLate || hasLong) status = "Needs Review";
        }
        // ** END: MODIFIED LOGIC **

        const tr = document.createElement('tr');
        tr.className = 'border-t';
        if (studentRecords.length > 0) {
            tr.classList.add('cursor-pointer');
            tr.dataset.accordionToggle = "true";
            tr.dataset.records = JSON.stringify(studentRecords);
            if (hasLong || hasLate) tr.classList.add('bg-yellow-100', 'hover:bg-yellow-200');
            else if (hasTravel) tr.classList.add('bg-cyan-100', 'hover:bg-cyan-200');
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

    // ** THIS IS THE CRUCIAL DATE-DEFINING LOGIC THAT WAS MISSING **
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
        endDate.setHours(23, 59, 59); // This will now work correctly
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
                colorClass = COLORS.late.moderate;
            } else if (record.Type === 'travel') {
                typeText = "Travel";
                colorClass = 'bg-cyan-200';
            } else if (record.Type === 'bathroom') {
                 if (durationInSeconds > DURATION_THRESHOLDS.moderate) {
                    typeText = "Long Sign Out";
                    if (durationInSeconds >= DURATION_THRESHOLDS.veryHigh) colorClass = COLORS.long.veryHigh;
                    else if (durationInSeconds >= DURATION_THRESHOLDS.high) colorClass = COLORS.long.high;
                    else colorClass = COLORS.long.moderate;
                }
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
async function handleEditEntry(payload) {
    try {
        const response = await sendAuthenticatedRequest(payload);
        if (response.result === 'success') {
            await fetchAllSignOutData();
            const activeTab = appState.ui.currentDashboardTab;
            if (activeTab === 'signOut') renderSignOutReport();
            else if (activeTab === 'attendance') renderAttendanceReport();
            else if (activeTab === 'classTrends') renderClassTrendsReport();
        } else { 
            throw new Error(response.error || 'Failed to edit entry on the server.'); 
        }
    } catch (error) { 
        console.error('Error in handleEditEntry:', error); 
        showErrorAlert(error.message);
    }
}

async function handleDeleteEntry(timestamp) {
    const payload = { action: 'deleteEntry', entryTimestamp: timestamp };
    try {
        const response = await sendAuthenticatedRequest(payload);
        if (response.result === 'success') {
            appState.data.allSignOuts = appState.data.allSignOuts.filter(entry => entry.Date !== timestamp);
            const activeTab = appState.ui.currentDashboardTab;
            if (activeTab === 'signOut') renderSignOutReport();
            else if (activeTab === 'attendance') renderAttendanceReport();
            else if (activeTab === 'classTrends') renderClassTrendsReport();
        } else { throw new Error(response.error || 'Failed to delete entry.'); }
    } catch (error) { 
        console.error('Error deleting entry:', error); 
        showErrorAlert(error.message);
    }
}

async function fetchAllSignOutData() {
    reportMessageP.textContent = "Loading all sign-out data...";
    reportMessageP.classList.remove('hidden');
    reportTable.classList.add('hidden');
    reloadDataBtn.disabled = true;
    reloadDataBtn.classList.add('opacity-50');
    try {
        const payload = { action: 'getAllSignOutsForTeacher' };
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

/**
 * UPDATED: Added detailed logging to debug the initialization process.
 */
async function initializePageSpecificApp() {
    console.log("--- Dashboard Init: Starting ---");

    try {
        // --- 1. Initial UI State Setup ---
        console.log("Dashboard Init: 1. Setting up initial UI state.");
        const dropdownsToInit = [signOutClassDropdown, attendanceClassDropdown, trendsClassDropdown, studentFilterDropdown, classOverrideDropdown];
        dropdownsToInit.forEach(dd => {
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
        trendsDateFilterType.value = 'this_week';
        toggleTrendsDateInputs();
        switchTab('signOut');

        // --- 2. Add All Event Listeners ---
        console.log("Dashboard Init: 2. Attaching event listeners.");
        
        classOverrideDropdown.addEventListener('change', async () => {
            const selectedClass = classOverrideDropdown.value;
            try {
                await sendAuthenticatedRequest({ action: 'setClassOverride', className: selectedClass });
                showSuccessAlert(`Pass page class override set to: ${selectedClass}`);
            } catch (error) {
                showErrorAlert("Could not save override setting.");
            }
        });

        reloadDataBtn.addEventListener('click', async () => {
    // 1. Show a loading/processing state to the user
    reloadDataBtn.textContent = "Reloading...";
    reloadDataBtn.disabled = true;

    try {
        // 2. Re-fetch the master student and course list
        await fetchAllStudentData();

        // 3. Re-populate the course dropdowns with the fresh data
        populateCourseDropdownFromData();
        populateDropdown('signOutClassDropdown', appState.data.courses, "All Classes", "All Classes");
        populateDropdown('attendanceClassDropdown', appState.data.courses, DEFAULT_CLASS_OPTION, "");
        populateDropdown('trendsClassDropdown', appState.data.courses, DEFAULT_CLASS_OPTION, "");
        populateDropdown('classOverrideDropdown', appState.data.courses, "Auto", "AUTO");

        // 4. Re-fetch the sign-out log data
        await fetchAllSignOutData();

        // 5. Re-render whichever report tab is currently active
        const activeTab = appState.ui.currentDashboardTab;
        if (activeTab === 'signOut') renderSignOutReport();
        else if (activeTab === 'attendance') renderAttendanceReport();
        else if (activeTab === 'classTrends') renderClassTrendsReport();
        
        showSuccessAlert("All data has been refreshed from the server.");

    } catch (error) {
        showErrorAlert("Failed to refresh data. Please check the console for errors.");
        console.error("Error during manual data refresh:", error);
    } finally {
        // 6. Restore the button to its normal state
        reloadDataBtn.textContent = "Reload All Data";
        reloadDataBtn.disabled = false;
    }
});

        passStatusToggle.addEventListener('change', async () => {
            const isEnabled = passStatusToggle.checked;
            passStatusLabel.textContent = isEnabled ? 'Enabled' : 'Disabled';
            try {
                await sendAuthenticatedRequest({ action: 'setPassStatus', isEnabled: isEnabled });
            } catch (error) {
                showErrorAlert("Could not update pass status. Please try again.");
                passStatusToggle.checked = !isEnabled; // Revert UI on failure
                passStatusLabel.textContent = !isEnabled ? 'Enabled' : 'Disabled';
            }
        });
        queueSortToggle.addEventListener('change', async () => {
        const sortByTime = queueSortToggle.checked;
        const sortMode = sortByTime ? 'time' : 'queue';
        queueSortLabel.textContent = sortByTime ? 'By Time Out' : 'By Queue Order';
        try {
            await sendAuthenticatedRequest({ action: 'setQueueSortMode', sortMode: sortMode });
            showSuccessAlert(`Queue sorting updated to: ${queueSortLabel.textContent}`);
        } catch (error) {
            showErrorAlert("Could not update queue sorting setting.");
            queueSortToggle.checked = !sortByTime;
            queueSortLabel.textContent = !sortByTime ? 'By Time Out' : 'By Queue Order';
        }
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

        // --- REFACTORED EVENT LISTENERS ---

        // Listener 1: Handles the accordion rows for both reports.
        dashboardContent.addEventListener('click', (event) => {
            const accordionRow = event.target.closest('[data-accordion-toggle="true"]');
            if (!accordionRow) return; // Exit if the click was not on an accordion row.

            event.stopPropagation();
            const nextElement = accordionRow.nextElementSibling;

            // If a details row already exists, remove it and we're done.
            if (nextElement && nextElement.classList.contains('details-wrapper-row')) {
                nextElement.remove();
                return;
            }

            // Otherwise, create and insert the new details row.
            const records = JSON.parse(accordionRow.dataset.records || '[]');
            if (records.length === 0) return;

            const wrapperRow = document.createElement('tr');
            wrapperRow.className = 'details-wrapper-row';
            const wrapperCell = document.createElement('td');
            wrapperCell.colSpan = accordionRow.cells.length;
            wrapperCell.className = 'p-2 bg-gray-50';

            // (The detailed table creation logic remains the same as your original code)
            const detailsTable = document.createElement('table');
            detailsTable.className = 'min-w-full';
            const detailsHead = document.createElement('thead');
            detailsHead.innerHTML = `<tr class="bg-gray-200 text-sm"><th class="py-1 px-2 border-b text-left">Date</th><th class="py-1 px-2 border-b text-left">Time</th><th class="py-1 px-2 border-b text-left">Type</th><th class="py-1 px-2 border-b text-left">Duration</th><th class="py-1 px-2 border-b text-right w-12">Edit</th></tr>`;
            detailsTable.appendChild(detailsHead);
            const detailsBody = document.createElement('tbody');
            records.forEach(row => {
                const detailTr = document.createElement('tr');
                let typeDisplay = "N/A", durationDisplay = "N/A";
                if (typeof row.Seconds === 'number') durationDisplay = formatSecondsToMMSS(row.Seconds);
                if (row.Type === 'late') {
                    typeDisplay = "Late Sign In";
                    detailTr.classList.add(COLORS.late.moderate);
                } else if (row.Type === 'travel') {
                    typeDisplay = `Travel <span class="info-icon" data-departing="${row.DepartingTeacher}" data-arriving="${row.ArrivingTeacher}">i</span>`;
                    detailTr.classList.add('bg-cyan-100');
                } else if (row.Type === 'bathroom') {
                    typeDisplay = "Bathroom";
                    if (row.Seconds > DURATION_THRESHOLDS.moderate) {
                        detailTr.classList.add(COLORS.long.moderate);
                    } else {
                        detailTr.classList.add(COLORS.normal);
                    }
                }
                const editButtonHtml = `<button class="text-gray-500 hover:text-blue-600 edit-btn p-1" data-timestamp="${row.Date}" title="Edit Entry"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>`;
                detailTr.innerHTML = `<td class="py-2 px-2 border-b">${formatDate(row.Date)}</td><td class="py-2 px-2 border-b">${formatTime(row.Date)}</td><td class="py-2 px-2 border-b">${typeDisplay}</td><td class="py-2 px-2 border-b">${durationDisplay}</td><td class="py-2 px-2 border-b text-right">${editButtonHtml}</td>`;
                detailsBody.appendChild(detailTr);
            });
            detailsTable.appendChild(detailsBody);
            wrapperCell.appendChild(detailsTable);
            wrapperRow.appendChild(wrapperCell);
            accordionRow.insertAdjacentElement('afterend', wrapperRow);
        });

        // Listener 2: Handles the Edit button clicks and the info icon popover.
        dashboardContent.addEventListener('click', (event) => {
            const editButton = event.target.closest('.edit-btn');
            const infoIcon = event.target.closest('.info-icon');

            // Handle Edit Button
            if (editButton) {
                event.stopPropagation();
                const timestamp = editButton.dataset.timestamp;
                const record = appState.data.allSignOuts.find(r => r.Date === timestamp);
                if (record) {
                    // (The logic for showing the edit modal is unchanged from your original code)
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
                        editMinutes.value = '';
                        editSeconds.value = '';
                    }
                    editModal.classList.remove('hidden');
                    saveEditBtn.dataset.timestamp = timestamp;
                    deleteEntryBtn.dataset.timestamp = timestamp;
                }
                return;
            }

            // Handle Info Icon Popover
            let popover = document.getElementById('travelPopover');
            if (infoIcon) {
                event.stopPropagation();
                if (!popover) {
                    popover = document.createElement('div');
                    popover.id = 'travelPopover';
                    document.body.appendChild(popover);
                }
                const { departing, arriving } = infoIcon.dataset;
                popover.innerHTML = `<div class="font-bold text-gray-700">Travel Details</div><div class="text-sm mt-1"><strong>From:</strong> ${departing}</div><div class="text-sm"><strong>To:</strong> ${arriving}</div>`;
                const rect = infoIcon.getBoundingClientRect();
                popover.style.top = `${rect.top + window.scrollY}px`;
                popover.style.left = `${rect.right + window.scrollX + 10}px`;
                popover.classList.toggle('visible');
            } else if (popover) {
                popover.classList.remove('visible');
            }
        });

        // Listener 3: Handles closing the popover when clicking anywhere else on the page.
        document.body.addEventListener('click', (event) => {
            let popover = document.getElementById('travelPopover');
            if (popover && !event.target.closest('.info-icon')) {
                popover.classList.remove('visible');
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
            const payload = {
                action: 'editEntry',
                entryTimestamp: timestamp,
                newName: editStudentName.value,
                type: record.Type,
                className: record.Class,
            };
            if (record.Type === 'late') {
                const newTime = editTimeInput.value;
                if (newTime) {
                    const originalDate = new Date(record.Date);
                    const [hours, minutes] = newTime.split(':');
                    originalDate.setHours(parseInt(hours, 10));
                    originalDate.setMinutes(parseInt(minutes, 10));
                    originalDate.setSeconds(0);
                    payload.newTimestamp = originalDate.toISOString();
                }
            } else {
                payload.newSeconds = (parseInt(editMinutes.value) || 0) * 60 + (parseInt(editSeconds.value) || 0);
            }
            handleEditEntry(payload);
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

        // --- 3. Initial Data Load ---
        console.log("Dashboard Init: 3. Checking authentication.");
        if (appState.currentUser.email && appState.currentUser.idToken) {
            console.log("Dashboard Init: 3a. User is authenticated. Fetching data...");
            
            const statusPayload = await sendAuthenticatedRequest({ action: 'getLiveState' });
            console.log("Dashboard Init: 3b. Fetched live state:", statusPayload);
            passStatusToggle.checked = statusPayload.isEnabled;
            passStatusLabel.textContent = statusPayload.isEnabled ? 'Enabled' : 'Disabled';
            
            await fetchAllStudentData();
            console.log("Dashboard Init: 3c. Fetched all student data.");
            populateCourseDropdownFromData();

            populateDropdown('signOutClassDropdown', appState.data.courses, "All Classes", "All Classes");
            signOutClassDropdown.removeAttribute("disabled");
            populateDropdown('attendanceClassDropdown', appState.data.courses, DEFAULT_CLASS_OPTION, "");
            attendanceClassDropdown.removeAttribute("disabled");
            populateDropdown('trendsClassDropdown', appState.data.courses, DEFAULT_CLASS_OPTION, "");
            trendsClassDropdown.removeAttribute("disabled");
            populateDropdown('classOverrideDropdown', appState.data.courses, "Auto", "AUTO");
            classOverrideDropdown.removeAttribute("disabled");

            await fetchAllSignOutData();
            console.log("Dashboard Init: 3d. Fetched all sign-out data.");
            
            // --- 4. Initial Renders ---
            console.log("Dashboard Init: 4. Rendering reports.");
            renderSignOutReport();
            renderAttendanceReport();
            renderClassTrendsReport();
            console.log("Dashboard Init: 5. Initialization complete.");

        } else {
            console.warn("Dashboard Init: 3a. User is NOT authenticated.");
            showErrorAlert("Authentication error. Please sign in again.");
        }
    } catch (error) {
        console.error("Dashboard Init: CRITICAL FAILURE during initialization.", error);
        showErrorAlert("A critical error occurred while loading the dashboard: " + error.message);
    }
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
