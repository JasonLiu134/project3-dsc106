// Create initial constants
const default_student = 'Student 1';
const default_exam = 'Final';

// Create variables
let current_students = [default_student];
let mainStudent = default_student;
let current_exam = default_exam;
let cmean_line_visible = false;
let mean_line_visible = false;
let colors = {
    'Student 1': '#1969a2',
    'Student 2': '#ce6000',
    'Student 3': '#207920',
    'Student 4': '#9e1a1a',
    'Student 5': '#854eb8',
    'Student 6': '#71453c',
    'Student 7': '#b75f9c',
    'Student 8': '#523549',
    'Student 9': '#72720e',
    'Student 10': '#1393a1',
};

// Global Variables for d3 Brush
let xScale;
let yScale;
let studentData;
let width;
let height;
let dataSlice = {};
let axisMax;

// Load in Data
let finalData = [];
let midterm1Data = [];
let midterm2Data = [];
let grades = [];
async function loadData() {
    finalData = await d3.csv('datasets/finaldata.csv');
    midterm1Data = await d3.csv('datasets/midterm1data.csv');
    midterm2Data = await d3.csv('datasets/midterm2data.csv');
    grades = await d3.csv('datasets/grades.csv');
}

// Call the initial functions when first loading the document
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    createLinePlot(current_students, current_exam);
    updateLegend();
    updateTooltipVisibility('hidden');
    brushSelector();
    createMainButtons();
    updateMainHighlight();
    updateGradeDisplay();

    //Initializes the current default exam and student values with current classes
    d3.select(`[data-value='${default_exam}']`).classed("current", true);
    d3.select(`[data-value='${default_student}']`).classed("current", true);
});

