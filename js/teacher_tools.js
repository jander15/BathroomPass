// js/teacher_tools.js

// --- DOM Element Caching ---
let classDropdown, chartMessage, seatingChartGrid, instructionsArea, toolsContent;
let generatePairsBtn, generateThreesBtn, generateFoursBtn;
let groupCountInput, generateGroupsByCountBtn;
let unselectedStudentsGrid;
let selectAllBtn, deselectAllBtn;
let startClassBtn, originalSeatingBtn, attendanceToggleBtn;
let setupButtons, inClassButtons; // Button containers
let groupBtns = [];
let sortableInstance = null;

// --- State Tracking ---
let classStarted = false;
let originalSeating = null;
let preselectedStudents = new Set();
let participatedStudents = new Set();
let attendanceVisible = true;

let showTimerBtn, timerContainer, timerHeader, timerHideBtn, timerMinutesInput, timerSecondsInput, timerPlayPauseBtn, timerResetBtn, timerAudio;
let timeRemaining = 0;
let timerInterval = null;

// --- Color Palette for Groups ---
const groupColors = [ { bg: '#fef2f2', border: '#fca5a5' }, { bg: '#fff7ed', border: '#fdba74' }, { bg: '#fefce8', border: '#fde047' }, { bg: '#f7fee7', border: '#bef264' }, { bg: '#ecfdf5', border: '#86efac' }, { bg: '#eff6ff', border: '#93c5fd' }, { bg: '#f5f3ff', border: '#c4b5fd' }, { bg: '#faf5ff', border: '#d8b4fe' }, { bg: '#fdf2f8', border: '#f9a8d4' }];

/** Caches all DOM elements specific to the Teacher Tools page. */
function cacheToolsDOMElements() {
    classDropdown = document.getElementById('classDropdown');
    chartMessage = document.getElementById('chartMessage');
    seatingChartGrid = document.getElementById('seatingChartGrid');
    instructionsArea = document.getElementById('instructionsArea');
    toolsContent = document.getElementById('toolsContent');
    generatePairsBtn = document.getElementById('generatePairsBtn');
    generateThreesBtn = document.getElementById('generateThreesBtn');
    generateFoursBtn = document.getElementById('generateFoursBtn');
    groupCountInput = document.getElementById('groupCountInput');
    generateGroupsByCountBtn = document.getElementById('generateGroupsByCountBtn');
    unselectedStudentsGrid = document.getElementById('unselectedStudentsGrid');
    selectAllBtn = document.getElementById('selectAllBtn');
    deselectAllBtn = document.getElementById('deselectAllBtn');
    startClassBtn = document.getElementById('startClassBtn');
    originalSeatingBtn = document.getElementById('originalSeatingBtn');
    attendanceToggleBtn = document.getElementById('attendanceToggleBtn');
    setupButtons = document.getElementById('setupButtons');
    inClassButtons = document.getElementById('inClassButtons');
    groupBtns = [generatePairsBtn, generateThreesBtn, generateFoursBtn, generateGroupsByCountBtn];
    showTimerBtn = document.getElementById('showTimerBtn');
    timerContainer = document.getElementById('timerContainer');
    timerHeader = document.getElementById('timerHeader');
    timerHideBtn = document.getElementById('timerHideBtn');
    timerMinutesInput = document.getElementById('timerMinutes');
    timerSecondsInput = document.getElementById('timerSeconds');
    timerPlayPauseBtn = document.getElementById('timerPlayPauseBtn');
    timerResetBtn = document.getElementById('timerResetBtn');
    timerAudio = document.getElementById('timerAudio');
}

/**
 * Makes an HTML element draggable by its handle.
 * @param {HTMLElement} element The element to drag.
 * @param {HTMLElement} handle The part of the element that starts the drag.
 */
function makeElementDraggable(element, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    const dragMouseDown = (e) => {
        e.preventDefault();
        // Get the mouse cursor position at startup
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // Call a function whenever the cursor moves
        document.onmousemove = elementDrag;
    };

    const elementDrag = (e) => {
        e.preventDefault();
        // Calculate the new cursor position
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // Set the element's new position
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    };

    const closeDragElement = () => {
        // Stop moving when mouse button is released
        document.onmouseup = null;
        document.onmousemove = null;
    };

    handle.onmousedown = dragMouseDown;
}

