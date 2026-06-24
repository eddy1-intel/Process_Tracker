:root {
    --bg: #f4f5f7;
    --bg-glow-1: #dbeaff;
    --bg-glow-2: #e8f8ee;
    --card: rgba(255, 255, 255, 0.88);
    --card-solid: #ffffff;
    --text: #101828;
    --muted: #667085;
    --line: rgba(15, 23, 42, 0.1);
    --line-strong: rgba(15, 23, 42, 0.18);
    --brand: #007aff;
    --brand-pressed: #0062cc;
    --ok: #34c759;
    --warn: #ff9f0a;
    --bad: #ff3b30;
    --soft: #eef2f7;
    --radius-lg: 22px;
    --radius-md: 16px;
    --radius-sm: 12px;
    --shadow-lg: 0 22px 45px rgba(17, 24, 39, 0.12);
    --shadow-sm: 0 6px 16px rgba(17, 24, 39, 0.08);
}

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    min-height: 100vh;
    color: var(--text);
    font-family: "SF Pro Text", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background:
        radial-gradient(circle at 14% 10%, var(--bg-glow-1) 0%, transparent 24%),
        radial-gradient(circle at 88% 85%, var(--bg-glow-2) 0%, transparent 22%),
        var(--bg);
}

.ios-shell {
    width: 1180px;
    max-width: 96vw;
    margin: 22px auto 34px;
    padding: 14px;
}

.app-header {
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 22px;
}

h1 {
    margin: 0;
    font-size: clamp(1.48rem, 1.9vw, 2rem);
    letter-spacing: -0.02em;
}

.subtitle {
    margin: 6px 0 0;
    color: var(--muted);
    max-width: 720px;
    font-size: 0.97rem;
}

.header-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #eef5ff;
    border: 1px solid #cde0ff;
    color: #2359b8;
    border-radius: 999px;
    padding: 8px 14px;
    font-weight: 600;
    font-size: 0.83rem;
    white-space: nowrap;
}

.card {
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    padding: 18px;
    margin-top: 14px;
}

.section-title {
    margin: 0 0 12px;
    font-size: 1.03rem;
    letter-spacing: -0.01em;
}

.input-section,
.filter-section {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: 10px;
}

#softwareName,
#categoryInput,
#tagsInput {
    grid-column: span 4;
}

#stepDetails {
    grid-column: span 8;
    min-height: 132px;
    resize: vertical;
}

#feeling,
#saveProcessBtn,
#cancelEditBtn {
    grid-column: span 2;
}

.image-upload-wrap {
    grid-column: span 4;
    border: 1px dashed var(--line-strong);
    border-radius: var(--radius-md);
    background: #fbfcfe;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: border-color 0.2s ease, background-color 0.2s ease;
}

.image-upload-wrap.drag-over {
    border-color: var(--brand);
    background: #edf4ff;
}

.image-upload-wrap label {
    font-size: 0.88rem;
    color: var(--muted);
    font-weight: 500;
}

.drop-hint {
    font-size: 0.8rem;
    color: var(--muted);
}

#searchInput {
    grid-column: span 3;
}

#categoryFilter,
#tagFilter,
#sortOptions {
    grid-column: span 2;
}

.filter-section button {
    grid-column: span 1;
}

input,
textarea,
select,
button {
    width: 100%;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    padding: 12px 14px;
    font-size: 0.95rem;
    background: var(--card-solid);
    color: var(--text);
}

input:focus,
textarea:focus,
select:focus {
    outline: none;
    border-color: #89bcff;
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.18);
}

