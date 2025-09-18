// js/teacher_tools.js

// --- DOM Element Caching ---
let classDropdown, chartMessage, seatingChartGrid, instructionsArea, toolsContent;
let generatePairsBtn, generateThreesBtn, generateFoursBtn;
let groupCountInput, generateGroupsByCountBtn;
let unselectedStudentsGrid;
let selectAllBtn, deselectAllBtn;
let startClassBtn, originalSeatingBtn, attendanceToggleBtn;
let setupButtons, inClassButtons;
let groupBtns = [];
let sortableInstance = null;

// --- State Tracking ---
let classStarted = false;
let originalSeating = null;
let onTimeStudents = new Set();
let tardyStudents = new Set();
let attendanceVisible = true; // True = Attendance Mode, False = Arrange Mode
let longPressTimer = null;
let isLongPress = false;
let firstSwapTile = null; // For tile swapping
const LONG_PRESS_DURATION = 500;

// --- Color Palette for Groups ---
const groupColors = [ { bg: '#fef2f2', border: '#fca5a5' }, { bg: '#fff7ed', border: '#fdba74' }, { bg: '#fefce8', border: '#fde047' }, { bg: '#f7fee7', border: '#bef264' }, { bg: '#ecdf5', border: '#86efac' }, { bg: '#eff6ff', border: '#93c5fd' }, { bg: '#f5f3ff', border: '#c4b5fd' }, { bg: '#faf5ff', border: '#d8b4fe' }, { bg: '#fdf2f8', border: '#f9a8d4' }];

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
}

/** Initializes or toggles Draggable.js Sortable functionality. */
function toggleSortable(enable) {
    if (enable) {
        if (!sortableInstance) {
            const containers = document.querySelectorAll('#seatingChartGrid, #unselectedStudentsGrid, .group-container');
            sortableInstance = new Draggable.Sortable(containers, {
                draggable: '.draggable-item', handle: '.draggable-item', mirror: { constrainDimensions: true }, plugins: [Draggable.Plugins.ResizeMirror],
            });
            sortableInstance.on('mirror:create', (evt) => {
                const sourceClasses = ['selected', 'participated', 'attendance-hidden', 'swap-selected'];
                sourceClasses.forEach(className => {
                    if (evt.source.classList.contains(className)) evt.mirror.classList.add(className);
                });
            });
        } else { sortableInstance.enable(); }
    } else { if (sortableInstance) sortableInstance.disable(); }
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
    toggleSortable(!attendanceVisible);
    applyAttendanceStyles();
}

