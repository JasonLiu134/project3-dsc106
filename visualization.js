// Create initial constants
const default_student = 'Student 1';
const default_exam = 'Final';

// Create variables
let current_student = default_student;
let current_exam = default_exam;
let student_line_visible = true;
let mean_line_visible = true;
let mouse_over_legend = false;

//Global Variables for d3 Brush
let xScale
let yScale
let studentData
let width
let height

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
    brushSelector();

    //Initializes the current default exam and student values with current classes
    d3.select(`[data-value='${default_exam}']`).classed("current", true);
    d3.select(`[data-value='${default_student}']`).classed("current", true);
});

// Function to generate the overall Line Plot
function createLinePlot(student, exam) {    
    // Get the right exam data column with the name 'student'
    const examData = {'Midterm 1': midterm1Data, 'Midterm 2': midterm2Data, 'Final': finalData};
    studentData = examData[exam].map(d => +d[student]).filter(d => d !== null && d !== 0);

    // Define content window of the line plot (Lab)
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 50, left: 50 };
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    // Create the x and y scales of the data
    xScale = d3.scaleLinear()
    .domain([0, studentData.length - 1])
    .range([0, width]);

    yScale = d3.scaleLinear()
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

    // Add x-axis label
    svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 10)
    .attr("text-anchor", "right")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text("Time (Minutes)");

    // Add y-axis label
    svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0) 
    .attr("x", -height/2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text("Beats Per Minute (BPM)");

    
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
        .attr('class', 'student-line')

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
        .attr('opacity', 0.4)
        .attr('class', 'mean-line');
        
    let x = width - 120
    let y = margin.bottom + 450
    
    // A draggable legend that allows filtering out the various lines
    const legend = svg.append("g")
        .attr("transform", `translate(${x}, ${y})`)
        .style("cursor", "pointer")
        .on("mouseenter", () => mouse_over_legend = true)
        .on("mouseleave", () => mouse_over_legend = false);

    // The legend box
    legend.append("rect")
        .attr("width", 120)
        .attr("height", 50)
        .attr("fill", "white")
        .attr("stroke", "black");

    // The student line rect to filter in/out
    legend.append("rect")
        .attr("x", 10)
        .attr("y", 5)
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", colors[student])
        .style("cursor", "pointer")
        .on("click", function() {
            student_line_visible = !student_line_visible;
            d3.select(".student-line").style("display", student_line_visible ? "block" : "none");
            if (!student_line_visible && !mean_line_visible) {
                highlightLine.style('visibility', 'hidden');
                highlightCircle.style('visibility', 'hidden');
                updateTooltipVisibility('hidden');
            }
        });

    // The student line indicator
    legend.append("text")
        .attr("x", 30)
        .attr("y", 17)
        .style("font-size", "14px")
        .text("Student's BPM");

    // The mean line rect to filter in/out
    legend.append("rect")
        .attr("x", 10)
        .attr("y", 25)
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", "gray")
        .attr("opacity", 0.4)
        .style("cursor", "pointer")
        .on("click", function() {
            mean_line_visible = !mean_line_visible;
            d3.select(".mean-line").style("display", mean_line_visible ? "block" : "none");
            if (!student_line_visible && !mean_line_visible) {
                highlightLine.style('visibility', 'hidden');
                highlightCircle.style('visibility', 'hidden');
                updateTooltipVisibility('hidden');
            }
        });

    // The mean line indicator
    legend.append("text")
        .attr("x", 30)
        .attr("y", 37)
        .style("font-size", "14px")
        .text("Average BPM");
    
    // The highlight line when hovering over the plot
    const highlightLine = svg.append('line')
        .attr('stroke', 'black')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4')
        .style('visibility', 'hidden')
        .attr('class', 'highlight-line');

    // The highlight data point when hovering over the plot
    const highlightCircle = svg.append('circle')
        .attr('r', '4')
        .attr('stroke', 'black')
        .attr('stroke-width', 2)
        .attr('fill', d3.color(colors[student]).darker(1))
        .style('visibility', 'hidden')
        .attr('class', 'highlight-circle');

    // Mousemove event for dynamic elements
    svg.on('mousemove', function(event) {
        if (mouse_over_legend) return;

        // Get mouse position and position in relation to the xScale
        const [x_pos, y_pos] = d3.pointer(event);
        const xIndex = Math.round(xScale.invert(x_pos));

        // Update interactive elements if the current location is within the line plot
        if (xIndex >= 0 && xIndex < studentData.length && 
            (student_line_visible || mean_line_visible)) {
            // Get the data value at the current location
            let dataPointValue = student_line_visible ? studentData[xIndex] : meanData[xIndex];

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
        } else {
            // Hide the highlight line if no line is visible
            highlightLine.style('visibility', 'hidden');
            highlightCircle.style('visibility', 'hidden');
            updateTooltipVisibility('hidden');
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
    student_line_visible = true;
    mean_line_visible = true;
    d3.select('#line').selectAll('svg').remove();
    createLinePlot(current_student, current_exam);
    document.getElementsByClassName("selectedstudent")[0].innerText = 'Current Student: ' + current_student;
    brushSelector();

    //Included to update the current student when its button when pressed
    d3.selectAll(".option").classed("current", false);
    d3.select(`[data-value='${optionSelected}']`).classed("current", true);
}

// Function to allow buttons to change currently selected student
d3.selectAll(".option").on("click", function() {
    const selectedStudent = d3.select(this).attr("data-value");
    selectStudent(selectedStudent);
});

// Function to update the line plot when selecting a different exam
function selectExam(examSelected) {
    current_exam = examSelected;
    student_line_visible = true;
    mean_line_visible = true;
    d3.select('#line').selectAll('svg').remove();
    createLinePlot(current_student, current_exam);
    document.getElementsByClassName("selectedexam")[0].innerText = 'Current Exam: ' + current_exam;
    brushSelector();

    //Included to update the current exam when its button when pressed
    d3.selectAll(".exam").classed("current", false);
    d3.select(`[data-value='${examSelected}']`).classed("current", true);
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

    if (student_line_visible) {
        studentdisplay.textContent = studentdisplayed;
    } else {
        studentdisplay.textContent = "Average BPM";
    }
    
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

// Function to create a brush selection box
function brushSelector() {
    const svg = d3.select('#line svg'); // Select the existing SVG inside #line
    
    const bWidth = +svg.attr('viewBox').split(' ')[2];
    const bHeight = +svg.attr('viewBox').split(' ')[3];
    
    const brush = d3.brushX()
        .extent([[0, 0], [bWidth, bHeight - 100]]) // Define brushable area
        .on('start', brushStarted)
        .on('brush', brushed)
        .on('end', brushEnded);
    
    // Append the brush to the SVG
    svg.append('g')
        .attr('class', 'brush')
        .call(brush);
}

// Function called when brushing starts
function brushStarted(event) {
    d3.selectAll('.highlight').remove(); // Remove any previous highlights
}

// Function to handle brushing
function brushed(event) {
    if (!event.selection) return;
}

// Function called when brushing ends
function brushEnded(event) {
    if (!event.selection) {
        d3.selectAll('.highlight').remove(); // Clear highlight if no selection
        updateBrushStats(null); // Hide stats display
        return;
    }   

    // Get the brushed range in pixels
    const [x0, x1] = event.selection;

    // Convert the pixel range to data indices
    const index0 = Math.round(xScale.invert(x0));
    const index1 = Math.round(xScale.invert(x1));

    // Ensure indices are within bounds
    const startIndex = Math.max(0, index0);
    const endIndex = Math.min(studentData.length - 1, index1);

    // Get the selected data range
    const selectedData = studentData.slice(startIndex, endIndex + 1);

    if (selectedData.length === 0) return; // Avoid errors for empty selection

    // Compute statistics
    const minVal = d3.min(selectedData);
    const maxVal = d3.max(selectedData);
    const meanVal = d3.mean(selectedData);

    // Find x-values corresponding to min/max
    const minIndex = selectedData.indexOf(minVal) + startIndex;
    const maxIndex = selectedData.indexOf(maxVal) + startIndex;

    // Update UI with statistics
    updateBrushStats({ startIndex, endIndex, minVal, maxVal, meanVal, minIndex, maxIndex });
}

function updateBrushStats(stats) {
    const statsBox = document.getElementById('brush-stats')
    console.log(stats)

    if (!stats) {
        statsBox.style.display = 'none'; // Hide if no selection
        return;
    }

    // Populate stats info
    statsBox.innerHTML = `
        <strong>Brushed Tick Range:</strong> ${stats.startIndex} - ${stats.endIndex} <br>
        <strong>Heartbeat Mean:</strong> ${stats.meanVal.toFixed(2)} <br>
        <strong>Heartbeat Min:</strong> ${stats.minVal} (at x = ${stats.minIndex}) <br>
        <strong>Heartbeat Max:</strong> ${stats.maxVal} (at x = ${stats.maxIndex}) <br>
    `;

    statsBox.style.display = 'block';
}