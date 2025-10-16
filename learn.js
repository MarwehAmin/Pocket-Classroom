function initLearn() {
    const knowFlashcardBtn = document.getElementById('knowFlashcard');
    const dontKnowFlashcardBtn = document.getElementById('dontKnowFlashcard');
    const nextQuestionBtn = document.getElementById('nextQuestionBtn');
    const restartQuizBtn = document.getElementById('restartQuizBtn');
    const exportCapsuleBtn = document.getElementById('exportCapsuleBtn');

    if (knowFlashcardBtn) knowFlashcardBtn.addEventListener('click', markFlashcardKnown);
    if (dontKnowFlashcardBtn) dontKnowFlashcardBtn.addEventListener('click', markFlashcardUnknown);
    if (nextQuestionBtn) nextQuestionBtn.addEventListener('click', nextQuizQuestion);
    if (restartQuizBtn) restartQuizBtn.addEventListener('click', restartQuiz);

    if (exportCapsuleBtn) {
        exportCapsuleBtn.addEventListener('click', () => {
            const selectedId = document.getElementById('capsuleSelector').value;
            if (!selectedId) return showToast('Please select a capsule to export', 'warning');
            const capsule = loadCap(selectedId);
            if (!capsule) return showToast('Capsule not found', 'danger');
            exportCapsuleAsJSON(capsule);
        });
    }

    const capsuleSelector = document.getElementById('capsuleSelector');
    if (capsuleSelector) {
        capsuleSelector.addEventListener('change', function() {
            const selectedId = this.value;
            if (selectedId) {
                currentFlashcardIndex = 0;
                loadCapsuleToLearn(selectedId);
            } else {
                resetLearnSection();
            }
        });
        renderCapsuleSelector();
    }

    window.addEventListener('beforeunload', function() {
        if (currentCapsuleId) {
            saveProgressAndUpdateCard();
        }
    });

    document.addEventListener('visibilitychange', function() {
        if (document.hidden && currentCapsuleId) {
            saveProgressAndUpdateCard();
        }
    });

    document.addEventListener('keydown', handleKeyPress);

    const tabLinks = document.querySelectorAll('#learnTabs .nav-link');
    if (tabLinks.length > 0) {
        tabLinks.forEach(tab => {
            tab.addEventListener('shown.bs.tab', function() {
                if (this.id === 'flashcards-tab') {
                    currentFlashcardIndex = 0;
                    if (currentCapsuleId && currentFlashcards.length > 0) {
                        showFlashcardForReview(true); 
                    }
                    
                    setTimeout(() => {
                        const focusableCard = document.getElementById('focusableFlashcard');
                        if (focusableCard) {
                            focusableCard.focus();
                        }
                    }, 100);
                }

                if (this.id === 'notes-tab') currentTabIndex = 0;
                else if (this.id === 'flashcards-tab') currentTabIndex = 1;
                else if (this.id === 'quiz-tab') currentTabIndex = 2;
            });
        });
    }
}

// Load Capsule for Learning
function loadCapsuleToLearn(capsuleId) {
    try {
        if (!capsuleId) {
            currentCapsuleId = null;
            currentFlashcards = [];
            currentFlashcardIndex = 0;
            knownFlashcards = new Set();
            showEmptyLearnState();
            return;
        }

        currentCapsuleId = capsuleId;
        const cap = loadCap(capsuleId);

        if (!cap) {
            showToast('Capsule not found', 'danger');
            showEmptyLearnState();
            return;
        }

        const progress = loadProg(capsuleId);
        loadNotesContent(cap);

        currentFlashcards = cap.flashcards || [];
        currentFlashcardIndex = 0;

        if (currentFlashcards.length > 0) {
            showFlashcardForReview(true);
        } else {
            const flashcardDiv = document.getElementById('flashcard');
            if (flashcardDiv) {
                flashcardDiv.innerHTML = `
                    <div class="empty-state">
                        <i class="bi bi-card-text display-1"></i>
                        <h5 class="mt-3">No flashcards available</h5>
                        <p class="text-muted">This capsule doesn't have any flashcards.</p>
                    </div>
                `;
            }
            const flashcardControls = document.getElementById('flashcardControls');
            if (flashcardControls) {
                flashcardControls.style.display = 'none';
            }
        }

        loadQuizContent(cap);
        activateTabByIndex(0);
        updateProgressDisplay();
        showToast(`Loaded: ${cap.title}`, 'success');
    } catch (error) {
        console.error('Error loading capsule for learning:', error);
        showToast('Error loading capsule', 'danger');
    }
}

