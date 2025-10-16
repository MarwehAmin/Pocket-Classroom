function loadIndex() {
    try {
        return JSON.parse(localStorage.getItem(IDX_KEY)) || [];
    } catch {
        return [];
    }
}

function saveIndex(idx) {
    localStorage.setItem(IDX_KEY, JSON.stringify(idx));
}

function loadCap(id) {
    try {
        return JSON.parse(localStorage.getItem(CAP_KEY(id)));
    } catch {
        return null;
    }
}

function saveCap(cap) {
    localStorage.setItem(CAP_KEY(cap.id), JSON.stringify(cap));
}

function loadProg(id) {
    try {
        const progress = JSON.parse(localStorage.getItem(PROG_KEY(id))) || {
            bestScore: 0,
            lastScore: 0,
            knownFlashcards: []
        };
        if (progress.lastScore === undefined) {
            progress.lastScore = progress.bestScore || 0;
        }
        return progress;
    } catch {
        return {
            bestScore: 0,
            lastScore: 0,
            knownFlashcards: []
        };
    }
}

function saveProg(id, progress) {
    localStorage.setItem(PROG_KEY(id), JSON.stringify(progress));
}

function dedupeIndex() {
    const index = loadIndex();
    const seen = new Set();
    const deduped = [];

    index.forEach(item => {
        if (!seen.has(item.id)) {
            seen.add(item.id);
            deduped.push(item);
        }
    });

    if (deduped.length !== index.length) {
        saveIndex(deduped);
    }
    return deduped;
}