/** Applies the correct visual style to all seats based on the current state. */
function applyAttendanceStyles() {
    toolsContent.querySelectorAll('.seat').forEach(seat => {
        const studentName = seat.textContent;
        const isOnTime = onTimeStudents.has(studentName);
        const isTardy = tardyStudents.has(studentName);
        seat.classList.remove('selected', 'participated', 'attendance-hidden', 'swap-selected');
        if (attendanceVisible) {
            if (isOnTime) seat.classList.add('selected');
            if (isTardy) seat.classList.add('participated');
        } else {
            if (isOnTime || isTardy) {
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
    onTimeStudents.clear();
    tardyStudents.clear();
    firstSwapTile = null;
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
    toggleSortable(false);
}

/** Groups selected students, preserving attendance state. */
function generateSelectiveChart() {
    const allStudents = Array.from(toolsContent.querySelectorAll('.seat')).map(seat => seat.textContent);
    const namesToRegroup = allStudents.filter(name => onTimeStudents.has(name) || tardyStudents.has(name));
    const unselectedNames = allStudents.filter(name => !onTimeStudents.has(name) && !tardyStudents.has(name));
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
    toggleSortable(!attendanceVisible);
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

/** Swaps two DOM elements */
function swapTiles(tile1, tile2) {
    const parent1 = tile1.parentNode;
    const parent2 = tile2.parentNode;
    if (!parent1 || !parent2) return;
    const after1 = tile1.nextElementSibling;
    const after2 = tile2.nextElementSibling;
    parent1.insertBefore(tile2, after1);
    parent2.insertBefore(tile1, after2);
}


/** Initializes the Teacher Tools page. */
async function initializePageSpecificApp() {
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
        if (!seat) return;
        event.preventDefault();
        isLongPress = false;
        if (classStarted && attendanceVisible) {
            longPressTimer = setTimeout(() => {
                isLongPress = true;
                const studentName = seat.textContent;
                if (onTimeStudents.has(studentName)) {
                    onTimeStudents.delete(studentName);
                    tardyStudents.add(studentName);
                } else if (tardyStudents.has(studentName)) {
                    tardyStudents.delete(studentName);
                    onTimeStudents.add(studentName);
                }
                applyAttendanceStyles();
            }, LONG_PRESS_DURATION);
        }
    });

    toolsContent.addEventListener('mouseup', (event) => {
        clearTimeout(longPressTimer);
        const seat = event.target.closest('.seat');
        if (seat && !isLongPress) {
            if (attendanceVisible) {
                const studentName = seat.textContent;
                if (classStarted) {
                    if (onTimeStudents.has(studentName)) onTimeStudents.delete(studentName);
                    else if (tardyStudents.has(studentName)) tardyStudents.delete(studentName);
                    else tardyStudents.add(studentName);
                } else {
                    onTimeStudents.has(studentName) ? onTimeStudents.delete(studentName) : onTimeStudents.add(studentName);
                }
                applyAttendanceStyles();
            } else { // In Arrange Mode
                if (firstSwapTile) {
                    if (firstSwapTile !== seat) swapTiles(firstSwapTile, seat);
                    firstSwapTile.classList.remove('swap-selected');
                    firstSwapTile = null;
                } else {
                    firstSwapTile = seat;
                    seat.classList.add('swap-selected');
                }
            }
        }
        isLongPress = false;
    });

    selectAllBtn.addEventListener('click', () => {
        toolsContent.querySelectorAll('.seat').forEach(seat => {
            onTimeStudents.add(seat.textContent);
            tardyStudents.delete(seat.textContent);
        });
        applyAttendanceStyles();
    });
    deselectAllBtn.addEventListener('click', () => {
        onTimeStudents.clear();
        tardyStudents.clear();
        applyAttendanceStyles();
    });
    
    startClassBtn.addEventListener('click', () => {
        classStarted = true;
        originalSeating = captureSeatingState();
        setupButtons.classList.add('hidden');
        inClassButtons.classList.remove('hidden');
        onTimeStudents.clear();
        tardyStudents.clear();
        toolsContent.querySelectorAll('.seat.selected').forEach(seat => {
            onTimeStudents.add(seat.textContent);
        });
        applyAttendanceStyles();
        showSuccessAlert("Class started! You can now mark tardy students (yellow).");
    });

    originalSeatingBtn.addEventListener('click', () => {
        if (originalSeating) renderSeatingState(originalSeating);
    });

    attendanceToggleBtn.addEventListener('click', () => {
        attendanceVisible = !attendanceVisible;
        attendanceToggleBtn.textContent = attendanceVisible ? "Arrange Mode" : "Attendance Mode";
        toggleSortable(!attendanceVisible);
        if (firstSwapTile) {
            firstSwapTile.classList.remove('swap-selected');
            firstSwapTile = null;
        }
        applyAttendanceStyles();
    });

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
    if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null; }
    classStarted = false;
    originalSeating = null;
    attendanceVisible = true;
    onTimeStudents.clear();
    tardyStudents.clear();
    firstSwapTile = null;
    if (setupButtons) setupButtons.classList.remove('hidden');
    if (inClassButtons) inClassButtons.classList.add('hidden');
    if (classDropdown) populateDropdown('classDropdown', [], DEFAULT_CLASS_OPTION, "");
    if (seatingChartGrid) seatingChartGrid.innerHTML = '';
    if (unselectedStudentsGrid) unselectedStudentsGrid.innerHTML = '';
    if (chartMessage) chartMessage.textContent = "Select a class and click a button to generate a chart.";
}