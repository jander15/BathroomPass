// js/teacher_dashboard.js

// --- DOM Element Caching (Elements specific to the Teacher Dashboard page) ---
const dashboardClassDropdown = document.getElementById('dashboardClassDropdown');
const dateFilterType = document.getElementById('dateFilterType');
const specificDateInputDiv = document.getElementById('specificDateInput');
const reportDateInput = document.getElementById('reportDate');
const dateRangeInputsDiv = document.getElementById('dateRangeInputs');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const filterLongDurationsCheckbox = document.getElementById('filterLongDurations'); // New checkbox
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
const attendanceReportOutputDiv = document.getElementById('attendanceReportOutput');
const attendanceReportMessageP = document.getElementById('attendanceReportMessage');
const attendanceReportTable = document.getElementById('attendanceReportTable');
const attendanceReportTableBody = document.getElementById('attendanceReportTableBody');
const detailsModal = document.getElementById('detailsModal');
const modalStudentName = document.getElementById('modalStudentName');
const modalDetailsContent = document.getElementById('modalDetailsContent');
const closeModalBtn = document.getElementById('closeModalBtn');


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
                totalSeconds = parseFloat(durationCell.textContent || '0'); // Assuming it's already a number
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
    showErrorAlert(''); // Clear previous errors
    showSuccessAlert(''); // Clear previous successes

    const selectedClass = dashboardClassDropdown.value;
    const filterType = dateFilterType.value;
    // filterLongDurationsCheckbox.checked is now handled client-side after fetch
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
        // Basic date validation
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
            // filterLongDurations is NOT sent to backend anymore
            userEmail: appState.currentUser.email
        };

        const data = await sendAuthenticatedRequest(payload);

        if (data.result === 'success' && Array.isArray(data.report)) {
            appState.data.currentReportData = data.report; // Store the raw, unfiltered report data

            if (appState.data.currentReportData.length === 0) {
                reportMessageP.textContent = `No sign-out data found for ${selectedClass} within the selected date range.`;
                reportTable.classList.add('hidden');
            } else {
                reportMessageP.classList.add('hidden'); // Hide message if data is found
                reportTable.classList.remove('hidden');
                
                // Clear existing rows before appending new ones
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
                
                // Apply the filter after all rows are rendered
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
        // Automatically generate the report if a class is selected
        if (dashboardClassDropdown.value && dashboardClassDropdown.value !== DEFAULT_CLASS_OPTION) {
             generateAttendanceReport();
        }
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
 * Generates and displays the attendance report.
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

    try {
        // 1. Fetch sign-out data for the selected day
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

        // 2. Get all students for the class
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

        // 3. Process and display
        allStudentsInClass.forEach(studentName => {
            const studentSignOuts = reportData.report.filter(record => record.Name === studentName);
            const tr = document.createElement('tr');
            tr.dataset.studentName = studentName;

            let status = "Present";
            let isClickable = false;
            let hasLateSignIn = false;
            let hasLongSignOut = false;

            if (studentSignOuts.length > 0) {
                isClickable = true;
                tr.dataset.signOuts = JSON.stringify(studentSignOuts); // Store data for modal

                hasLateSignIn = studentSignOuts.some(record => record.Seconds === "Late Sign In");
                hasLongSignOut = studentSignOuts.some(record => typeof record.Seconds === 'number' && record.Seconds > (TARDY_THRESHOLD_MINUTES * 60));

                if (hasLateSignIn && hasLongSignOut) {
                    status = "Late Sign In & Long Sign Out";
                } else if (hasLateSignIn) {
                    status = "Late Sign In";
                } else if (hasLongSignOut) {
                    status = "Long Sign Out (> 5 min)";
                } else {
                    status = `Signed Out (${studentSignOuts.length} time(s))`;
                }
            }

            tr.innerHTML = `
                <td class="py-2 px-4 border-b">${studentName}</td>
                <td class="py-2 px-4 border-b">${status}</td>
            `;

            if (hasLateSignIn || hasLongSignOut) {
                tr.classList.add('bg-red-200');
            }

            if (isClickable) {
                tr.classList.add('cursor-pointer', 'hover:bg-gray-200');
                tr.addEventListener('click', () => showStudentDetails(tr.dataset.studentName, tr.dataset.signOuts));
            }

            attendanceReportTableBody.appendChild(tr);
        });

    } catch (error) {
        console.error('Error generating attendance report:', error);
        showErrorAlert(`Failed to generate attendance report: ${error.message}`);
        attendanceReportMessageP.textContent = "Failed to generate report. Please try again.";
        attendanceReportMessageP.classList.remove('hidden');
    }
}


/**
 * Shows the modal with a student's sign-out details.
 * @param {string} studentName - The name of the student.
 * @param {string} signOutsJSON - The sign-out data as a JSON string.
 */
function showStudentDetails(studentName, signOutsJSON) {
    const signOuts = JSON.parse(signOutsJSON);
    modalStudentName.textContent = `For: ${studentName}`;

    let detailsHtml = '<ul class="list-disc list-inside">';
    signOuts.forEach(record => {
        if (record.Seconds === "Late Sign In") {
            detailsHtml += `<li>Late Sign In at ${formatTime(record.Date)}</li>`;
        } else {
            const totalSeconds = record.Seconds;
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            const durationDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            detailsHtml += `<li>Signed out at ${formatTime(record.Date)} for a duration of ${durationDisplay}</li>`;
        }
    });
    detailsHtml += '</ul>';

    modalDetailsContent.innerHTML = detailsHtml;
    detailsModal.classList.remove('hidden');
}


/**
 * Hides the student details modal.
 */
function hideStudentDetails() {
    detailsModal.classList.add('hidden');
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

    // Pre-select 'Today' and hide other date inputs for Sign Out report
    dateFilterType.value = 'today';
    toggleDateInputs();
    reportDateInput.value = getTodayDateString(); 
    startDateInput.value = getTodayDateString();
    endDateInput.value = getTodayDateString();

    // Set default date for Attendance Report
    attendanceDateInput.value = getTodayDateString();

    filterLongDurationsCheckbox.checked = false; 

    generateReportBtn.disabled = false;
    generateReportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    generateReportBtn.textContent = "Generate Report";

    reportMessageP.textContent = "Select a class and date filter, then click 'Generate Report'.";
    reportTable.classList.add('hidden');
    reportTableBody.innerHTML = '';
    
    attendanceReportMessageP.textContent = "Select a class and date to generate the attendance report.";
    attendanceReportTable.classList.add('hidden');
    attendanceReportTableBody.innerHTML = '';

    console.log("initializePageSpecificApp (Dashboard): Current user state:", appState.currentUser);

    if (appState.currentUser.email && appState.currentUser.idToken) {
        try {
            console.log("initializePageSpecificApp (Dashboard): Fetching all student data...");
            await fetchAllStudentData(); 
            console.log("initializePageSpecificApp (Dashboard): appState.data.allNamesFromSheet:", appState.data.allNamesFromSheet);
            
            populateCourseDropdownFromData();
            console.log("initializePageSpecificApp (Dashboard): appState.data.courses (after populateCourseDropdownFromData):", appState.data.courses);

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
    
    // Set the initial tab view
    switchTab('signOut');
}

/**
 * Resets all Teacher Dashboard page specific UI and state.
 * This is the page-specific reset called by common.js on sign-out.
 */
function resetPageSpecificAppState() {
    // Reset appState.data for a clean slate
    appState.data = { allNamesFromSheet: [], courses: [], namesForSelectedCourse: [], currentReportData: [] }; 

    // Reset dropdowns
    populateDropdown('dashboardClassDropdown', [], DEFAULT_CLASS_OPTION, "");
    dashboardClassDropdown.setAttribute("disabled", "disabled");

    // Reset date filters
    dateFilterType.value = 'today';
    toggleDateInputs();
    reportDateInput.value = '';
    startDateInput.value = '';
    endDateInput.value = '';
    attendanceDateInput.value = '';
    filterLongDurationsCheckbox.checked = false; 

    // Clear sign out report output
    reportTableBody.innerHTML = '';
    reportTable.classList.add('hidden');
    reportMessageP.textContent = "Select a class and date filter, then click 'Generate Report'.";

    // Clear attendance report output
    attendanceReportTableBody.innerHTML = '';
    attendanceReportTable.classList.add('hidden');
    attendanceReportMessageP.textContent = "Select a class and date to generate the attendance report.";

    // Reset button state
    generateReportBtn.disabled = false;
    generateReportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    generateReportBtn.textContent = "Generate Report";
    
    // Reset to default tab
    switchTab('signOut');
}

// --- Event Listeners specific to Teacher Dashboard page (All function calls go here, after functions are defined) ---
document.addEventListener('DOMContentLoaded', initGoogleSignIn); // Initialize GSI on DOM load for this page
dateFilterType.addEventListener('change', toggleDateInputs);
generateReportBtn.addEventListener('click', generateReport);
filterLongDurationsCheckbox.addEventListener('change', applyDurationFilter);
// New listeners for attendance report
signOutReportTab.addEventListener('click', () => switchTab('signOut'));
attendanceReportTab.addEventListener('click', () => switchTab('attendance'));
attendanceDateInput.addEventListener('change', generateAttendanceReport);
dashboardClassDropdown.addEventListener('change', () => {
    // Determine which report is active and regenerate it
    if (!signOutReportContent.classList.contains('hidden')) {
        reportTable.classList.add('hidden');
        reportMessageP.textContent = "Class changed. Click 'Generate Report' to see new data.";
        reportMessageP.classList.remove('hidden');
    }
    if (!attendanceReportContent.classList.contains('hidden')) {
        generateAttendanceReport();
    }
});

closeModalBtn.addEventListener('click', hideStudentDetails);
// Also close modal if clicking outside of it
detailsModal.addEventListener('click', (event) => {
    if (event.target === detailsModal) {
        hideStudentDetails();
    }
});