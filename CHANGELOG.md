# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-02-17

### Added
- **Smart Logic**: Implemented age verification to automatically flag users under 18.
- **Mitochondrial Module**: Added specific screening for MOTS-c, SS-31, and SLU-PP-332.
- **Wolverine Stack**: Created a dedicated safety module for the BPC-157/TB-500 combination.
- **Inline Fields**: "Current Peptide Use" now reveals inline fields for Name, Form, and Dose without leaving the page.
- **Detailed PDF**: Clinical summary now includes all inline follow-up details.

### Changed
- **Contraindications**: Updated "Active Cancer" to "History of Cancer" across all modules for clinical accuracy.
- **Safety Messaging**: Specific, hard-coded reasons are now displayed for each stop flag (e.g., "Mitochondrial peptides are contraindicated with active cancer").
- **Stop Screen**: Removed generic "Consult your physician" text to focus on specific disqualification reasons.

### Fixed
- **Gender Filtering**: "Pregnancy/Breastfeeding" options are now automatically hidden for Male patients in all multiselect questions.
- **Logic Gaps**: Fixed routing for TB-500 and Repair Stack to ensure correct safety modules are loaded.

## [1.2.0] - 2026-02-17

### Changed
- **PDF Engine**: Replaced `html2pdf.js` export flow with native browser print (`window.print`) for stable “Save as PDF” output.
- **Runtime**: Removed dependency on a PDF backend endpoint; app can run from any static web server.

## [1.0.0] - 2026-02-16

### Added
- **Patient Information**: Added "Full Name", "Date of Birth", and "Biological Sex" collection at the start of the flow.
- **Multiselect Support**: Users can now select multiple categories of interest (e.g., "Repair" AND "Weight Loss") and the app routes through all relevant screening modules.
- **Nutrient Injections**: Added a new category for Glutathione, NAD+, and B12 with specific Sulfa allergy screening for Glutathione.
- **PDF Export**: Integrated `html2pdf.js` to generate a branded clinical summary report.

### Changed
- **Rebranding**: Complete UI overhaul to match "10X Health System" aesthetic (White/Black/Red theme, Oswald typography).
- **Layout**: Transformed from a basic form container to a full-screen app experience with a header and progress bar.
- **Navigation**: "Severe Allergy" question is now skipped if the user has no prior or current peptide use.
- **Navigation**: "Pregnant/Breastfeeding" question is now skipped for Male patients.
- **Clarity**: Updated medical history questions to be specific to the product class (e.g., "For Growth Hormone Safety: Have you ever...").

### Fixed
- **Alignment**: improved grid alignment for option cards to center orphan items.
