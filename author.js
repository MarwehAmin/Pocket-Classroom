function initAuthor() {
    document.getElementById('backToLibraryBtn').addEventListener('click', () => {
        document.querySelector('.nav-link[data-section="library"]').click();
        resetAuthorForm();
    });

    document.getElementById('addFlashcardBtn').addEventListener('click', () => addFlashcardField());
    document.getElementById('addQuestionBtn').addEventListener('click', () => addQuizQuestionField());
    document.getElementById('saveCapsuleBtn').addEventListener('click', saveCapsule);
}

function addFlashcardField(front = '', back = '') {
    const flashcardsContainer = document.getElementById('flashcardsContainer');
    const emptyState = document.getElementById('emptyFlashcardsState');
    if (emptyState) emptyState.style.display = 'none';

    const flashcardDiv = document.createElement('div');
    flashcardDiv.className = 'flashcard-item col-12';
    flashcardDiv.innerHTML = `
        <div class="flashcard-row">
            <div class="flashcard-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0"><i class="bi bi-card-text me-2"></i>Flashcard</h6>
                <button type="button" class="btn btn-sm btn-danger remove-flashcard">
                    <i class="bi bi-trash"></i>
                    <span class="btn-text">Remove</span>
                </button>
            </div>
            <div class="flashcard-fields">
                <div class="flashcard-field">
                    <label>Front:</label>
                    <input type="text" class="form-control flashcard-input flashcard-front" placeholder="Enter front content..." value="${front}">
                </div>
                <div class="flashcard-field">
                    <label>Back:</label>
                    <input type="text" class="form-control flashcard-input flashcard-back" placeholder="Enter back content..." value="${back}">
                </div>
            </div>
        </div>
    `;
    flashcardsContainer.appendChild(flashcardDiv);

    flashcardDiv.querySelector('.remove-flashcard').addEventListener('click', () => {
        flashcardDiv.remove();
        updateCounters();
        if (flashcardsContainer.children.length === 0 && emptyState) emptyState.style.display = 'block';
    });

    updateCounters();
}

function addQuizQuestionField(question = '', options = ['', '', '', ''], correctAnswer = 0, explanation = '') {
    const quizEditor = document.getElementById('quizEditor');
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-item col-12 mb-4 p-3 border rounded quiz-hover';

    questionDiv.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-2">
            <label class="form-label">Question</label>
            <button type="button" class="btn btn-sm btn-danger remove-item">
                <i class="bi bi-trash"></i>
                <span class="btn-text">Remove</span>
            </button>
        </div>
        <div class="mb-3">
            <textarea class="form-control question-text" placeholder="Enter question...">${question}</textarea>
        </div>
        <div class="mb-2">
            <label class="form-label">Options</label>
            <div class="row">
                ${options.map((opt, idx) => `
                <div class="col-md-6 mb-2">
                    <div class="input-group">
                        <span class="input-group-text">${String.fromCharCode(65 + idx)}</span>
                        <input type="text" class="form-control option-input" placeholder="Option ${String.fromCharCode(65 + idx)}" value="${opt}">
                    </div>
                </div>`).join('')}
            </div>
        </div>
        <div class="row mb-3">
            <div class="col-md-6">
                <label class="form-label">Correct Answer</label>
                <select class="form-select correct-answer">
                    ${[0, 1, 2, 3].map(i => `<option value="${i}" ${i === correctAnswer ? 'selected' : ''}>${String.fromCharCode(65 + i)}</option>`).join('')}
                </select>
            </div>
            <div class="col-md-6">
                <label class="form-label">Explanation</label>
                <input type="text" class="form-control explanation-text" placeholder="Why is this answer correct?" value="${explanation}">
            </div>
        </div>
    `;

    quizEditor.appendChild(questionDiv);
    questionDiv.querySelector('.remove-item').addEventListener('click', () => {
        questionDiv.remove();
        updateCounters();
    });

    updateCounters();
}

function saveCapsule() {
    const title = document.getElementById('capsuleTitle').value.trim();
    const subject = document.getElementById('capsuleSubject').value.trim();
    const level = document.getElementById('capsuleLevel').value;
    const description = document.getElementById('capsuleDescription').value.trim();
    const notes = document.querySelector('.note-content').value.trim();

    if (!title || !subject) {
        showToast('Please fill in title and subject fields', 'warning');
        return;
    }

    const saveButton = document.getElementById('saveCapsuleBtn');
    const isEditing = saveButton.dataset.editingId;
    const capsuleId = isEditing || generateId();

    const flashcards = Array.from(document.querySelectorAll('.flashcard-item')).map(flashcardItem => ({
        id: 'fc_' + Date.now() + Math.random().toString(36).substring(2, 9),
        front: flashcardItem.querySelector('.flashcard-front').value.trim(),
        back: flashcardItem.querySelector('.flashcard-back').value.trim()
    })).filter(fc => fc.front && fc.back);

    const quiz = Array.from(document.querySelectorAll('.question-item')).map(questionItem => ({
        id: 'q_' + Date.now() + Math.random().toString(36).substring(2, 9),
        question: questionItem.querySelector('.question-text').value.trim(),
        options: Array.from(questionItem.querySelectorAll('.option-input')).map(o => o.value.trim()),
        answer: parseInt(questionItem.querySelector('.correct-answer').value),
        explanation: questionItem.querySelector('.explanation-text').value.trim()
    })).filter(q => q.question && q.options.every(opt => opt) && q.options.length === 4);

    const capsule = {
        id: capsuleId,
        title,
        subject,
        level,
        description: description,
        notes: notes ? notes.split('\n').filter(line => line.trim() !== '') : [],
        flashcards,
        quiz,
        updatedAt: new Date().toISOString()
    };

    if (!isEditing) {
        capsule.createdAt = new Date().toISOString();
        saveCap(capsule);

        const index = loadIndex();
        index.push({ id: capsule.id, createdAt: capsule.createdAt });
        saveIndex(index);

        showToast('Capsule saved successfully!', 'success');
    } else {
        const existingCap = loadCap(capsuleId);
        capsule.createdAt = existingCap?.createdAt || new Date().toISOString();
        saveCap(capsule);
        showToast('Capsule updated successfully!', 'success');
    }

    renderCapsules();
    renderCapsuleSelector();

    setTimeout(() => {
        resetAuthorForm();
        document.querySelector('.nav-link[data-section="library"]').click();
    }, 1500);
}

function resetAuthorForm() {
    document.getElementById('capsuleTitle').value = '';
    document.getElementById('capsuleSubject').value = '';
    document.getElementById('capsuleLevel').value = 'Beginner';
    document.getElementById('capsuleDescription').value = '';

    const noteContentField = document.querySelector('.note-content');
    if (noteContentField) {
        noteContentField.value = '';
    }
    document.getElementById('flashcardsContainer').innerHTML = '';
    document.getElementById('quizEditor').innerHTML = '';

    const saveButton = document.getElementById('saveCapsuleBtn');
    saveButton.textContent = 'Save Capsule';
    delete saveButton.dataset.editingId;

    updateCounters();
}

function updateCounters() {
    // Implementation for counters if needed
}