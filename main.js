// Storage keys
const IDX_KEY = 'pc_capsules_index';
const CAP_KEY = id => `pc_capsule_${id}`;
const PROG_KEY = id => `pc_progress_${id}`;

// Global variables
let currentCapsuleId = null;
let currentFlashcards = [];
let currentFlashcardIndex = 0;
let knownFlashcards = new Set();
let currentQuiz = [];
let currentQuestionIndex = 0;
let quizScore = 0;
let userAnswers = [];
let currentTabIndex = 0;
let currentQuizOptionIndex = -1;
let answeredQuestions = new Set();

// Touch events variables
let touchStartX = 0;
let touchEndX = 0;
let touchStartY = 0;
let touchEndY = 0;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initToast();
    initLibrary();
    initAuthor();
    initLearn();
    initTouchEvents();
    initResponsiveElements();
});

function initResponsiveElements() {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        document.body.classList.add('touch-device');
    }
    
    window.addEventListener('resize', handleResize);
    handleResize();
}

function handleResize() {
    const width = window.innerWidth;
    const navTexts = document.querySelectorAll('.nav-text');
    const btnTexts = document.querySelectorAll('.btn-text');
    
    if (width <= 480) {
        btnTexts.forEach(text => {
            if (text.closest('.capsule-card')) {
                text.style.display = 'none';
            } else {
                text.style.display = 'inline';
            }
        });
    } else if (width <= 767) {
        btnTexts.forEach(text => {
            text.style.display = 'inline';
        });
    } else {
        navTexts.forEach(text => text.style.display = 'inline');
        btnTexts.forEach(text => text.style.display = 'inline');
    }
}

// Touch Events Initialization
function initTouchEvents() {
    const flashcardElement = document.getElementById('flashcard');
    if (flashcardElement) {
        flashcardElement.addEventListener('touchstart', handleTouchStart, { passive: true });
        flashcardElement.addEventListener('touchend', handleTouchEnd, { passive: true });
    }
}

function handleTouchStart(event) {
    touchStartX = event.changedTouches[0].screenX;
    touchStartY = event.changedTouches[0].screenY;
}

function handleTouchEnd(event) {
    touchEndX = event.changedTouches[0].screenX;
    touchEndY = event.changedTouches[0].screenY;
    handleSwipe();
}

function handleSwipe() {
    const minSwipeDistance = 50;
    const swipeDistanceX = touchEndX - touchStartX;
    const swipeDistanceY = touchEndY - touchStartY;

    if (Math.abs(swipeDistanceX) < minSwipeDistance || Math.abs(swipeDistanceY) > Math.abs(swipeDistanceX)) {
        return;
    }

    if (swipeDistanceX > 0) {
        previousFlashcard();
    } else {
        nextFlashcard();
    }
}

// Navigation functions
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link[data-section]');
    const sections = document.querySelectorAll('.section');

    navLinks.forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();

            const currentActiveSection = document.querySelector('.section.active');
            const currentSectionId = currentActiveSection ? currentActiveSection.id : null;

            if (currentSectionId === 'author') {
                const saveButton = document.getElementById('saveCapsuleBtn');
                const isEditing = saveButton.dataset.editingId;
                if (isEditing) {
                    resetAuthorForm();
                    showToast('Edit mode cancelled', 'info');
                }
            }

            navLinks.forEach(nl => nl.classList.remove('active'));
            link.classList.add('active');

            const targetSection = link.dataset.section;
            sections.forEach(section => {
                section.classList.toggle('active', section.id === targetSection);
            });

            if (targetSection === 'library') {
                renderCapsules();
            }

            if (currentSectionId === 'learn' && targetSection !== 'learn') {
                resetLearnSection();
            } else if (targetSection === 'learn' && currentSectionId !== 'learn') {
                const capsuleSelector = document.getElementById('capsuleSelector');
                if (!capsuleSelector || !capsuleSelector.value) {
                    resetLearnSection();
                } else {
                    currentFlashcardIndex = 0;
                    activateTabByIndex(0);
                }
            }
        });
    });
}

// Reset Learn Section
function resetLearnSection() {
    currentCapsuleId = null;
    currentFlashcards = [];
    currentFlashcardIndex = 0;
    knownFlashcards = new Set();
    currentQuiz = [];
    currentQuestionIndex = 0;
    quizScore = 0;
    userAnswers = [];
    currentTabIndex = 0;
    currentQuizOptionIndex = -1;
    answeredQuestions = new Set();

    const capsuleSelector = document.getElementById('capsuleSelector');
    if (capsuleSelector) {
        capsuleSelector.value = '';
    }

    activateTabByIndex(0);
    showEmptyLearnState();
    updateFlashcardCounterDisplay();

    const quizControls = document.getElementById('quizControls');
    if (quizControls) {
        quizControls.style.display = 'none';
    }

    const quizProgress = document.getElementById('quizProgress');
    if (quizProgress) {
        quizProgress.textContent = 'Question 0 of 0';
    }

    const nextQuestionBtn = document.getElementById('nextQuestionBtn');
    if (nextQuestionBtn) {
        nextQuestionBtn.style.display = 'none';
    }

    const restartQuizBtn = document.getElementById('restartQuizBtn');
    if (restartQuizBtn) {
        restartQuizBtn.style.display = 'none';
    }
}

