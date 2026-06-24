let processes = JSON.parse(localStorage.getItem("processes")) || [];
let chart;
let currentPage = 1;
const itemsPerPage = 3;
let editingIndex = null;
let activeQuery = "";
let activeColor = "";

const softwareNameInput = document.getElementById("softwareName");
const categoryInput = document.getElementById("categoryInput");
const tagsInput = document.getElementById("tagsInput");
const stepDetailsInput = document.getElementById("stepDetails");
const feelingInput = document.getElementById("feeling");
const imageInput = document.getElementById("stepImage");
const imageDropZone = document.getElementById("imageDropZone");
const imagePreview = document.getElementById("imagePreview");
const removeImageBtn = document.getElementById("removeImageBtn");
const saveProcessBtn = document.getElementById("saveProcessBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const categoryFilterInput = document.getElementById("categoryFilter");
const tagFilterInput = document.getElementById("tagFilter");
const restoreInput = document.getElementById("restoreInput");

let pendingImageData = "";

function sanitizeStoredData() {
    processes = processes.map((item) => {
        const createdAt = item.createdAt || item.timestamp || Date.now();
        const parsedTags = Array.isArray(item.tags)
            ? item.tags.map((tag) => String(tag).trim()).filter(Boolean)
            : parseTags(item.tags || "");

        return {
            name: item.name || "Untitled Process",
            category: (item.category || "General").trim(),
            tags: parsedTags,
            rawSteps: item.rawSteps || item.steps || "",
            feeling: item.feeling || "green",
            date: item.date || new Date(createdAt).toLocaleString(),
            createdAt,
            imageData: item.imageData || "",
        };
    });
}

function parseTags(tagText) {
    return tagText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 12);
}

function escapeHTML(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatTextWithLinks(text) {
    const escaped = escapeHTML(text);
    return escaped
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
        .replace(/\n/g, "<br>");
}

function renderPreview(imageData) {
    if (!imageData) {
        imagePreview.classList.add("hidden");
        imagePreview.innerHTML = "";
        removeImageBtn.classList.add("hidden");
        return;
    }

    imagePreview.classList.remove("hidden");
    imagePreview.innerHTML = `<img src="${imageData}" alt="Selected preview">`;
    removeImageBtn.classList.remove("hidden");
}

function downscaleImage(file, maxWidth = 1280, quality = 0.82) {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith("image/")) {
            reject(new Error("Please upload a valid image file."));
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    const ratio = maxWidth / width;
                    width = maxWidth;
                    height = Math.round(height * ratio);
                }

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL("image/jpeg", quality));
            };
            img.onerror = () => reject(new Error("Could not process the selected image."));
            img.src = reader.result;
        };
        reader.onerror = () => reject(new Error("Could not read the selected image."));
        reader.readAsDataURL(file);
    });
}

async function processSelectedFile(file) {
    if (!file) {
        return;
    }

    if (file.size > 8 * 1024 * 1024) {
        alert("Please choose an image smaller than 8MB.");
        return;
    }

    try {
        pendingImageData = await downscaleImage(file);
        renderPreview(pendingImageData);
    } catch (error) {
        alert(error.message);
    }
}

async function handleImageChange() {
    const file = imageInput.files[0];
    if (!file) {
        pendingImageData = editingIndex !== null ? processes[editingIndex].imageData || "" : "";
        renderPreview(pendingImageData);
        return;
    }

    await processSelectedFile(file);
}

function removeSelectedImage() {
    pendingImageData = "";
    imageInput.value = "";
    renderPreview("");
}

function clearInputs() {
    softwareNameInput.value = "";
    categoryInput.value = "";
    tagsInput.value = "";
    stepDetailsInput.value = "";
    feelingInput.value = "green";
    imageInput.value = "";
    pendingImageData = "";
    renderPreview("");
}

function setEditingState(isEditing) {
    saveProcessBtn.textContent = isEditing ? "Update Process" : "Add Process";
    cancelEditBtn.classList.toggle("hidden", !isEditing);
}

function saveAndRender() {
    localStorage.setItem("processes", JSON.stringify(processes));
    updateCategoryFilterOptions();
    renderProcesses();
    updateChart();
}

