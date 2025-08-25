// js/teacher_tools.js

// --- DOM Element Caching ---
let classDropdown, chartMessage, seatingChartGrid, instructionsArea;
let generatePairsBtn, generateThreesBtn, generateFoursBtn;
let groupCountInput, generateGroupsByCountBtn;
let groupBtns = [];
let sortableInstance = null; // To hold the Draggable.js instance

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
    generatePairsBtn = document.getElementById('generatePairsBtn');
    generateThreesBtn = document.getElementById('generateThreesBtn');
    generateFoursBtn = document.getElementById('generateFoursBtn');
    groupCountInput = document.getElementById('groupCountInput');
    generateGroupsByCountBtn = document.getElementById('generateGroupsByCountBtn');
    groupBtns = [generatePairsBtn, generateThreesBtn, generateFoursBtn, generateGroupsByCountBtn];
}

/**
 * MODIFIED: Initializes or re-initializes the Draggable.js Sortable functionality,
 * with revised logic to correctly prevent nesting group containers.
 */
function initializeSortable() {
    if (sortableInstance) {
        sortableInstance.destroy();
    }

    const containers = document.querySelectorAll('#seatingChartGrid, .group-container');

    sortableInstance = new Draggable.Sortable(containers, {
        draggable: '.draggable-item',
        handle: '.draggable-item',
        mirror: { constrainDimensions: true },
        plugins: [Draggable.Plugins.ResizeMirror],
    });

    // --- REVISED AND FINAL LOGIC to prevent container nesting ---
    sortableInstance.on('sortable:start', (evt) => {
        // When a drag starts, check if the source is a group container.
        if (evt.data.source.classList.contains('group-container')) {
            // If so, add a class to the body to signify a container is being dragged.
            document.body.classList.add('dragging-a-container');
        }
    });

    sortableInstance.on('drag:over:container', (evt) => {
        // When dragging over any container, check our special class on the body.
        if (document.body.classList.contains('dragging-a-container')) {
            // If a container is being dragged, and we are now over *another* container,
            // we should cancel the drop.
            if (evt.overContainer.classList.contains('group-container')) {
                evt.cancel();
            }
        }
    });

    sortableInstance.on('sortable:stop', () => {
        // Always clean up the special class when the drag operation ends.
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
    // Ensure "Individuals" always has the primary blue color when active
    if (activeBtn === generatePairsBtn) {
         generatePairsBtn.classList.add('bg-blue-600');
    } else {
         generatePairsBtn.classList.remove('bg-blue-600');
    }
}

/** Shuffles an array in place. */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/** Creates student groups based on a target size. */
function createStudentGroupsBySize(students, groupSize) {
    const shuffledStudents = [...students];
    shuffleArray(shuffledStudents);
    const groups = [];
    while (shuffledStudents.length > 0) {
        groups.push(shuffledStudents.splice(0, groupSize));
    }
    return groups;
}

/** Creates a specific number of student groups. */
function createStudentGroupsByCount(students, groupCount) {
    const shuffledStudents = [...students];
    shuffleArray(shuffledStudents);
    const groups = Array.from({ length: groupCount }, () => []);
    let groupIndex = 0;
    while (shuffledStudents.length > 0) {
        groups[groupIndex % groupCount].push(shuffledStudents.pop());
        groupIndex++;
    }
    return groups;
}

/** Main function to generate and render the chart. */
function generateAndRenderChart() {
    const selectedClass = classDropdown.value;
    if (!selectedClass || selectedClass === DEFAULT_CLASS_OPTION) {
        chartMessage.textContent = "Please select a class first.";
        seatingChartGrid.innerHTML = '';
        return;
    }

    const students = appState.data.allNamesFromSheet
        .filter(student => student.Class === selectedClass)
        .map(student => normalizeName(student.Name));

    chartMessage.textContent = `Seating Chart for ${selectedClass} (${students.length} students)`;
    seatingChartGrid.innerHTML = ''; // Clear the grid before rendering

    const activeModeBtn = document.querySelector('.group-btn.active');
    const mode = activeModeBtn.id;

    let groups;
    if (mode === 'generateIndividualsBtn') {
        // For individuals, each student is a "group" of one
        groups = students.map(student => [student]);
    } else if (mode === 'generateGroupsByCountBtn') {
        const groupCount = parseInt(groupCountInput.value, 10);
        if (isNaN(groupCount) || groupCount < 1) {
            chartMessage.textContent = "Please enter a valid number of groups.";
            return;
        }
        groups = createStudentGroupsByCount(students, groupCount);
    } else { // Handles Pairs, Threes, Fours
        const groupSize = parseInt(activeModeBtn.dataset.groupsize, 10);
        groups = createStudentGroupsBySize(students, groupSize);
    }
    
    // Render the chart based on the generated groups
    renderChart(groups);
    // Initialize Draggable.js on the newly rendered elements
    initializeSortable();
}

/** Creates an individual student seat element. */
function createSeatElement(studentName) {
    const seat = document.createElement('div');
    seat.textContent = studentName;
    seat.className = 'seat draggable-item bg-white p-2 border border-gray-300 rounded-md shadow-sm text-center text-sm flex items-center justify-center min-h-[60px] font-semibold';
    return seat;
}

/** * MODIFIED: Creates a group container element with dynamic grid styling and column span.
 */
function createGroupContainerElement(group, color) {
    const container = document.createElement('div');
    container.className = 'group-container draggable-item';
    container.style.backgroundColor = color.bg;
    container.style.borderColor = color.border;

    const size = group.length;
    let cols = 1;

    // Determine the number of columns for the *internal* grid
    if (size <= 2) { cols = 2; }
    else if (size <= 4) { cols = 2; } 
    else if (size <= 6) { cols = 3; } 
    else if (size <= 9) { cols = 3; } 
    else if (size <= 12) { cols = 4; }
    else if (size <= 16) { cols = 4; }
    else { cols = Math.ceil(Math.sqrt(size)); }

    // Apply the internal grid styling
    container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    
    // *** THE FIX: Set the column span for the PARENT grid ***
    container.style.gridColumn = `span ${cols}`;

    group.forEach(studentName => {
        container.appendChild(createSeatElement(studentName));
    });
    return container;
}


/** Renders the entire chart from an array of groups. */
function renderChart(groups) {
    seatingChartGrid.innerHTML = ''; // Clear previous content
    shuffleArray(groups); // Shuffle the order of groups for randomness

    // --- MODIFICATION: Separate individuals from actual groups ---
    const actualGroups = groups.filter(group => group.length > 1);
    const individuals = groups.filter(group => group.length === 1);

    // Render actual groups first
    actualGroups.forEach((group, index) => {
        const color = groupColors[index % groupColors.length];
        const groupContainer = createGroupContainerElement(group, color);
        seatingChartGrid.appendChild(groupContainer);
    });

    // Render individuals last
    individuals.forEach(group => {
        const seat = createSeatElement(group[0]);
        seatingChartGrid.appendChild(seat);
    });
}

/** Initializes the Teacher Tools page. */
async function initializePageSpecificApp() {
    cacheToolsDOMElements();
    groupBtns.forEach(btn => btn.disabled = true);
    
    // Setup event listeners for all generation buttons
    groupBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            updateActiveButton(e.currentTarget);
            generateAndRenderChart();
        });
    });
    
    classDropdown.addEventListener('change', () => {
        const selectedClass = classDropdown.value;
        if (selectedClass && selectedClass !== DEFAULT_CLASS_OPTION) {
            const studentCount = appState.data.allNamesFromSheet.filter(s => s.Class === selectedClass).length;
            groupCountInput.max = studentCount;
        }
        // Default to individuals and regenerate chart on class change
        updateActiveButton(generatePairsBtn);
        generateAndRenderChart();
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

/** Resets the page state when the user signs out. */
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
    if (chartMessage) chartMessage.textContent = "Select a class and click a button to generate a chart.";
    if (groupBtns.length > 0) groupBtns.forEach(btn => { if(btn) btn.disabled = true });
}