# Changelog

All notable changes to this project will be documented in this file.

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
- **PDF Layout**: Fixed content clipping issues by adjusting print width and enforcing text wrapping.
- **Alignment**: improved grid alignment for option cards to center orphan items.