function getVisibleProcesses() {
    const selectedCategory = categoryFilterInput.value.trim().toLowerCase();
    const tagQuery = tagFilterInput.value.trim().toLowerCase();

    return processes.filter((item) => {
        const nameMatch = item.name.toLowerCase().includes(activeQuery);
        const stepsMatch = item.rawSteps.toLowerCase().includes(activeQuery);
        const tagsString = item.tags.join(" ").toLowerCase();
        const tagsMatch = tagsString.includes(activeQuery);
        const categoryMatch = !selectedCategory || item.category.toLowerCase() === selectedCategory;
        const colorMatch = !activeColor || item.feeling === activeColor;
        const tagFilterMatch = !tagQuery || item.tags.some((tag) => tag.toLowerCase().includes(tagQuery));
        const searchMatch = !activeQuery || nameMatch || stepsMatch || tagsMatch;

        return searchMatch && categoryMatch && colorMatch && tagFilterMatch;
    });
}

function renderTags(tags) {
    if (!tags.length) {
        return "";
    }

    return tags
        .map((tag) => `<span class="meta-pill">#${escapeHTML(tag)}</span>`)
        .join("");
}

function renderProcesses() {
    const list = document.getElementById("processList");
    const filtered = getVisibleProcesses();

    list.innerHTML = "";

    if (filtered.length === 0) {
        list.innerHTML = "<p>No matching processes found.</p>";
        updatePagination(filtered.length);
        return;
    }

    const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedProcesses = filtered.slice(start, end);

    paginatedProcesses.forEach((process) => {
        const originalIndex = processes.indexOf(process);
        const card = document.createElement("div");
        card.className = `process-card ${process.feeling}`;

        const shortSteps = process.rawSteps.length > 120
            ? `${process.rawSteps.slice(0, 117)}...`
            : process.rawSteps;

        card.innerHTML = `
            <div>
                <strong>${escapeHTML(process.name)}</strong><br>
                <small>Category: ${escapeHTML(process.category)}</small><br>
                <small>${escapeHTML(shortSteps)}</small><br>
                <small>Date: ${escapeHTML(process.date)}</small><br>
                ${renderTags(process.tags)}
                ${process.imageData ? `<img class="card-thumb" src="${process.imageData}" alt="${escapeHTML(process.name)} screenshot">` : ""}
            </div>
            <div class="card-actions">
                <button class="view-btn" onclick="viewProcess(${originalIndex})">View</button>
                <button class="edit-btn" onclick="editProcess(${originalIndex})">Edit</button>
                <button class="delete-btn" onclick="deleteProcess(${originalIndex})">Delete</button>
                <button class="download-btn" onclick="downloadStep(${originalIndex})">Download</button>
            </div>
        `;

        list.appendChild(card);
    });

    updatePagination(filtered.length);
}

function updatePagination(totalItems) {
    const pageInfo = document.getElementById("pageInfo");
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}

function nextPage() {
    const totalPages = Math.max(1, Math.ceil(getVisibleProcesses().length / itemsPerPage));
    if (currentPage < totalPages) {
        currentPage += 1;
        renderProcesses();
    }
}

function previousPage() {
    if (currentPage > 1) {
        currentPage -= 1;
        renderProcesses();
    }
}

async function addProcess() {
    const name = softwareNameInput.value.trim();
    const category = categoryInput.value.trim() || "General";
    const tags = parseTags(tagsInput.value);
    const rawSteps = stepDetailsInput.value.trim();
    const feeling = feelingInput.value;

    if (!name || !rawSteps) {
        alert("Please fill out software name and step details.");
        return;
    }

    if (imageInput.files[0]) {
        await handleImageChange();
    }

    const now = Date.now();
    const record = {
        name,
        category,
        tags,
        rawSteps,
        feeling,
        date: new Date(now).toLocaleString(),
        createdAt: now,
        imageData: pendingImageData || "",
    };

    if (editingIndex !== null) {
        processes[editingIndex] = {
            ...processes[editingIndex],
            ...record,
            createdAt: processes[editingIndex].createdAt,
            date: processes[editingIndex].date,
        };
        editingIndex = null;
        setEditingState(false);
    } else {
        processes.unshift(record);
    }

    currentPage = 1;
    saveAndRender();
    clearInputs();
}