// Toast notifications
function initToast() {
    window.toast = new bootstrap.Toast(document.getElementById('notificationToast'), { delay: 3000 });
}

function showToast(message, type = 'info') {
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;

    const icon = document.querySelector('#notificationToast .bi');
    switch (type) {
        case 'success':
            icon.className = 'bi bi-check-circle text-success me-2';
            break;
        case 'warning':
            icon.className = 'bi bi-exclamation-triangle text-warning me-2';
            break;
        case 'danger':
            icon.className = 'bi bi-x-circle text-danger me-2';
            break;
        default:
            icon.className = 'bi bi-info-circle text-primary me-2';
            break;
    }

    window.toast.show();
}

// Helper functions
function generateId() {
    return 'cap_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
}

function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
}

// Tab navigation functions
function switchToNextTab() {
    if (currentTabIndex >= 2) {
        currentTabIndex = 0;
    } else {
        currentTabIndex++;
    }
    activateTabByIndex(currentTabIndex);
}

function switchToPreviousTab() {
    if (currentTabIndex <= 0) {
        currentTabIndex = 2;
    } else {
        currentTabIndex--;
    }
    activateTabByIndex(currentTabIndex);
}

function activateTabByIndex(index) {
    try {
        let tabId, contentId;
        switch (index) {
            case 0:
                tabId = 'notes-tab';
                contentId = 'notesTab';
                break;
            case 1:
                tabId = 'flashcards-tab';
                contentId = 'flashcardsTab';
                
                currentFlashcardIndex = 0;
                if (currentCapsuleId && currentFlashcards.length > 0) {
                    setTimeout(() => {
                        showFlashcardForReview(true);
                    }, 100);
                }
                break;
            case 2:
                tabId = 'quiz-tab';
                contentId = 'quizTab';
                break;
            default:
                return;
        }

        if (tabId && contentId) {
            const tab = document.getElementById(tabId);
            const content = document.getElementById(contentId);

            if (tab && content) {
                document.querySelectorAll('.nav-link').forEach(t => {
                    t.classList.remove('active');
                });
                document.querySelectorAll('.tab-pane').forEach(c => {
                    c.classList.remove('show', 'active');
                });

                tab.classList.add('active');
                content.classList.add('show', 'active');
                currentTabIndex = index;

                if (index === 1) {
                    setTimeout(() => {
                        const focusableCard = document.getElementById('focusableFlashcard');
                        if (focusableCard) {
                            focusableCard.focus();
                        }
                    }, 100);
                }
            }
        }
    } catch (error) {
        console.error('Error activating tab:', error);
    }
}

// Keyboard handling
function handleKeyPress(event) {
    const learnSection = document.getElementById('learn');
    if (!learnSection || !learnSection.classList.contains('active')) return;

    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter'].includes(event.key)) {
        event.preventDefault();
    }

    if (event.key === 'ArrowLeft') {
        switchToPreviousTab();
    } else if (event.key === 'ArrowRight') {
        switchToNextTab();
    }

    switch (currentTabIndex) {
        case 1: 
            handleFlashcardsKeys(event);
            break;
        case 2: 
            handleQuizKeys(event);
            break;
    }
}

function handleFlashcardsKeys(event) {
    if (!currentCapsuleId || currentFlashcards.length === 0) return;

    if ([' ', 'ArrowUp', 'ArrowDown', 'k', 'K', 'n', 'N', 'a', 'A', 'd', 'D'].includes(event.key)) {
        event.preventDefault();
    }

    switch (event.key) {
        case ' ':
            toggleFlashcard();
            break;
        case 'ArrowUp':
        case 'k':
        case 'K':
            markFlashcardKnown();
            break;
        case 'ArrowDown':
        case 'n':
        case 'N':
            markFlashcardUnknown();
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            previousFlashcard();
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            nextFlashcard();
            break;
    }
}

function handleQuizKeys(event) {
    if (!currentQuiz || currentQuiz.length === 0) return;
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

    if (answeredQuestions.has(currentQuestionIndex)) {
        if (['ArrowUp', 'ArrowDown', 'Enter', ' '].includes(event.key)) {
            showToast('You have already answered this question!', 'warning');
            event.preventDefault();
        }
        return;
    }

    switch (event.key) {
        case 'ArrowUp':
            selectPreviousQuizOption();
            break;
        case 'ArrowDown':
            selectNextQuizOption();
            break;
        case 'Enter':
        case ' ':
            if (currentQuizOptionIndex !== -1) {
                selectQuizOption(currentQuizOptionIndex);
            }
            break;
    }
}