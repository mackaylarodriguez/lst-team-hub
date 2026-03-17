# Excel templates

Place the **travel agency passenger list template** here:

- **Filename:** `travel-form-export.xlsx`
- **Full path:** `public/templates/travel-form-export.xlsx`

Example: HIGH POINT “Passenger Name List” (.xls or .xlsx). The app finds the row with column headers (e.g. FIRST NAME, LAST NAME), keeps any instructions/Group Leader section above it, and fills one row per participant below the header in **name order: First, Middle, Last**.

Staff use **Export for travel agency (Excel)** on the trip’s Travel Form tab to download the template filled with the team’s travel form responses.

## Template format

- **Any number of top rows:** Instructions, Group Leader fields, etc. are left as-is.
- **Header row:** The first row that contains both “first name” and “last name” (case-insensitive) is treated as the passenger table header.
- **Data rows:** Filled from the row immediately after the header, one row per trip participant.

## Supported column headers

Matched case-insensitively. Examples:

| Template header (examples) | Travel form field |
|----------------------------|--------------------|
| FIRST NAME, First Name | Passport first name |
| MIDDLE NAME, Middle Name | Passport middle name |
| LAST NAME, Last Name | Passport last name |
| SUFFIX | Suffix |
| MONTH, DATE, YEAR (Date of Birth) | Birth month, day, year |
| GENDER | Gender |
| CITIZENSHIP | Citizenship |
| PASSPORT NUMBER | Passport number |
| EXPIRATION DATE | Passport expiration |
| ISSUING COUNTRY | Issuing country |
| FREQUENT FLYER #, Known traveler number | Frequent flyer / Pre-check / Known Traveler Number |
| Notes | Special travel preferences |
| Email, Team Name, etc. | Other supported fields (see code) |

Columns that don’t match are left blank. To add more mappings, share the exact header text.
