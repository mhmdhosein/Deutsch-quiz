// متغیرهای عمومی
let allQuestions = [];
let examQuestions = [];
let userAnswers = {};
let currentQuestionIndex = 0;
let totalTimeSeconds = 0;
let timeRemaining = 0;
let timerInterval = null;
let lastViewedQuestionIndex = 0;

// انتخاب‌گرهای DOM
const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

// المان‌های صفحه
const screens = $$('.screen');
const startExamBtn = $('#start-exam-btn');
const finishExamBtn = $('#finish-exam-btn');
const retakeExamBtn = $('#retake-exam-btn');
const prevQuestionBtn = $('#prev-question-btn');
const nextQuestionBtn = $('#next-question-btn');
const answerSheetBtn = $('#answer-sheet-btn');
const answerSheetModal = $('#answer-sheet-modal');
const closeModalBtn = $('#close-modal-btn');
const optionsContainer = $('#options-container');

// ------------------- Utility Functions -------------------

/** نمایش صفحه مورد نظر */
function showScreen(screenId) {
    screens.forEach(screen => {
        screen.classList.remove('active');
    });
    $(screenId).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** بارگذاری بانک سوالات از متغیر سراسری در index.html (رفع خطای بارگذاری) */
function loadQuestions() {
    try {
        // خواندن داده‌ها از متغیری که در index.html تعریف شده است
        if (window.QUESTIONS_DATA && Array.isArray(window.QUESTIONS_DATA) && window.QUESTIONS_DATA.length > 0) {
            allQuestions = window.QUESTIONS_DATA;
            console.log(`بانک سوالات با موفقیت از index.html بارگذاری شد. تعداد: ${allQuestions.length}`);
            
            // تنظیم حداکثر سوالات در صفحه اصلی بر اساس تعداد واقعی
            const questionCountInput = $('#question-count');
            questionCountInput.setAttribute('max', allQuestions.length);
            if (parseInt(questionCountInput.value) > allQuestions.length) {
                 questionCountInput.value = Math.min(40, allQuestions.length);
            }
        } else {
            throw new Error("متغیر QUESTIONS_DATA در index.html تعریف نشده، خالی یا نامعتبر است.");
        }
    } catch (error) {
        console.error("خطا در بارگذاری بانک سوالات:", error);
        alert("خطا در بارگذاری بانک سوالات. لطفاً محتوای questions.json را در index.html بررسی کنید.");
    }
}

/** رندوم‌سازی سوالات و شروع آزمون */
function startExam() {
    if (allQuestions.length === 0) {
        alert("بانک سوالات هنوز بارگذاری نشده است.");
        return;
    }

    const requestedCount = parseInt($('#question-count').value);
    const count = Math.min(requestedCount, allQuestions.length);
    const duration = parseInt($('#exam-duration').value);

    if (count <= 0 || duration <= 0) {
        alert("تعداد سوالات و زمان آزمون باید مثبت و منطقی باشد.");
        return;
    }

    // انتخاب رندوم سوالات
    const shuffledQuestions = [...allQuestions].sort(() => 0.5 - Math.random());
    examQuestions = shuffledQuestions.slice(0, count);
    
    userAnswers = {};
    currentQuestionIndex = 0;
    totalTimeSeconds = duration * 60;
    timeRemaining = totalTimeSeconds;

    // مقداردهی اولیه پاسخ‌ها
    examQuestions.forEach(q => {
        userAnswers[q.id] = null;
    });

    showScreen('#exam-screen');
    startTimer();
    displayQuestion(currentQuestionIndex);
}

// ------------------- Timer Management -------------------

function startTimer() {
    clearInterval(timerInterval);
    const timerDisplay = $('#timer-display');
    timerDisplay.style.color = '#ffc107';

    timerInterval = setInterval(() => {
        timeRemaining--;

        if (timeRemaining < 0) {
            timeRemaining = 0;
            clearInterval(timerInterval);
            finishExam(true); // پایان خودکار با اتمام زمان
            return;
        }

        const minutes = String(Math.floor(timeRemaining / 60)).padStart(2, '0');
        const seconds = String(timeRemaining % 60).padStart(2, '0');
        timerDisplay.textContent = `${minutes}:${seconds}`;

        if (timeRemaining <= 300 && timeRemaining > 0) {
            timerDisplay.style.color = 'red';
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

// ------------------- Exam Screen Management -------------------

/** نمایش سوال فعلی */
function displayQuestion(index) {
    if (index < 0 || index >= examQuestions.length) return;

    currentQuestionIndex = index;
    const question = examQuestions[index];
    
    lastViewedQuestionIndex = index;
    
    // نمایش سوال (LTR)
    $('#question-text').textContent = `${index + 1}. ${question.questionText}`;
    optionsContainer.innerHTML = '';

    const options = [
        { key: 'A', text: question.optionA },
        { key: 'B', text: question.optionB },
        { key: 'C', text: question.optionC },
        { key: 'D', text: question.optionD }
    ];

    options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.dir = 'ltr';
        btn.textContent = `${option.key}: ${option.text}`;
        btn.dataset.answer = option.key;

        if (userAnswers[question.id] === option.key) {
            btn.classList.add('selected');
        }

        btn.addEventListener('click', () => selectAnswer(question.id, option.key));
        optionsContainer.appendChild(btn);
    });

    updateNavigationButtons();
}

/** انتخاب پاسخ و رفتن به سوال بعد (خودکار) */
function selectAnswer(questionId, answer) {
    $$('.option-btn').forEach(btn => btn.classList.remove('selected'));
    
    $(`.option-btn[data-answer="${answer}"]`).classList.add('selected');

    userAnswers[questionId] = answer;
    
    // رفتن خودکار به سوال بعد (با تأخیر کوتاه)
    setTimeout(() => {
        if (currentQuestionIndex < examQuestions.length - 1) {
            displayQuestion(currentQuestionIndex + 1);
        } else {
            finishExamBtn.focus();
        }
    }, 300);
    updateAnswerSheetModal();
}

/** به‌روزرسانی وضعیت دکمه‌های ناوبری */
function updateNavigationButtons() {
    prevQuestionBtn.disabled = currentQuestionIndex === 0;
    nextQuestionBtn.disabled = currentQuestionIndex === examQuestions.length - 1;
}

/** مدیریت دکمه‌های ناوبری */
prevQuestionBtn.addEventListener('click', () => displayQuestion(currentQuestionIndex - 1));
nextQuestionBtn.addEventListener('click', () => displayQuestion(currentQuestionIndex + 1));


/** نمایش مودال پاسخبرگ */
answerSheetBtn.addEventListener('click', () => {
    answerSheetModal.style.display = 'flex';
    updateAnswerSheetModal();
});

/** به‌روزرسانی محتوای مودال پاسخبرگ */
function updateAnswerSheetModal() {
    const modalContainer = $('#modal-controls-container');
    modalContainer.innerHTML = '';

    examQuestions.forEach((q, index) => {
        const btn = document.createElement('button');
        btn.className = 'modal-jump-btn';
        btn.textContent = index + 1;
        btn.addEventListener('click', () => jumpToQuestion(index));

        // رنگ‌دهی: آبی کمرنگ برای جواب داده شده
        if (userAnswers[q.id] !== null) {
            btn.classList.add('answered');
        }
        
        modalContainer.appendChild(btn);
    });
}

/** پرش به سوال از طریق مودال */
function jumpToQuestion(index) {
    displayQuestion(index);
    answerSheetModal.style.display = 'none';
}

/** بستن مودال و برگشت به آخرین سوالی که از آن وارد پاسخبرگ شده بودیم */
closeModalBtn.addEventListener('click', () => {
    answerSheetModal.style.display = 'none';
    displayQuestion(lastViewedQuestionIndex);
});


// ------------------- Exam Finish -------------------

/** پایان دادن به آزمون توسط کاربر */
finishExamBtn.addEventListener('click', () => {
    const confirmation = confirm("آیا مطمئن هستید که می‌خواهید آزمون را پایان دهید؟");
    if (confirmation) {
        finishExam(false);
    }
});

/** منطق پایان آزمون */
function finishExam(isAuto = false) {
    stopTimer();
    
    if (isAuto) {
        alert("زمان آزمون به پایان رسید. آزمون خاتمه یافت.");
    }
    
    // محاسبه نتایج
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;
    const totalQuestions = examQuestions.length;
    const timeSpent = totalTimeSeconds - timeRemaining;

    examQuestions.forEach(q => {
        const userAnswer = userAnswers[q.id];
        if (userAnswer === null) {
            unansweredCount++;
        } else if (userAnswer === q.correctAnswer) {
            correctCount++;
        } else {
            wrongCount++;
        }
    });

    const scorePercentage = ((correctCount / totalQuestions) * 100).toFixed(2);
    
    // نمایش کارنامه
    displayResults({
        totalQuestions,
        correctCount,
        wrongCount,
        unansweredCount,
        scorePercentage,
        timeSpent
    });
}

// ------------------- Result Screen Management -------------------

/** نمایش صفحه کارنامه */
function displayResults(results) {
    showScreen('#result-screen');

    // ۱. نمایش خلاصه نتایج
    $('#total-questions-result').textContent = results.totalQuestions;
    $('#correct-answers-result').textContent = results.correctCount;
    $('#wrong-answers-result').textContent = results.wrongCount;
    $('#unanswered-result').textContent = results.unansweredCount;
    $('#score-percentage-result').textContent = `% ${results.scorePercentage}`;
    
    const minutes = String(Math.floor(results.timeSpent / 60)).padStart(2, '0');
    const seconds = String(results.timeSpent % 60).padStart(2, '0');
    $('#time-spent-result').textContent = `${minutes}:${seconds}`;

    // ۲. نمایش دکمه‌های پرش (کلید سوالات)
    const resultControlsContainer = $('#result-controls-container');
    resultControlsContainer.innerHTML = '';
    
    examQuestions.forEach((q, index) => {
        const userAnswer = userAnswers[q.id];
        const btn = document.createElement('button');
        btn.className = 'result-jump-btn';
        btn.textContent = index + 1;
        
        let statusClass = 'unanswered';
        if (userAnswer !== null) {
            statusClass = (userAnswer === q.correctAnswer) ? 'correct' : 'wrong';
        }
        btn.classList.add(statusClass);
        
        // اسکرول به پاسخ تشریحی
        btn.addEventListener('click', () => {
            const explanationCard = $(`#explanation-q-${index}`);
            if (explanationCard) {
                // اسکرول به بالا با یک آفست کوچک
                const offset = -70;
                const elementPosition = explanationCard.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffsets + offset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });

        resultControlsContainer.appendChild(btn);
    });

    // ۳. نمایش پاسخ‌های تشریحی
    const explanationArea = $('#explanation-area');
    explanationArea.innerHTML = '';

    examQuestions.forEach((q, index) => {
        const card = createExplanationCard(q, index);
        explanationArea.appendChild(card);
    });
}

/** ساخت کادر پاسخ تشریحی برای نمایش در کارنامه */
function createExplanationCard(question, index) {
    const card = document.createElement('div');
    card.className = 'glass-card explanation-card';
    card.id = `explanation-q-${index}`;

    const userAnswer = userAnswers[question.id];
    
    // صورت سوال (LTR)
    card.innerHTML += `<p class="question-text" dir="ltr">${index + 1}. ${question.questionText}</p>`;
    
    // گزینه‌ها (LTR)
    const optionsHtml = document.createElement('div');
    optionsHtml.className = 'options-container';
    
    const options = [
        { key: 'A', text: question.optionA },
        { key: 'B', text: question.optionB },
        { key: 'C', text: question.optionC },
        { key: 'D', text: question.optionD }
    ];

    options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.dir = 'ltr';
        btn.textContent = `${option.key}: ${option.text}`;
        btn.disabled = true; // در کارنامه غیرفعال است

        if (option.key === question.correctAnswer) {
            btn.classList.add('correct-answer'); // گزینه صحیح (سبز)
        } else if (option.key === userAnswer && option.key !== question.correctAnswer) {
            btn.classList.add('user-wrong-answer'); // پاسخ غلط کاربر (قرمز)
        }
        optionsHtml.appendChild(btn);
    });
    
    card.appendChild(optionsHtml);

    // پاسخ تشریحی (RTL/فارسی)
    card.innerHTML += `<p class="explanation-text">${question.explanation}</p>`;
    
    // دکمه بازگشت به بالا
    const backToTopBtn = document.createElement('button');
    backToTopBtn.className = 'back-to-top-btn control-btn';
    backToTopBtn.textContent = 'بازگشت به بالا';
    backToTopBtn.addEventListener('click', () => {
        // اسکرول به بالای صفحه (بخش Summary و دکمه‌های پرش)
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    card.appendChild(backToTopBtn);

    return card;
}

// ------------------- Event Listeners -------------------

startExamBtn.addEventListener('click', startExam);
retakeExamBtn.addEventListener('click', () => showScreen('#home-screen'));

// ------------------- Initialization -------------------

document.addEventListener('DOMContentLoaded', () => {
    loadQuestions();
    showScreen('#home-screen');
});
