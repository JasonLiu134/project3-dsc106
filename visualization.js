// Create initial constants
const default_student = 'Student 1';
const default_exam = 'Final';

// Create variables
let current_students = [default_student];
let mainStudent = default_student;
let current_exam = default_exam;
let student_line_visible = true;
let mean_line_visible = true;
let mouse_over_legend = false;
let colors;

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
    createLinePlot(current_students, current_exam);
    updateTooltipVisibility('hidden');
    brushSelector();
    createMainButtons();
    updateMainHighlight();
    updateLegend();

    //Initializes the current default exam and student values with current classes
    d3.select(`[data-value='${default_exam}']`).classed("current", true);
    d3.select(`[data-value='${default_student}']`).classed("current", true);
});

// Function to generate the overall Line Plot
function createLinePlot(student, exam) {
    // Get the right exam data column
    const examData = {'Midterm 1': midterm1Data, 'Midterm 2': midterm2Data, 'Final': finalData};
    studentData = examData[exam].map(d => +d[mainStudent]).filter(d => d !== null && d !== 0);

    // Define content window of the line plot (Lab)
    const width = 1500;
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

    let dataLen = [];
    student.forEach(s => {
        dataLen.push(examData[exam].map(d => +d[s]).filter(d => d !== null && d !== 0).length);
    });

    // Create the x and y scales of the data
    xScale = d3.scaleLinear()
    .domain([0, Math.max(...dataLen) - 1])
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
    .style("font-size", "20px")
    .style("font-weight", "bold")
    .text("Time (Minutes)")

    // Add y-axis label
    svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0) 
    .attr("x", -height/2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "20px")
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
    .call(xAxis)
    .style('font-size', '15px');

    svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis)
    .style('font-size', '12px');

    // Define the colors for each student
    colors = {
        'Student 1': d3.schemeCategory10[0],
        'Student 2': d3.schemeCategory10[1],
        'Student 3': d3.schemeCategory10[2],
        'Student 4': d3.schemeCategory10[3],
        'Student 5': d3.schemeCategory10[4],
        'Student 6': d3.schemeCategory10[5],
        'Student 7': d3.schemeCategory10[6],
        'Student 8': '#523549',
        'Student 9': d3.schemeCategory10[8],
        'Student 10': d3.schemeCategory10[9],
      };

    // Create the different objects for the line plot visualization
    // The line data + line plots
    const lineData = d3.line().x((d, i) => xScale(i)).y(d => yScale(d));
    student.forEach(s => {
        const sData = examData[exam].map(d => +d[s]).filter(d => d !== null && d !== 0);
        if (!(s === mainStudent)) {
            svg.append('path')
                .datum(sData)
                .attr('fill', 'none')
                .attr('stroke', colors[s])
                .attr('stroke-width', 2)
                .attr('d', lineData)
                .attr('class', 'student-line')
                .attr('opacity', 0.4);
        }
    });

    svg.append('path')
        .datum(studentData)
        .attr('fill', 'none')
        .attr('stroke', colors[mainStudent])
        .attr('stroke-width', 2)
        .attr('d', lineData)
        .attr('class', 'student-line');
    
    // Mean data + mean line
    const meanData = finalData.map(row => {
        const filtered = Object.values(row).map(d => +d).filter(d => d !== null && d !== 0);
        return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
    });
    svg.append('path')
        .datum(meanData)
        .attr('fill', 'none')
        .attr('stroke', 'gray')
        .attr('stroke-width', 2)
        .attr('d', lineData)
        .attr('opacity', 0.2)
        .attr('class', 'mean-line');
    
    
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
        .attr('fill', d3.color(colors[mainStudent]).darker(1))
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
            let meanDataValue = Math.round(meanData[xIndex] * 100) / 100;

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

            if (x_pos > 850) {
                updateTooltipPosition(event, 'left');
            } else {
                updateTooltipPosition(event, 'right');
            }
            updateTooltipData(dataPointValue, meanDataValue, xIndex, mainStudent);
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
        updateTooltipVisibility('hidden');
    });
}

// Function to update the line plot when selecting a different student
function selectStudent(optionSelected) {
    if (!current_students.includes(optionSelected)) {
        d3.select(`[data-value='${optionSelected}']`).classed("current", true);
        current_students.push(optionSelected);
    } else if (current_students.includes(optionSelected)) {
        if (current_students.length > 1) {
            d3.select(`[data-value='${optionSelected}']`).classed("current", false);
            current_students = current_students.filter(s => s !== optionSelected);
        }
    }

    if (!(current_students.includes(mainStudent))) {
        mainStudent = current_students[0];
        d3.selectAll(".mainselect").classed("current", false);
        d3.select(`button.mainselect[data-value="${mainStudent}"]`).classed('current', true);
    }

    student_line_visible = true;
    mean_line_visible = true;
    d3.select('#line').selectAll('svg').remove();
    createLinePlot(current_students, current_exam);
    updateLegend();
    // document.getElementsByClassName("selectedstudent")[0].innerText = 'Current Students: ' + current_students;
    brushSelector();
    updateMainStudents();
}