button {
    border: none;
    border-radius: 13px;
    background: linear-gradient(180deg, #2890ff 0%, #007aff 100%);
    color: #ffffff;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.14s ease, filter 0.2s ease;
}

button:hover {
    transform: translateY(-1px);
    filter: brightness(0.97);
}

button:active {
    transform: translateY(0);
}

.secondary-btn,
.soft-btn {
    background: var(--soft);
    color: #334155;
    border: 1px solid var(--line);
}

.secondary-btn:hover,
.soft-btn:hover {
    background: #e6ebf2;
}

.tone-btn.good {
    background: linear-gradient(180deg, #48d96b 0%, var(--ok) 100%);
}

.tone-btn.neutral {
    background: linear-gradient(180deg, #ffb847 0%, var(--warn) 100%);
}

.tone-btn.poor {
    background: linear-gradient(180deg, #ff6f67 0%, var(--bad) 100%);
}

.main-container {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(320px, 1fr);
    gap: 14px;
    align-items: start;
    margin-top: 14px;
}

.list-card,
.chart-section {
    min-height: 100%;
}

#processList {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.process-card {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    padding: 14px;
    background: #ffffff;
    border-radius: 16px;
    border: 1px solid var(--line);
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
    animation: cardIn 0.24s ease;
}

.process-card.green {
    border-left: 4px solid var(--ok);
}

.process-card.yellow {
    border-left: 4px solid var(--warn);
}

.process-card.red {
    border-left: 4px solid var(--bad);
}

.process-card strong {
    font-size: 1.04rem;
    display: inline-block;
    margin-bottom: 2px;
}

.process-card small {
    color: #475467;
    line-height: 1.45;
}

.card-thumb {
    width: 120px;
    height: 82px;
    object-fit: cover;
    border-radius: 10px;
    margin-top: 10px;
    border: 1px solid var(--line);
}

.card-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: flex-end;
    align-content: flex-start;
    width: 260px;
}

.card-actions button {
    min-width: 80px;
    padding: 10px 12px;
}

.meta-pill {
    display: inline-flex;
    align-items: center;
    margin-top: 8px;
    margin-right: 6px;
    border-radius: 999px;
    border: 1px solid #d0d8e6;
    background: #f4f7fc;
    color: #334155;
    font-size: 0.76rem;
    font-weight: 500;
    padding: 4px 8px;
}

.chart-section h2 {
    margin: 0 0 10px;
    font-size: 1.02rem;
}

canvas {
    width: 100%;
    max-width: 360px;
    margin: 2px auto 0;
    display: block;
}

.pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 12px;
    gap: 10px;
}

#pageInfo {
    color: var(--muted);
    font-size: 0.91rem;
    text-align: center;
    min-width: 110px;
}

.export-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
}

.export-btn {
    background: #1f2937;
    color: #f8fafc;
}

.export-btn:hover {
    background: #111827;
}

.image-preview {
    width: 118px;
    height: 84px;
    border: 1px solid var(--line);
    border-radius: 10px;
    overflow: hidden;
    background: #f9fafb;
}

.image-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.popup {
    position: fixed;
    inset: 0;
    z-index: 1000;
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, 0.55);
}

.popup-content {
    width: min(760px, 100%);
    max-height: 88vh;
    overflow-y: auto;
    background: #ffffff;
    border: 1px solid var(--line);
    border-radius: 20px;
    box-shadow: var(--shadow-lg);
    position: relative;
    padding: 22px;
}

.popup-content h2 {
    margin: 0;
    padding-right: 42px;
    text-align: left;
}

.popup-meta {
    margin: 8px 0 0;
    color: #475467;
    line-height: 1.5;
}

.popup-image-wrap {
    margin: 12px 0;
}

#popupImage {
    width: 100%;
    max-height: 380px;
    object-fit: contain;
    border-radius: 12px;
    border: 1px solid var(--line);
    background: #f8fafc;
}

#popupSteps {
    margin: 8px 0;
    line-height: 1.65;
    color: #1d2939;
    word-break: break-word;
}

#popupSteps a {
    color: #005bd1;
    font-weight: 500;
}

#popupDate {
    color: #667085;
}

.close-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #f3f4f6;
    color: #334155;
    border: 1px solid #d8dee8;
    padding: 0;
}

.close-btn:hover {
    background: #e9edf3;
}

.hidden {
    display: none !important;
}

@keyframes cardIn {
    from {
        opacity: 0;
        transform: translateY(8px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