function editProcess(index) {
    const process = processes[index];
    if (!process) {
        return;
    }

    editingIndex = index;
    softwareNameInput.value = process.name;
    categoryInput.value = process.category;
    tagsInput.value = process.tags.join(", ");
    stepDetailsInput.value = process.rawSteps;
    feelingInput.value = process.feeling;
    pendingImageData = process.imageData || "";
    imageInput.value = "";
    renderPreview(pendingImageData);
    setEditingState(true);
    softwareNameInput.focus();
}

function cancelEdit() {
    editingIndex = null;
    setEditingState(false);
    clearInputs();
}

function deleteProcess(index) {
    processes.splice(index, 1);

    if (editingIndex === index) {
        cancelEdit();
    } else if (editingIndex !== null && editingIndex > index) {
        editingIndex -= 1;
    }

    saveAndRender();
}

function viewProcess(index) {
    const process = processes[index];
    if (!process) {
        return;
    }

    document.getElementById("popupTitle").textContent = process.name;
    document.getElementById("popupMeta").innerHTML = `Category: <strong>${escapeHTML(process.category)}</strong><br>Tags: ${process.tags.length ? escapeHTML(process.tags.join(", ")) : "None"}`;
    document.getElementById("popupSteps").innerHTML = formatTextWithLinks(process.rawSteps);
    document.getElementById("popupDate").textContent = `Date Added: ${process.date}`;

    const popupImageWrap = document.getElementById("popupImageWrap");
    const popupImage = document.getElementById("popupImage");
    if (process.imageData) {
        popupImage.src = process.imageData;
        popupImage.alt = `${process.name} screenshot`;
        popupImageWrap.classList.remove("hidden");
    } else {
        popupImageWrap.classList.add("hidden");
        popupImage.src = "";
    }

    document.getElementById("popupView").classList.remove("hidden");
}

function closePopup() {
    document.getElementById("popupView").classList.add("hidden");
}

function filterProcesses() {
    activeQuery = document.getElementById("searchInput").value.trim().toLowerCase();
    currentPage = 1;
    renderProcesses();
}

function filterByColor(color) {
    activeColor = color;
    currentPage = 1;
    renderProcesses();
}

function resetFilters() {
    activeQuery = "";
    activeColor = "";
    document.getElementById("searchInput").value = "";
    categoryFilterInput.value = "";
    tagFilterInput.value = "";
    currentPage = 1;
    renderProcesses();
}

function sortProcesses() {
    const option = document.getElementById("sortOptions").value;
    if (option === "name") {
        processes.sort((a, b) => a.name.localeCompare(b.name));
    } else if (option === "rating") {
        processes.sort((a, b) => a.feeling.localeCompare(b.feeling));
    } else if (option === "category") {
        processes.sort((a, b) => a.category.localeCompare(b.category));
    } else if (option === "newest") {
        processes.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else if (option === "oldest") {
        processes.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    }

    currentPage = 1;
    saveAndRender();
}

function updateCategoryFilterOptions() {
    const current = categoryFilterInput.value;
    const categories = [...new Set(processes.map((item) => item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));

    categoryFilterInput.innerHTML = '<option value="">All Categories</option>';
    categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categoryFilterInput.appendChild(option);
    });

    categoryFilterInput.value = categories.includes(current) ? current : "";
}

function updateChart() {
    const counts = { green: 0, yellow: 0, red: 0 };
    processes.forEach((item) => {
        if (counts[item.feeling] !== undefined) {
            counts[item.feeling] += 1;
        }
    });

    const ctx = document.getElementById("overviewChart").getContext("2d");
    if (chart) {
        chart.destroy();
    }

    chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Good", "Neutral", "Poor"],
            datasets: [{
                label: "Task Ratings",
                data: [counts.green, counts.yellow, counts.red],
                backgroundColor: ["#2d9f54", "#c89100", "#c84242"],
            }],
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                    },
                },
            },
        },
    });
}

