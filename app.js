class QuestionnaireEngine {
    constructor() {
        this.config = null;
        this.answers = {};
        this.queue = []; // Array of question IDs to ask
        this.history = []; // Array of visited question IDs
        this.flags = []; // Collected flags (STOP, CONSULT)

        this.ui = {
            container: document.getElementById('quiz-container'),
            nextBtn: document.getElementById('next-btn'),
            progressBar: document.getElementById('progress-bar')
        };

        this.ui.nextBtn.addEventListener('click', () => this.handleNext());
        this.init();
    }

    async init() {
        try {
            const response = await fetch(`questionnaire_config.json?t=${Date.now()}`);
            this.config = await response.json();
            this.startSequence();
        } catch (error) {
            console.error('Failed to load config', error);
            this.ui.container.innerHTML = '<div class="error">Failed to load questionnaire configuration.</div>';
        }
    }

    startSequence() {
        // 0. Get Patient Info
        const patientInfo = this.config.sections.find(s => s.id === 'patient_info');
        if (patientInfo) {
            this.queue.push(...patientInfo.questions);
        }

        // 1. Get Product Selection Questions
        const productSelection = this.config.sections.find(s => s.id === 'product_selection');
        if (productSelection) {
            this.queue.push(...productSelection.questions);
        }

        // 2. Get Common Screening Questions
        const commonScreening = this.config.sections.find(s => s.id === 'common_screening');
        if (commonScreening) {
            this.queue.push(...commonScreening.questions);
        }

        this.renderCurrentQuestion();
    }

    updateProgress() {
        const total = this.history.length + this.queue.length + (this.queue.length > 0 ? 1 : 0); // +1 for current
        const current = this.history.length;
        // Avoid division by zero
        const percent = total === 0 ? 0 : Math.round((current / total) * 100);
        this.ui.progressBar.style.width = `${percent}%`;
    }

    renderCurrentQuestion() {
        if (this.queue.length === 0) {
            this.finish();
            return;
        }

        this.updateProgress();

        const currentQ = this.queue[0];

        // LOGIC: Skip "Severe Allergy" if user has never used peptides
        if (currentQ.id === 'severe_allergy') {
            const prevUse = this.answers['prev_peptide_use'];
            const currUse = this.answers['curr_peptide_use'];

            // If both are NO (or not YES), then we skip allergy question
            if (prevUse !== 'yes' && currUse !== 'yes') {
                this.answers[currentQ.id] = 'no'; // Auto-answer no
                this.history.push(currentQ);
                this.queue.shift();
                this.renderCurrentQuestion();
                return;
            }
        }

        // LOGIC: Skip "Pregnant or Breastfeeding" if user is Male
        if (currentQ.id === 'pregnant_breastfeeding') {
            const sex = this.answers['patient_sex'];
            if (sex === 'male') {
                this.answers[currentQ.id] = 'no'; // Auto-answer no
                this.history.push(currentQ);
                this.queue.shift();
                this.renderCurrentQuestion();
                return;
            }
        }

        // Clear container
        this.ui.container.innerHTML = '';

        const qBlock = document.createElement('div');
        qBlock.className = 'question-block';
        qBlock.innerHTML = `<div class="question-text">${currentQ.text}</div>`;

        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'options-grid'; // Use the grid layout

        if (currentQ.type === 'yes_no') {
            optionsContainer.innerHTML = `
                <label class="option-card">
                    <input type="radio" name="${currentQ.id}" value="yes">
                    <div class="card-display">YES</div>
                </label>
                <label class="option-card">
                    <input type="radio" name="${currentQ.id}" value="no">
                    <div class="card-display">NO</div>
                </label>
            `;
            optionsContainer.addEventListener('change', (e) => {
                this.handleFollowUpDisplay(currentQ, e.target.value, qBlock);
            });

        } else if (currentQ.type === 'single_choice') {
            currentQ.options.forEach(opt => {
                optionsContainer.innerHTML += `
                    <label class="option-card">
                        <input type="radio" name="${currentQ.id}" value="${opt.value}">
                        <div class="card-display">${opt.label}</div>
                    </label>
                `;
            });
        } else if (currentQ.type === 'multiselect') {
            currentQ.options.forEach(opt => {
                optionsContainer.innerHTML += `
                    <label class="option-card">
                        <input type="checkbox" name="${currentQ.id}" value="${opt.value}">
                        <div class="card-display">${opt.label}</div>
                    </label>
                `;
            });
        } else if (currentQ.type === 'text') {
            // Text inputs don't use the grid, so we reset the class/style for this one
            optionsContainer.className = 'options-text';
            optionsContainer.innerHTML = `<input type="text" name="${currentQ.id}" placeholder="Type your answer here...">`;
        } else if (currentQ.type === 'date') {
            optionsContainer.className = 'options-text';
            optionsContainer.innerHTML = `<input type="date" name="${currentQ.id}" style="padding: 15px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem; width: 100%; box-sizing: border-box;">`;
        }

        qBlock.appendChild(optionsContainer);
        this.ui.container.appendChild(qBlock);
    }

    handleFollowUpDisplay(question, answer, container) {
        const existingFollowUp = container.querySelector('.follow-up-input');
        if (existingFollowUp) existingFollowUp.remove();

        if (question.follow_up && question.follow_up[answer]) {
            const followUpConfig = question.follow_up[answer];
            const div = document.createElement('div');
            div.className = 'follow-up-input';
            div.style.marginTop = '20px';
            div.innerHTML = `
                <div style="font-weight:600; margin-bottom: 10px;">${followUpConfig.text}</div>
                <input type="text" name="${followUpConfig.id}" placeholder="Please specify details...">
            `;
            container.appendChild(div);
        }
    }

    handleNext() {
        const currentQ = this.queue[0];
        if (!currentQ) return;

        const inputs = document.querySelectorAll(`[name="${currentQ.id}"]`);
        let value = null;

        // Extract Value
        if (currentQ.type === 'yes_no' || currentQ.type === 'single_choice') {
            const selected = Array.from(inputs).find(i => i.checked);
            if (!selected) {
                alert('Please select an answer to continue.');
                return;
            }
            value = selected.value;
        } else if (currentQ.type === 'multiselect') {
            const selected = Array.from(inputs).filter(i => i.checked).map(i => i.value);
            if (selected.length === 0) {
                alert('Please select at least one option.');
                return;
            }
            value = selected;
        } else if (currentQ.type === 'text' || currentQ.type === 'date') {
            value = inputs[0].value;
            if (!value) {
                alert('Please enter a value.');
                return;
            }
        }

        // Validate Follow-up Input if visible
        const followUpInput = document.querySelector('.follow-up-input input');
        if (followUpInput && followUpInput.offsetParent !== null) { // Check if visible
            if (!followUpInput.value.trim()) {
                alert('Please provide details for your selection.');
                followUpInput.focus();
                return;
            }
            // Save follow-up answer
            this.answers[followUpInput.name] = followUpInput.value;
        }

        // Match the selected option to get its config (for next_module logic)
        let nextModules = [];
        if (currentQ.options) {
            if (Array.isArray(value)) {
                // Multiselect logic: collect all next_modules from selected options
                value.forEach(val => {
                    const opt = currentQ.options.find(o => o.value === val);
                    if (opt && opt.next_module) {
                        nextModules.push(opt.next_module);
                    }
                });
            } else {
                // Single choice logic
                const selectedOption = currentQ.options.find(o => o.value === value);
                if (selectedOption && selectedOption.next_module) {
                    nextModules.push(selectedOption.next_module);
                }
            }
        }

        this.answers[currentQ.id] = value;

        // PROCESS LOGIC & FLAGS
        this.processLogic(currentQ, value);

        // Check for STOP flag
        const stops = this.flags.filter(f => f.type === 'stop');
        if (stops.length > 0) {
            this.showStopScreen(stops);
            return;
        }

        // Move Queue
        this.queue.shift();
        this.history.push(currentQ);

        // GENERIC ROUTING: Load next modules if specified (Deduplicate first)
        const uniqueModules = [...new Set(nextModules)];
        uniqueModules.forEach(modKey => {
            this.appendProductModule(modKey);
        });

        this.renderCurrentQuestion();
    }

    processLogic(question, answer) {
        // 1. Simple Yes/No Flags
        if (question.flag && question.flag[answer]) {
            const flagType = question.flag[answer];
            const msg = question.flag.message || `Flagged on ${question.text}`;
            this.flags.push({ type: flagType, reason: msg, questionId: question.id });
        }

        // 2. Multiselect Flags
        if (question.type === 'multiselect' && Array.isArray(answer)) {
            question.options.forEach(opt => {
                if (answer.includes(opt.value)) {
                    if (opt.flag) {
                        const msg = opt.message || `Flagged: ${opt.label}`;
                        this.flags.push({ type: opt.flag, reason: msg, questionId: question.id });
                    }
                }
            });
        }
    }

    appendProductModule(productKey) {
        const module = this.config.product_modules[productKey];
        if (module && module.questions) {
            // Avoid adding duplicate questions if they are already in queue or history
            // Simple check: if the first question of the module is already in queue or history
            const firstQId = module.questions[0].id;
            const alreadyQueued = this.queue.some(q => q.id === firstQId);
            const alreadyVisited = this.history.some(q => q.id === firstQId);

            if (!alreadyQueued && !alreadyVisited) {
                this.queue.push(...module.questions);
            }
        }
    }

    showStopScreen(reasons) {
        this.ui.progressBar.style.width = '100%';
        this.ui.progressBar.style.backgroundColor = '#721c24'; // Red error color

        this.ui.container.innerHTML = `
            <div class="error">
                <h2>NOT ELIGIBLE FOR TREATMENT</h2>
                <p>Based on your answers, we cannot proceed with this peptide therapy at this time due to the following contraindications:</p>
                <ul style="text-align: left; display: inline-block;">
                    ${reasons.map(r => `<li>${r.reason}</li>`).join('')}
                </ul>
                <p>Please consult with your primary care physician.</p>
            </div>
        `;
        this.ui.nextBtn.style.display = 'none';
    }

    finish() {
        this.ui.progressBar.style.width = '100%';

        // Collect consult flags
        const consults = this.flags.filter(f => f.type === 'consult');
        const timestamp = new Date().toLocaleString();

        let reportHTML = `
            <div id="clinical-report" style="background: white; padding: 20px;">
                <div style="text-align: center; margin-bottom: 20px;">
                     <img src="10X Health System_logo1.png" style="max-height: 50px;">
                </div>
                <div class="report-header">
                    <h2 style="margin-top: 0;">Peptide Intake Summary</h2>
                    <p>Date: ${timestamp}</p>
                </div>
                <div class="clinical-status" style="margin-bottom: 20px;">`;

        if (consults.length > 0) {
            reportHTML += `
                <div class="warning">
                    <strong>⚠️ PHYSICIAN REVIEW REQUIRED</strong>
                    <ul>${consults.map(c => `<li>${c.reason}</li>`).join('')}</ul>
                </div>`;
        } else {
            reportHTML += `
                <div style="color: #2e7d32; padding: 15px; border: 1px solid #2e7d32; background: #eaffea; border-radius: 6px; text-align: center;">
                    <strong>✅ CLEARED FOR PROTOCOL</strong><br>
                    No contraindications or consult flags triggered.
                </div>`;
        }

        reportHTML += `</div><div class="report-section" style="margin-top: 20px;"><h3>Questionnaire Responses</h3>`;

        this.history.forEach(q => {
            const answer = this.answers[q.id];
            let displayAnswer = answer;

            // Logic to find human-readable label
            if (q.options) {
                if (Array.isArray(answer)) {
                    // Multiselect
                    const labels = answer.map(val => {
                        const opt = q.options.find(o => o.value === val);
                        return opt ? opt.label : val;
                    });
                    displayAnswer = labels.join(', ');
                } else {
                    // Single choice
                    const opt = q.options.find(o => o.value === answer);
                    if (opt) displayAnswer = opt.label;
                }
            } else {
                if (Array.isArray(answer)) displayAnswer = answer.join(', ');
            }

            if (displayAnswer === 'yes') displayAnswer = 'Yes';
            if (displayAnswer === 'no') displayAnswer = 'No';

            reportHTML += `
                <div class="report-row">
                    <span class="report-label">${q.text}</span>
                    <span class="report-value">${displayAnswer || '-'}</span>
                </div>
            `;
        });

        reportHTML += `</div></div>`;

        const uiHTML = `
            ${reportHTML}
            <div style="text-align: center; margin-top: 30px;">
                <button id="download-btn" class="btn" style="background-color: #2e7d32;">DOWNLOAD PDF REPORT</button>
            </div>
        `;

        this.ui.container.innerHTML = uiHTML;
        this.ui.nextBtn.style.display = 'none';

        // PDF Listener
        setTimeout(() => {
            const btn = document.getElementById('download-btn');
            if (btn) {
                btn.addEventListener('click', () => {
                    if (typeof html2pdf === 'undefined') {
                        alert("Error: PDF library not loaded. Refresh page.");
                        return;
                    }

                    const element = document.getElementById('clinical-report');

                    // Temporary style for PDF generation to prevent clipping
                    const originalWidth = element.style.width;
                    const originalPadding = element.style.padding;

                    element.style.width = '700px'; // Fit within Letter page width (7.5in * 96dpi = 720px)
                    element.style.maxWidth = 'none';
                    element.style.padding = '0'; // Remove padding for print to reduce whitespace

                    const opt = {
                        margin: 0.5,
                        filename: `Peptide_Intake_${new Date().toISOString().split('T')[0]}.pdf`,
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: { scale: 2, useCORS: true },
                        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
                    };

                    html2pdf().set(opt).from(element).save().then(() => {
                        // Restore original styles
                        element.style.width = originalWidth;
                        element.style.maxWidth = '';
                        element.style.padding = originalPadding;
                    }).catch(err => {
                        console.error(err);
                        alert("PDF Generation Failed");
                        element.style.width = originalWidth;
                        element.style.maxWidth = '';
                        element.style.padding = originalPadding;
                    });
                });
            }
        }, 100);
    }
}

new QuestionnaireEngine();
