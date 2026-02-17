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
            // Support inline follow-up for single_choice
            optionsContainer.addEventListener('change', (e) => {
                this.handleFollowUpDisplay(currentQ, e.target.value, qBlock);
            });

        } else if (currentQ.type === 'multiselect') {
            const sex = this.answers['patient_sex'];
            currentQ.options.forEach(opt => {
                // Filter out Pregnancy for Males
                if (sex === 'male' && opt.value === 'pregnancy') {
                    return;
                }

                optionsContainer.innerHTML += `
                    <label class="option-card">
                        <input type="checkbox" name="${currentQ.id}" value="${opt.value}">
                        <div class="card-display">${opt.label}</div>
                    </label>
                `;
            });

            optionsContainer.addEventListener('change', (e) => {
                if (e.target.type !== 'checkbox') return;

                const allBoxes = optionsContainer.querySelectorAll(`input[name="${currentQ.id}"]`);
                if (e.target.value === 'none' && e.target.checked) {
                    allBoxes.forEach(box => {
                        if (box.value !== 'none') box.checked = false;
                    });
                } else if (e.target.value !== 'none' && e.target.checked) {
                    allBoxes.forEach(box => {
                        if (box.value === 'none') box.checked = false;
                    });
                }
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
            div.style.padding = '15px';
            div.style.backgroundColor = '#f9f9f9';
            div.style.borderRadius = '8px';

            if (followUpConfig.text) {
                div.innerHTML += `<div style="font-weight:600; margin-bottom: 10px;">${followUpConfig.text}</div>`;
            }

            if (followUpConfig.fields) {
                // Render multiple fields
                followUpConfig.fields.forEach(field => {
                    const fieldWrapper = document.createElement('div');
                    fieldWrapper.style.marginBottom = '10px';

                    const label = `<label style="display:block; font-size:0.9em; margin-bottom:4px;">${field.label}</label>`;
                    let inputHtml = '';

                    if (field.type === 'select') {
                        const opts = field.options.map(o => `<option value="${o}">${o}</option>`).join('');
                        inputHtml = `<select name="${field.id}" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;"><option value="">Select...</option>${opts}</select>`;
                    } else {
                        inputHtml = `<input type="text" name="${field.id}" placeholder="${field.placeholder || ''}" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">`;
                    }

                    fieldWrapper.innerHTML = label + inputHtml;
                    div.appendChild(fieldWrapper);
                });
            } else {
                // Legacy / Single Text capability
                div.innerHTML += `
                    <input type="text" name="${followUpConfig.id}" placeholder="Please specify details..." style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
                `;
            }
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
            if (selected.includes('none') && selected.length > 1) {
                alert('"None of the above" cannot be selected with other options.');
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

        // Validate Follow-up Inputs if visible
        const followUpContainer = document.querySelector('.follow-up-input');
        if (followUpContainer) {
            const subInputs = followUpContainer.querySelectorAll('input, select');
            let allValid = true;
            subInputs.forEach(input => {
                if (!input.value.trim()) {
                    allValid = false;
                    input.style.borderColor = 'red';
                } else {
                    input.style.borderColor = '#ccc';
                    this.answers[input.name] = input.value;
                }
            });

            if (!allValid) {
                alert('Please provide details for the additional fields.');
                return;
            }
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

        // Avoid redundant Wolverine screening when BPC-157 + TB-500 are both explicitly selected.
        if (currentQ.id === 'repair_product_select' && Array.isArray(value)) {
            const selected = new Set(value);
            const hasWolverine = selected.has('repair_wolverine');
            const hasBpcAndTb500 = selected.has('repair_bpc') && selected.has('repair_tb500');

            if (hasWolverine && hasBpcAndTb500) {
                nextModules = nextModules.filter(modKey => modKey !== 'repair_wolverine');
            }
        }

        this.answers[currentQ.id] = value;

        // LOGIC: Check Age for Minors (<18)
        if (currentQ.id === 'patient_dob') {
            const birthDate = new Date(value);
            if (Number.isNaN(birthDate.getTime())) {
                alert('Please enter a valid date of birth.');
                return;
            }
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }

            if (age < 18) {
                this.flags.push({
                    type: 'stop',
                    reason: 'Must be 18 years or older to receive peptide therapy.',
                    questionId: currentQ.id
                });
                this.showStopScreen(this.flags.filter(f => f.type === 'stop'));
                return;
            }
        }

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

        // 2. Follow-up-triggered flags
        if (!Array.isArray(answer) && question.follow_up && question.follow_up[answer] && question.follow_up[answer].flag) {
            const followUp = question.follow_up[answer];
            const msg = followUp.message || question.flag?.message || `Flagged on ${question.text}`;
            this.flags.push({ type: followUp.flag, reason: msg, questionId: question.id });
        }

        // 3. Multiselect Flags
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
            </div>
        `;
        this.ui.nextBtn.style.display = 'none';
    }

    finish() {
        this.ui.progressBar.style.width = '100%';

        // Collect consult flags
        const consults = this.flags.filter(f => f.type === 'consult');
        const timestamp = new Date().toLocaleString();
        const patientName = this.answers.patient_name || '-';
        const patientDob = this.answers.patient_dob || '-';
        const patientSex = this.answers.patient_sex ? (this.answers.patient_sex === 'male' ? 'Male' : 'Female') : '-';

        const escapeHtml = (value) => String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        const formatAnswer = (question, answer) => {
            if (answer === null || answer === undefined || answer === '') return '-';
            if (question.options) {
                if (Array.isArray(answer)) {
                    return answer.map(val => {
                        const opt = question.options.find(o => o.value === val);
                        return opt ? opt.label : val;
                    }).join(', ');
                }
                const opt = question.options.find(o => o.value === answer);
                const value = opt ? opt.label : answer;
                if (typeof value === 'string' && value.toLowerCase() === 'yes') return 'Yes';
                if (typeof value === 'string' && value.toLowerCase() === 'no') return 'No';
                return value;
            }

            if (Array.isArray(answer)) return answer.join(', ');
            if (answer === 'yes') return 'Yes';
            if (answer === 'no') return 'No';
            return answer;
        };

        const consultReasonSet = new Set(consults.map(c => c.reason));
        const consultReasons = Array.from(consultReasonSet);

        let reportHTML = `
            <div id="clinical-report" style="background: white; padding: 20px; color: #111; font-family: Arial, sans-serif;">
                <div style="text-align: center; margin-bottom: 20px;">
                     <img src="10X Health System_logo1.png" style="max-height: 50px;">
                </div>
                <div class="report-header">
                    <h2 style="margin-top: 0;">Peptide Intake Summary</h2>
                    <p>Date: ${timestamp}</p>
                </div>
                <div style="margin-bottom: 18px; border: 1px solid #e5e5e5; border-radius: 6px; padding: 12px;">
                    <div style="font-weight: 700; margin-bottom: 8px;">Patient Snapshot</div>
                    <div style="font-size: 14px; line-height: 1.6;">
                        <div><strong>Name:</strong> ${escapeHtml(patientName)}</div>
                        <div><strong>Date of Birth:</strong> ${escapeHtml(patientDob)}</div>
                        <div><strong>Biological Sex:</strong> ${escapeHtml(patientSex)}</div>
                    </div>
                </div>
                <div class="clinical-status" style="margin-bottom: 20px;">`;

        if (consultReasons.length > 0) {
            reportHTML += `
                <div class="warning">
                    <strong>PHYSICIAN REVIEW REQUIRED</strong>
                    <ul>${consultReasons.map(reason => `<li>${escapeHtml(reason)}</li>`).join('')}</ul>
                </div>`;
        } else {
            reportHTML += `
                <div style="color: #2e7d32; padding: 15px; border: 1px solid #2e7d32; background: #eaffea; border-radius: 6px; text-align: center;">
                    <strong>CLEARED FOR PROTOCOL</strong><br>
                    No contraindications or consult flags triggered.
                </div>`;
        }

        let responseRowsHTML = '';
        this.history.forEach(q => {
            const answer = this.answers[q.id];
            const displayAnswer = formatAnswer(q, answer);

            responseRowsHTML += `
                <tr>
                    <td class="report-cell-label">${escapeHtml(q.text)}</td>
                    <td class="report-cell-value">${escapeHtml(displayAnswer)}</td>
                </tr>
            `;

            // Append Follow-up Details if applicable
            // Only applicable for single-value answers that match a follow-up key
            if (q.follow_up && !Array.isArray(answer) && q.follow_up[answer]) {
                const config = q.follow_up[answer];
                if (config.fields) {
                    config.fields.forEach(field => {
                        const subAnswer = this.answers[field.id];
                        if (subAnswer) {
                            responseRowsHTML += `
                                <tr class="report-followup-row">
                                    <td class="report-cell-label report-followup-label">-> ${escapeHtml(field.label)}</td>
                                    <td class="report-cell-value report-followup-value">${escapeHtml(subAnswer)}</td>
                                </tr>
                            `;
                        }
                    });
                } else if (config.id) {
                    // Legacy single field
                    const subAnswer = this.answers[config.id];
                    if (subAnswer) {
                        const legacyLabel = config.text ? config.text : 'Details';
                        responseRowsHTML += `
                            <tr class="report-followup-row">
                                <td class="report-cell-label report-followup-label">-> ${escapeHtml(legacyLabel)}</td>
                                <td class="report-cell-value report-followup-value">${escapeHtml(subAnswer)}</td>
                            </tr>
                        `;
                    }
                }
            }
        });

        reportHTML += `
            </div>
            <div class="report-section" style="margin-top: 20px;">
                <h3>Questionnaire Responses</h3>
                <table class="report-table">
                    <tbody>
                        ${responseRowsHTML}
                    </tbody>
                </table>
            </div>
        </div>`;

        const uiHTML = `
            ${reportHTML}
            <div style="text-align: center; margin-top: 30px;">
                <button id="download-btn" class="btn" style="background-color: #2e7d32;">DOWNLOAD PDF REPORT</button>
            </div>
        `;

        this.ui.container.innerHTML = uiHTML;
        this.ui.nextBtn.style.display = 'none';
        const header = document.querySelector('.header');
        if (header) header.style.display = 'none';

        // PDF Listener
        setTimeout(() => {
            const btn = document.getElementById('download-btn');
            if (btn) {
                btn.addEventListener('click', () => {
                    const source = document.getElementById('clinical-report');
                    if (!source) {
                        alert("PDF source not found.");
                        return;
                    }

                    const previousTitle = document.title;
                    const reportDate = new Date().toISOString().split('T')[0];
                    document.title = `Peptide_Intake_${reportDate}`;

                    // Browser print dialog supports "Save as PDF" and avoids fragile canvas-based rendering.
                    window.print();

                    setTimeout(() => {
                        document.title = previousTitle;
                    }, 500);
                });
            }
        }, 100);
    }
}

new QuestionnaireEngine();
