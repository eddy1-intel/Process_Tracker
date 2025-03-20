let processes = JSON.parse(localStorage.getItem("processes")) || [];
let chart;
let currentPage = 1;
const itemsPerPage = 3;
const stepDetails = document.getElementById("stepDetails");

// Add Process
function addProcess() {
    const name = document.getElementById("softwareName").value.trim();
    const rawSteps = document.getElementById("stepDetails").value; // get as-is
    const feeling = document.getElementById("feeling").value;

    if (!name || !rawSteps) {
        alert("Please fill out all fields.");
        return;
    }

    processes.push({
        name,
        rawSteps, // preserve original input
        feeling,
        date: new Date().toLocaleString(),
    });

    saveAndRender();
    clearInputs();
}




// Clear Input Fields
function clearInputs() {
    document.getElementById("softwareName").value = "";
    document.getElementById("stepDetails").value = stripHTML(process.steps);
}


// Format Links for Clickability

function formatLinks(text) {
    return text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
}





// Save to Local Storage and Render
function saveAndRender() {
    localStorage.setItem("processes", JSON.stringify(processes));
    renderProcesses();
    updateChart();
}

// Render Processes with Pagination
function renderProcesses(filteredProcesses = processes) {
    const list = document.getElementById("processList");
    list.innerHTML = "";

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedProcesses = filteredProcesses.slice(start, end);

    paginatedProcesses.forEach((process, index) => {
        const card = document.createElement("div");
        card.className = `process-card ${process.feeling}`;
        card.innerHTML = `
            <div>
                <strong>${process.name}</strong><br>
                <small>Steps: ${process.steps}</small><br>
                <small>Date: ${process.date}</small>
            </div>
            <div>
                <button class="view-btn" onclick="viewProcess(${index + start})">View</button>
                <button class="edit-btn" onclick="editProcess(${index + start})">Edit</button>
                <button class="delete-btn" onclick="deleteProcess(${index + start})">Delete</button>
                <button class="download-btn" onclick="downloadStep(${index + start})">Download</button>
            </div>
        `;
        list.appendChild(card);
    });

    updatePagination(filteredProcesses);
}
function downloadStep(index) {
        const process = processes[index];
        const content = `Name: ${process.name}
    Feeling: ${process.feeling}
    Date: ${process.date}

    Steps:
    ${process.rawSteps || stripHTML(process.steps)}`;

        const blob = new Blob([content], { type: 'text/plain' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${process.name.replace(/\s+/g, "_")}_Steps.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }


// Edit Process
function editProcess(index) {
    const process = processes[index];
    document.getElementById("softwareName").value = process.name;
    document.getElementById("stepDetails").value = process.rawSteps; // get exactly what user typed
    document.getElementById("feeling").value = process.feeling;

    deleteProcess(index, false);
}





// Delete Process
function deleteProcess(index, shouldSave = true) {
    processes.splice(index, 1);
    if (shouldSave) saveAndRender();
}

// Dynamic Popup View for Process
function viewProcess(index) {
    const process = processes[index];
    const formatted = formatLinks(process.rawSteps).replace(/\n/g, '<br>');

    document.getElementById("popupTitle").textContent = process.name;
    document.getElementById("popupSteps").innerHTML = formatted;
    document.getElementById("popupDate").textContent = `Date Added: ${process.date}`;

    document.getElementById("popupView").classList.remove("hidden");
}



// Close Popup
function closePopup() {
    document.getElementById("popupView").classList.add("hidden");
}

// Pagination Controls
function updatePagination(filteredProcesses = processes) {
    const pageInfo = document.getElementById("pageInfo");
    const totalPages = Math.ceil(filteredProcesses.length / itemsPerPage);

    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}

function nextPage() {
    const totalPages = Math.ceil(processes.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderProcesses();
    }
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        renderProcesses();
    }
}

// Search and Filter
function filterProcesses() {
    const query = document.getElementById("searchInput").value.toLowerCase();
    const filtered = processes.filter(p => p.name.toLowerCase().includes(query));
    renderProcesses(filtered);
}

function filterByColor(color) {
    const filtered = processes.filter(p => p.feeling === color);
    renderProcesses(filtered);
}

function resetFilters() {
    renderProcesses();
}

// Sort Processes
function sortProcesses() {
    const option = document.getElementById("sortOptions").value;
    if (option === "name") {
        processes.sort((a, b) => a.name.localeCompare(b.name));
    } else if (option === "rating") {
        processes.sort((a, b) => a.feeling.localeCompare(b.feeling));
    }
    saveAndRender();
}

// Update Chart
function updateChart() {
    const counts = { green: 0, yellow: 0, red: 0 };
    processes.forEach(p => counts[p.feeling]++);

    const ctx = document.getElementById("overviewChart").getContext("2d");
    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Good", " Neutral", "Poor"],
            datasets: [{
                label: "Task Ratings",
                data: [counts.green, counts.yellow, counts.red],
                backgroundColor: ["#28a745", "#ffc107", "#dc3545"],
            }],
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } },
    });
}

// Export to PDF
function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    processes.forEach((process, index) => {
        const y = 10 + index * 20;
        doc.text(`${index + 1}. ${process.name} (${process.feeling.toUpperCase()})`, 10, y);
        doc.text(`Steps: ${process.rawSteps}`, 10, y + 6);
    });

    doc.save("processes.pdf");
}

// Strip HTML Tags (for clean PDF text)
function stripHTML(html) {
    const div = document.createElement("div");
    div.innerHTML = html.replace(/<br\s*\/?>/gi, '\n');
    return div.textContent || div.innerText || "";
}

function downloadAllSteps() {
    if (processes.length === 0) {
        alert("No steps to download.");
        return;
    }

    let content = "";
    processes.forEach((process, index) => {
        content += `#${index + 1}
Name: ${process.name}
Feeling: ${process.feeling}
Date: ${process.date}
Steps:
${process.rawSteps || stripHTML(process.steps)}

-----------------------------\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "All_Steps.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


// Initialize
saveAndRender();