// ADD these new listeners for showing, hiding, and dragging the timer.
showTimerBtn.addEventListener('click', () => {
    timerContainer.classList.remove('hidden');
});

timerHideBtn.addEventListener('click', () => {
    timerContainer.classList.add('hidden');
});

timerPlayPauseBtn.addEventListener('click', () => {
    if (timerInterval) {
        pauseTimer();
    } else {
        playTimer();
    }
});

timerResetBtn.addEventListener('click', resetTimer);

// Make the timer draggable
makeElementDraggable(timerContainer, timerHeader);

/** Initializes Draggable.js Sortable functionality. */
function initializeSortable() {
    if (sortableInstance) sortableInstance.destroy();
    const containers = document.querySelectorAll('#seatingChartGrid, #unselectedStudentsGrid, .group-container');
    sortableInstance = new Draggable.Sortable(containers, {
        draggable: '.draggable-item',
        handle: '.draggable-item',
        mirror: { constrainDimensions: true },
        plugins: [Draggable.Plugins.ResizeMirror],
    });
}

/** Updates the visual state of the generation buttons. */
function updateActiveButton(activeBtn) {
    groupBtns.forEach(btn => {
        if (btn === activeBtn) btn.classList.add('active', 'bg-blue-700', 'text-white');
        else btn.classList.remove('active', 'bg-blue-700', 'text-white');
    });
}

/** Shuffles an array in place. */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/** Creates student groups with a special exception for pairs. */
function createStudentGroupsBySize(students, groupSize) {
    const shuffledStudents = [...students];
    shuffleArray(shuffledStudents);
    const groups = [];
    if (groupSize === 2) {
        while (shuffledStudents.length > 0) groups.push(shuffledStudents.splice(0, 2));
        return groups;
    }
    const studentCount = students.length;
    if (studentCount === 0) return [];
    const remainder = studentCount % groupSize;
    let numGroups = Math.floor(studentCount / groupSize);
    if (remainder >= 2) numGroups++;
    if (numGroups === 0 && studentCount > 0) numGroups = 1;
    const balancedGroups = Array.from({ length: numGroups }, () => []);
    let groupIndex = 0;
    shuffledStudents.forEach(student => {
        balancedGroups[groupIndex % numGroups].push(student);
        groupIndex++;
    });
    return balancedGroups;
}

/** Creates a specific number of student groups. */
function createStudentGroupsByCount(students, groupCount) {
    const shuffledStudents = [...students];
    shuffleArray(shuffledStudents);
    if (students.length === 0) return [];
    const groups = Array.from({ length: groupCount }, () => []);
    let groupIndex = 0;
    shuffledStudents.forEach(student => {
        groups[groupIndex % groupCount].push(student);
        groupIndex++;
    });
    return groups;
}

/** Saves the current seating chart layout. */
function captureSeatingState() {
    const groups = [];
    seatingChartGrid.querySelectorAll('.group-container').forEach(container => {
        groups.push(Array.from(container.querySelectorAll('.seat')).map(seat => seat.textContent));
    });
    const unselected = Array.from(unselectedStudentsGrid.querySelectorAll('.seat')).map(seat => seat.textContent);
    return { groups, unselected };
}

/** Renders a captured seating chart layout. */
function renderSeatingState(seatingState) {
    seatingChartGrid.innerHTML = '';
    unselectedStudentsGrid.innerHTML = '';
    seatingState.groups.forEach((group, index) => {
        const color = groupColors[index % groupColors.length];
        seatingChartGrid.appendChild(createGroupContainerElement(group, color));
    });
    seatingState.unselected.forEach(name => {
        unselectedStudentsGrid.appendChild(createSeatElement(name));
    });
    initializeSortable();
    applyAttendanceStyles();
}

