# Peptide Intake Questionnaire

A digital intake and screening tool for peptide therapy, designed with a premium aesthetic inspired by 10X Health System. This application collects patient information, screens for contraindications based on selected products, and generates a printable clinical summary PDF.

## Features

*   **Dynamic Questionnaire Engine**:  
    *   Driven by a JSON configuration file (`questionnaire_config.json`) for easy updates.
    *   Supports various question types: Single Choice, Multi-select, Yes/No, Text, and Date.
    *   **Smart Conditional Logic**: Automatically adapts based on patient profile (e.g., hides "Pregnancy" for males, flags minors <18).
    *   **Inline Data Capture**: Collects detailed follow-up information (e.g., current medications) without breaking the user flow.
    *   **Branching Workflows**: Routes users to specific safety modules (Mitochondrial, Wolverine Stack, etc.) based on product interest.

*   **Premium UI/UX**:
    *   Clean, high-contrast "Biohacking" aesthetic (White/Black/Red).
    *   Interactive card-based inputs for better usability.
    *   Progress bar and smooth transition animations.
    *   Fully responsive design for mobile and desktop.

*   **Safety & Screening**:
    *   **Clinical Contraindications**: Hard-coded safety stops (e.g., "History of Cancer", "Active Pregnancy") with precise medical reasoning.
    *   **Modular Protocols**: Dedicated screening logic for complex stacks like BPC-157/TB-500 and Mitochondrial peptides.

*   **PDF Report Generation**:
    *   Generates a professional clinical summary protocol.
    *   Includes patient details, selected products, screening responses, and safety flags.
    *   Formatted for standard Letter-sized paper.

## Getting Started

### Prerequisites

*   A modern web browser (Chrome, Safari, Edge, Firefox).
*   A local web server (recommended for JSON loading in browsers).

### Installation & Running

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/rajbrades/peptide_questionnaire.git
    cd peptide_questionnaire
    ```

2.  **Run locally**:
    Because the app loads a JSON configuration file, it should be served over HTTP.

    *   **Using Python (Mac/Linux)**:
        ```bash
        python3 -m http.server 8080
        ```
        Then open `http://localhost:8080` in your browser.

    *   **Using VS Code Live Server**:
        Right-click `index.html` and select "Open with Live Server".

## Configuration

The entire flow is defined in `questionnaire_config.json`. You can modify this file to:

*   Add new products or categories.
*   Change screening questions.
*   Update logic flags (Stop/Consult messages).

### Structure Example
```json
{
  "id": "question_id",
  "text": "Question text here?",
  "type": "yes_no",
  "flag": {
    "yes": "stop",
    "message": "Reason for stopping."
  }
}
```

## Technologies

*   **frontend**: HTML5, CSS3 (Custom Properties), Vanilla JavaScript (ES6+).
*   **Libraries**: 
    *   Browser native print dialog (`window.print`) for PDF export
    *   Google Fonts (Oswald, Inter)

## License

[MIT](LICENSE)
