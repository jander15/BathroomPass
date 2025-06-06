// js/teacher_dashboard.js

// --- DOM Element Caching (Elements specific to the Teacher Dashboard page) ---
const dashboardClassDropdown = document.getElementById('dashboardClassDropdown');
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


// --- Dashboard Page Specific Functions (All function declarations first) ---

/**
 * Toggles the visibility of date input fields based on the selected filter type.
 */
function toggleDateInputs() {
    const selectedFilter = dateFilterType.value;
    specificDateInputDiv.classList.add('hidden');
    dateRangeInputsDiv.classList.add('hidden');

    if (selectedFilter === 'specificDate') {
        specificDateInputDiv.classList.remove('hidden');
    } else if (selectedFilter === 'dateRange') {
        dateRangeInputsDiv.classList.remove('hidden');
    }
}

/**
 * Generates today's date in 'YYYY-MM-DD' format.
 * @returns {string} Current date string.
 */
function getTodayDateString() {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Formats to YYYY-MM-DD
}

/**
 * Formats a Date object to MM/DD/YYYY.
 * @param {Date|string} dateInput - The Date object or date string.
 * @returns {string} Formatted date string.
 */
function formatDate(dateInput) {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    // Ensure padding for month and day
    return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
}

/**
 * Formats a Date object to HH:MM:SS.
 * @param {Date|string} dateInput - The Date object or date string.
 * @returns {string} Formatted time string.
 */