/** Applies the correct visual style to all seats based on the current state. */
function applyAttendanceStyles() {
    toolsContent.querySelectorAll('.seat').forEach(seat => {
        const studentName = seat.textContent;
        const isPreselected = preselectedStudents.has(studentName);
        const hasParticipated = participatedStudents.has(studentName);
        seat.classList.remove('selected', 'participated', 'attendance-hidden');
        if (attendanceVisible) {
            if (isPreselected) seat.classList.add('selected');
            if (hasParticipated) seat.classList.add('participated');
        } else {
            if (isPreselected || hasParticipated) {
                seat.classList.add('attendance-hidden');
            }
        }
    });
}

/** Generates the initial chart for a class. */
function generateInitialChart() {
    const selectedClass = classDropdown.value;
    if (!selectedClass || selectedClass === DEFAULT_CLASS_OPTION) return;
    
    classStarted = false;
    originalSeating = null;
    attendanceVisible = true;
    preselectedStudents.clear();
    participatedStudents.clear();
    
    setupButtons.classList.remove('hidden');
    inClassButtons.classList.add('hidden');
    startClassBtn.disabled = false;
    
    const students = appState.data.allNamesFromSheet.filter(s => s.Class === selectedClass).map(s => normalizeName(s.Name));
    chartMessage.textContent = `Seating Chart for ${selectedClass} (${students.length} students)`;
    
    const initialGroups = createStudentGroupsBySize(students, 2);
    seatingChartGrid.innerHTML = '';
    unselectedStudentsGrid.innerHTML = '';
    initialGroups.forEach((group, index) => {
        const color = groupColors[index % groupColors.length];
        seatingChartGrid.appendChild(createGroupContainerElement(group, color));
    });
    initializeSortable();
}

/** Groups selected students, preserving participation state. */
function generateSelectiveChart() {
    const allStudents = Array.from(toolsContent.querySelectorAll('.seat')).map(seat => seat.textContent);
    const namesToRegroup = allStudents.filter(name => preselectedStudents.has(name) || participatedStudents.has(name));
    const unselectedNames = allStudents.filter(name => !preselectedStudents.has(name) && !participatedStudents.has(name));
    if (namesToRegroup.length === 0) {
        showErrorAlert("No students are selected for grouping.");
        return;
    }
    const activeModeBtn = document.querySelector('.group-btn.active');
    if (!activeModeBtn) { showErrorAlert("Please select a grouping method."); return; }
    
    const mode = activeModeBtn.id;
    let generatedGroups;
    if (mode === 'generateGroupsByCountBtn') {
        const groupCount = parseInt(groupCountInput.value, 10);
        generatedGroups = createStudentGroupsByCount(namesToRegroup, groupCount);
    } else {
        const groupSize = parseInt(activeModeBtn.dataset.groupsize, 10);
        generatedGroups = createStudentGroupsBySize(namesToRegroup, groupSize);
    }
    
    seatingChartGrid.innerHTML = '';
    unselectedStudentsGrid.innerHTML = '';
    generatedGroups.forEach((group, index) => {
        const color = groupColors[index % groupColors.length];
        seatingChartGrid.appendChild(createGroupContainerElement(group, color));
    });
    unselectedNames.forEach(name => {
        unselectedStudentsGrid.appendChild(createSeatElement(name));
    });
    initializeSortable();
    applyAttendanceStyles();
}

/** Creates an individual student seat element. */
function createSeatElement(studentName) {
    const seat = document.createElement('div');
    seat.textContent = studentName;
    seat.className = 'seat draggable-item bg-white p-2 border border-gray-300 rounded-md shadow-sm text-center text-sm flex items-center justify-center min-h-[60px] font-semibold cursor-pointer';
    return seat;
}

/** Creates a group container element. */
function createGroupContainerElement(group, color) {
    const container = document.createElement('div');
    container.className = 'group-container draggable-item';
    container.style.backgroundColor = color.bg;
    container.style.borderColor = color.border;
    const size = group.length;
    let internalCols = (size <= 4) ? 2 : (size <= 6) ? 3 : 4;
    let parentSpan = (size <= 4) ? 2 : (size <= 6) ? 3 : 4;
    container.style.gridTemplateColumns = `repeat(${internalCols}, 1fr)`;
    container.style.gridColumn = `span ${parentSpan}`;
    group.forEach(studentName => container.appendChild(createSeatElement(studentName)));
    return container;
}

