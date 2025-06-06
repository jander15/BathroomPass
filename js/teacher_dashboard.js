// js/teacher_dashboard.js

// --- DOM Element Caching (Elements specific to the Teacher Dashboard page) ---
const dashboardClassDropdown = document.getElementById('dashboardClassDropdown');

// Tab Buttons
const attendanceReportTabBtn = document.getElementById('attendanceReportTabBtn');
const signOutHistoryTabBtn = document.getElementById('signOutHistoryTabBtn');
const studentHistoryTabBtn = document.getElementById('studentHistoryTabBtn');

// Tab Content Divs
const attendanceReportTabContent = document.getElementById('attendanceReportTabContent');
const signOutHistoryTabContent = document.getElementById('signOutHistoryTabContent');
const studentHistoryTabContent = document.getElementById('studentHistoryTabContent');

// Tab 1: Attendance Report elements
const attendanceDateFilterType = document.getElementById('attendanceDateFilterType');
const attendanceSpecificDateInputDiv = document.getElementById('attendanceSpecificDateInput');
const attendanceReportDateInput = document.getElementById('attendanceReportDate');
const attendanceDateRangeInputsDiv = document.getElementById('attendanceDateRangeInputs');
const attendanceStartDateInput = document.getElementById('attendanceStartDate');
const attendanceEndDateInput = document.getElementById('attendanceEndDate');
const generateAttendanceReportBtn = document.getElementById('generateAttendanceReportBtn');
const attendanceReportMessageP = document.getElementById('attendanceReportMessage');
const attendanceReportTable = document.getElementById('attendanceReportTable');
const attendanceReportTableBody = document.getElementById('attendanceReportTableBody');

// Tab 2: Sign Out History elements (re-caching from previous version)
const signOutHistoryDateFilterType = document.getElementById('signOutHistoryDateFilterType');
const signOutHistorySpecificDateInputDiv = document.getElementById('signOutHistorySpecificDateInput');
const signOutHistoryReportDateInput = document.getElementById('signOutHistoryReportDate');
const signOutHistoryDateRangeInputsDiv = document.getElementById('signOutHistoryDateRangeInputs');
const signOutHistoryStartDateInput = document.getElementById('signOutHistoryStartDate');
const signOutHistoryEndDateInput = document.getElementById('signOutHistoryEndDate');
const filterLongDurationsCheckbox = document.getElementById('filterLongDurations'); 
const generateSignOutHistoryBtn = document.getElementById('generateSignOutHistoryBtn');
const signOutHistoryReportMessageP = document.getElementById('signOutHistoryReportMessage');
const signOutHistoryReportTable = document.getElementById('signOutHistoryReportTable');
const signOutHistoryReportTableBody = document.getElementById('signOutHistoryReportTableBody');

// Tab 3: Student History elements
const studentHistoryDropdown = document.getElementById('studentHistoryDropdown');
const studentHistoryDateFilterType = document.getElementById('studentHistoryDateFilterType');
const studentHistorySpecificDateInputDiv = document.getElementById('studentHistorySpecificDateInput');
const studentHistoryReportDateInput = document.getElementById('studentHistoryReportDate');
const studentHistoryDateRangeInputsDiv = document.getElementById('studentHistoryDateRangeInputs');
const studentHistoryStartDateInput = document.getElementById('studentHistoryStartDate');
const studentHistoryEndDateInput = document.getElementById('studentHistoryEndDate');
const generateStudentHistoryBtn = document.getElementById('generateStudentHistoryBtn');
const studentHistoryReportMessageP = document.getElementById('studentHistoryReportMessage');
const studentHistoryReportTable = document.getElementById('studentHistoryReportTable');
const studentHistoryReportTableBody = document.getElementById('studentHistoryReportTableBody');


// --- Dashboard Page Specific Functions (All function declarations first) ---

/**
 * Shows a specific dashboard tab and updates button styles.
 * @param {string} tabId - The ID of the tab content div to show (e.g., 'attendanceReportTabContent').
 */
function showDashboardTab(tabId) {
    // Hide all tab contents
    attendanceReportTabContent.classList.add('hidden');
    signOutHistoryTabContent.classList.add('hidden');
    studentHistoryTabContent.classList.add('hidden');

    // Reset all tab button styles to inactive
    attendanceReportTabBtn.classList.remove('bg-blue-600', 'text-white');
    attendanceReportTabBtn.classList.add('bg-gray-200', 'text-gray-800');
    signOutHistoryTabBtn.classList.remove('bg-blue-600', 'text-white');
    signOutHistoryTabBtn.classList.add('bg-gray-200', 'text-gray-800');
    studentHistoryTabBtn.classList.remove('bg-blue-600', 'text-white');
    studentHistoryTabBtn.classList.add('bg-gray-200', 'text-gray-800');

    // Show the selected tab content and set its button to active style
    if (tabId === 'attendanceReportTabContent') {
        attendanceReportTabContent.classList.remove('hidden');
        attendanceReportTabBtn.classList.add('bg-blue-600', 'text-white');
        attendanceReportTabBtn.classList.remove('bg-gray-200', 'text-gray-800');
    } else if (tabId === 'signOutHistoryTabContent') {
        signOutHistoryTabContent.classList.remove('hidden');
        signOutHistoryTabBtn.classList.add('bg-blue-600', 'text-white');
        signOutHistoryTabBtn.classList.remove('bg-gray-200', 'text-gray-800');
    } else if (tabId === 'studentHistoryTabContent') {
        studentHistoryTabContent.classList.remove('hidden');
        studentHistoryTabBtn.classList.add('bg-blue-600', 'text-white');
        studentHistoryTabBtn.classList.remove('bg-gray-200', 'text-gray-800');
    }
    // Store current active tab for reset purposes
    appState.ui.currentDashboardTab = tabId;
}

