// js/teacher_tools.js

// --- DOM Element Caching ---
let classDropdown, chartMessage, seatingChartGrid, instructionsArea, toolsContent;
let generatePairsBtn, generateThreesBtn, generateFoursBtn;
let groupCountInput, generateGroupsByCountBtn;
let unselectedStudentsGrid, unselectedStudentsSection;
let groupBtns = [];
let sortableInstance = null;

// --- Color Palette for Groups ---
const groupColors = [
    { bg: '#fef2f2', border: '#fca5a5' }, // Red
    { bg: '#fff7ed', border: '#fdba74' }, // Orange
    { bg: '#fefce8', border: '#fde047' }, // Yellow
    { bg: '#f7fee7', border: '#bef264' }, // Lime
    { bg: '#ecfdf5', border: '#86efac' }, // Green
    { bg: '#eff6ff', border: '#93c5fd' }, // Blue
    { bg: '#f5f3ff', border: '#c4b5fd' }, // Violet
    { bg: '#faf5ff', border: '#d8b4fe' }, // Purple
    { bg: '#fdf2f8', border: '#f9a8d4' }, // Pink
];

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
    unselectedStudentsSection = document.getElementById('unselectedStudentsSection');
    groupBtns = [generatePairsBtn, generateThreesBtn, generateFoursBtn, generateGroupsByCountBtn];
}

/**
 * Initializes Draggable.js Sortable functionality.
 */
function initializeSortable() {
    if (sortableInstance) {
        sortableInstance.destroy();
    }
    const containers = document.querySelectorAll('#seatingChartGrid, #unselectedStudentsGrid, .group-container');
    
    sortableInstance = new Draggable.Sortable(containers, {
        draggable: '.draggable-item',
        handle: '.draggable-item',
        mirror: { constrainDimensions: true },
        plugins: [Draggable.Plugins.ResizeMirror],
    });

    sortableInstance.on('sortable:start', (evt) => {
        if (evt.data.source.classList.contains('group-container')) {
            document.body.classList.add('dragging-a-container');
        }
    });
    sortableInstance.on('drag:over:container', (evt) => {
        if (document.body.classList.contains('dragging-a-container')) {
            if (evt.overContainer.classList.contains('group-container')) {
                evt.cancel();
            }
        }
    });
    sortableInstance.on('sortable:stop', () => {
        document.body.classList.remove('dragging-a-container');
    });
}

/** Updates the visual state of the generation buttons. */
function updateActiveButton(activeBtn) {
    groupBtns.forEach(btn => {
        if (btn === activeBtn) {
            btn.classList.add('active', 'bg-blue-700', 'text-white');
            btn.classList.remove('bg-gray-200', 'text-gray-800');
        } else {
            btn.classList.remove('active', 'bg-blue-700', 'text-white');
            btn.classList.add('bg-gray-200', 'text-gray-800');
        }
    });
}

/** Shuffles an array in place. */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * MODIFIED: Creates student groups with more balanced distribution logic.
 * - If remainder is 1, a student is added to an existing group.
 * - If remainder is 2+, they form a new group.
 * - Students are distributed as evenly as possible.
 */
function createStudentGroupsBySize(students, groupSize) {
    const studentCount = students.length;
    const shuffledStudents = [...students];
    shuffleArray(shuffledStudents);

    if (studentCount === 0) {
        return [];
    }
    
    // Determine the number of groups to create based on the remainder logic
    const remainder = studentCount % groupSize;
    let numGroups = Math.floor(studentCount / groupSize);

    if (remainder >= 2) {
        numGroups++;
    }
    
    // If there are students but not enough to make a full group according to the logic,
    // default to creating a single group.
    if (numGroups === 0 && studentCount > 0) {
        numGroups = 1;
    }

    const groups = Array.from({ length: numGroups }, () => []);
    let groupIndex = 0;

    // Distribute all students as evenly as possible among the determined number of groups
    shuffledStudents.forEach(student => {
        groups[groupIndex % numGroups].push(student);
        groupIndex++;
    });

    return groups;
}


/** Creates a specific number of student groups. */
function createStudentGroupsByCount(students, groupCount) {
    const shuffledStudents = [...students];
    shuffleArray(shuffledStudents);
    
    if (students.length === 0) {
        return [];
    }

    const groups = Array.from({ length: groupCount }, () => []);
    let groupIndex = 0;

    shuffledStudents.forEach(student => {
        groups[groupIndex % groupCount].push(student);
        groupIndex++;
    });

    return groups;
}

/**
 * Generates the initial chart, placing all students in the top grid.
 */