/** Initializes the Teacher Tools page. */
async function initializePageSpecificApp() {
    // THIS IS THE SAFEGUARD: Cache page-specific elements immediately.
    cacheToolsDOMElements();

    groupBtns.forEach(btn => btn.disabled = true);
    
    groupBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            updateActiveButton(e.currentTarget);
            generateSelectiveChart();
        });
    });
    
    classDropdown.addEventListener('change', generateInitialChart);

    toolsContent.addEventListener('mousedown', (event) => {
        const seat = event.target.closest('.seat');
        if (seat) {
            event.preventDefault();
            const studentName = seat.textContent;
            if (classStarted) {
                if (preselectedStudents.has(studentName)) {
                    preselectedStudents.has(studentName) ? preselectedStudents.delete(studentName) : preselectedStudents.add(studentName);
                } else {
                    participatedStudents.has(studentName) ? participatedStudents.delete(studentName) : participatedStudents.add(studentName);
                }
            } else {
                preselectedStudents.has(studentName) ? preselectedStudents.delete(studentName) : preselectedStudents.add(studentName);
            }
            applyAttendanceStyles();
        }
    });

    selectAllBtn.addEventListener('click', () => {
        toolsContent.querySelectorAll('.seat').forEach(seat => {
            preselectedStudents.add(seat.textContent);
        });
        applyAttendanceStyles();
    });
    deselectAllBtn.addEventListener('click', () => {
        preselectedStudents.clear();
        participatedStudents.clear();
        applyAttendanceStyles();
    });
    
    startClassBtn.addEventListener('click', () => {
        classStarted = true;
        originalSeating = captureSeatingState();
        setupButtons.classList.add('hidden');
        inClassButtons.classList.remove('hidden');
        originalSeatingBtn.disabled = false;
        preselectedStudents.clear();
        toolsContent.querySelectorAll('.seat.selected').forEach(seat => {
            preselectedStudents.add(seat.textContent);
        });
        showSuccessAlert("Class started! You can now track participation.");
    });

    originalSeatingBtn.addEventListener('click', () => {
        if (originalSeating) renderSeatingState(originalSeating);
    });

    attendanceToggleBtn.addEventListener('click', () => {
        attendanceVisible = !attendanceVisible;
        attendanceToggleBtn.textContent = attendanceVisible ? "Hide Attendance" : "Show Attendance";
        applyAttendanceStyles();
    });

    timerPlayPauseBtn.addEventListener('click', () => {
    if (timerInterval) {
        pauseTimer();
    } else {
        playTimer();
    }
});

timerResetBtn.addEventListener('click', resetTimer);

    if (appState.currentUser.email && appState.currentUser.idToken) {
        try {
            await fetchAllStudentData();
            populateCourseDropdownFromData();
            populateDropdown('classDropdown', appState.data.courses, DEFAULT_CLASS_OPTION, "");
            classDropdown.removeAttribute("disabled");
            groupBtns.forEach(btn => btn.disabled = false);
            updateActiveButton(generatePairsBtn);
        } catch (error) {
            showErrorAlert("Could not load class data. Please reload.");
        }
    }
}

/** Resets the page state. */
function resetPageSpecificAppState() {
    if (sortableInstance) sortableInstance.destroy();
    classStarted = false;
    originalSeating = null;
    attendanceVisible = true;
    preselectedStudents.clear();
    participatedStudents.clear();
    if (setupButtons) setupButtons.classList.remove('hidden');
    if (inClassButtons) inClassButtons.classList.add('hidden');
    if (startClassBtn) startClassBtn.disabled = false;
    if (classDropdown) populateDropdown('classDropdown', [], DEFAULT_CLASS_OPTION, "");
    if (seatingChartGrid) seatingChartGrid.innerHTML = '';
    if (unselectedStudentsGrid) unselectedStudentsGrid.innerHTML = '';
    if (chartMessage) chartMessage.textContent = "Select a class and click a button to generate a chart.";
}