const APP_VERSION = '1.3';

(function checkVersion() {
    const saved = localStorage.getItem('scoringAppVersion');
    if (saved !== APP_VERSION) {
        localStorage.removeItem('bingoScoring');
        localStorage.setItem('scoringAppVersion', APP_VERSION);
        if (saved !== null) window.location.reload(true);
    }
})();

let groups = [];

// ─── INIT ────────────────────────────────────────────────────

function init() {
    const saved = localStorage.getItem('bingoScoring');
    if (saved) {
        const data = JSON.parse(saved);
        groups = data.groups || [];
        if (groups.length > 0) {
            showScoringScreen();
            return;
        }
    }
    addGroup();
    addGroup();
    renderSetup();
}

// ─── SETUP ───────────────────────────────────────────────────

function addGroup() {
    groups.push({
        id: Date.now() + Math.random(),
        name: '',
        members: ['', '', '', '', ''],
        cells: Array(25).fill(false)
    });
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

// ─── SCORING ─────────────────────────────────────────────────

function calculateScore(cells) {
    let cellPoints = 0, rowBonus = 0, colBonus = 0, diagBonus = 0;

    cells.forEach(c => { if (c) cellPoints++; });

    for (let r = 0; r < 5; r++) {
        if ([0,1,2,3,4].every(c => cells[r * 5 + c])) rowBonus++;
    }
    for (let c = 0; c < 5; c++) {
        if ([0,1,2,3,4].every(r => cells[r * 5 + c])) colBonus++;
    }
    if ([0,6,12,18,24].every(i => cells[i])) diagBonus++;
    if ([4,8,12,16,20].every(i => cells[i])) diagBonus++;

    return {
        cells: cellPoints,
        rows: rowBonus,
        cols: colBonus,
        diags: diagBonus,
        total: cellPoints + rowBonus + colBonus + diagBonus
    };
}

function getBonusSets(cells) {
    const row = new Set(), col = new Set(), diag = new Set();

    for (let r = 0; r < 5; r++) {
        if ([0,1,2,3,4].every(c => cells[r*5+c]))
            [0,1,2,3,4].forEach(c => row.add(r*5+c));
    }
    for (let c = 0; c < 5; c++) {
        if ([0,1,2,3,4].every(r => cells[r*5+c]))
            [0,1,2,3,4].forEach(r => col.add(r*5+c));
    }
    if ([0,6,12,18,24].every(i => cells[i])) [0,6,12,18,24].forEach(i => diag.add(i));
    if ([4,8,12,16,20].every(i => cells[i])) [4,8,12,16,20].forEach(i => diag.add(i));

    return { row, col, diag };
}

function renderScoring() {
    renderLeaderboard();
    renderGroupCards();
}

function renderLeaderboard() {
    // Leaderboard sorts by score
    const ranked = [...groups]
        .map(g => ({ ...g, score: calculateScore(g.cells) }))
        .sort((a, b) => b.score.total - a.score.total);

    const medals = ['🥇', '🥈', '🥉'];
    document.getElementById('leaderboardList').innerHTML = ranked.map((g, i) => {
        const members = g.members.filter(m => m.trim()).join(', ') || '–';
        return `
            <div class="leaderboard-row ${i < 3 ? `rank-${i+1}` : 'rank-other'}">
                <span class="lb-rank">${medals[i] || `${i+1}.`}</span>
                <div class="lb-name">
                    ${g.name}
                    <div style="font-size:0.75em;color:#888;font-weight:normal;">${members}</div>
                </div>
                <span class="lb-cells">${g.score.cells}/25 Felder</span>
                <span class="lb-score">${g.score.total} Pt.</span>
            </div>
        `;
    }).join('');
}

function renderGroupCards() {
    const container = document.getElementById('groupsScoring');

    // Remember which cards were open before re-render
    const openIds = new Set(
        [...document.querySelectorAll('.group-card.open')]
            .map(c => c.dataset.groupId)
    );

    container.innerHTML = '';

    // Cards stay in original entry order - no sorting
    const withScores = groups.map(g => ({ ...g, score: calculateScore(g.cells) }));

    withScores.forEach((group, index) => {
        const score = group.score;
        const bonus = getBonusSets(group.cells);
        const members = group.members.filter(m => m.trim());
        const memberPreview = members.slice(0, 3).join(', ') + (members.length > 3 ? ` +${members.length - 3}` : '');
        const wasOpen = openIds.has(String(group.id));

        const card = document.createElement('div');
        card.className = 'group-card' + (wasOpen ? ' open' : '');
        card.dataset.groupId = group.id;

        const gridCells = Array.from({ length: 25 }, (_, i) => {
            const checked = group.cells[i];
            let bonusClass = '';
            if (checked) {
                if      (bonus.diag.has(i))                       bonusClass = 'diag-bonus';
                else if (bonus.row.has(i) && bonus.col.has(i))    bonusClass = 'diag-bonus';
                else if (bonus.row.has(i))                        bonusClass = 'row-bonus';
                else if (bonus.col.has(i))                        bonusClass = 'col-bonus';
            }
            return `<div class="scoring-cell ${checked ? 'checked' : ''} ${checked ? bonusClass : ''}"
                onclick="toggleCell('${group.id}', ${i})">${i + 1}</div>`;
        }).join('');

        card.innerHTML = `
            <div class="group-header" onclick="toggleGroup('${group.id}')">
                <div class="group-title">
                    <span class="group-rank">Gruppe ${index + 1}</span>
                    <span class="group-name">${group.name}</span>
                    <span class="group-members-preview">${memberPreview}</span>
                </div>
                <div class="group-score-display">
                    <span class="score-number">${score.total}</span>
                    <span class="score-label">Punkte</span>
                    <span class="chevron">▼</span>
                </div>
            </div>
            <div class="group-body ${wasOpen ? '' : 'collapsed'}">
                <div class="score-breakdown">
                    <span class="breakdown-item">📌 Felder: <b>${score.cells}</b></span>
                    <span class="breakdown-item">➡️ Reihen: <b>+${score.rows}</b></span>
                    <span class="breakdown-item">⬇️ Spalten: <b>+${score.cols}</b></span>
                    <span class="breakdown-item">↗️ Diagonalen: <b>+${score.diags}</b></span>
                </div>
                <div class="scoring-grid">${gridCells}</div>
                <div class="bonus-legend">
                    <span class="legend-item"><span class="legend-dot" style="background:#f0c040;"></span> Reihe komplett</span>
                    <span class="legend-item"><span class="legend-dot" style="background:#4caf50;"></span> Spalte komplett</span>
                    <span class="legend-item"><span class="legend-dot" style="background:#ff6b6b;"></span> Diagonale komplett</span>
                </div>
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
