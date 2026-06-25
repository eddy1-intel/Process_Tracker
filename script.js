function loadProcessesFromStorage() {
    try {
        const raw = localStorage.getItem("processes");
        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Failed to parse saved processes:", error);
        alert("Saved tracker data was corrupted and has been reset.");
        localStorage.removeItem("processes");
        return [];
    }
}

let processes = loadProcessesFromStorage();
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
const statusBanner = document.getElementById("statusBanner");

let pendingImageData = "";
let statusBannerTimer;

function showStatus(message, type = "info", timeoutMs = 2800) {
    if (!statusBanner) {
        return;
    }

    clearTimeout(statusBannerTimer);
    statusBanner.textContent = message;
    statusBanner.classList.remove("hidden", "info", "success", "warning", "error");
    statusBanner.classList.add(type);

    statusBannerTimer = setTimeout(() => {
        statusBanner.classList.add("hidden");
        statusBanner.classList.remove("info", "success", "warning", "error");
    }, timeoutMs);
}

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
    return String(tagText || "")
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
    if (!imagePreview || !removeImageBtn) {
        return;
    }

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
        showStatus("Image must be smaller than 8MB.", "warning");
        alert("Please choose an image smaller than 8MB.");
        return;
    }

    try {
        pendingImageData = await downscaleImage(file);
        renderPreview(pendingImageData);
        showStatus("Photo attached.", "success", 1800);
    } catch (error) {
        showStatus(error.message, "error", 3600);
        alert(error.message);
    }
}

async function handleImageChange() {
    if (!imageInput) {
        return;
    }

    const file = imageInput.files[0];
    if (!file) {
        pendingImageData = editingIndex !== null && processes[editingIndex]
            ? processes[editingIndex].imageData || ""
            : "";
        renderPreview(pendingImageData);
        return;
    }

    await processSelectedFile(file);
}

function removeSelectedImage() {
    pendingImageData = "";
    imageInput.value = "";
    renderPreview("");
    showStatus("Photo removed.", "info", 1800);
}

function clearInputs() {
    if (softwareNameInput) softwareNameInput.value = "";
    if (categoryInput) categoryInput.value = "";
    if (tagsInput) tagsInput.value = "";
    if (stepDetailsInput) stepDetailsInput.value = "";
    if (feelingInput) feelingInput.value = "green";
    if (imageInput) imageInput.value = "";
    pendingImageData = "";
    renderPreview("");
}

function setEditingState(isEditing) {
    if (saveProcessBtn) {
        saveProcessBtn.textContent = isEditing ? "Update Process" : "Add Process";
    }
    if (cancelEditBtn) {
        cancelEditBtn.classList.toggle("hidden", !isEditing);
    }
}

function saveAndRender() {
    try {
        localStorage.setItem("processes", JSON.stringify(processes));
    } catch (error) {
        if (error && error.name === "QuotaExceededError") {
            throw new Error("Storage is full. Remove a few large image entries or restore from backup with fewer images.");
        }
        throw error;
    }

    updateCategoryFilterOptions();
    renderProcesses();
    updateChart();
}

function getVisibleProcesses() {
    const selectedCategory = categoryFilterInput ? categoryFilterInput.value.trim().toLowerCase() : "";
    const tagQuery = tagFilterInput ? tagFilterInput.value.trim().toLowerCase() : "";

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
    const name = softwareNameInput ? softwareNameInput.value.trim() : "";
    const category = categoryInput ? categoryInput.value.trim() || "General" : "General";
    const tags = parseTags(tagsInput ? tagsInput.value : "");
    const rawSteps = stepDetailsInput ? stepDetailsInput.value.trim() : "";
    const feeling = feelingInput ? feelingInput.value : "green";

    if (!name || !rawSteps) {
        showStatus("Software name and step details are required.", "warning");
        alert("Please fill out software name and step details.");
        return;
    }

    if (imageInput && imageInput.files[0]) {
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

    let previousRecord = null;
    let previousIndex = -1;
    const wasEditing = editingIndex !== null;

    if (wasEditing) {
        previousIndex = editingIndex;
        previousRecord = { ...processes[editingIndex] };
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

    try {
        currentPage = 1;
        saveAndRender();
        clearInputs();
        showStatus(wasEditing ? "Process updated." : "Process added.", "success");
    } catch (error) {
        if (wasEditing && previousRecord) {
            processes[previousIndex] = previousRecord;
            editingIndex = previousIndex;
            setEditingState(true);
        } else {
            processes.shift();
        }

        showStatus(`Unable to save process: ${error.message}`, "error", 4200);
        alert(`Unable to save process: ${error.message}`);
        console.error("Failed to add/update process:", error);
    }
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
    showStatus("Edit canceled.", "info", 1800);
}

function deleteProcess(index) {
    processes.splice(index, 1);

    if (editingIndex === index) {
        cancelEdit();
    } else if (editingIndex !== null && editingIndex > index) {
        editingIndex -= 1;
    }

    saveAndRender();
    showStatus("Process deleted.", "success", 1800);
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
    if (categoryFilterInput) {
        categoryFilterInput.value = "";
    }
    if (tagFilterInput) {
        tagFilterInput.value = "";
    }
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
    if (!categoryFilterInput) {
        return;
    }

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
    if (typeof Chart === "undefined") {
        return;
    }

    const canvas = document.getElementById("overviewChart");
    if (!canvas) {
        return;
    }

    const counts = { green: 0, yellow: 0, red: 0 };
    processes.forEach((item) => {
        if (counts[item.feeling] !== undefined) {
            counts[item.feeling] += 1;
        }
    });

    const ctx = canvas.getContext("2d");
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
    if (!window.jspdf || !window.jspdf.jsPDF) {
        showStatus("PDF export library is unavailable.", "error", 3600);
        alert("PDF library is not available right now. Refresh and try again.");
        return;
    }

    if (processes.length === 0) {
        showStatus("No processes available to export.", "warning");
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
    showStatus("PDF exported.", "success", 2000);
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
    showStatus("Process steps downloaded.", "success", 2000);
}

function downloadAllSteps() {
    if (processes.length === 0) {
        showStatus("No steps available to download.", "warning");
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
    showStatus("All process steps downloaded.", "success", 2000);
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
    showStatus("Backup exported as JSON.", "success", 2200);
}

function triggerRestore() {
    if (!restoreInput) {
        return;
    }
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
            showStatus(`Restore complete. Loaded ${normalized.length} processes.`, "success", 3200);
            alert(`Restore complete. Loaded ${normalized.length} process records.`);
        } catch (error) {
            showStatus(`Restore failed: ${error.message}`, "error", 4200);
            alert(`Restore failed: ${error.message}`);
        }
    };

    reader.onerror = () => {
        showStatus("Unable to read selected backup file.", "error", 3600);
        alert("Unable to read selected backup file.");
    };

    reader.readAsText(file);
}

function handleDropEvents() {
    if (!imageDropZone) {
        return;
    }

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

if (imageInput) {
    imageInput.addEventListener("change", handleImageChange);
}
if (restoreInput) {
    restoreInput.addEventListener("change", handleRestoreFileChange);
}
handleDropEvents();

sanitizeStoredData();
setEditingState(false);
try {
    saveAndRender();
    showStatus("Tracker ready.", "info", 1500);
} catch (error) {
    console.error("Initial render failed:", error);
    showStatus(`App initialization issue: ${error.message}`, "error", 5000);
    alert(`App initialization issue: ${error.message}`);
}
