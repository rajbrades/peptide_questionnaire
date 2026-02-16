# Peptide Intake Questionnaire

A digital intake and screening tool for peptide therapy, designed with a premium aesthetic inspired by 10X Health System. This application collects patient information, screens for contraindications based on selected products, and generates a printable clinical summary PDF.

## Features

*   **Dynamic Questionnaire Engine**:  
    *   Driven by a JSON configuration file (`questionnaire_config.json`) for easy updates.
    *   Supports various question types: Single Choice, Multi-select, Yes/No, Text, and Date.
    *   **Conditional Logic**: Shows/hides questions based on previous answers (e.g., specific screening for specific peptides).
    *   **Branching Workflows**: Routes users to specific modules based on their product interests.

*   **Premium UI/UX**:
    *   Clean, high-contrast "Biohacking" aesthetic (White/Black/Red).
    *   Interactive card-based inputs for better usability.
    *   Progress bar and smooth transition animations.
    *   Fully responsive design for mobile and desktop.

*   **Safety & Screening**:
    *   **Contraindication Flags**: Automatically flags "Stop" or "Consult" conditions based on medical history.
    *   **Specific Screenings**: targeted questions for Growth Hormone, GLP-1s, BPC-157, etc.

*   **PDF Report Generation**:
    *   Generates a professional clinical summary protocol.
    *   Includes patient details, selected products, screening responses, and safety flags.
    *   Formatted for standard Letter-sized paper.

## Getting Started

### Prerequisites

*   A modern web browser (Chrome, Safari, Edge, Firefox).
*   A local web server (recommended for testing JSON loading).

### Installation & Running

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/rajbrades/peptide_questionnaire.git
    cd peptide_questionnaire
    ```

2.  **Run locally**:
    Because the app loads a JSON configuration file, it works best when served via a web server (to avoid CORS issues with local file access).

    *   **Using Python (Mac/Linux)**:
        ```bash
        python3 -m http.server 8000
        ```
        Then open `http://localhost:8000` in your browser.

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
    *   `html2pdf.js` (for PDF generation)
    *   Google Fonts (Oswald, Inter)

## License

[MIT](LICENSE)