// Function to create the main student buttons
function createMainButtons() {
    const mainButtons = d3.select('.updatemain');
    finalData.columns.forEach(s => {
        mainButtons.append('button').text('Set Main').attr('data-value', s).classed('mainselect', true).style('visibility', 'hidden');
    });

    current_students.forEach(s => {
        d3.select(`button.mainselect[data-value="${s}"]`).style('visibility', 'visible');
    });

    updateMainHighlight();

    d3.selectAll(".mainselect").on("click", function() {
        const selectedStudent = d3.select(this).attr("data-value");
        mainStudent = selectedStudent;
        d3.select('#line').selectAll('svg').remove();
        createLinePlot(current_students, current_exam);
        d3.selectAll(".mainselect").classed("current", false);
        d3.select(this).classed("current", true);
    });
}

// Function to allow main student updating
function updateMainStudents() {
    finalData.columns.forEach(s => {
        if (current_students.includes(s)) {
            d3.select(`button.mainselect[data-value="${s}"]`).style('visibility', 'visible');
        } else {
            d3.select(`button.mainselect[data-value="${s}"]`).style('visibility', 'hidden');
        }
    });
}

// Simple function to update main highlight (for document loading)
function updateMainHighlight() {
    d3.selectAll(".mainselect").classed("current", false);
    d3.select(`button.mainselect[data-value="${mainStudent}"]`).classed("current", true);
}

// Function to update the legend at the top left
function updateLegend() {
    let legendContainer = d3.select("#legend-container");

    // Generate legend content
    let legendHTML = `<div class="legend_title" style="margin-bottom: 10px; font-weight: bold;">Legend</div>`;
    legendHTML += `<div class="class_title"><strong>Current Exam:</strong> ${current_exam}</div>`;
    legendHTML += `<div class="students_title" style="display: flex; flex-direction: row; flex-wrap: nowrap; gap: 10px; padding-top: 10px; padding-bottom: 10px;"><strong>Students:</strong>`;
    
    current_students.forEach(student => {
        legendHTML += `<div style="display: flex; gap: 5px; white-space: nowrap;">
            <span style="width: 15px; height: 15px; background: ${colors[student]}; display: inline-block; border-radius: 3px;"></span>
            <span style="color: ${colors[student]};">${student}</span>
        </div>`;
    });
    legendHTML += `</div>`;
    
    legendContainer.html(legendHTML);
}

// Allow buttons to change currently selected student
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
    createLinePlot(current_students, current_exam);
    updateLegend();
    // document.getElementsByClassName("selectedexam")[0].innerText = 'Current Exam: ' + current_exam;
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
function updateTooltipPosition(event, side) {
    const tooltip = document.getElementById('tooltip');
    if (side === 'left') {
        tooltip.style.left = `${event.clientX - 140}px`;
    } else {
        tooltip.style.left = `${event.clientX + 20}px`;
    }
    tooltip.style.top = `500px`;
}

// Function to update the data contained in the tooltip
function updateTooltipData(bpm_data, mean_data, time_data, studentdisplayed) {
    const studentdisplay = document.getElementById('tooltipstudent');
    const bpm = document.getElementById('bpm');
    const currentavg = document.getElementById('mean');
    const time = document.getElementById('time');

    if (student_line_visible) {
        studentdisplay.textContent = studentdisplayed;
    } else {
        studentdisplay.textContent = "Average BPM";
    }
    
    bpm.textContent = bpm_data;
    currentavg.textContent = mean_data;
    time.textContent = time_data;
}

// Function to hide/show the tooltip
function updateTooltipVisibility(status) {
    const tooltip = document.getElementById('tooltip');
    tooltip.style.visibility = status;
}

// Function to create a brush selection box
function brushSelector() {
    const svg = d3.select('#line svg');
    const bWidth = +svg.attr('viewBox').split(' ')[2];
    const bHeight = +svg.attr('viewBox').split(' ')[3];
    
    const brush = d3.brushX()
        .extent([[0, 0], [bWidth, bHeight - 50]])
        .on('start', brushStarted)
        .on('brush', brushed)
        .on('end', brushEnded);
    
    svg.append('g').attr('class', 'brush').call(brush);
}

// Function called when brushing starts to remove previous highlights
function brushStarted(event) {
    d3.selectAll('.highlight').remove();
}

// Function to handle brushing
function brushed(event) {
    if (!event.selection) return;
}

// Function called when brushing ends
function brushEnded(event) {
    if (!event.selection) {
        d3.selectAll('.highlight').remove();
        updateBrushStats(null);
        return;
    }   

    // Get the brushed range in pixels
    const [x0, x1] = event.selection;

    // Snap to data if brushed outside
    if (x0 < 50) {
        d3.select(".brush").call(d3.brushX().move, [50, x1]);
    }

    // Convert the pixel range to data indices
    const index0 = Math.round(xScale.invert(x0));
    const index1 = Math.round(xScale.invert(x1));

    // Ensure indices are within bounds
    const startIndex = Math.max(0, index0);
    const endIndex = Math.min(studentData.length - 1, index1);

    // Get the selected data range
    const selectedData = studentData.slice(startIndex, endIndex + 1);
    if (selectedData.length === 0) return;

    // Compute statistics
    const minVal = d3.min(selectedData);
    const maxVal = d3.max(selectedData);
    const meanVal = d3.mean(selectedData);

    // Find x-values corresponding to min/max
    const minIndex = selectedData.indexOf(minVal) + startIndex;
    const maxIndex = selectedData.indexOf(maxVal) + startIndex;

    // Update UI with statistics
    updateBrushStats({startIndex, endIndex, minVal, maxVal, meanVal, minIndex, maxIndex});
}

// Function to update the displayed stats after brushing
function updateBrushStats(stats) {
    const statsBox = document.getElementById('brush-stats')
    if (!stats) {
        statsBox.style.display = 'none';
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