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
    { bg: '##fefce8', border: '#fde047' }, // Yellow
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
 * Initializes or re-initializes the Draggable.js Sortable functionality.
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

/**
 * NEW: Displays all students in a class as individual, selectable seats.
 * This is the initial state when a class is selected.
 */
function displayAllStudentsAsIndividuals() {
    const selectedClass = classDropdown.value;
    if (!selectedClass || selectedClass === DEFAULT_CLASS_OPTION) {
        chartMessage.textContent = "Please select a class.";
        seatingChartGrid.innerHTML = '';
        return;
    }

    const students = appState.data.allNamesFromSheet
        .filter(student => student.Class === selectedClass)
        .map(student => normalizeName(student.Name));

    chartMessage.textContent = `Seating Chart for ${selectedClass} (${students.length} students)`;
    
    // Create an array where each student is in their own group
    const individualGroups = students.map(student => [student]);
    
    renderChart(individualGroups);
    initializeSortable();
}

/** * MODIFIED: Main function to generate and render the chart. 
 * Now reads selected students from the DOM and only groups them.
 */
function generateAndRenderChart() {
    // 1. Get the names of selected and unselected students from the DOM.
    const selectedNames = Array.from(seatingChartGrid.querySelectorAll('.seat.selected'))
                               .map(seat => seat.textContent);
    const unselectedNames = Array.from(seatingChartGrid.querySelectorAll('.seat:not(.selected)'))
                                 .map(seat => seat.textContent);

    if (selectedNames.length === 0) {
        showErrorAlert("No students are selected. Please click on student tiles to select them for grouping.");
        return;
    }

    // 2. Determine which grouping mode is active.
    const activeModeBtn = document.querySelector('.group-btn.active');
    if (!activeModeBtn) {
        showErrorAlert("Please select a grouping method (e.g., Pairs, Threes).");
        return;
    }
    const mode = activeModeBtn.id;

    // 3. Generate groups using ONLY the selected students.
    let generatedGroups;
    if (mode === 'generateGroupsByCountBtn') {
        const groupCount = parseInt(groupCountInput.value, 10);
        if (isNaN(groupCount) || groupCount < 1) {
            chartMessage.textContent = "Please enter a valid number of groups.";
            return;
        }
        generatedGroups = createStudentGroupsByCount(selectedNames, groupCount);
    } else { // Handles Pairs, Threes, Fours
        const groupSize = parseInt(activeModeBtn.dataset.groupsize, 10);
        generatedGroups = createStudentGroupsBySize(selectedNames, groupSize);
    }
    
    // 4. Unselected students become individual groups.
    const unselectedIndividualGroups = unselectedNames.map(name => [name]);

    // 5. Combine the new groups and the unselected individuals.
    const finalChartLayout = [...generatedGroups, ...unselectedIndividualGroups];

    // 6. Render the new layout.
    renderChart(finalChartLayout);
    initializeSortable();
}

/** Creates an individual student seat element. */
function createSeatElement(studentName) {
    const seat = document.createElement('div');
    seat.textContent = studentName;
    // Add 'seat' class for styling and event handling
    seat.className = 'seat draggable-item bg-white p-2 border border-gray-300 rounded-md shadow-sm text-center text-sm flex items-center justify-center min-h-[60px] font-semibold cursor-pointer';
    return seat;
}

/** Creates a group container element with dynamic grid styling and column span. */
function createGroupContainerElement(group, color) {
    const container = document.createElement('div');
    container.className = 'group-container draggable-item';
    container.style.backgroundColor = color.bg;
    container.style.borderColor = color.border;

    const size = group.length;
    let cols = (size <= 2) ? 2 : (size <= 6) ? 3 : 4;
    
    container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    container.style.gridColumn = `span ${cols}`;

    group.forEach(studentName => {
        container.appendChild(createSeatElement(studentName));
    });
    return container;
}

/** Renders the entire chart from an array of groups. */
function renderChart(groups) {
    seatingChartGrid.innerHTML = ''; // Clear previous content
    shuffleArray(groups);

    const actualGroups = groups.filter(group => group.length > 1);
    const individuals = groups.filter(group => group.length === 1);

    actualGroups.forEach((group, index) => {
        const color = groupColors[index % groupColors.length];
        seatingChartGrid.appendChild(createGroupContainerElement(group, color));
    });

    individuals.forEach(group => {
        seatingChartGrid.appendChild(createSeatElement(group[0]));
    });
}

/** Initializes the Teacher Tools page. */
async function initializePageSpecificApp() {
    cacheToolsDOMElements();
    groupBtns.forEach(btn => btn.disabled = true);
    
    // MODIFIED: Generate buttons now call the selective grouping function.
    groupBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            updateActiveButton(e.currentTarget);
            generateAndRenderChart();
        });
    });
    
    // MODIFIED: Class dropdown now displays all students as individuals initially.
    classDropdown.addEventListener('change', () => {
        const selectedClass = classDropdown.value;
        if (selectedClass && selectedClass !== DEFAULT_CLASS_OPTION) {
            const studentCount = appState.data.allNamesFromSheet.filter(s => s.Class === selectedClass).length;
            groupCountInput.max = studentCount;
        }
        updateActiveButton(generatePairsBtn); // Default to pairs
        displayAllStudentsAsIndividuals(); // Render the initial set of clickable tiles
    });

    // NEW: Add a single event listener to the grid for toggling selection.
    seatingChartGrid.addEventListener('click', (event) => {
        // Use .closest() to ensure we're targeting a seat, even if a child element is clicked
        const seat = event.target.closest('.seat');
        if (seat) {
            seat.classList.toggle('selected');
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