function exportPDF() {
    if (processes.length === 0) {
        alert("No processes to export.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let y = 12;
    processes.forEach((process, index) => {
        const title = `${index + 1}. ${process.name} (${process.feeling.toUpperCase()})`;
        const meta = `Category: ${process.category} | Tags: ${process.tags.join(", ") || "None"}`;
        const steps = doc.splitTextToSize(process.rawSteps, 175);

        if (y > 245) {
            doc.addPage();
            y = 12;
        }

        doc.text(title, 10, y);
        y += 6;
        doc.text(meta, 10, y);
        y += 6;
        doc.text(`Date: ${process.date}`, 10, y);
        y += 6;
        doc.text(steps, 10, y);
        y += steps.length * 5 + 4;
    });

    doc.save("processes.pdf");
}

function downloadStep(index) {
    const process = processes[index];
    if (!process) {
        return;
    }

    const content = `Name: ${process.name}
Category: ${process.category}
Tags: ${process.tags.join(", ") || "None"}
Feeling: ${process.feeling}
Date: ${process.date}
Photo Attached: ${process.imageData ? "Yes" : "No"}

Steps:
${process.rawSteps}`;

    const blob = new Blob([content], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${process.name.replace(/\s+/g, "_")}_Steps.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
Category: ${process.category}
Tags: ${process.tags.join(", ") || "None"}
Feeling: ${process.feeling}
Date: ${process.date}
Photo Attached: ${process.imageData ? "Yes" : "No"}
Steps:
${process.rawSteps}

-----------------------------\n\n`;
    });

    const blob = new Blob([content], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "All_Steps.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function backupData() {
    const payload = {
        app: "process-tracker",
        version: 2,
        exportedAt: new Date().toISOString(),
        processes,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `process-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function triggerRestore() {
    restoreInput.value = "";
    restoreInput.click();
}

function normalizeRestoredRecord(item) {
    const createdAt = item.createdAt || item.timestamp || Date.now();
    return {
        name: String(item.name || "Untitled Process").trim(),
        category: String(item.category || "General").trim() || "General",
        tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag).trim()).filter(Boolean) : parseTags(String(item.tags || "")),
        rawSteps: String(item.rawSteps || item.steps || "").trim(),
        feeling: ["green", "yellow", "red"].includes(item.feeling) ? item.feeling : "green",
        date: String(item.date || new Date(createdAt).toLocaleString()),
        createdAt,
        imageData: typeof item.imageData === "string" ? item.imageData : "",
    };
}

function handleRestoreFileChange(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);
            const restored = Array.isArray(data) ? data : data.processes;

            if (!Array.isArray(restored)) {
                throw new Error("Backup format is invalid.");
            }

            const normalized = restored
                .map((item) => normalizeRestoredRecord(item))
                .filter((item) => item.name && item.rawSteps);

            if (!normalized.length) {
                throw new Error("Backup did not contain any valid process records.");
            }

            const shouldMerge = confirm("Click OK to merge with existing data, or Cancel to replace all existing data.");
            processes = shouldMerge ? [...normalized, ...processes] : normalized;

            editingIndex = null;
            setEditingState(false);
            clearInputs();
            currentPage = 1;
            saveAndRender();
            alert(`Restore complete. Loaded ${normalized.length} process records.`);
        } catch (error) {
            alert(`Restore failed: ${error.message}`);
        }
    };

    reader.onerror = () => {
        alert("Unable to read selected backup file.");
    };

    reader.readAsText(file);
}

function handleDropEvents() {
    ["dragenter", "dragover"].forEach((type) => {
        imageDropZone.addEventListener(type, (event) => {
            event.preventDefault();
            event.stopPropagation();
            imageDropZone.classList.add("drag-over");
        });
    });

    ["dragleave", "drop"].forEach((type) => {
        imageDropZone.addEventListener(type, (event) => {
            event.preventDefault();
            event.stopPropagation();
            imageDropZone.classList.remove("drag-over");
        });
    });

    imageDropZone.addEventListener("drop", async (event) => {
        const file = event.dataTransfer.files && event.dataTransfer.files[0];
        if (!file) {
            return;
        }

        await processSelectedFile(file);
    });
}

imageInput.addEventListener("change", handleImageChange);
restoreInput.addEventListener("change", handleRestoreFileChange);
handleDropEvents();

sanitizeStoredData();
setEditingState(false);
saveAndRender();