// Show Empty Learn State
function showEmptyLearnState() {
    const notesContent = document.getElementById('notesContent');
    if (notesContent) {
        notesContent.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-journal-text display-1"></i>
                <h5 class="mt-3">No capsule selected</h5>
                <p class="text-muted">Select a capsule from the dropdown to view its content.</p>
            </div>
        `;
    }

    const flashcard = document.getElementById('flashcard');
    if (flashcard) {
        flashcard.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-card-text display-1"></i>
                <h5 class="mt-3">No capsule selected</h5>
                <p class="text-muted">Select a capsule from the dropdown to study its flashcards.</p>
            </div>
        `;
    }

    const quizContent = document.getElementById('quizContent');
    if (quizContent) {
        quizContent.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-question-circle display-1 text-muted"></i>
                <h5 class="mt-3">No capsule selected</h5>
                <p class="text-muted">Select a capsule from the dropdown to take its quiz.</p>
            </div>
        `;
    }

    const flashcardControls = document.getElementById('flashcardControls');
    if (flashcardControls) {
        flashcardControls.style.display = 'none';
    }

    const quizControls = document.getElementById('quizControls');
    if (quizControls) {
        quizControls.style.display = 'none';
    }

    const quizProgress = document.getElementById('quizProgress');
    if (quizProgress) {
        quizProgress.textContent = 'Question 0 of 0';
    }

    updateFlashcardCounterDisplay();
}

// Load Notes Content
function loadNotesContent(capsule) {
    const notesContent = document.getElementById('notesContent');

    if (!capsule) {
        notesContent.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-journal-text display-1"></i>
                <h5 class="mt-3">No capsule selected</h5>
                <p class="text-muted">Select a capsule from the dropdown to view its content.</p>
            </div>
        `;
        return;
    }

    let notesHTML = `
        <div class="notes-container">
            <h2 class="h4 mb-2 fw-bold">${capsule.title || 'Untitled Capsule'}</h2>
            <h3 class="h6 text-muted mb-3">${capsule.subject || 'General'} - ${capsule.level || 'Beginner'}</h3>
    `;

    if (capsule.description) {
        notesHTML += `
            <div class="description-section mb-2">
                <p class="mb-0" style="white-space: pre-wrap;">${capsule.description}</p>
            </div>
        `;
    }

    if (capsule.notes && capsule.notes.length > 0) {
        notesHTML += `
            <div class="notes-section">
                <ol class="notes-list ps-3 mt-2" style="list-style-type: decimal; padding-left: 1.5rem;">
        `;

        capsule.notes.forEach((note, index) => {
            notesHTML += `
                <li class="note-item" style="margin-bottom: 0.25rem; padding-left: 0.5rem; line-height: 1.4;">
                    <div style="white-space: pre-wrap;">${note}</div>
                </li>
            `;
        });

        notesHTML += `
                </ol>
            </div>
        `;
    }

    if (!capsule.description && (!capsule.notes || capsule.notes.length === 0)) {
        notesHTML += `
            <div class="empty-state">
                <i class="bi bi-journal-text display-1 text-muted"></i>
                <h5 class="mt-3">No content available</h5>
                <p class="text-muted">This capsule doesn't have any description or notes.</p>
            </div>
        `;
    }

    notesHTML += `
            <hr class="my-4">
            <div class="tip-section mt-3 text-muted small">
                <strong>Tip:</strong> Use [←] and [→] to switch tabs
            </div>
    </div>
    `;
    notesContent.innerHTML = notesHTML;
}