/**
 * Toggles the visibility of date input fields for Attendance Report based on the selected filter type.
 */
function toggleAttendanceDateInputs() {
    const selectedFilter = attendanceDateFilterType.value;
    attendanceSpecificDateInputDiv.classList.add('hidden');
    attendanceDateRangeInputsDiv.classList.add('hidden');

    if (selectedFilter === 'specificDate') {
        attendanceSpecificDateInputDiv.classList.remove('hidden');
    } else if (selectedFilter === 'dateRange') {
        attendanceDateRangeInputsDiv.classList.remove('hidden');
    }
}

/**
 * Toggles the visibility of date input fields for Sign Out History based on the selected filter type.
 */
function toggleSignOutHistoryDateInputs() {
    const selectedFilter = signOutHistoryDateFilterType.value;
    signOutHistorySpecificDateInputDiv.classList.add('hidden');
    signOutHistoryDateRangeInputsDiv.classList.add('hidden');

    if (selectedFilter === 'specificDate') {
        signOutHistorySpecificDateInputDiv.classList.remove('hidden');
    } else if (selectedFilter === 'dateRange') {
        signOutHistoryDateRangeInputsDiv.classList.remove('hidden');
    }
}

/**
 * Toggles the visibility of date input fields for Student History based on the selected filter type.
 */
function toggleStudentHistoryDateInputs() {
    const selectedFilter = studentHistoryDateFilterType.value;
    studentHistorySpecificDateInputDiv.classList.add('hidden');
    studentHistoryDateRangeInputsDiv.classList.add('hidden');

    if (selectedFilter === 'specificDate') {
        studentHistorySpecificDateInputDiv.classList.remove('hidden');
    } else if (selectedFilter === 'dateRange') {
        studentHistoryDateRangeInputsDiv.classList.remove('hidden');
    }
}

/**
 * Generates today's date in YYYY-MM-DD format.
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
 * Converts seconds to MM:SS format.
 * @param {number} totalSeconds - Total seconds.
 * @returns {string} Formatted time string (MM:SS).
 */
