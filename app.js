const APP_VERSION = '1.8';
const GRID_COLUMNS = 4;
const GRID_ROWS = 3;
const TOTAL_CELLS = GRID_COLUMNS * GRID_ROWS;
const CUSTOM_POINT_INDEXES = [5, 6];
const FOUR_IN_ROW_POINTS = 1;
const THREE_IN_ROW_POINTS = 0.5;

const ROW_LINES = Array.from({ length: GRID_ROWS }, (_, row) =>
    Array.from({ length: GRID_COLUMNS }, (_, col) => row * GRID_COLUMNS + col)
);
const COLUMN_LINES = Array.from({ length: GRID_COLUMNS }, (_, col) =>
    Array.from({ length: GRID_ROWS }, (_, row) => row * GRID_COLUMNS + col)
);
const DIAGONAL_LINES = [
    [0, 5, 10],
    [1, 6, 11],
    [2, 5, 8],
    [3, 6, 9]
];

(function checkVersion() {
    const saved = localStorage.getItem('scoringAppVersion');
    if (saved !== APP_VERSION) {
        localStorage.removeItem('bingoScoring');
        localStorage.setItem('scoringAppVersion', APP_VERSION);
        if (saved !== null) window.location.reload(true);
    }
})();

let groups = [];

function createEmptyCustomPoints() {
    return CUSTOM_POINT_INDEXES.reduce((acc, index) => {
        acc[index] = 0;
        return acc;
    }, {});
}

function createGroup() {
    return {
        id: Date.now() + Math.random(),
        name: '',
        members: ['', '', '', '', ''],
        cells: Array(TOTAL_CELLS).fill(false),
        customPoints: createEmptyCustomPoints(),
        submittedAt: null
    };
}

function isCustomPointCell(index) {
    return CUSTOM_POINT_INDEXES.includes(index);
}

function sanitizePointValue(value) {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function formatPoints(value) {
    const normalized = Math.round(value * 100) / 100;
    if (Number.isInteger(normalized)) {
        return normalized.toString();
    }
    return normalized.toLocaleString('de-DE', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2
    });
}

function normalizeGroup(group) {
    group.members = Array.isArray(group.members) ? group.members.slice(0, 5) : [];
    while (group.members.length < 5) group.members.push('');

    group.cells = Array.isArray(group.cells)
        ? group.cells.slice(0, TOTAL_CELLS).map(Boolean)
        : [];
    while (group.cells.length < TOTAL_CELLS) group.cells.push(false);

    const legacyCustomValue = typeof group.gltCount === 'number' ? group.gltCount : 0;
    group.customPoints = group.customPoints && typeof group.customPoints === 'object'
        ? group.customPoints
        : createEmptyCustomPoints();

    if (legacyCustomValue > 0 && !group.customPoints[CUSTOM_POINT_INDEXES[0]]) {
        group.customPoints[CUSTOM_POINT_INDEXES[0]] = legacyCustomValue;
    }

    CUSTOM_POINT_INDEXES.forEach(index => {
        const customValue = sanitizePointValue(group.customPoints[index]);
        group.customPoints[index] = customValue;
        group.cells[index] = customValue > 0;
    });

    if (typeof group.submittedAt === 'undefined') group.submittedAt = null;
}

function countCompletedLines(lines, cells) {
    return lines.filter(line => line.every(index => cells[index])).length;
}

function init() {
    const saved = localStorage.getItem('bingoScoring');
    if (saved) {
        const data = JSON.parse(saved);
        groups = data.groups || [];
        groups.forEach(normalizeGroup);
        if (groups.length > 0) {
            showScoringScreen();
            return;
        }
    }
    addGroup();
    addGroup();
    renderSetup();
}

function addGroup() {
    groups.push(createGroup());
    renderSetup();
}

function removeGroup(id) {
    if (groups.length <= 1) return alert('Mindestens eine Gruppe wird benötigt!');
    groups = groups.filter(g => String(g.id) !== String(id));
    renderSetup();
}