function generateInitialChart() {
    const selectedClass = classDropdown.value;
    if (!selectedClass || selectedClass === DEFAULT_CLASS_OPTION) {
        chartMessage.textContent = "Please select a class first.";
        seatingChartGrid.innerHTML = '';
        unselectedStudentsGrid.innerHTML = '';
        return;
    }

    const students = appState.data.allNamesFromSheet
        .filter(student => student.Class === selectedClass)
        .map(student => normalizeName(student.Name));

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

/**
 * Groups selected students and moves unselected students to the bottom section.
 */
function generateSelectiveChart() {
    const selectedNames = Array.from(toolsContent.querySelectorAll('.seat.selected'))
                               .map(seat => seat.textContent);
    const unselectedNames = Array.from(toolsContent.querySelectorAll('.seat:not(.selected)'))
                                 .map(seat => seat.textContent);

    if (selectedNames.length === 0) {
        showErrorAlert("No students are selected. Please click on student tiles to select them for grouping.");
        return;
    }

    const activeModeBtn = document.querySelector('.group-btn.active');
    if (!activeModeBtn) {
        showErrorAlert("Please select a grouping method (e.g., Pairs, Threes).");
        return;
    }
    const mode = activeModeBtn.id;

    let generatedGroups;
    if (mode === 'generateGroupsByCountBtn') {
        const groupCount = parseInt(groupCountInput.value, 10);
        if (isNaN(groupCount) || groupCount < 1) {
            chartMessage.textContent = "Please enter a valid number of groups.";
            return;
        }
        generatedGroups = createStudentGroupsByCount(selectedNames, groupCount);
    } else {
        const groupSize = parseInt(activeModeBtn.dataset.groupsize, 10);
        generatedGroups = createStudentGroupsBySize(selectedNames, groupSize);
    }
    
    seatingChartGrid.innerHTML = '';
    unselectedStudentsGrid.innerHTML = '';

    generatedGroups.forEach((group, index) => {
        const color = groupColors[index % groupColors.length];
        seatingChartGrid.appendChild(createGroupContainerElement(group, color, selectedNames));
    });

    unselectedNames.forEach(name => {
        unselectedStudentsGrid.appendChild(createSeatElement(name, false));
    });

    initializeSortable();
}

/**
 * Creates an individual student seat element.
 */
function createSeatElement(studentName, isSelected = false) {
    const seat = document.createElement('div');
    seat.textContent = studentName;
    seat.className = 'seat draggable-item bg-white p-2 border border-gray-300 rounded-md shadow-sm text-center text-sm flex items-center justify-center min-h-[60px] font-semibold cursor-pointer';

    if (isSelected) {
        seat.classList.add('selected');
        seat.style.backgroundColor = '#dcfce7';
        seat.style.borderColor = '#22c55e';
    }
    
    return seat;
}

/**
 * Creates a group container element.
 */
function createGroupContainerElement(group, color, selectedNames = []) {
    const container = document.createElement('div');
    container.className = 'group-container draggable-item';
    container.style.backgroundColor = color.bg;
    container.style.borderColor = color.border;

    const size = group.length;
    let cols = (size <= 2) ? 2 : (size <= 6) ? 3 : 4;
    
    container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    container.style.gridColumn = `span ${cols}`;

    group.forEach(studentName => {
        const isSelected = selectedNames.includes(studentName);
        container.appendChild(createSeatElement(studentName, isSelected));
    });
    return container;
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
    
    classDropdown.addEventListener('change', () => {
        const selectedClass = classDropdown.value;
        if (selectedClass && selectedClass !== DEFAULT_CLASS_OPTION) {
            const studentCount = appState.data.allNamesFromSheet.filter(s => s.Class === selectedClass).length;
            groupCountInput.max = studentCount;
        }
        updateActiveButton(generatePairsBtn);
        generateInitialChart();
    });

    toolsContent.addEventListener('mousedown', (event) => {
        const seat = event.target.closest('.seat');
        if (seat) {
            event.preventDefault();
            seat.classList.toggle('selected');

            if (seat.classList.contains('selected')) {
                seat.style.backgroundColor = '#dcfce7';
                seat.style.borderColor = '#22c55e';
            } else {
                seat.style.backgroundColor = '';
                seat.style.borderColor = '';
            }
        }
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
            console.error("Failed to initialize Teacher Tools with data:", error);
            showErrorAlert("Could not load class data. Please reload.");
            chartMessage.textContent = "Error: Could not load class data.";
        }
    }
}

/** Resets the page state. */
function resetPageSpecificAppState() {
    if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
    }
    if (classDropdown) {
        populateDropdown('classDropdown', [], DEFAULT_CLASS_OPTION, "");
        classDropdown.setAttribute("disabled", "disabled");
    }
    if (seatingChartGrid) seatingChartGrid.innerHTML = '';
    if (unselectedStudentsGrid) unselectedStudentsGrid.innerHTML = '';
    if (chartMessage) chartMessage.textContent = "Select a class and click a button to generate a chart.";
    if (groupBtns.length > 0) groupBtns.forEach(btn => { if(btn) btn.disabled = true });
}