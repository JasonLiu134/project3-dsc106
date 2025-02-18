// Create initial constants
const default_student = 'Student 1';
const default_exam = 'Final';

// Create variables
let current_student = default_student;
let current_exam = default_exam;

// Load in Data
let finalData = [];
let midterm1Data = [];
let midterm2Data = [];
async function loadData() {
    finalData = await d3.csv('datasets/finaldata.csv');
    midterm1Data = await d3.csv('datasets/midterm1data.csv');
    midterm2Data = await d3.csv('datasets/midterm2data.csv');
}

// Call the initial functions when first loading the document
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    createLinePlot(default_student, default_exam);
    updateTooltipVisibility('hidden');
});

// Function to generate the overall Line Plot
function createLinePlot(student, exam) {    
    // Get the right exam data column with the name 'student'
    const examData = {'Midterm 1': midterm1Data, 'Midterm 2': midterm2Data, 'Final': finalData};
    const studentData = examData[exam].map(d => +d[student]).filter(d => d !== null && d !== 0);

    // Define content window of the line plot (Lab)
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    // Create the x and y scales of the data
    const xScale = d3.scaleLinear()
    .domain([0, studentData.length - 1])
    .range([0, width]);

    const yScale = d3.scaleLinear()
    .domain([0, 200])
    .range([height, 0]);

    xScale.range([usableArea.left, usableArea.right]);
    yScale.range([usableArea.bottom, usableArea.top]);

    // Create the svg for the plot (Lab)
    const svg = d3
    .select('#line')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');
    
    // Create and scale the gridlines (Lab)
    const gridlines = svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width)).style('opacity', 0.1);
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

    svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

    // Define the colors for each student
    const colors = {
        'Student 1': d3.schemeCategory10[0],
        'Student 2': d3.schemeCategory10[1],
        'Student 3': d3.schemeCategory10[2],
        'Student 4': d3.schemeCategory10[3],
        'Student 5': d3.schemeCategory10[4],
        'Student 6': d3.schemeCategory10[5],
        'Student 7': d3.schemeCategory10[6],
        'Student 8': d3.schemeCategory10[7],
        'Student 9': d3.schemeCategory10[8],
        'Student 10': d3.schemeCategory10[9],
      };

    // Create the different objects for the line plot visualization
    // The line data + line plot
    const lineData = d3.line().x((d, i) => xScale(i)).y(d => yScale(d));
    const line = svg.append('path')
        .datum(studentData)
        .attr('fill', 'none')
        .attr('stroke', colors[student])
        .attr('stroke-width', 2)
        .attr('d', lineData)

    // Mean data + mean line
    const meanData = finalData.map(row => {
        const filtered = Object.values(row).map(d => +d).filter(d => d !== null && d !== 0);
        return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
    });
    const meanLine = svg.append('path')
        .datum(meanData)
        .attr('fill', 'none')
        .attr('stroke', 'gray')
        .attr('stroke-width', 2)
        .attr('d', lineData)
        .attr('opacity', 0.4);

    // The highlight line when hovering over the plot
    const highlightLine = svg.append('line')
        .attr('stroke', 'black')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4')
        .style('visibility', 'hidden');

    // The highlight data point when hovering over the plot
    const highlightCircle = svg.append('circle')
        .attr('r', '4')
        .attr('stroke', 'black')
        .attr('stroke-width', 2)
        .attr('fill', d3.color(colors[student]).darker(1))
        .style('visibility', 'hidden');

    // Mousemove event for dynamic elements
    svg.on('mousemove', function(event) {
        // Get mouse position and position in relation to the xScale
        const [x_pos, y_pos] = d3.pointer(event);
        const xIndex = Math.round(xScale.invert(x_pos));

        // Update interactive elements if the current location is within the line plot
        if (xIndex >= 0 && xIndex < studentData.length) {
            // Get the data value at the current location
            const dataPointValue = studentData[xIndex];

            // Update the highlight line position
            highlightLine
                .attr('x1', x_pos)
                .attr('x2', x_pos)
                .attr('y1', usableArea.top)
                .attr('y2', usableArea.bottom)
                .style('visibility', 'visible');

            // Update the data point highlight
            highlightCircle
                .attr('cx', x_pos)
                .attr('cy', yScale(dataPointValue))
                .style('visibility', 'visible');

            // Modify the line plot's opacity
            line.attr('opacity', 0.75);
            updateTooltipPosition(event);
            updateTooltipData(dataPointValue, xIndex, student);
            updateTooltipVisibility('visible');
        }
    });

    // Hide the interactive elements when leaving the window
    svg.on('pointerleave', function() {
        highlightLine.style('visibility', 'hidden');
        highlightCircle.style('visibility', 'hidden');
        line.attr('opacity', 1);
        updateTooltipVisibility('hidden');
    });
}

// Function to update the line plot when selecting a different student
function selectStudent(optionSelected) {
    current_student = optionSelected;
    d3.select('#line').selectAll('svg').remove();
    createLinePlot(current_student, current_exam);
    document.getElementsByClassName("selectedstudent")[0].innerText = 'Current Student: ' + current_student;
}

// Function to allow buttons to change currently selected student
d3.selectAll(".option").on("click", function() {
    const selectedStudent = d3.select(this).attr("data-value");
    selectStudent(selectedStudent);
});

// Function to update the line plot when selecting a different exam
function selectExam(examSelected) {
    current_exam = examSelected;
    d3.select('#line').selectAll('svg').remove();
    createLinePlot(current_student, current_exam);
    document.getElementsByClassName("selectedexam")[0].innerText = 'Current Exam: ' + current_exam;
}

// Function to allow buttons to change currently selected exam
d3.selectAll(".exam").on("click", function() {
    const selectedExam = d3.select(this).attr("data-value");
    selectExam(selectedExam);
});

// Function to update the tooltip position
function updateTooltipPosition(event) {
    const tooltip = document.getElementById('tooltip');
    tooltip.style.left = `${event.clientX + 20}px`;
    tooltip.style.top = `500px`;
}

function updateTooltipData(bpm_data, time_data, studentdisplayed) {
    const studentdisplay = document.getElementById('tooltipstudent');
    const bpm = document.getElementById('bpm');
    const time = document.getElementById('time');

    studentdisplay.textContent = studentdisplayed;
    bpm.textContent = bpm_data;
    time.textContent = time_data;
}

// Function to hide/show the tooltip
function updateTooltipVisibility(status) {
    const tooltip = document.getElementById('tooltip');
    if (status === 'hidden') {
        tooltip.hidden = true;
    }
    if (status === 'visible') {
        tooltip.hidden = false;
    }
}