function renderSetup() {
    const list = document.getElementById('groupList');
    list.innerHTML = '';

    groups.forEach((group, index) => {
        const card = document.createElement('div');
        card.className = 'group-input-card';
        card.innerHTML = `
            <div class="group-input-header">
                <h3>Gruppe ${index + 1}</h3>
                <button class="btn btn-danger" onclick="removeGroup('${group.id}')">✕ Entfernen</button>
            </div>
            <input class="input-field" type="text" placeholder="Gruppenname (z.B. Die Bingo-Helden)"
                value="${group.name}"
                oninput="updateGroupName('${group.id}', this.value)" />
            <div style="font-size:0.85em;color:#666;margin-bottom:8px;">Gruppenmitglieder:</div>
            <div class="members-inputs">
                ${group.members.map((m, i) => `
                    <div>
                        <span class="member-label">Person ${i + 1}</span>
                        <input class="input-field" type="text" placeholder="Name..."
                            value="${m}"
                            oninput="updateMember('${group.id}', ${i}, this.value)"
                            style="margin-bottom:0;" />
                    </div>
                `).join('')}
            </div>
        `;
        list.appendChild(card);
    });

    checkStartBtn();
}

function updateGroupName(id, value) {
    groups.find(g => String(g.id) === String(id)).name = value;
    checkStartBtn();
}

function updateMember(id, index, value) {
    groups.find(g => String(g.id) === String(id)).members[index] = value;
}

function checkStartBtn() {
    const allNamed = groups.every(g => g.name.trim() !== '');
    document.getElementById('startBtn').disabled = !allNamed;
}

function showScoringScreen() {
    document.getElementById('setupScreen').classList.remove('active');
    document.getElementById('scoringScreen').classList.add('active');
    renderScoring();
}

function calculateScore(group) {
    const cells = group.cells;
    let cellPoints = 0;

    cells.forEach((checked, index) => {
        if (isCustomPointCell(index)) {
            cellPoints += sanitizePointValue(group.customPoints?.[index]);
        } else if (checked) {
            cellPoints++;
        }
    });

    const rowBonus = countCompletedLines(ROW_LINES, cells);
    const colBonus = countCompletedLines(COLUMN_LINES, cells);
    const diagBonus = countCompletedLines(DIAGONAL_LINES, cells);
    const rowPoints = rowBonus * FOUR_IN_ROW_POINTS;
    const colPoints = colBonus * THREE_IN_ROW_POINTS;
    const diagPoints = diagBonus * THREE_IN_ROW_POINTS;

    return {
        cells: cellPoints,
        rows: rowBonus,
        cols: colBonus,
        diags: diagBonus,
        rowPoints,
        colPoints,
        diagPoints,
        total: cellPoints + rowPoints + colPoints + diagPoints
    };
}

function getBonusSets(cells) {
    const row = new Set(), col = new Set(), diag = new Set();

    ROW_LINES.forEach(line => {
        if (line.every(index => cells[index])) line.forEach(index => row.add(index));
    });
    COLUMN_LINES.forEach(line => {
        if (line.every(index => cells[index])) line.forEach(index => col.add(index));
    });
    DIAGONAL_LINES.forEach(line => {
        if (line.every(index => cells[index])) line.forEach(index => diag.add(index));
    });

    return { row, col, diag };
}