// Function to generate the overall Line Plot
function createLinePlot(student, exam) {
    let line_opacity;
    if (cmean_line_visible || mean_line_visible) {
        line_opacity = 0.2;
    } else {
        line_opacity = 1;
    }

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

    // Calculate aggregate data
    let dataLen = [];
    dataSlice = {};
    student.forEach(s => {
        const currentMapping = examData[exam].map(d => +d[s]).filter(d => d !== null && d !== 0);
        dataLen.push(currentMapping.length);
        dataSlice[s] = currentMapping;
    });

    // Create the x and y scales of the data
    axisMax = Math.max(...dataLen) - 1;
    xScale = d3.scaleLinear()
    .domain([0, axisMax])
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
    .text("Time (Minutes)");

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
    const xAxis = d3.axisBottom(xScale).tickFormat(d => Math.round(d * 180 / 25506));
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

    // Create the different objects for the line plot visualization
    // The line data + line plots
    const lineData = d3.line().x((d, i) => xScale(i)).y(d => yScale(d));
    student.forEach(s => {
        const sData = examData[exam].map(d => +d[s]).filter(d => d !== null && d !== 0);
        if (!(s === mainStudent)) {
            const sLine = svg.append('path')
                .datum(sData)
                .attr('fill', 'none')
                .attr('stroke', colors[s])
                .attr('stroke-width', 2)
                .attr('d', lineData)
                .attr('class', 'student-line')
                .attr('opacity', 0.2);
        }
    });

    const line = svg.append('path')
        .datum(studentData)
        .attr('fill', 'none')
        .attr('stroke', colors[mainStudent])
        .attr('stroke-width', 2)
        .attr('d', lineData)
        .attr('class', 'student-line')
        .attr('opacity', line_opacity);
    
    // Mean data + mean line
    const meanData = examData[exam].map(row => {
        const filtered = {};
        Object.keys(dataSlice).forEach(key => {
            filtered[key] = row[key];
        });
        return filtered;
    });

    const meanValues = meanData.map(row => {
        const filtered = Object.values(row).map(d => +d).filter(d => d !== null && d !== 0);
        return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
    });

    const overallMeanData = examData[exam].map(row => {
        const filtered = Object.values(row).map(d => +d).filter(d => d !== null && d !== 0);
        return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
    });
    
    if (cmean_line_visible) {
        const cmeanLine = svg.append('path')
            .datum(meanValues)
            .attr('fill', 'none')
            .attr('stroke', '#585858')
            .attr('stroke-width', 2)
            .attr('d', lineData)
            .attr('opacity', 1)
            .attr('class', 'cmean-line');
    }

    if (mean_line_visible) {
        const meanLine = svg.append('path')
            .datum(overallMeanData)
            .attr('fill', 'none')
            .attr('stroke', '#0f0d11')
            .attr('stroke-width', 2)
            .attr('d', lineData)
            .attr('opacity', 1)
            .attr('class', 'mean-line');
    }
    
    // The highlight line when hovering over the plot
    const highlightLine = svg.append('line')
        .attr('stroke', 'black')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4')
        .style('visibility', 'hidden')
        .attr('class', 'highlight-line');

    // The highlight data point when hovering over the plot
    let circleColor;
    if (mean_line_visible) {
        circleColor = '#0f0d11';
    } else if (cmean_line_visible) {
        circleColor = '#585858';
    } else {
        circleColor = d3.color(colors[mainStudent]).darker(1);
    }

    const highlightCircle = svg.append('circle')
        .attr('r', '4')
        .attr('stroke', 'black')
        .attr('stroke-width', 2)
        .attr('fill', circleColor)
        .style('visibility', 'hidden')
        .attr('class', 'highlight-circle');

    // Mousemove event for dynamic elements
    svg.on('mousemove', function(event) {
        // Get mouse position and position in relation to the xScale
        const [x_pos, y_pos] = d3.pointer(event);
        const xIndex = Math.round(xScale.invert(x_pos));

        // Update interactive elements if the current location is within the line plot
        let maxDataSizeCurr;
        if (mean_line_visible) {
            maxDataSizeCurr = axisMax;
        } else if (cmean_line_visible) {
            maxDataSizeCurr = meanValues.length;
        } else {
            maxDataSizeCurr = studentData.length;
        }

        if (xIndex >= 0 && xIndex < maxDataSizeCurr) {
            // Get the data value at the current location
            let dataPointValue;
            let displayName;
            if (mean_line_visible) {
                dataPointValue = Math.round(overallMeanData[xIndex] * 100) / 100;
                displayName = `${current_exam} Average`;
            } else if (cmean_line_visible) {
                dataPointValue = Math.round(meanValues[xIndex] * 100) / 100;
                displayName = "Current Average";
            } else {
                dataPointValue = studentData[xIndex];
                displayName = mainStudent;
            }

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

            if (x_pos > 1100) {
                updateTooltipPosition(event, 'left');
            } else {
                updateTooltipPosition(event, 'right');
            }
            updateTooltipData(dataPointValue, Math.round(xIndex * 18000 / 25506) / 100, displayName);
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

    d3.select('#line').selectAll('svg').remove();
    createLinePlot(current_students, current_exam);
    updateLegend();
    brushSelector();
    updateBrushStats(null);
    updateMainStudents();
}

// Function to create the main student buttons
function createMainButtons() {
    const mainButtons = d3.select('.updatemain');
    finalData.columns.forEach(s => {
        mainButtons.append('button').text('Highlight').attr('data-value', s).classed('mainselect', true).style('visibility', 'hidden');
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
        brushSelector();
        updateBrushStats(null);
        d3.selectAll(".mainselect").classed("current", false);
        d3.select(this).classed("current", true);
    });
}

// Function to update the legend at the top left
function updateLegend() {
    let legendContainer = d3.select("#legend-container");
    // Generate legend content
    let legendHTML = `<div class="legend_title" style="margin-bottom: 10px; font-weight: bold;">Currently Displaying</div>`;
    legendHTML += `<div class="class_title"><strong>Exam:</strong> ${current_exam}</div>`;
    legendHTML += `<div class="students_title" style="display: flex; flex-direction: row; flex-wrap: nowrap; gap: 10px; padding-top: 10px; padding-bottom: 10px;"><strong>Students:</strong>`;
    
    current_students.forEach(student => {
        const studentGrades = grades.map(s => {return s[student];})
        let studentGrade;
        if (current_exam === 'Midterm 1') {
            studentGrade = studentGrades[0];
        } else if (current_exam === 'Midterm 2') {
            studentGrade = studentGrades[1];
        } else if (current_exam === 'Final') {
            studentGrade = studentGrades[2];
        }
        legendHTML += `<div style="display: flex; gap: 5px; white-space: nowrap;">
            <span style="width: 15px; height: 15px; background: ${colors[student]}; display: inline-block; border-radius: 3px;"></span>
            <span style="color: ${colors[student]};">Score: ${studentGrade}</span>
        </div>`;
    });
    legendHTML += `</div>`;
    legendContainer.html(legendHTML);
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

// Allow buttons to change currently selected student
d3.selectAll(".option").on("click", function() {
    const selectedStudent = d3.select(this).attr("data-value");
    selectStudent(selectedStudent);
});

// Function to update the line plot when selecting a different exam
function selectExam(examSelected) {
    current_exam = examSelected;
    d3.select('#line').selectAll('svg').remove();
    createLinePlot(current_students, current_exam);
    updateLegend();
    brushSelector();
    updateBrushStats(null);
    updateGradeDisplay();

    //Included to update the current exam when its button when pressed
    d3.selectAll(".exam").classed("current", false);
    d3.select(`[data-value='${examSelected}']`).classed("current", true);
}

// Allow buttons to change currently selected exam
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
function updateTooltipData(bpm_data, time_data, studentdisplayed) {
    const studentdisplay = document.getElementById('tooltipstudent');
    const bpm = document.getElementById('bpm');
    const time = document.getElementById('time');

    studentdisplay.textContent = studentdisplayed;
    bpm.textContent = bpm_data;
    time.textContent = `${time_data} Mins`;
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
    updateTooltipVisibility('hidden');
    d3.selectAll('.highlight').remove();
}

// Function to handle brushing
function brushed(event) {
    if (!event.selection) return;
}

// Function called when brushing ends
function brushEnded(event) {
    updateTooltipVisibility('visible');
    if (!event.selection) {
        d3.selectAll('.highlight').remove();
        updateBrushStats(null);
        return;
    }   

    // Get the brushed range in pixels
    const [x0, x1] = event.selection;

    // Snap to data if brushed outside
    d3.select(".brush").call(d3.brushX().move, [Math.max(50, x0), Math.min(x1, 1490)]);

    // Convert the pixel range to data indices
    const index0 = Math.round(xScale.invert(x0));
    const index1 = Math.round(xScale.invert(x1));

    // Calculate some aggregate data
    let dataLengths = [];
    Object.values(dataSlice).forEach(s => {
        dataLengths.push(s.length);
    });

    // Ensure indices are within bounds
    const startIndex = Math.max(0, index0);
    const endIndex = Math.min(d3.max(dataLengths) - 1, index1);

    // Get the selected data range
    let selectedData = {};
    for (let key in dataSlice) {
        selectedData[key] = dataSlice[key].slice(startIndex, endIndex + 1);
    }

    // Compute statistics
    let minVals = {};
    let maxVals = {};
    let totalValues = [];
    for (let key in selectedData) {
        minVals[key] = d3.min(selectedData[key]);
        maxVals[key] = d3.max(selectedData[key]);
        totalValues = totalValues.concat(selectedData[key]);
    }
    
    const minVal = d3.min(Object.values(minVals));
    const minKey = Object.keys(minVals).find(key => minVals[key] === minVal);
    const minLoc = selectedData[minKey].indexOf(minVal) + startIndex;

    const maxVal = d3.max(Object.values(maxVals));
    const maxKey = Object.keys(minVals).find(key => maxVals[key] === maxVal);
    const maxLoc = selectedData[maxKey].indexOf(maxVal) + startIndex;

    const meanVal = d3.mean(totalValues);

    // Update UI with statistics
    updateBrushStats({startIndex, endIndex, minVal, maxVal, meanVal, minLoc, maxLoc, minKey, maxKey});
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
        <strong>Selected Student Count:</strong> ${current_students.length} <br>
        <strong>Data Range:</strong> ${Math.round(stats.startIndex * 18000 / 25506) / 100} - ${Math.round(stats.endIndex * 18000 / 25506) / 100} Mins<br>
        <strong>Average BPM:</strong> ${stats.meanVal.toFixed(2)} <br>
        <strong>Lowest BPM:</strong> ${stats.minVal} (at ${Math.round(stats.minLoc * 18000 / 25506) / 100} Mins, ${stats.minKey}) <br>
        <strong>Highest BPM:</strong> ${stats.maxVal} (at ${Math.round(stats.maxLoc * 18000 / 25506) / 100} Mins, ${stats.maxKey}) <br>
    `;
    statsBox.style.display = 'block';
}

// Funciton to update the grade display above student buttons
function updateGradeDisplay() {
    Object.keys(finalData[0]).forEach(student => {
        const studentGrades = grades.map(s => {return s[student];})
        let studentGrade;
        if (current_exam === 'Midterm 1') {
            studentGrade = studentGrades[0];
        } else if (current_exam === 'Midterm 2') {
            studentGrade = studentGrades[1];
        } else if (current_exam === 'Final') {
            studentGrade = studentGrades[2];
        }
        
        let gradeDisplay = d3.select(`.gradedisplay#${student.replace(' ', '\\ ')}`);
        gradeDisplay.attr('style', `color: ${colors[student]};`);
        gradeDisplay.text(`Grade: ${studentGrade}`);
    });
    
}

// Function to handle the average line switching
function averageDisplayer(command) {
    if (command === 'overallaverage') {
        mean_line_visible = !mean_line_visible;
        if (mean_line_visible) {
            cmean_line_visible = false;
            d3.select(`[data-value='currentaverage']`).classed("current", cmean_line_visible);
        }
        d3.select(`[data-value='${command}']`).classed("current", mean_line_visible);
    } else if (command === 'currentaverage') {
        cmean_line_visible = !cmean_line_visible;
        if (cmean_line_visible) {
            mean_line_visible = false;
            d3.select(`[data-value='overallaverage']`).classed("current", mean_line_visible);
        }
        d3.select(`[data-value='${command}']`).classed("current", cmean_line_visible);
    } else if (command === 'off') {
        cmean_line_visible = false;
        mean_line_visible = false;
        d3.select(`[data-value='currentaverage']`).classed("current", false);
        d3.select(`[data-value='overallaverage']`).classed("current", false);
    }

    d3.select('#line').selectAll('svg').remove();
    createLinePlot(current_students, current_exam);
    updateLegend();
    brushSelector();
    updateBrushStats(null);
    updateGradeDisplay();
}

d3.selectAll(".averages").on("click", function() {
    const selectedCommand = d3.select(this).attr("data-value");
    averageDisplayer(selectedCommand);
});