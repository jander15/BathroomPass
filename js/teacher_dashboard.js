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
 * Generates today's date investre-MM-DD format.
 * @returns {string} Current date string.
 */
function getTodayDateString() {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Formats to वर्षे-MM-DD
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
 * Initializes the Teacher Dashboard application elements and fetches initial data.
 * This is the page-specific initialization called by common.js.
 */
async function initializePageSpecificApp() {
    alertDiv.classList.add("hidden");
    errorAlertDiv.classList.add("hidden");

    populateDropdown('dashboardClassDropdown', [], LOADING_OPTION, "");
    dashboardClassDropdown.setAttribute("disabled", "disabled");

    // Pre-select 'Today' and hide other date inputs
    dateFilterType.value = 'today';
    toggleDateInputs();
    reportDateInput.value = getTodayDateString(); 
    startDateInput.value = getTodayDateString();
    endDateInput.value = getTodayDateString();

    filterLongDurationsCheckbox.checked = false; // Ensure checkbox is reset on init

    generateReportBtn.disabled = false;
    generateReportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    generateReportBtn.textContent = "Generate Report";

    reportMessageP.textContent = "Select a class and date filter, then click 'Generate Report'.";
    reportTable.classList.add('hidden');
    reportTableBody.innerHTML = '';

    console.log("initializePageSpecificApp (Dashboard): Current user state:", appState.currentUser);

    if (appState.currentUser.email && appState.currentUser.idToken) {
        try {
            console.log("initializePageSpecificApp (Dashboard): Fetching all student data...");
            await fetchAllStudentData(); // common.js function to get all student data (which includes classes)
            console.log("initializePageSpecificApp (Dashboard): appState.data.allNamesFromSheet:", appState.data.allNamesFromSheet);
            
            populateCourseDropdownFromData(); // This function is in common.js
            console.log("initializePageSpecificApp (Dashboard): appState.data.courses (after populateCourseDropdownFromData):", appState.data.courses);

            populateDropdown('dashboardClassDropdown', appState.data.courses, DEFAULT_CLASS_OPTION, "");
            dashboardClassDropdown.removeAttribute("disabled");

            // Optionally, trigger initial report if a class is pre-selected or default
            // This is generally not done automatically on dashboard load,
            // but left here for quick testing if needed.
            // if (dashboardClassDropdown.value && dashboardClassDropdown.value !== DEFAULT_CLASS_OPTION) {
            //      generateReport();
            // }

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
}

/**
 * Resets all Teacher Dashboard page specific UI and state.
 * This is the page-specific reset called by common.js on sign-out.
 */
function resetPageSpecificAppState() {
    // Reset appState.data for a clean slate
    appState.data = { allNamesFromSheet: [], courses: [], namesForSelectedCourse: [], currentReportData: [] }; // Reset currentReportData too

    // Reset dropdowns
    populateDropdown('dashboardClassDropdown', [], DEFAULT_CLASS_OPTION, "");
    dashboardClassDropdown.setAttribute("disabled", "disabled");

    // Reset date filters
    dateFilterType.value = 'today';
    toggleDateInputs(); // Ensure only 'today' input is visible
    reportDateInput.value = '';
    startDateInput.value = '';
    endDateInput.value = '';
    filterLongDurationsCheckbox.checked = false; // Reset checkbox

    // Clear report output
    reportTableBody.innerHTML = '';
    reportTable.classList.add('hidden');
    reportMessageP.textContent = "Select a class and date filter, then click 'Generate Report'.";

    // Reset button state
    generateReportBtn.disabled = false;
    generateReportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    generateReportBtn.textContent = "Generate Report";
}

// --- Event Listeners specific to Teacher Dashboard page (All function calls go here, after functions are defined) ---
document.addEventListener('DOMContentLoaded', initGoogleSignIn); // Initialize GSI on DOM load for this page
dateFilterType.addEventListener('change', toggleDateInputs);
generateReportBtn.addEventListener('click', generateReport);
filterLongDurationsCheckbox.addEventListener('change', applyDurationFilter); // New event listener for the checkbox