function formatTime(ts) {
    if (!ts) return null;
    const d = new Date(ts);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function getSubmissionOrder(groupId) {
    const submitted = groups
        .filter(g => g.submittedAt !== null)
        .sort((a, b) => a.submittedAt - b.submittedAt);
    const idx = submitted.findIndex(g => String(g.id) === String(groupId));
    return idx === -1 ? null : idx + 1;
}

function submitGroup(groupId) {
    const group = groups.find(g => String(g.id) === String(groupId));
    if (!group) return;
    if (group.submittedAt) {
        if (!confirm(`Abgabe für "${group.name}" rückgängig machen?`)) return;
        group.submittedAt = null;
    } else {
        group.submittedAt = Date.now();
    }
    saveData();
    renderScoring();
}

function updateCustomCellPoints(groupId, cellIndex, value) {
    const group = groups.find(g => String(g.id) === String(groupId));
    if (!group) return;
    const points = sanitizePointValue(value);
    group.customPoints[cellIndex] = points;
    group.cells[cellIndex] = points > 0;
    saveData();
    renderScoring();
}

function renderScoring() {
    renderLeaderboard();
    renderGroupCards();
}

function renderLeaderboard() {
    const ranked = [...groups]
        .map(g => ({ ...g, score: calculateScore(g) }))
        .sort((a, b) => {
            if (b.score.total !== a.score.total) return b.score.total - a.score.total;
            if (a.submittedAt && b.submittedAt) return a.submittedAt - b.submittedAt;
            if (a.submittedAt) return -1;
            if (b.submittedAt) return 1;
            return 0;
        });

    const medals = ['🥇', '🥈', '🥉'];
    document.getElementById('leaderboardList').innerHTML = ranked.map((g, i) => {
        const members = g.members.filter(m => m.trim()).join(', ') || '–';
        const order = getSubmissionOrder(g.id);
        const submittedHtml = g.submittedAt
            ? `<span class="lb-submitted">✅ Abgabe ${order}. (${formatTime(g.submittedAt)})</span>`
            : `<span class="lb-not-submitted">⏳ Noch nicht abgegeben</span>`;
        return `
            <div class="leaderboard-row ${i < 3 ? `rank-${i+1}` : 'rank-other'}">
                <span class="lb-rank">${medals[i] || `${i+1}.`}</span>
                <div class="lb-name">
                    ${g.name}
                    <div style="font-size:0.75em;color:#888;font-weight:normal;">${members}</div>
                </div>
                <div class="lb-meta">
                    <span class="lb-cells">${formatPoints(g.score.cells)} Pt. (Felder & Sonderpunkte)</span>
                    ${submittedHtml}
                </div>
                <span class="lb-score">${formatPoints(g.score.total)} Pt.</span>
            </div>
        `;
    }).join('');
}

function renderGroupCards() {
    const container = document.getElementById('groupsScoring');

    const openIds = new Set(
        [...document.querySelectorAll('.group-card.open')]
            .map(c => c.dataset.groupId)
    );

    container.innerHTML = '';

    const withScores = groups.map(g => ({ ...g, score: calculateScore(g) }));

    withScores.forEach((group, index) => {
        const score = group.score;
        const bonus = getBonusSets(group.cells);
        const members = group.members.filter(m => m.trim());
        const memberPreview = members.slice(0, 3).join(', ') + (members.length > 3 ? ` +${members.length - 3}` : '');
        const wasOpen = openIds.has(String(group.id));
        const isSubmitted = group.submittedAt !== null;
        const order = getSubmissionOrder(group.id);

        const card = document.createElement('div');
        card.className = `group-card${wasOpen ? ' open' : ''}${isSubmitted ? ' submitted' : ''}`;
        card.dataset.groupId = group.id;

        const gridCells = Array.from({ length: TOTAL_CELLS }, (_, i) => {
            const checked = group.cells[i];
            let bonusClass = '';
            if (checked) {
                if      (bonus.diag.has(i))                    bonusClass = 'diag-bonus';
                else if (bonus.row.has(i) && bonus.col.has(i)) bonusClass = 'diag-bonus';
                else if (bonus.row.has(i))                     bonusClass = 'row-bonus';
                else if (bonus.col.has(i))                     bonusClass = 'col-bonus';
            }
            
            if (isCustomPointCell(i)) {
                return `
                <div class="scoring-cell scoring-cell-input ${checked ? 'checked' : ''} ${checked ? bonusClass : ''}">
                    <label class="scoring-input-label" onclick="event.stopPropagation()">
                        Sonderpunkte
                        <input class="scoring-input" type="number" min="0" step="0.5" value="${group.customPoints?.[i] || 0}"
                        onchange="updateCustomCellPoints('${group.id}', ${i}, this.value)"
                        onclick="event.stopPropagation()"
                        title="Sonderpunkte für dieses Mittelfeld eintragen" />
                    </label>
                </div>`;
            }

            return `<div class="scoring-cell ${checked ? 'checked' : ''} ${checked ? bonusClass : ''}"
                onclick="toggleCell('${group.id}', ${i})">${i + 1}</div>`;
        }).join('');

        const submitHtml = isSubmitted
            ? `<div class="submit-section done">
                <button class="btn-submit undone" onclick="submitGroup('${group.id}')">↩ Rückgängig</button>
                <span class="submit-info done">✅ Abgegeben als ${order}. um ${formatTime(group.submittedAt)}</span>
               </div>`
            : `<div class="submit-section">
                <button class="btn-submit" onclick="submitGroup('${group.id}')">✅ Abgabe bestätigen</button>
                <span class="submit-info">Drücken wenn die Gruppe ihr Bingo abgibt. Uhrzeit wird als Tiebreaker gespeichert.</span>
               </div>`;

        card.innerHTML = `
            <div class="group-header" onclick="toggleGroup('${group.id}')">
                <div class="group-title">
                    <span class="group-rank">Gruppe ${index + 1}</span>
                    <span class="group-name">${group.name}</span>
                    <span class="group-members-preview">${memberPreview}</span>
                    ${isSubmitted ? `<span class="group-submitted-badge">✅ Abgabe ${order}. um ${formatTime(group.submittedAt)}</span>` : ''}
                </div>
                <div class="group-score-display">
                    <span class="score-number">${formatPoints(score.total)}</span>
                    <span class="score-label">Punkte</span>
                    <span class="chevron">▼</span>
                </div>
            </div>
            <div class="group-body ${wasOpen ? '' : 'collapsed'}">
                <div class="score-breakdown">
                    <span class="breakdown-item">📌 Felder & Sonderpunkte: <b>${formatPoints(score.cells)}</b></span>
                    <span class="breakdown-item">➡️ 4er-Reihen: <b>${score.rows} × 1 = +${formatPoints(score.rowPoints)}</b></span>
                    <span class="breakdown-item">⬇️ 3er-Spalten: <b>${score.cols} × 0,5 = +${formatPoints(score.colPoints)}</b></span>
                    <span class="breakdown-item">↗️ 3er-Diagonalen: <b>${score.diags} × 0,5 = +${formatPoints(score.diagPoints)}</b></span>
                </div>
                <div class="scoring-grid">${gridCells}</div>
                <div class="bonus-legend">
                    <span class="legend-item"><span class="legend-dot" style="background:#f0c040;"></span> 4er-Reihe komplett = +1</span>
                    <span class="legend-item"><span class="legend-dot" style="background:#4caf50;"></span> 3er-Spalte komplett = +0,5</span>
                    <span class="legend-item"><span class="legend-dot" style="background:#ff6b6b;"></span> 3er-Diagonale komplett = +0,5</span>
                </div>
                ${submitHtml}
                <div class="members-list">
                    ${members.map(m => `<span class="member-tag">👤 ${m}</span>`).join('')}
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

function toggleGroup(id) {
    const card = document.querySelector(`.group-card[data-group-id="${id}"]`);
    const body = card.querySelector('.group-body');
    const isOpen = card.classList.contains('open');
    card.classList.toggle('open', !isOpen);
    body.classList.toggle('collapsed', isOpen);
}

function toggleCell(groupId, cellIndex) {
    const group = groups.find(g => String(g.id) === String(groupId));
    if (!group) return;
    if (isCustomPointCell(cellIndex)) return;
    group.cells[cellIndex] = !group.cells[cellIndex];
    saveData();
    renderScoring();
}

function saveData() {
    localStorage.setItem('bingoScoring', JSON.stringify({ groups }));
}

function resetAll() {
    if (confirm('Wirklich alle Daten löschen und neu starten?')) {
        localStorage.removeItem('bingoScoring');
        groups = [];
        document.getElementById('scoringScreen').classList.remove('active');
        document.getElementById('setupScreen').classList.add('active');
        addGroup();
        addGroup();
        renderSetup();
    }
}

document.getElementById('addGroupBtn').addEventListener('click', addGroup);
document.getElementById('startBtn').addEventListener('click', () => { saveData(); showScoringScreen(); });
document.getElementById('resetBtn').addEventListener('click', resetAll);

init();