function formatDuration(totalSeconds) {
    if (typeof totalSeconds !== 'number' || isNaN(totalSeconds)) return 'N/A';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Aggregates sign-out data for a single student on a given day for attendance report.
 * @param {Array<object>} studentActivities - All log entries for a student on a specific day.
 * @returns {object} Aggregated status and details.
 */
function aggregateDailyStudentActivity(studentActivities) {
    let status = "Present";
    let totalSignOutSeconds = 0;
    let lateSignInCount = 0;
    let hasLongSignOut = false;
    let details = [];

    studentActivities.forEach(activity => {
        const activityTime = new Date(activity.Date);
        const activityType = activity.Seconds === "Late Sign In" ? "Late Sign In" : "Sign Out";
        const durationSeconds = activityType === "Sign Out" ? parseFloat(activity.Seconds) : 0;

        if (activityType === "Late Sign In") {
            lateSignInCount++;
            status = "Late Sign In"; // Prioritize late sign in for overall status
            details.push(`Late Sign In at ${formatTime(activityTime)}`);
        } else if (activityType === "Sign Out") {
            totalSignOutSeconds += durationSeconds;
            if (durationSeconds > (TARDY_THRESHOLD_MINUTES * 60)) {
                hasLongSignOut = true;
                status = "Long Sign Out"; // Prioritize long sign out for overall status
            } else if (status === "Present") {
                status = "Signed Out"; // Default status if not already late/long
            }
            details.push(`Signed Out for ${formatDuration(durationSeconds)} at ${formatTime(activityTime)}`);
        }
    });

    if (totalSignOutSeconds > 0 && status === "Present") {
        status = "Signed Out"; // Ensure status reflects if they were just out for a normal duration
    }

    return {
        status: status,
        totalSignOutSeconds: totalSignOutSeconds,
        lateSignInCount: lateSignInCount,
        hasLongSignOut: hasLongSignOut,
        isLateSignIn: lateSignInCount > 0, // Flag for highlighting
        details: details.sort() // Sort details for consistent display
    };
}

/**
 * Aggregates sign-out data for a single student over a date range for attendance report.
 * @param {Array<object>} studentActivities - All log entries for a student over a date range.
 * @returns {object} Aggregated counts and times.
 */
function aggregateRangeStudentActivity(studentActivities) {
    let totalSignOuts = 0;
    let totalSignOutSeconds = 0;
    let totalLateSignIns = 0;
    let dailyDetails = {}; // { 'YYYY-MM-DD': { events: [], totalSeconds: 0, lateCount: 0 } }

    studentActivities.forEach(activity => {
        const activityDateKey = new Date(activity.Date).toISOString().split('T')[0];
        if (!dailyDetails[activityDateKey]) {
            dailyDetails[activityDateKey] = { events: [], totalSeconds: 0, lateCount: 0 };
        }

        const activityType = activity.Seconds === "Late Sign In" ? "Late Sign In" : "Sign Out";
        const durationSeconds = activityType === "Sign Out" ? parseFloat(activity.Seconds) : 0;

        totalSignOuts++; // Count both sign-outs and late sign-ins

        if (activityType === "Late Sign In") {
            totalLateSignIns++;
            dailyDetails[activityDateKey].lateCount++;
            dailyDetails[activityDateKey].events.push(`Late Sign In at ${formatTime(activity.Date)}`);
        } else if (activityType === "Sign Out") {
            totalSignOutSeconds += durationSeconds;
            dailyDetails[activityDateKey].totalSeconds += durationSeconds;
            dailyDetails[activityDateKey].events.push(`Signed Out for ${formatDuration(durationSeconds)} at ${formatTime(activity.Date)}`);
        }
    });

    const sortedDailyDetails = Object.keys(dailyDetails).sort().map(dateKey => ({
        date: dateKey,
        data: dailyDetails[dateKey]
    }));

    return {
        totalSignOuts: totalSignOuts,
        totalSignOutSeconds: totalSignOutSeconds,
        totalLateSignIns: totalLateSignIns,
        dailyDetails: sortedDailyDetails // Details per day
    };
}


/**
 * Renders the Attendance Report table.
 * @param {Array<object>} reportData - Raw report data from the backend.
 * @param {string} filterType - 'today', 'specificDate', or 'dateRange'.
 * @param {string} selectedDate - The date for single-day reports.
 */
function renderAttendanceReport(reportData, filterType, selectedDate) {
    reportTableBody.innerHTML = '';
    attendanceReportTable.classList.remove('hidden');
    attendanceReportMessageP.classList.add('hidden');

    const uniqueStudents = Array.from(new Set(appState.data.allNamesFromSheet.map(s => s.Name))).sort(); // Get all students in teacher's classes

    uniqueStudents.forEach(studentName => {
        const studentActivities = reportData.filter(entry => entry.Name === studentName);

        let rowData = {};
        let isHighlightRow = false;
        let mainRowStatus = "";

        if (filterType === 'today' || filterType === 'specificDate') {
            const dailyAgg = aggregateDailyStudentActivity(studentActivities);
            rowData = dailyAgg;
            isHighlightRow = dailyAgg.isLateSignIn || dailyAgg.hasLongSignOut;
            mainRowStatus = dailyAgg.status;
            // For single day, status/total sign outs column shows status, total sign out time, late sign ins
            mainRowStatus = `${dailyAgg.status || "Present"}`;
            if (dailyAgg.totalSignOutSeconds > 0) {
                mainRowStatus += ` (${formatDuration(dailyAgg.totalSignOutSeconds)})`;
            }
            if (dailyAgg.lateSignInCount > 0) {
                mainRowStatus += ` (${dailyAgg.lateSignInCount} Late)`;
            }

        } else if (filterType === 'dateRange') {
            const rangeAgg = aggregateRangeStudentActivity(studentActivities);
            rowData = rangeAgg;
            isHighlightRow = rangeAgg.totalLateSignIns > 0 || (rangeAgg.totalSignOutSeconds / rangeAgg.totalSignOuts > (TARDY_THRESHOLD_MINUTES * 60) && rangeAgg.totalSignOuts > 0); // Avg duration > 5 min
            mainRowStatus = `${rangeAgg.totalSignOuts} Sign Outs`;
            if (rangeAgg.totalLateSignIns > 0) {
                mainRowStatus += ` (${rangeAgg.totalLateSignIns} Late)`;
            }
        }

        const tr = document.createElement('tr');
        tr.classList.add('report-table-row');
        if (isHighlightRow) {
            tr.classList.add('bg-red-200');
        }

        let totalDurationFormatted = '';
        if (filterType === 'today' || filterType === 'specificDate') {
            totalDurationFormatted = rowData.totalSignOutSeconds > 0 ? formatDuration(rowData.totalSignOutSeconds) : '0:00';
        } else { // Date range
            totalDurationFormatted = rowData.totalSignOutSeconds > 0 ? formatDuration(rowData.totalSignOutSeconds) : '0:00';
        }

        tr.innerHTML = `
            <td class="py-2 px-4 border-b">${studentName}</td>
            <td class="py-2 px-4 border-b">${mainRowStatus}</td>
            <td class="py-2 px-4 border-b">${totalDurationFormatted}</td>
            <td class="py-2 px-4 border-b">${filterType === 'today' || filterType === 'specificDate' ? rowData.lateSignInCount : rowData.totalLateSignIns}</td>
        `;
        attendanceReportTableBody.appendChild(tr);

        // Add click listener for expansion
        if (rowData.details && rowData.details.length > 0 || (rowData.dailyDetails && rowData.dailyDetails.length > 0)) {
            let detailRow = null;
            tr.addEventListener('click', () => {
                if (detailRow && detailRow.parentNode) {
                    detailRow.parentNode.removeChild(detailRow);
                    tr.classList.remove('expanded-row');
                    detailRow = null;
                } else {
                    detailRow = document.createElement('tr');
                    detailRow.classList.add('detail-row');
                    detailRow.innerHTML = `<td colspan="4"></td>`; // Placeholder for correct colspan
                    const detailCell = detailRow.querySelector('td');
                    tr.classList.add('expanded-row');

                    let detailsContent = '';
                    if (filterType === 'today' || filterType === 'specificDate') {
                        detailsContent = `<strong>Activity for ${formatDate(selectedDate)}:</strong><br>${rowData.details.join('<br>')}`;
                    } else { // Date range
                        detailsContent = `<strong>Activity for ${studentName}:</strong><br>`;
                        rowData.dailyDetails.forEach(day => {
                            detailsContent += `<strong>${formatDate(day.date)}:</strong> (${formatDuration(day.data.totalSeconds)}, ${day.data.lateCount} Late)<br>`;
                            detailsContent += `&nbsp;&nbsp;${day.data.events.join('<br>&nbsp;&nbsp;')}<br>`;
                        });
                    }
                    detailCell.innerHTML = detailsContent;
                    
                    tr.parentNode.insertBefore(detailRow, tr.nextSibling);
                }
            });
        }
    });

    if (uniqueStudents.length === 0) {
        attendanceReportMessageP.textContent = `No students found for ${dashboardClassDropdown.value} or no data for selected criteria.`;
        attendanceReportTable.classList.add('hidden');
        attendanceReportMessageP.classList.remove('hidden');
    }
}


/**
 * Generates the Attendance Report.
 */
async function generateAttendanceReport() {
    attendanceReportMessageP.textContent = "Generating report...";
    attendanceReportTable.classList.add('hidden');
    attendanceReportTableBody.innerHTML = '';
    showErrorAlert(''); 
    showSuccessAlert(''); 

    const selectedClass = dashboardClassDropdown.value;
    const filterType = attendanceDateFilterType.value;
    let startDate = null;
    let endDate = null;

    if (selectedClass === "" || selectedClass === DEFAULT_CLASS_OPTION) {
        showErrorAlert("Please select a class to generate the report.");
        attendanceReportMessageP.textContent = "Select a class and date filter, then click 'Generate Report'.";
        return;
    }

    if (filterType === 'today') {
        const today = getTodayDateString();
        startDate = today;
        endDate = today;
    } else if (filterType === 'specificDate') {
        startDate = attendanceReportDateInput.value;
        endDate = attendanceReportDateInput.value;
        if (!startDate) {
            showErrorAlert("Please select a specific date.");
            attendanceReportMessageP.textContent = "Select a class and date filter, then click 'Generate Report'.";
            return;
        }
    } else if (filterType === 'dateRange') {
        startDate = attendanceStartDateInput.value;
        endDate = attendanceEndDateInput.value;
        if (!startDate || !endDate) {
            showErrorAlert("Please select both start and end dates for the range.");
            attendanceReportMessageP.textContent = "Select a class and date filter, then click 'Generate Report'.";
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            showErrorAlert("Start date cannot be after end date.");
            attendanceReportMessageP.textContent = "Select a class and date filter, then click 'Generate Report'.";
            return;
        }
    }

    generateAttendanceReportBtn.disabled = true;
    generateAttendanceReportBtn.classList.add('opacity-50', 'cursor-not-allowed');
    generateAttendanceReportBtn.textContent = "Loading Report...";

    try {
        const payload = {
            action: ACTION_GET_REPORT_DATA, // Use the same backend action, filter in frontend
            class: selectedClass,
            startDate: startDate,
            endDate: endDate,
            userEmail: appState.currentUser.email
        };

        const data = await sendAuthenticatedRequest(payload);

        if (data.result === 'success' && Array.isArray(data.report)) {
            appState.data.currentAttendanceReportRawData = data.report; // Store raw data for attendance
            renderAttendanceReport(data.report, filterType, startDate); // Pass raw data and filter type
        } else {
            showErrorAlert(`Error generating attendance report: ${data.error || 'Unknown error'}`);
            attendanceReportMessageP.textContent = "Failed to generate attendance report. Please try again or check console for details.";
        }
    } catch (error) {
        console.error('Error fetching attendance report data:', error);
        showErrorAlert("Failed to generate attendance report. Network or authentication issue. Please ensure you are signed in.");
        attendanceReportMessageP.textContent = "Failed to generate attendance report. Please try again or check console for details.";
    } finally {
        generateAttendanceReportBtn.disabled = false;
        generateAttendanceReportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        generateAttendanceReportBtn.textContent = "Generate Report";
    }
}


/**
 * Applies the duration filter (show only > 5 minutes) to the Sign Out History report table rows.
 * This is done client-side after the report is fetched.
 */
function applySignOutHistoryDurationFilter() {
    const showLongDurationsOnly = filterLongDurationsCheckbox.checked;
    const thresholdSeconds = TARDY_THRESHOLD_MINUTES * 60; // 5 minutes in seconds

    Array.from(signOutHistoryReportTableBody.rows).forEach(row => {
        const typeCell = row.cells[3]; // 'Type' column
        const durationCell = row.cells[4]; // 'Duration (s)' column

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
 * Generates and displays the Sign Out History report. (Existing functionality, adapted for tab)
 */
async function generateSignOutHistoryReport() {
    signOutHistoryReportMessageP.textContent = "Generating report...";
    signOutHistoryReportTable.classList.add('hidden');
    signOutHistoryReportTableBody.innerHTML = '';
    showErrorAlert(''); 
    showSuccessAlert(''); 

    const selectedClass = dashboardClassDropdown.value;
    const filterType = signOutHistoryDateFilterType.value;
    let startDate = null;
    let endDate = null;

    if (selectedClass === "" || selectedClass === DEFAULT_CLASS_OPTION) {
        showErrorAlert("Please select a class to generate the report.");
        signOutHistoryReportMessageP.textContent = "Select a class and date filter, then click 'Generate Report'.";
        return;
    }

    if (filterType === 'today') {
        const today = getTodayDateString();
        startDate = today;
        endDate = today;
    } else if (filterType === 'specificDate') {
        startDate = signOutHistoryReportDateInput.value;
        endDate = signOutHistoryReportDateInput.value;
        if (!startDate) {
            showErrorAlert("Please select a specific date.");
            signOutHistoryReportMessageP.textContent = "Select a class and date filter, then click 'Generate Report'.";
            return;
        }
    } else if (filterType === 'dateRange') {
        startDate = signOutHistoryStartDateInput.value;
        endDate = signOutHistoryEndDateInput.value;
        if (!startDate || !endDate) {
            showErrorAlert("Please select both start and end dates for the range.");
            signOutHistoryReportMessageP.textContent = "Select a class and date filter, then click 'Generate Report'.";
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            showErrorAlert("Start date cannot be after end date.");
            signOutHistoryReportMessageP.textContent = "Select a class and date filter, then click 'Generate Report'.";
            return;
        }
    }

    generateSignOutHistoryBtn.disabled = true;
    generateSignOutHistoryBtn.classList.add('opacity-50', 'cursor-not-allowed');
    generateSignOutHistoryBtn.textContent = "Loading Report...";

    try {
        const payload = {
            action: ACTION_GET_REPORT_DATA, // Use this action, backend returns all data for range
            class: selectedClass,
            startDate: startDate,
            endDate: endDate,
            userEmail: appState.currentUser.email
        };

        const data = await sendAuthenticatedRequest(payload);

        if (data.result === 'success' && Array.isArray(data.report)) {
            appState.data.currentSignOutHistoryRawData = data.report; // Store the raw, unfiltered report data

            if (appState.data.currentSignOutHistoryRawData.length === 0) {
                signOutHistoryReportMessageP.textContent = `No sign-out data found for ${selectedClass} within the selected date range.`;
                signOutHistoryReportTable.classList.add('hidden');
            } else {
                signOutHistoryReportMessageP.classList.add('hidden');
                signOutHistoryReportTable.classList.remove('hidden');
                
                signOutHistoryReportTableBody.innerHTML = ''; 

                appState.data.currentSignOutHistoryRawData.forEach(row => {
                    const tr = document.createElement('tr');
                    let type = "Sign Out";
                    let durationDisplay = row.Seconds;

                    if (row.Seconds === "Late Sign In") {
                        type = "Late Sign In";
                        durationDisplay = "N/A";
                    } else if (typeof row.Seconds === 'number') {
                        durationDisplay = formatDuration(row.Seconds);
                    }

                    tr.innerHTML = `
                        <td class="py-2 px-4 border-b">${formatDate(row.Date)}</td>
                        <td class="py-2 px-4 border-b">${formatTime(row.Date)}</td>
                        <td class="py-2 px-4 border-b">${row.Name || 'N/A'}</td>
                        <td class="py-2 px-4 border-b">${type}</td>
                        <td class="py-2 px-4 border-b">${durationDisplay}</td>
                    `;
                    signOutHistoryReportTableBody.appendChild(tr);
                });
                
                applySignOutHistoryDurationFilter(); // Apply the filter after all rows are rendered
            }
        } else {
            showErrorAlert(`Error generating report: ${data.error || 'Unknown error'}`);
            signOutHistoryReportMessageP.textContent = "Failed to generate report. Please try again or check console for details.";
        }
    } catch (error) {
        console.error('Error fetching report data:', error);
        showErrorAlert("Failed to generate report. Network or authentication issue. Please ensure you are signed in.");
        signOutHistoryReportMessageP.textContent = "Failed to generate report. Please try again or check console for details.";
    } finally {
        generateSignOutHistoryBtn.disabled = false;
        generateSignOutHistoryBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        generateSignOutHistoryBtn.textContent = "Generate Report";
    }
}

/**
 * Populates the student dropdown for individual history.
 */
function populateStudentHistoryDropdown() {
    const studentNamesSet = new Set();
    studentNamesSet.add(DEFAULT_NAME_OPTION); // Always include default

    // Collect all unique student names from all classes for the current teacher
    appState.data.allNamesFromSheet.forEach(item => {
        if (item && item.Name) {
            studentNamesSet.add(item.Name);
        }
    });

    const sortedStudentNames = Array.from(studentNamesSet).sort();
    populateDropdown('studentHistoryDropdown', sortedStudentNames, DEFAULT_NAME_OPTION, DEFAULT_NAME_OPTION);
    studentHistoryDropdown.removeAttribute("disabled");
}

/**
 * Generates and displays the Individual Student History report.
 */
async function generateStudentHistoryReport() {
    studentHistoryReportMessageP.textContent = "Generating report...";
    studentHistoryReportTable.classList.add('hidden');
    studentHistoryReportTableBody.innerHTML = '';
    showErrorAlert('');
    showSuccessAlert('');

    const selectedClass = dashboardClassDropdown.value; // Class from main dropdown
    const selectedStudent = studentHistoryDropdown.value; // Specific student
    const filterType = studentHistoryDateFilterType.value;
    let startDate = null;
    let endDate = null;

    if (selectedClass === "" || selectedClass === DEFAULT_CLASS_OPTION) {
        showErrorAlert("Please select a class first.");
        studentHistoryReportMessageP.textContent = "Select a student and date filter, then click 'Generate Report'.";
        return;
    }
    if (selectedStudent === "" || selectedStudent === DEFAULT_NAME_OPTION) {
        showErrorAlert("Please select a student to generate their history.");
        studentHistoryReportMessageP.textContent = "Select a student and date filter, then click 'Generate Report'.";
        return;
    }

    if (filterType === 'today') {
        const today = getTodayDateString();
        startDate = today;
        endDate = today;
    } else if (filterType === 'specificDate') {
        startDate = studentHistoryReportDateInput.value;
        endDate = studentHistoryReportDateInput.value;
        if (!startDate) {
            showErrorAlert("Please select a specific date.");
            studentHistoryReportMessageP.textContent = "Select a student and date filter, then click 'Generate Report'.";
            return;
        }
    } else if (filterType === 'dateRange') {
        startDate = studentHistoryStartDateInput.value;
        endDate = studentHistoryEndDateInput.value;
        if (!startDate || !endDate) {
            showErrorAlert("Please select both start and end dates for the range.");
            studentHistoryReportMessageP.textContent = "Select a student and date filter, then click 'Generate Report'.";
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            showErrorAlert("Start date cannot be after end date.");
            studentHistoryReportMessageP.textContent = "Select a student and date filter, then click 'Generate Report'.";
            return;
        }
    } else if (filterType === 'allTime') {
        startDate = ''; // Empty string to indicate no date filter to backend
        endDate = '';
    }

    generateStudentHistoryBtn.disabled = true;
    generateStudentHistoryBtn.classList.add('opacity-50', 'cursor-not-allowed');
    generateStudentHistoryBtn.textContent = "Loading Report...";

    try {
        const payload = {
            action: ACTION_GET_REPORT_DATA, // Use the same action, filter data on frontend
            class: selectedClass, // Send class
            studentName: selectedStudent, // Send specific student name
            startDate: startDate,
            endDate: endDate,
            userEmail: appState.currentUser.email
        };

        const data = await sendAuthenticatedRequest(payload);

        if (data.result === 'success' && Array.isArray(data.report)) {
            // Filter report data client-side for the specific student
            const studentHistory = data.report.filter(entry => entry.Name === selectedStudent);

            if (studentHistory.length === 0) {
                studentHistoryReportMessageP.textContent = `No history found for ${selectedStudent} within the selected criteria.`;
                studentHistoryReportTable.classList.add('hidden');
            } else {
                studentHistoryReportMessageP.classList.add('hidden');
                studentHistoryReportTable.classList.remove('hidden');
                studentHistoryReportTableBody.innerHTML = '';

                studentHistory.forEach(row => {
                    const tr = document.createElement('tr');
                    let type = "Sign Out";
                    let durationDisplay = row.Seconds;

                    if (row.Seconds === "Late Sign In") {
                        type = "Late Sign In";
                        durationDisplay = "N/A";
                    } else if (typeof row.Seconds === 'number') {
                        durationDisplay = formatDuration(row.Seconds);
                    }
                     // Highlight long durations/late sign-ins
                    const isLongDuration = (type === "Sign Out" && typeof row.Seconds === 'number' && row.Seconds > (TARDY_THRESHOLD_MINUTES * 60));
                    const isLateSignIn = type === "Late Sign In";

                    if (isLongDuration || isLateSignIn) {
                        tr.classList.add('bg-red-200'); // Tailwind class for light red background
                    }

                    tr.innerHTML = `
                        <td class="py-2 px-4 border-b">${formatDate(row.Date)}</td>
                        <td class="py-2 px-4 border-b">${formatTime(row.Date)}</td>
                        <td class="py-2 px-4 border-b">${type}</td>
                        <td class="py-2 px-4 border-b">${durationDisplay}</td>
                    `;
                    studentHistoryReportTableBody.appendChild(tr);
                });
            }
        } else {
            showErrorAlert(`Error generating student history: ${data.error || 'Unknown error'}`);
            studentHistoryReportMessageP.textContent = "Failed to generate student history. Please try again or check console for details.";
        }
    } catch (error) {
        console.error('Error fetching student history data:', error);
        showErrorAlert("Failed to generate student history. Network or authentication issue. Please ensure you are signed in.");
        studentHistoryReportMessageP.textContent = "Failed to generate student history. Please try again or check console for details.";
    } finally {
        generateStudentHistoryBtn.disabled = false;
        generateStudentHistoryBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        generateStudentHistoryBtn.textContent = "Generate Report";
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

    // Initialize all date filters to 'today' and set current date strings
    const todayStr = getTodayDateString();

    attendanceDateFilterType.value = 'today';
    toggleAttendanceDateInputs();
    attendanceReportDateInput.value = todayStr;
    attendanceStartDateInput.value = todayStr;
    attendanceEndDateInput.value = todayStr;

    signOutHistoryDateFilterType.value = 'today';
    toggleSignOutHistoryDateInputs();
    signOutHistoryReportDateInput.value = todayStr;
    signOutHistoryStartDateInput.value = todayStr;
    signOutHistoryEndDateInput.value = todayStr;
    filterLongDurationsCheckbox.checked = false; // Reset checkbox

    studentHistoryDateFilterType.value = 'today';
    toggleStudentHistoryDateInputs();
    studentHistoryReportDateInput.value = todayStr;
    studentHistoryStartDateInput.value = todayStr;
    studentHistoryEndDateInput.value = todayStr;

    // Reset report output messages and tables for all tabs
    attendanceReportMessageP.textContent = "Select a class and date filter, then click 'Generate Report'.";
    attendanceReportTable.classList.add('hidden');
    attendanceReportTableBody.innerHTML = '';

    signOutHistoryReportMessageP.textContent = "Select a class and date filter, then click 'Generate Report'.";
    signOutHistoryReportTable.classList.add('hidden');
    signOutHistoryReportTableBody.innerHTML = '';

    studentHistoryReportMessageP.textContent = "Select a student and date filter, then click 'Generate Report'.";
    studentHistoryReportTable.classList.add('hidden');
    studentHistoryReportTableBody.innerHTML = '';
    
    // Disable student dropdown until class is selected
    populateDropdown('studentHistoryDropdown', [], DEFAULT_NAME_OPTION, DEFAULT_NAME_OPTION);
    studentHistoryDropdown.setAttribute("disabled", "disabled");


    // Default button states
    generateAttendanceReportBtn.disabled = false;
    generateAttendanceReportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    generateAttendanceReportBtn.textContent = "Generate Report";

    generateSignOutHistoryBtn.disabled = false;
    generateSignOutHistoryBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    generateSignOutHistoryBtn.textContent = "Generate Report";

    generateStudentHistoryBtn.disabled = false;
    generateStudentHistoryBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    generateStudentHistoryBtn.textContent = "Generate Report";


    console.log("initializePageSpecificApp (Dashboard): Current user state:", appState.currentUser);

    if (appState.currentUser.email && appState.currentUser.idToken) {
        try {
            console.log("initializePageSpecificApp (Dashboard): Fetching all student data...");
            await fetchAllStudentData(); // common.js function to get all student data (which includes classes)
            console.log("initializePageSpecificApp (Dashboard): appState.data.allNamesFromSheet:", appState.data.allNamesFromSheet);
            
            populateCourseDropdownFromData(); // This function is in common.js and populates appState.data.courses
            console.log("initializePageSpecificApp (Dashboard): appState.data.courses (after populateCourseDropdownFromData):", appState.data.courses);

            populateDropdown('dashboardClassDropdown', appState.data.courses, DEFAULT_CLASS_OPTION, "");
            dashboardClassDropdown.removeAttribute("disabled");

            // Populate student dropdown from all available students (unfiltered by class initially)
            const allUniqueStudentNames = Array.from(new Set(appState.data.allNamesFromSheet.map(s => s.Name))).sort();
            populateDropdown('studentHistoryDropdown', allUniqueStudentNames, DEFAULT_NAME_OPTION, DEFAULT_NAME_OPTION);
            // Re-disable student history dropdown if no class is selected yet
            if (dashboardClassDropdown.value === "" || dashboardClassDropdown.value === DEFAULT_CLASS_OPTION) {
                studentHistoryDropdown.setAttribute("disabled", "disabled");
            } else {
                studentHistoryDropdown.removeAttribute("disabled");
            }


            // Set default tab to Attendance Report
            showDashboardTab('attendanceReportTabContent');

        } catch (error) {
            console.error("Failed to initialize dashboard with data:", error);
            populateDropdown('dashboardClassDropdown', [], "Error loading classes", "");
            dashboardClassDropdown.setAttribute("disabled", "disabled");
            populateDropdown('studentHistoryDropdown', [], "Error loading students", "");
            studentHistoryDropdown.setAttribute("disabled", "disabled");
        }
    } else {
        console.warn("User not authenticated for dashboard. Cannot fetch data.");
        populateDropdown('dashboardClassDropdown', [], "Sign in to load classes", "");
        dashboardClassDropdown.setAttribute("disabled", "disabled");
        populateDropdown('studentHistoryDropdown', [], "Sign in to load students", "");
        studentHistoryDropdown.setAttribute("disabled", "disabled");
    }
}

/**
 * Resets all Teacher Dashboard page specific UI and state.
 * This is the page-specific reset called by common.js on sign-out.
 */
function resetPageSpecificAppState() {
    // Reset appState.data for a clean slate
    appState.data = { allNamesFromSheet: [], courses: [], namesForSelectedCourse: [], currentSignOutHistoryRawData: [], currentAttendanceReportRawData: [] }; 

    // Reset class dropdown
    populateDropdown('dashboardClassDropdown', [], DEFAULT_CLASS_OPTION, "");
    dashboardClassDropdown.setAttribute("disabled", "disabled");

    // Reset student history dropdown
    populateDropdown('studentHistoryDropdown', [], DEFAULT_NAME_OPTION, DEFAULT_NAME_OPTION);
    studentHistoryDropdown.setAttribute("disabled", "disabled");

    // Reset date filters for all tabs
    attendanceDateFilterType.value = 'today';
    toggleAttendanceDateInputs();
    attendanceReportDateInput.value = '';
    attendanceStartDateInput.value = '';
    attendanceEndDateInput.value = '';

    signOutHistoryDateFilterType.value = 'today';
    toggleSignOutHistoryDateInputs();
    signOutHistoryReportDateInput.value = '';
    signOutHistoryStartDateInput.value = '';
    signOutHistoryEndDateInput.value = '';
    filterLongDurationsCheckbox.checked = false; // Reset checkbox

    studentHistoryDateFilterType.value = 'today';
    toggleStudentHistoryDateInputs();
    studentHistoryReportDateInput.value = '';
    studentHistoryStartDateInput.value = '';
    studentHistoryEndDateInput.value = '';


    // Clear report output for all tabs
    attendanceReportTableBody.innerHTML = '';
    attendanceReportTable.classList.add('hidden');
    attendanceReportMessageP.textContent = "Select a class and date filter, then click 'Generate Report'.";

    signOutHistoryReportTableBody.innerHTML = '';
    signOutHistoryReportTable.classList.add('hidden');
    signOutHistoryReportMessageP.textContent = "Select a class and date filter, then click 'Generate Report'.";

    studentHistoryReportTableBody.innerHTML = '';
    studentHistoryReportTable.classList.add('hidden');
    studentHistoryReportMessageP.textContent = "Select a student and date filter, then click 'Generate Report'.";


    // Reset button states
    generateAttendanceReportBtn.disabled = false;
    generateAttendanceReportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    generateAttendanceReportBtn.textContent = "Generate Report";

    generateSignOutHistoryBtn.disabled = false;
    generateSignOutHistoryBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    generateSignOutHistoryBtn.textContent = "Generate Report";

    generateStudentHistoryBtn.disabled = false;
    generateStudentHistoryBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    generateStudentHistoryBtn.textContent = "Generate Report";

    // Show default tab (Attendance Report)
    showDashboardTab('attendanceReportTabContent');
}

// --- Event Listeners specific to Teacher Dashboard page (All function calls go here, after functions are defined) ---
// Tab Buttons
attendanceReportTabBtn.addEventListener('click', () => showDashboardTab('attendanceReportTabContent'));
signOutHistoryTabBtn.addEventListener('click', () => showDashboardTab('signOutHistoryTabContent'));
studentHistoryTabBtn.addEventListener('click', () => showDashboardTab('studentHistoryTabContent'));

// Class Dropdown - Main filter for the dashboard
dashboardClassDropdown.addEventListener('change', async () => {
    // When class changes, disable student history dropdown if default class is selected
    if (dashboardClassDropdown.value === "" || dashboardClassDropdown.value === DEFAULT_CLASS_OPTION) {
        studentHistoryDropdown.setAttribute("disabled", "disabled");
    } else {
        studentHistoryDropdown.removeAttribute("disabled");
    }
    // Optionally trigger a report generation automatically on class change,
    // or rely on user clicking "Generate Report"
});


// Tab 1: Attendance Report Listeners
attendanceDateFilterType.addEventListener('change', toggleAttendanceDateInputs);
generateAttendanceReportBtn.addEventListener('click', generateAttendanceReport);


// Tab 2: Sign Out History Listeners
signOutHistoryDateFilterType.addEventListener('change', toggleSignOutHistoryDateInputs);
generateSignOutHistoryBtn.addEventListener('click', generateSignOutHistoryReport);
filterLongDurationsCheckbox.addEventListener('change', applySignOutHistoryDurationFilter);


// Tab 3: Student History Listeners
studentHistoryDateFilterType.addEventListener('change', toggleStudentHistoryDateInputs);
generateStudentHistoryBtn.addEventListener('click', generateStudentHistoryReport);
// studentHistoryDropdown.addEventListener('change', ...); // Add a listener if needed for immediate student selection actions

// Call initGoogleSignIn on DOM load for this specific page.
document.addEventListener('DOMContentLoaded', initGoogleSignIn);
