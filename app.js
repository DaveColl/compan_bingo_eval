const QUESTIONS = [
    "Hat Kinder", "Hat ein Haustier", "Spielt ein Instrument",
    "Fährt Fahrrad zur Arbeit", "Trinkt keinen Kaffee",
    "Spricht 3+ Sprachen", "Hat einen Garten", "Macht Yoga",
    "Kocht gerne", "Ist Linkshänder", "Trägt eine Brille",
    "Hat im Ausland gelebt", "Spielt Fußball", "Ist Vegetarier/Vegan",
    "Hat Geschwister", "Kann ein Lied singen", "Liebt Horrorfilme",
    "Sammelt etwas", "Hat ein Tattoo", "Liest gerne Bücher",
    "Läuft Marathon", "Spielt Videospiele", "Kann tanzen",
    "Backt gerne", "Ist im selben Monat geboren"
];

let groups = [];

// ─── SETUP SCREEN ───────────────────────────────────────────

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
    groups = groups.filter(g => g.id !== id);
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
                <button class="btn btn-danger" onclick="removeGroup(${group.id})">✕ Entfernen</button>
            </div>
            <input class="input-field" type="text" placeholder="Gruppenname (z.B. Die Bingo-Helden)"
                value="${group.name}"
                oninput="updateGroupName(${group.id}, this.value)" />
            <div style="font-size:0.85em;color:#666;margin-bottom:6px;">Gruppenmitglieder:</div>
            <div class="members-inputs">
                ${group.members.map((m, i) => `
                    <div>
                        <span class="member-label">Person ${i + 1}</span>
                        <input class="input-field" type="text" placeholder="Name..."
                            value="${m}"
                            oninput="updateMember(${group.id}, ${i}, this.value)"
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
    groups.find(g => g.id === id).name = value;
    checkStartBtn();
}

function updateMember(id, index, value) {
    groups.find(g => g.id === id).members[index] = value;
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

// ─── SCORING SCREEN ─────────────────────────────────────────

function renderScoring() {
    renderLeaderboard();
    renderGroupCards();
}

function calculateScore(cells) {
    let cellPoints = 0, rowBonus = 0, colBonus = 0, diagBonus = 0;

    // Cells
    cells.forEach(c => { if (c) cellPoints++; });

    // Rows
    for (let r = 0; r < 5; r++) {
        if ([0,1,2,3,4].every(c => cells[r * 5 + c])) rowBonus++;
    }

    // Columns
    for (let c = 0; c < 5; c++) {
        if ([0,1,2,3,4].every(r => cells[r * 5 + c])) colBonus++;
    }

    // Diagonals
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

function renderLeaderboard() {
    const ranked = [...groups]
        .map(g => ({ ...g, score: calculateScore(g.cells) }))
        .sort((a, b) => b.score.total - a.score.total);

    const medals = ['🥇', '🥈', '🥉'];
    const list = document.getElementById('leaderboardList');

    list.innerHTML = ranked.map((g, i) => {
        const rankClass = i < 3 ? `rank-${i + 1}` : 'rank-other';
        const medal = medals[i] || `${i + 1}.`;
        const members = g.members.filter(m => m.trim()).join(', ') || '–';
        return `
            <div class="leaderboard-row ${rankClass}">
                <span class="lb-rank">${medal}</span>
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
    container.innerHTML = '';

    const ranked = [...groups]
        .map(g => ({ ...g, score: calculateScore(g.cells) }))
        .sort((a, b) => b.score.total - a.score.total);

    ranked.forEach((group, rankIndex) => {
        const score = group.score;
        const card = document.createElement('div');
        card.className = 'group-card';
        card.dataset.groupId = group.id;

        // Build bonus highlight sets
        const highlightRow = new Set();
        const highlightCol = new Set();
        const highlightDiag = new Set();

        for (let r = 0; r < 5; r++) {
            if ([0,1,2,3,4].every(c => group.cells[r*5+c])) {
                [0,1,2,3,4].forEach(c => highlightRow.add(r*5+c));
            }
        }
        for (let c = 0; c < 5; c++) {
            if ([0,1,2,3,4].every(r => group.cells[r*5+c])) {
                [0,1,2,3,4].forEach(r => highlightCol.add(r*5+c));
            }
        }
        if ([0,6,12,18,24].every(i => group.cells[i])) [0,6,12,18,24].forEach(i => highlightDiag.add(i));
        if ([4,8,12,16,20].every(i => group.cells[i])) [4,8,12,16,20].forEach(i => highlightDiag.add(i));

        const medals = ['🥇', '🥈', '🥉'];
        const rankLabel = rankIndex < 3 ? medals[rankIndex] : `Platz ${rankIndex + 1}`;
        const members = group.members.filter(m => m.trim());
        const memberPreview = members.slice(0, 3).join(', ') + (members.length > 3 ? ` +${members.length - 3}` : '');

        card.innerHTML = `
            <div class="group-header" onclick="toggleGroup('${group.id}')">
                <div class="group-title">
                    <span class="group-rank">${rankLabel}</span>
                    <span class="group-name">${group.name}</span>
                    <span class="group-members-preview">${memberPreview}</span>
                </div>
                <div class="group-score-display">
                    <span class="score-number">${score.total}</span>
                    <span class="score-label">Punkte</span>
                    <span class="chevron">▼</span>
                </div>
            </div>
            <div class="group-body collapsed">
                <div class="score-breakdown">
                    <span class="breakdown-item">📌 Felder: <b>${score.cells}</b></span>
                    <span class="breakdown-item">➡️ Reihen: <b>+${score.rows}</b></span>
                    <span class="breakdown-item">⬇️ Spalten: <b>+${score.cols}</b></span>
                    <span class="breakdown-item">↗️ Diagonalen: <b>+${score.diags}</b></span>
                </div>
                <div class="scoring-grid">
                    ${QUESTIONS.map((q, i) => {
                        let bonusClass = '';
                        if (highlightDiag.has(i)) bonusClass = 'diag-bonus';
                        else if (highlightRow.has(i) && highlightCol.has(i)) bonusClass = 'col-bonus';
                        else if (highlightRow.has(i)) bonusClass = 'row-bonus';
                        else if (highlightCol.has(i)) bonusClass = 'col-bonus';
                        return `<div class="scoring-cell ${group.cells[i] ? 'checked' : ''} ${group.cells[i] ? bonusClass : ''}"
                            onclick="toggleCell('${group.id}', ${i})">${q}</div>`;
                    }).join('')}
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

    // Re-open the card that was open
    const card = document.querySelector(`.group-card[data-group-id="${groupId}"]`);
    if (card) {
        card.classList.add('open');
        card.querySelector('.group-body').classList.remove('collapsed');
    }
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

// ─── EVENT LISTENERS ────────────────────────────────────────

document.getElementById('addGroupBtn').addEventListener('click', addGroup);
document.getElementById('startBtn').addEventListener('click', () => {
    saveData();
    showScoringScreen();
});
document.getElementById('resetBtn').addEventListener('click', resetAll);

init();
