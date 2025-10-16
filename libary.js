function initLibrary() {
    renderCapsules();

    document.getElementById('newCapsuleBtn').addEventListener('click', () => {
        document.querySelector('.nav-link[data-section="author"]').click();
    });

    document.getElementById('importJsonBtn').addEventListener('click', () => {
        document.getElementById('importFileInput').click();
    });

    document.getElementById('importFileInput').addEventListener('change', handleFileImport);

    document.getElementById('capsulesContainer').addEventListener('click', function (e) {
        const target = e.target.closest('button');
        if (!target) return;

        const capsuleId = target.dataset.id;
        if (!capsuleId) return;

        e.preventDefault();
        e.stopPropagation();

        if (target.classList.contains('delete-btn')) {
            deleteCapsule(capsuleId);
        } else if (target.classList.contains('learn-btn')) {
            startLearning(capsuleId);
        } else if (target.classList.contains('edit-btn')) {
            editCapsule(capsuleId);
        } else if (target.classList.contains('export-btn')) {
            exportSingleCapsule(capsuleId);
        }
    });
}

function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        try {
            const importedData = JSON.parse(e.target.result);
            importCapsule(importedData);
            event.target.value = '';
        } catch (error) {
            console.error('Import error:', error);
            showToast('Invalid JSON file!', 'danger');
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

function importCapsule(importedData) {
    if (!importedData || typeof importedData !== 'object') {
        showToast('Invalid capsule data!', 'danger');
        return false;
    }

    const importedCapsule = JSON.parse(JSON.stringify(importedData));
    importedCapsule.id = generateId();
    importedCapsule.updatedAt = new Date().toISOString();

    if (!importedCapsule.createdAt) {
        importedCapsule.createdAt = new Date().toISOString();
    }

    saveCap(importedCapsule);

    const index = loadIndex();
    if (!index.find(item => item.id === importedCapsule.id)) {
        index.push({
            id: importedCapsule.id,
            createdAt: importedCapsule.createdAt
        });
        saveIndex(index);
    }

    renderCapsules();
    renderCapsuleSelector();
    showToast(`Capsule "${importedCapsule.title || 'Untitled'}" imported successfully!`, 'success');
    return true;
}

// Render Capsules
function renderCapsules() {
    const capsules = dedupeIndex();
    const grid = document.getElementById('capsulesContainer');
    const emptyLibrary = document.getElementById('emptyLibrary');

    grid.innerHTML = '';

    if (!emptyLibrary) {
        console.error('emptyLibrary element not found!');
        return;
    }

    const existingCapsules = capsules.filter(c => loadCap(c.id) !== null);

    if (existingCapsules.length === 0) {
        emptyLibrary.style.display = 'block';
        return;
    } else {
        emptyLibrary.style.display = 'none';
    }

    existingCapsules.forEach(c => {
        const cap = loadCap(c.id);
        const progress = loadProg(c.id);
        if (!cap) return;

        if (!cap.level) {
            cap.level = 'Beginner';
            saveCap(cap);
        }

        const levelBadgeClass = 'bg-secondary';
        const div = document.createElement('div');
        div.className = 'col-12 col-sm-6 col-lg-4 mb-4';

        div.innerHTML = `
            <div class="card capsule-card h-100" data-id="${c.id}">
                <div class="card-body d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="card-title">${cap.title}</h5>
                        <span class="badge ${levelBadgeClass}">${cap.level}</span>
                    </div>
                    <div class="d-flex justify-content-between mb-3">
                        <h6 class="card-subtitle text-muted mb-0">${cap.subject}</h6>
                        <small class="text-muted">${timeAgo(cap.updatedAt || c.createdAt)}</small>
                    </div>
                    
                    <div class="row align-items-center mb-2">
                        <div class="col-7 ps-0 text-start">
                            <div class="text-muted mb-1 small">Quiz Score</div>
                            <div class="progress" style="height: 8px; border-radius: 4px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.1); background-color: #f0f0f0;">
                                <div class="progress-bar" 
                                    role="progressbar" 
                                    style="width: ${progress.lastScore}%; 
                                    background: linear-gradient(90deg, #4CAF50 0%, #66bB6A 50%, #8BC34A 100%);"
                                    aria-valuenow="${progress.lastScore}" 
                                    aria-valuemin="0" 
                                    aria-valuemax="100">
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-5 text-center">
                            <div class="text-muted small">Known Cards</div>
                            <div class="fw-bold" style="font-size: 1.1rem;">
                            ${progress.knownFlashcards && progress.knownFlashcards.length ? progress.knownFlashcards.length : 0}/${cap.flashcards ? cap.flashcards.length : 0}
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-auto">
                        <div class="btn-group w-100 gap-2" role="group">
                            <button class="btn btn-outline-secondary btn-sm flex-fill learn-btn rounded" data-id="${c.id}">
                                <i class="bi bi-play-circle text-primary"></i>
                                <span class="btn-text text-dark">Learn</span>
                            </button>
                            <button class="btn btn-outline-secondary btn-sm flex-fill edit-btn rounded" data-id="${c.id}">
                                <i class="bi bi-pencil text-success"></i>
                                <span class="btn-text text-dark">Edit</span>
                            </button>
                            <button class="btn btn-outline-secondary btn-sm flex-fill export-btn rounded" data-id="${c.id}">
                                <i class="bi bi-download text-info"></i>
                                <span class="btn-text text-dark">Export</span>
                            </button>
                            <button class="btn btn-outline-secondary btn-sm flex-fill delete-btn rounded" data-id="${c.id}">
                                <i class="bi bi-trash text-danger"></i>
                                <span class="btn-text text-dark">Delete</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(div);
    });
}

// Delete Capsule
function deleteCapsule(capsuleId) {
    if (!confirm('Are you sure you want to delete this capsule?')) {
        return;
    }

    const index = loadIndex();
    const newIndex = index.filter(item => item.id !== capsuleId);
    saveIndex(newIndex);

    localStorage.removeItem(CAP_KEY(capsuleId));
    localStorage.removeItem(PROG_KEY(capsuleId));

    renderCapsules();
    renderCapsuleSelector();
    showToast('Capsule deleted successfully!', 'success');
}

// Start Learning
function startLearning(capsuleId) {
    resetLearnSection();
    currentCapsuleId = capsuleId;
    const capsule = loadCap(capsuleId);

    if (!capsule) {
        showToast('Capsule not found!', 'danger');
        return;
    }

    document.querySelector('.nav-link[data-section="learn"]').click();

    const selector = document.getElementById('capsuleSelector');
    if (selector) {
        selector.value = capsuleId;
    }

    loadCapsuleToLearn(capsuleId);
}

// Edit Capsule
function editCapsule(capsuleId) {
    const capsule = loadCap(capsuleId);

    if (!capsule) {
        showToast('Capsule not found!', 'danger');
        return;
    }

    document.querySelector('.nav-link[data-section="author"]').click();
    window.scrollTo(0, 0);

    document.getElementById('capsuleTitle').value = capsule.title || '';
    document.getElementById('capsuleSubject').value = capsule.subject || '';
    document.getElementById('capsuleLevel').value = capsule.level || 'Beginner';
    document.getElementById('capsuleDescription').value = capsule.description || '';
    
    const noteContentField = document.querySelector('.note-content');
    if (noteContentField) {
        noteContentField.value = capsule.notes ? capsule.notes.join('\n') : '';
    }

    document.getElementById('flashcardsContainer').innerHTML = '';
    document.getElementById('quizEditor').innerHTML = '';

    if (capsule.flashcards && capsule.flashcards.length > 0) {
        capsule.flashcards.forEach(flashcard => {
            addFlashcardField(flashcard.front, flashcard.back);
        });
    }

    if (capsule.quiz && capsule.quiz.length > 0) {
        capsule.quiz.forEach(question => {
            addQuizQuestionField(question.question, question.options, question.answer, question.explanation);
        });
    }

    const saveButton = document.getElementById('saveCapsuleBtn');
    saveButton.textContent = 'Update Capsule';
    saveButton.dataset.editingId = capsuleId;

    updateCounters();
}

// Export Single Capsule
function exportSingleCapsule(capsuleId) {
    const capsule = loadCap(capsuleId);

    if (!capsule) {
        showToast('Capsule not found!', 'danger');
        return;
    }

    exportCapsuleAsJSON(capsule);
}

function exportCapsuleAsJSON(capsule) {
    const dataStr = JSON.stringify(capsule, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `capsule_${capsule.title}_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// Capsule Selector
function renderCapsuleSelector() {
    const selector = document.getElementById('capsuleSelector');
    if (!selector) return;

    const index = loadIndex();
    selector.innerHTML = '<option value="">-- Select a capsule --</option>';

    index.forEach(item => {
        const cap = loadCap(item.id);
        if (cap) {
            const opt = document.createElement('option');
            opt.value = item.id;
            opt.textContent = cap.title;
            selector.appendChild(opt);
        }
    });
}