function formatTime(dateInput) {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    // Ensure padding for hours, minutes, and seconds
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

/**
 * Applies the duration filter (show only > 5 minutes) to the report table rows.
 * This is done client-side after the report is fetched.
 */
function applyDurationFilter() {
    const showLongDurationsOnly = filterLongDurationsCheckbox.checked;
    const thresholdSeconds = TARDY_THRESHOLD_MINUTES * 60; // 5 minutes in seconds

    Array.from(reportTableBody.rows).forEach(row => {
        const typeCell = row.cells[3]; // 'Type' column
        const durationCell = row.cells[4]; // 'Duration (s)' column

        let isLongDuration = false;
        let isSignOut = typeCell.textContent === "Sign Out";

        if (isSignOut && durationCell.textContent !== "N/A") {
            // Convert MM:SS to seconds or read raw seconds
            let totalSeconds = 0;
            if (durationCell.textContent.includes(':')) {
                const parts = durationCell.textContent.split(':');
                totalSeconds = parseInt(parts[0] || '0') * 60 + parseInt(parts[1] || '0');
            } else {
                totalSeconds = parseFloat(durationCell.textContent || '0');
            }
            isLongDuration = totalSeconds > thresholdSeconds;
        }

        // Apply red background highlighting
        if (isSignOut && isLongDuration) {
            row.classList.add('bg-red-200'); // Apply highlight for long durations
        } else {
            row.classList.remove('bg-red-200'); // Remove highlight otherwise
        }

        // Hide/show based on filter checkbox
        if (showLongDurationsOnly) {
            if (isSignOut && isLongDuration) {
                row.classList.remove('hidden'); // Show if it's a long sign-out
            } else {
                row.classList.add('hidden'); // Hide if it's not
            }
        } else {
            row.classList.remove('hidden'); // Show all rows if filter is off
        }
    });
}


/**
 * Generates and displays the report based on selected class and date filter.
 */
async function generateReport() {
    reportMessageP.textContent = "Generating report...";
    reportTable.classList.add('hidden');
    reportTableBody.innerHTML = '';
    showErrorAlert(''); 
    showSuccessAlert(''); 

    const selectedClass = dashboardClassDropdown.value;
    const filterType = dateFilterType.value;
    let startDate = null;
    let endDate = null;

    if (selectedClass === "" || selectedClass === DEFAULT_CLASS_OPTION) {
        showErrorAlert("Please select a class to generate the report.");
        reportMessageP.textContent = "Select a class and date filter, then click 'Generate Report'.";
        return;
    }

    if (filterType === 'today') {
        const today = getTodayDateString();
        startDate = today;
        endDate = today;
    } else if (filterType === 'specificDate') {
        startDate = reportDateInput.value;
        endDate = reportDateInput.value;
        if (!startDate) {
            showErrorAlert("Please select a specific date.");
            reportMessageP.textContent = "Select a class and date filter, then click 'Generate Report'.";
            return;
        }
    } else if (filterType === 'dateRange') {
        startDate = startDateInput.value;
        endDate = endDateInput.value;
        if (!startDate || !endDate) {
            showErrorAlert("Please select both start and end dates for the range.");
            reportMessageP.textContent = "Select a class and date filter, then click 'Generate Report'.";
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            showErrorAlert("Start date cannot be after end date.");
            reportMessageP.textContent = "Select a class and date filter, then click 'Generate Report'.";
            return;
        }
    }

    generateReportBtn.disabled = true;
    generateReportBtn.classList.add('opacity-50', 'cursor-not-allowed');
    generateReportBtn.textContent = "Loading Report...";

    try {
        const payload = {
            action: ACTION_GET_REPORT_DATA,
            class: selectedClass,
            startDate: startDate,
            endDate: endDate,
            userEmail: appState.currentUser.email
        };

        const data = await sendAuthenticatedRequest(payload);

        if (data.result === 'success' && Array.isArray(data.report)) {
            appState.data.currentReportData = data.report;

            if (appState.data.currentReportData.length === 0) {
                reportMessageP.textContent = `No sign-out data found for ${selectedClass} within the selected date range.`;
                reportTable.classList.add('hidden');
            } else {
                reportMessageP.classList.add('hidden');
                reportTable.classList.remove('hidden');
                reportTableBody.innerHTML = ''; 

                appState.data.currentReportData.forEach(row => {
                    const tr = document.createElement('tr');
                    let type = "Sign Out";
                    let durationDisplay = row.Seconds;

                    if (row.Seconds === "Late Sign In") {
                        type = "Late Sign In";
                        durationDisplay = "N/A";
                    } else if (typeof row.Seconds === 'number') {
                         const totalSeconds = row.Seconds;
                         const minutes = Math.floor(totalSeconds / 60);
                         const seconds = totalSeconds % 60;
                         durationDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    }

                    tr.innerHTML = `
                        <td class="py-2 px-4 border-b">${formatDate(row.Date)}</td>
                        <td class="py-2 px-4 border-b">${formatTime(row.Date)}</td>
                        <td class="py-2 px-4 border-b">${row.Name || 'N/A'}</td>
                        <td class="py-2 px-4 border-b">${type}</td>
                        <td class="py-2 px-4 border-b">${durationDisplay}</td>
                    `;
                    reportTableBody.appendChild(tr);
                });
                
                applyDurationFilter();
            }
        } else {
            showErrorAlert(`Error generating report: ${data.error || 'Unknown error'}`);
            reportMessageP.textContent = "Failed to generate report. Please try again or check console for details.";
        }
    } catch (error) {
        console.error('Error fetching report data:', error);
        showErrorAlert("Failed to generate report. Network or authentication issue. Please ensure you are signed in.");
        reportMessageP.textContent = "Failed to generate report. Please try again or check console for details.";
    } finally {
        generateReportBtn.disabled = false;
        generateReportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        generateReportBtn.textContent = "Generate Report";
    }
}

/**
 * Switches between the Sign Out and Attendance report tabs.
 * @param {string} tab - The tab to switch to ('signOut' or 'attendance').
 */
function switchTab(tab) {
    if (tab === 'attendance') {
        signOutReportContent.classList.add('hidden');
        attendanceReportContent.classList.remove('hidden');
        signOutReportTab.classList.remove('border-indigo-500', 'text-indigo-600');
        signOutReportTab.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        attendanceReportTab.classList.add('border-indigo-500', 'text-indigo-600');
        attendanceReportTab.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
    } else { // 'signOut'
        signOutReportContent.classList.remove('hidden');
        attendanceReportContent.classList.add('hidden');
        attendanceReportTab.classList.remove('border-indigo-500', 'text-indigo-600');
        attendanceReportTab.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        signOutReportTab.classList.add('border-indigo-500', 'text-indigo-600');
        signOutReportTab.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
    }
}

/**
 * Generates and displays the attendance report with an accordion-style view.
 */
async function generateAttendanceReport() {
    attendanceReportMessageP.textContent = "Generating attendance report...";
    attendanceReportTable.classList.add('hidden');
    attendanceReportTableBody.innerHTML = '';
    showErrorAlert('');
    showSuccessAlert('');

    const selectedClass = dashboardClassDropdown.value;
    const selectedDate = attendanceDateInput.value;

    if (selectedClass === "" || selectedClass === DEFAULT_CLASS_OPTION) {
        showErrorAlert("Please select a class to generate the report.");
        attendanceReportMessageP.textContent = "Select a class and date to generate the attendance report.";
        return;
    }
    if (!selectedDate) {
        showErrorAlert("Please select a date.");
        attendanceReportMessageP.textContent = "Select a class and date to generate the attendance report.";
        return;
    }

    generateAttendanceReportBtn.disabled = true;
    generateAttendanceReportBtn.classList.add('opacity-50', 'cursor-not-allowed');
    generateAttendanceReportBtn.textContent = "Loading...";

    try {
        const payload = {
            action: ACTION_GET_REPORT_DATA,
            class: selectedClass,
            startDate: selectedDate,
            endDate: selectedDate,
            userEmail: appState.currentUser.email
        };
        const reportData = await sendAuthenticatedRequest(payload);

        if (reportData.result !== 'success' || !Array.isArray(reportData.report)) {
            throw new Error(reportData.error || 'Failed to fetch report data.');
        }

        const allStudentsInClass = appState.data.allNamesFromSheet
            .filter(student => student.Class === selectedClass)
            .map(student => student.Name)
            .sort();

        if (allStudentsInClass.length === 0) {
            attendanceReportMessageP.textContent = `No students found for class ${selectedClass}.`;
            return;
        }

        attendanceReportMessageP.classList.add('hidden');
        attendanceReportTable.classList.remove('hidden');
        attendanceReportTableBody.innerHTML = '';

        allStudentsInClass.forEach(studentName => {
            const studentRecords = reportData.report.filter(record => record.Name === studentName);

            let attendanceStatus = "Present";
            let reason = "N/A";
            let hasLongSignOut = false;
            let hasLateSignIn = false;
            let signOutCount = 0;

            if (studentRecords.length > 0) {
                attendanceStatus = "Activity Recorded";
                let longSignOutCount = 0;
                
                studentRecords.forEach(record => {
                    if (record.Seconds === "Late Sign In") {
                        hasLateSignIn = true;
                    } else if (typeof record.Seconds === 'number') {
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
                
                if(hasLateSignIn || hasLongSignOut) {
                    attendanceStatus = "Needs Review";
                }
            }

            const tr = document.createElement('tr');
            tr.className = 'border-t';
            if (studentRecords.length > 0) {
                tr.classList.add('cursor-pointer');
                tr.dataset.accordionToggle = "true";
            }
            if (hasLateSignIn || hasLongSignOut) {
                tr.classList.add('bg-yellow-100', 'font-bold');
            }

            const arrowSvg = studentRecords.length > 0 
                ? `<svg class="w-4 h-4 inline-block ml-2 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>` 
                : '';
            
            tr.innerHTML = `
                <td class="py-3 px-4">${studentName} ${arrowSvg}</td>
                <td class="py-3 px-4">${attendanceStatus}</td>
                <td class="py-3 px-4">${reason}</td>
            `;
            attendanceReportTableBody.appendChild(tr);

            if (studentRecords.length > 0) {
                const detailsTr = document.createElement('tr');
                detailsTr.className = 'hidden';
                const detailsTd = document.createElement('td');
                detailsTd.colSpan = 3;
                detailsTd.className = 'p-0';

                let detailsTableHtml = `<div class="p-4 bg-gray-50"><table class="min-w-full bg-white"><thead>
                    <tr class="bg-gray-200">
                        <th class="py-2 px-4 border-b text-left">Date</th>
                        <th class="py-2 px-4 border-b text-left">Time</th>
                        <th class="py-2 px-4 border-b text-left">Type</th>
                        <th class="py-2 px-4 border-b text-left">Duration (min:sec)</th>
                    </tr>
                </thead><tbody>`;
                
                studentRecords.forEach(record => {
                    let type = "Sign Out";
                    let durationDisplay = "N/A";
                    if (record.Seconds === "Late Sign In") {
                        type = "Late Sign In";
                    } else if (typeof record.Seconds === 'number') {
                        const totalSeconds = record.Seconds;
                        const minutes = Math.floor(totalSeconds / 60);
                        const seconds = totalSeconds % 60;
                        durationDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    }
                    const detailRowClass = (record.Seconds > (TARDY_THRESHOLD_MINUTES * 60)) ? 'bg-red-100' : '';
                    detailsTableHtml += `
                        <tr class="border-t ${detailRowClass}">
                            <td class="py-2 px-4">${formatDate(record.Date)}</td>
                            <td class="py-2 px-4">${formatTime(record.Date)}</td>
                            <td class="py-2 px-4">${type}</td>
                            <td class="py-2 px-4">${durationDisplay}</td>
                        </tr>
                    `;
                });
                detailsTableHtml += '</tbody></table></div>';
                detailsTd.innerHTML = detailsTableHtml;
                detailsTr.appendChild(detailsTd);
                attendanceReportTableBody.appendChild(detailsTr);
            }
        });

    } catch (error) {
        console.error('Error generating attendance report:', error);
        showErrorAlert(`Failed to generate attendance report: ${error.message}`);
        attendanceReportMessageP.textContent = "Failed to generate report. Please try again.";
        attendanceReportMessageP.classList.remove('hidden');
    } finally {
        generateAttendanceReportBtn.disabled = false;
        generateAttendanceReportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        generateAttendanceReportBtn.textContent = "Generate Attendance Report";
    }
}

/**
 * Initializes the Teacher Dashboard application elements and fetches initial data.
 * This is the page-specific initialization called by common.js.
 */
async function initializePageSpecificApp() {
    alertDiv.classList.add("hidden");
    errorAlertDiv.classList.add("hidden");

    populateDropdown('dashboardClassDropdown', [], LOADING_OPTION, "");
    dashboardClassDropdown.setAttribute("disabled", "disabled");

    // Set up Sign Out report
    dateFilterType.value = 'today';
    toggleDateInputs();
    reportDateInput.value = getTodayDateString(); 
    startDateInput.value = getTodayDateString();
    endDateInput.value = getTodayDateString();
    filterLongDurationsCheckbox.checked = false; 
    generateReportBtn.disabled = false;
    generateReportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    generateReportBtn.textContent = "Generate Report";
    reportMessageP.textContent = "Select a class and date filter, then click 'Generate Report'.";
    reportTable.classList.add('hidden');
    reportTableBody.innerHTML = '';
    
    // Set up Attendance report
    attendanceDateInput.value = getTodayDateString();
    generateAttendanceReportBtn.disabled = false;
    generateAttendanceReportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    generateAttendanceReportBtn.textContent = "Generate Attendance Report";
    attendanceReportMessageP.textContent = "Select a class and date to generate the attendance report.";
    attendanceReportTable.classList.add('hidden');
    attendanceReportTableBody.innerHTML = '';

    if (appState.currentUser.email && appState.currentUser.idToken) {
        try {
            await fetchAllStudentData(); 
            populateCourseDropdownFromData();
            populateDropdown('dashboardClassDropdown', appState.data.courses, DEFAULT_CLASS_OPTION, "");
            dashboardClassDropdown.removeAttribute("disabled");
        } catch (error) {
            console.error("Failed to initialize dashboard with data:", error);
            populateDropdown('dashboardClassDropdown', [], "Error loading classes", "");
            dashboardClassDropdown.setAttribute("disabled", "disabled");
        }
    } else {
        console.warn("User not authenticated for dashboard. Cannot fetch data.");
        populateDropdown('dashboardClassDropdown', [], "Sign in to load classes", "");
        dashboardClassDropdown.setAttribute("disabled", "disabled");
    }
    
    switchTab('signOut');
}

/**
 * Resets all Teacher Dashboard page specific UI and state.
 * This is the page-specific reset called by common.js on sign-out.
 */
function resetPageSpecificAppState() {
    appState.data = { allNamesFromSheet: [], courses: [], namesForSelectedCourse: [], currentReportData: [] }; 

    populateDropdown('dashboardClassDropdown', [], DEFAULT_CLASS_OPTION, "");
    dashboardClassDropdown.setAttribute("disabled", "disabled");

    // Reset Sign Out report
    dateFilterType.value = 'today';
    toggleDateInputs();
    reportDateInput.value = '';
    startDateInput.value = '';
    endDateInput.value = '';
    filterLongDurationsCheckbox.checked = false; 
    reportTableBody.innerHTML = '';
    reportTable.classList.add('hidden');
    reportMessageP.textContent = "Select a class and date filter, then click 'Generate Report'.";
    generateReportBtn.disabled = false;
    generateReportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    generateReportBtn.textContent = "Generate Report";

    // Reset Attendance report
    attendanceDateInput.value = '';
    attendanceReportTableBody.innerHTML = '';
    attendanceReportTable.classList.add('hidden');
    attendanceReportMessageP.textContent = "Select a class and date to generate the attendance report.";
    generateAttendanceReportBtn.disabled = false;
    generateAttendanceReportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    generateAttendanceReportBtn.textContent = "Generate Attendance Report";
    
    switchTab('signOut');
}

// --- Event Listeners specific to Teacher Dashboard page ---
document.addEventListener('DOMContentLoaded', initGoogleSignIn);
dateFilterType.addEventListener('change', toggleDateInputs);
generateReportBtn.addEventListener('click', generateReport);
filterLongDurationsCheckbox.addEventListener('change', applyDurationFilter);

// Tab listeners
signOutReportTab.addEventListener('click', () => switchTab('signOut'));
attendanceReportTab.addEventListener('click', () => switchTab('attendance'));

// Report generation listener
generateAttendanceReportBtn.addEventListener('click', generateAttendanceReport);

// Event Delegation for Accordion Rows
attendanceReportTableBody.addEventListener('click', (event) => {
    const headerRow = event.target.closest('tr[data-accordion-toggle="true"]');
    if (headerRow) {
        const detailsRow = headerRow.nextElementSibling;
        if (detailsRow) {
            detailsRow.classList.toggle('hidden');
            const arrow = headerRow.querySelector('svg');
            if (arrow) {
                arrow.classList.toggle('rotate-180');
            }
        }
    }
});

// Clear reports when class changes
dashboardClassDropdown.addEventListener('change', () => {
    reportTable.classList.add('hidden');
    reportMessageP.textContent = "Class changed. Click 'Generate Report' to see new data.";
    reportMessageP.classList.remove('hidden');
    
    attendanceReportTable.classList.add('hidden');
    attendanceReportMessageP.textContent = "Class changed. Click 'Generate Attendance Report' to see new data.";
    attendanceReportMessageP.classList.remove('hidden');
});