// Flashcard Functions 
function showFlashcardForReview(reset = false) {
    if (reset || currentFlashcardIndex >= currentFlashcards.length) {
        currentFlashcardIndex = 0;
    }

    if (!currentCapsuleId || currentFlashcards.length === 0) {
        const flashcardDiv = document.getElementById('flashcard');
        if (flashcardDiv) {
            flashcardDiv.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-card-text display-1"></i>
                    <h5 class="mt-3">No flashcards available</h5>
                    <p class="text-muted">This capsule doesn't have any flashcards.</p>
                </div>
            `;
        }
        const flashcardControls = document.getElementById('flashcardControls');
        if (flashcardControls) {
            flashcardControls.style.display = 'none';
        }
        return;
    }

    const card = currentFlashcards[currentFlashcardIndex];
    const totalCards = currentFlashcards.length;
    const knownCount = knownFlashcards.size;
    const currentIndex = currentFlashcardIndex + 1;

    const flashcardDiv = document.getElementById('flashcard');
    if (!flashcardDiv) return;

    
    flashcardDiv.innerHTML = `
        <div class="card h-100" tabindex="0" id="focusableFlashcard">
            <div class="card-header d-flex justify-content-between align-items-center py-2 flashcard-header-unified">
                <div class="d-flex align-items-center">
                    <h5 class="mb-0 me-3">Flashcards</h5>
                    <span class="fw-bold me-2 known-counter text-black">${knownCount}/${totalCards} Known</span>
                </div>
                <div class="d-flex align-items-center">
                    <span class="text-muted me-3 current-counter fw-bold">${currentIndex}/${totalCards}</span>
                    <div class="btn-group">
                        <button class="btn btn-outline-dark btn-sm" id="prevFlashcard">
                            <i class="bi bi-chevron-left"></i>
                            <span class="btn-text">Prev</span>
                        </button>
                        <button class="btn btn-outline-dark btn-sm" id="nextFlashcard">
                            <i class="bi bi-chevron-right"></i>
                            <span class="btn-text">Next</span>
                        </button>
                    </div>
                </div>
            </div>
            <div class="card-body d-flex flex-column justify-content-center align-items-center p-3">
                <div class="flashcard-content text-center" style="font-size: 1.1rem; min-height: 80px; cursor: pointer;">
                    ${card.front}
                </div>
                <button class="btn btn-outline-dark btn-sm mt-3" onclick="toggleFlashcard()">
                    <i class="bi bi-arrow-repeat"></i> Flip Card
                </button>  
            </div>
        </div>
    `;

    const prevBtn = document.getElementById('prevFlashcard');
    const nextBtn = document.getElementById('nextFlashcard');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', previousFlashcard);
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', nextFlashcard);
    }

    const flashcardContent = flashcardDiv.querySelector('.flashcard-content');
    if (flashcardContent) {
        flashcardContent.addEventListener('click', toggleFlashcard);
    }

    const focusableCard = document.getElementById('focusableFlashcard');
    if (focusableCard) {
        focusableCard.addEventListener('keydown', function (e) {
            if (e.code === 'Space') {
                e.preventDefault();
                toggleFlashcard();
            }
        });
        focusableCard.focus();
    }

    updateFlashcardButtons();
    updateProgressDisplay();

    const flashcardControls = document.getElementById('flashcardControls');
    if (flashcardControls) {
        flashcardControls.style.display = 'flex';
    }
}

function toggleFlashcard() {
    if (!currentCapsuleId || currentFlashcards.length === 0) return;

    const card = currentFlashcards[currentFlashcardIndex];
    const content = document.querySelector('.flashcard-content');
    const flipButton = document.querySelector('.btn-outline-primary');

    if (!content) return;

    if (content.textContent === card.front) {
        content.textContent = card.back;
        content.classList.add('text-success');
        if (flipButton) {
            flipButton.innerHTML = '<i class="bi bi-arrow-repeat"></i> Flip Back';
        }
    } else {
        content.textContent = card.front;
        content.classList.remove('text-success');
        if (flipButton) {
            flipButton.innerHTML = '<i class="bi bi-arrow-repeat"></i> Flip Card';
        }
    }

    const focusableCard = document.getElementById('focusableFlashcard');
    if (focusableCard) {
        focusableCard.focus();
    }
}

function markFlashcardKnown() {
    if (!currentCapsuleId || currentFlashcards.length === 0) return;

    const card = currentFlashcards[currentFlashcardIndex];

    if (!knownFlashcards.has(card.id)) {
        knownFlashcards.add(card.id);
        
        const progress = loadProg(currentCapsuleId);
        progress.knownFlashcards = Array.from(knownFlashcards);
        saveProg(currentCapsuleId, progress);
        
        updateCapsuleCard(currentCapsuleId);
        updateProgressDisplay();
        showToast('Marked as known!', 'success');
        
        setTimeout(() => {
            renderCapsules();
        }, 100);
    } else {
        showToast('Card is already known', 'info');
    }
    nextFlashcard();
}

function markFlashcardUnknown() {
    if (!currentCapsuleId || currentFlashcards.length === 0) return;

    showToast('Skipped as unknown', 'info');
    nextFlashcard();
}

function nextFlashcard() {
    if (!currentCapsuleId || currentFlashcards.length === 0) return;

    if (currentFlashcardIndex < currentFlashcards.length - 1) {
        currentFlashcardIndex++;
        showFlashcardForReview();
    } else {
        showToast('You have reached the last flashcard!', 'info');
        updateFlashcardButtons();
    }
    updateProgressDisplay();
}

function previousFlashcard() {
    if (!currentCapsuleId || currentFlashcards.length === 0) return;

    if (currentFlashcardIndex > 0) {
        currentFlashcardIndex--;
        showFlashcardForReview();
    } else {
        showToast('You are on the first flashcard!', 'info');
    }
    updateProgressDisplay();
}

function updateFlashcardButtons() {
    if (!currentCapsuleId || currentFlashcards.length === 0) return;

    const prevBtn = document.getElementById('prevFlashcard');
    const nextBtn = document.getElementById('nextFlashcard');
    const knowBtn = document.getElementById('knowFlashcard');
    const dontKnowBtn = document.getElementById('dontKnowFlashcard');

    if (prevBtn) {
        prevBtn.disabled = currentFlashcardIndex === 0;
        prevBtn.title = currentFlashcardIndex === 0 ? 'This is the first card' : 'Previous card (A)';
        
        if (currentFlashcardIndex === 0) {
            prevBtn.classList.add('disabled');
        } else {
            prevBtn.classList.remove('disabled');
        }
    }

    if (nextBtn) {
        nextBtn.disabled = currentFlashcardIndex === currentFlashcards.length - 1;
        nextBtn.title = currentFlashcardIndex === currentFlashcards.length - 1 ? 'This is the last card' : 'Next card (D)';
        
        if (currentFlashcardIndex === currentFlashcards.length - 1) {
            nextBtn.classList.add('disabled');
        } else {
            nextBtn.classList.remove('disabled');
        }
    }

    if (knowBtn) {
        knowBtn.disabled = false;
        knowBtn.title = 'Mark as known (K)';
    }

    if (dontKnowBtn) {
        dontKnowBtn.disabled = false;
        dontKnowBtn.title = 'Mark as unknown (N)';
    }    
}

function updateFlashcardCounterDisplay() {
    const flashcardCounter = document.getElementById('flashcardCounter');
    if (flashcardCounter) {
        flashcardCounter.textContent = '0/0';
    }
}

function updateProgressDisplay() {
    if (!currentCapsuleId || currentFlashcards.length === 0) {
        const flashcardCounter = document.getElementById('flashcardCounter');
        if (flashcardCounter) {
            flashcardCounter.textContent = '0/0';
        }
        return;
    }

    const knownCount = knownFlashcards.size;
    const totalCount = currentFlashcards.length;
    const currentIndex = currentFlashcardIndex + 1;

    const flashcardCounter = document.getElementById('flashcardCounter');
    if (flashcardCounter) {
        flashcardCounter.textContent = `${currentIndex}/${totalCount}`;
    }

    const knownCounters = document.querySelectorAll('.known-counter');
    knownCounters.forEach(counter => {
        counter.textContent = `${knownCount}/${totalCount} Known`;
    });

    const currentCounters = document.querySelectorAll('.current-counter');
    currentCounters.forEach(counter => {
        counter.textContent = `${currentIndex}/${totalCount}`;
    });

    updateProgressText();
}

function updateProgressText() {
    if (!currentCapsuleId || currentFlashcards.length === 0) return;

    const knownCount = knownFlashcards.size;
    const totalCount = currentFlashcards.length;
    const progressPercent = totalCount > 0 ? Math.round((knownCount / totalCount) * 100) : 0;

    const progressText = document.getElementById('progressText');
    if (progressText) {
        progressText.textContent = `Known: ${knownCount} (${progressPercent}%)`;
    }
}

function saveProgressAndUpdateCard() {
    if (!currentCapsuleId) return;

    const progress = loadProg(currentCapsuleId);
    progress.knownFlashcards = Array.from(knownFlashcards || []);
    
    const totalCards = currentFlashcards.length;
    const knownCount = knownFlashcards.size;
    const progressPercent = totalCards > 0 ? Math.round((knownCount / totalCards) * 100) : 0;
    progress.lastScore = progressPercent;
    
    saveProg(currentCapsuleId, progress);
    updateCapsuleCard(currentCapsuleId);
    updateProgressDisplay();

    renderCapsules();
}

function updateCapsuleCard(capsuleId) {
    const capsuleCard = document.querySelector(`.capsule-card[data-id="${capsuleId}"]`);

    if (!capsuleCard) {
        setTimeout(() => {
            renderCapsules();
        }, 50);
        return;
    }

    const cap = loadCap(capsuleId);
    const progress = loadProg(capsuleId);

    if (!cap) {
        return;
    }

    const progressBar = capsuleCard.querySelector('.progress-bar');
    if (progressBar) {
        progressBar.style.width = `${progress.lastScore}%`;
        progressBar.setAttribute('aria-valuenow', progress.lastScore);
    }

    const knownCardsElements = capsuleCard.querySelectorAll('.col-5 .fw-bold');
    if (knownCardsElements.length > 0) {
        const knownCount = progress.knownFlashcards ? progress.knownFlashcards.length : 0;
        const totalCount = cap.flashcards ? cap.flashcards.length : 0;
        knownCardsElements.forEach(element => {
        element.textContent = `${knownCount}/${totalCount}`;
        });
    }

    if (knownCardsElements.length === 0) {
        renderCapsules();
    }
}

// Quiz functions
function startQuiz() {
    if (!currentCapsuleId) {
        showToast('Please select a capsule first!', 'warning');
        return;
    }

    const capsule = loadCap(currentCapsuleId);
    if (!capsule.quiz || capsule.quiz.length === 0) {
        showToast('This capsule has no quiz questions!', 'warning');
        return;
    }

    currentQuiz = [...capsule.quiz];
    currentQuestionIndex = 0;
    quizScore = 0;
    userAnswers = [];
    currentQuizOptionIndex = 0;
    answeredQuestions = new Set();

    document.getElementById('quizControls').style.display = 'flex';
    document.getElementById('restartQuizBtn').style.display = 'inline-block';
    document.getElementById('nextQuestionBtn').style.display = 'none';

    showQuizQuestion();
}

function showQuizQuestion() {
    if (!currentQuiz || currentQuiz.length === 0) {
        showQuizEmptyState();
        return;
    }

    const question = currentQuiz[currentQuestionIndex];
    const quizContent = document.getElementById('quizContent');

    let optionsHTML = '';
    question.options.forEach((option, index) => {
        optionsHTML += `
            <div class="quiz-option" data-index="${index}" tabindex="0">
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="quizOption" id="option${index}" value="${index}">
                    <label class="form-check-label w-100" for="option${index}">
                        ${String.fromCharCode(65 + index)}. ${option}
                    </label>
                </div>
            </div>
        `;
    });

    quizContent.innerHTML = `
        <div class="quiz-question-card">
            <div class="question-header mb-3">
                <h5 class="question-text">${question.question}</h5>
            </div>
            <div class="quiz-options-container">
                ${optionsHTML}
            </div>
            <div id="quizExplanation" class="explanation-container mt-3" style="display: none;">
                <div class="alert alert-info">
                    <strong>Explanation:</strong> 
                    <span id="explanationText">${question.explanation || 'No explanation provided.'}</span>
                </div>
            </div>
        </div>
    `;

    if (answeredQuestions.has(currentQuestionIndex)) {
        const userAnswer = userAnswers[currentQuestionIndex];
        if (userAnswer) {
            showAnswerFeedback(userAnswer.selected, userAnswer.correct);
            const explanationDiv = document.getElementById('quizExplanation');
            if (explanationDiv) {
                explanationDiv.style.display = 'block';
            }
            document.getElementById('nextQuestionBtn').style.display = 'inline-block';
        }
    }

    document.getElementById('quizProgress').textContent =
        `Question ${currentQuestionIndex + 1} of ${currentQuiz.length}`;

    addQuizOptionListeners();

    setTimeout(() => {
        currentQuizOptionIndex = 0;
        updateQuizOptionSelection();
    }, 100);
}

function addQuizOptionListeners() {
    const options = document.querySelectorAll('.quiz-option');
    options.forEach(option => {
        option.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            selectQuizOption(index);
        });

        option.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const index = parseInt(this.dataset.index);
                selectQuizOption(index);
            }
        });
    });
}

function selectQuizOption(index) {
    if (answeredQuestions.has(currentQuestionIndex)) {
        showToast('You have already answered this question!', 'warning');
        return;
    }

    const radioInputs = document.querySelectorAll('input[name="quizOption"]');
    const options = document.querySelectorAll('.quiz-option');

    radioInputs[index].checked = true;
    options.forEach(opt => {
        opt.style.pointerEvents = 'none';
    });

    answeredQuestions.add(currentQuestionIndex);
    checkAnswer(index);
}

function checkAnswer(selectedIndex) {
    if (answeredQuestions.has(currentQuestionIndex) && userAnswers[currentQuestionIndex]) {
        return;
    }

    const question = currentQuiz[currentQuestionIndex];
    const isCorrect = selectedIndex === question.answer;

    userAnswers[currentQuestionIndex] = {
        selected: selectedIndex,
        correct: question.answer,
        isCorrect: isCorrect
    };

    if (isCorrect) {
        quizScore++;
        showToast('Correct!', 'success');
    } else {
        showToast('Incorrect!', 'danger');
    }

    showAnswerFeedback(selectedIndex, question.answer);

    const explanationDiv = document.getElementById('quizExplanation');
    if (explanationDiv) {
        explanationDiv.style.display = 'block';
    }

    document.getElementById('nextQuestionBtn').style.display = 'inline-block';
}

function showAnswerFeedback(selectedIndex, correctIndex) {
    const options = document.querySelectorAll('.quiz-option');
    options.forEach((option, index) => {
        if (index === correctIndex) {
            option.classList.add('correct');
            option.style.backgroundColor = '#d4edda';
            option.style.borderColor = '#28a745';
        } else if (index === selectedIndex && index !== correctIndex) {
            option.classList.add('incorrect');
            option.style.backgroundColor = '#f8d7da';
            option.style.borderColor = '#dc3545';
        }
        option.style.pointerEvents = 'none';
    });
}

function nextQuizQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < currentQuiz.length) {
        showQuizQuestion();
        document.getElementById('nextQuestionBtn').style.display = 'none';
    } else {
        showQuizResults();
    }
}

function showQuizResults() {
    const scorePercentage = Math.round((quizScore / currentQuiz.length) * 100);
    const quizContent = document.getElementById('quizContent');

    let resultsHTML = `
        <div class="quiz-results text-center py-4">
            <h1 class="display-4 fw-bold">${scorePercentage}%</h1>
            <p class="text-muted">${quizScore} out of ${currentQuiz.length} correct</p>
    `;

    resultsHTML += `
        <div class="answers-summary mt-4 text-start">
            <h5 class="mb-3">Review Your Answers:</h5>
    `;

    userAnswers.forEach((answer, index) => {
        const question = currentQuiz[index];
        const isCorrect = answer.isCorrect;
        const userAnswerChar = String.fromCharCode(65 + answer.selected);
        const correctAnswerChar = String.fromCharCode(65 + answer.correct);

        resultsHTML += `
            <div class="answer-item mb-3 p-3 border rounded ${isCorrect ? 'border-success' : 'border-danger'}">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <strong>Q${index + 1}:</strong> ${question.question}
                    </div>
                    <span class="badge ${isCorrect ? 'bg-success' : 'bg-danger'} ms-2">
                        ${isCorrect ? '✓' : '✗'}
                    </span>
                </div>
                <div class="mt-2">
                    <div class="small ${isCorrect ? 'text-success' : 'text-danger'}">
                        <strong>Your answer:</strong> ${userAnswerChar}. ${question.options[answer.selected]}
                    </div>
                    ${!isCorrect ? `
                        <div class="small text-success">
                            <strong>Correct answer:</strong> ${correctAnswerChar}. ${question.options[answer.correct]}
                        </div>
                    ` : ''}
                    ${question.explanation ? `
                        <div class="small text-muted mt-1">
                            <strong>Explanation:</strong> ${question.explanation}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });

    resultsHTML += `
        </div>
        </div>
    `;

    quizContent.innerHTML = resultsHTML;
    document.getElementById('nextQuestionBtn').style.display = 'none';
    document.getElementById('restartQuizBtn').style.display = 'inline-block';
    updateBestScore();
}

function updateBestScore() {
    if (!currentCapsuleId) return;

    const progress = loadProg(currentCapsuleId);
    const scorePercentage = Math.round((quizScore / currentQuiz.length) * 100);
    const finalScore = Math.min(scorePercentage, 100);

    progress.lastScore = finalScore;
    if (finalScore > progress.bestScore) {
        progress.bestScore = finalScore;
        showToast(`New best score: ${progress.bestScore}%`, 'success');
    }

    saveProg(currentCapsuleId, progress);
    refreshLibraryCapsuleCard(currentCapsuleId);
}

function refreshLibraryCapsuleCard(capsuleId) {
    renderCapsules();
}

function restartQuiz() {
    if (!currentCapsuleId) return;

    const capsule = loadCap(currentCapsuleId);
    if (!capsule.quiz || capsule.quiz.length === 0) {
        showToast('No quiz questions available!', 'warning');
        return;
    }

    startQuiz();
}

function showQuizEmptyState() {
    const quizContent = document.getElementById('quizContent');
    quizContent.innerHTML = `
        <div class="text-center py-5">
            <i class="bi bi-question-circle display-1 text-muted"></i>
            <h5 class="mt-3">No quiz questions</h5>
            <p class="text-muted">This capsule doesn't have any quiz questions.</p>
        </div>
    `;
    document.getElementById('quizControls').style.display = 'none';
}

function loadQuizContent(capsule) {
    const quizContent = document.getElementById('quizContent');
    const quizControls = document.getElementById('quizControls');

    if (!capsule.quiz || capsule.quiz.length === 0) {
        quizContent.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-question-circle display-1 text-muted"></i>
                <h5 class="mt-3">No quiz available</h5>
                <p class="text-muted">This capsule doesn't have any quiz questions.</p>
                <div class="quiz-start-container mt-3">
                    <button class="btn btn-dark" onclick="startQuiz()" disabled>
                        <i class="bi bi-play-circle me-1 "></i> Start Quiz
                    </button>
                </div>
            </div>
        `;
        quizControls.style.display = 'none';
        return;
    }

    quizContent.innerHTML = `
        <div class="text-center py-5">
            <i class="bi bi-patch-question display-1 text-muted"></i>
            <h5 class="mt-3">Ready for the Quiz?</h5>
            <p class="text-muted">This capsule has ${capsule.quiz.length} question${capsule.quiz.length > 1 ? 's' : ''}.</p>
            <div class="quiz-start-container mt-3">
                <button class="btn btn-dark" onclick="startQuiz()">
                    <i class="bi bi-play-circle me-1"></i> Start Quiz
                </button>
            </div>
        </div>
    `;

    quizControls.style.display = 'flex';
    document.getElementById('restartQuizBtn').style.display = 'inline-block';
    document.getElementById('nextQuestionBtn').style.display = 'none';
}

function selectPreviousQuizOption() {
    if (currentQuizOptionIndex <= 0) {
        currentQuizOptionIndex = 3;
    } else {
        currentQuizOptionIndex--;
    }
    updateQuizOptionSelection();
}

function selectNextQuizOption() {
    if (currentQuizOptionIndex >= 3) {
        currentQuizOptionIndex = 0;
    } else {
        currentQuizOptionIndex++;
    }
    updateQuizOptionSelection();
}

function updateQuizOptionSelection() {
    const options = document.querySelectorAll('.quiz-option');
    options.forEach((option, index) => {
        if (index === currentQuizOptionIndex) {
            option.style.backgroundColor = '#e9ecef';
            option.focus();
        } else {
            option.style.backgroundColor = '';
            option.style.border = '1px solid #dee2e6';
        }
    });
}

// Initialize on page load
renderCapsuleSelector();