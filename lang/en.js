const Messages = {
    post: "Run Query",
    default: "Default Query",
    title: "COMP4537 – Lab 5 (Server1)",
    onlyTwo: 'Only SELECT or INSERT queries are allowed.',
    empty: 'Please type a SQL query in the textarea.',
    clientError: 'Client error:',
    noResponse: "No response received.",
    unknownError: "An unknown error occurred.",
    successful: "✅ Query executed successfully.",
    NA: "N/A",
    noRows: "ℹ️ No rows found.",
    error: "❌ Error:",
    rowsAffected: "Rows affected:",
    insertID: "Insert ID:",
    prettyLabel: "Formatter",
    prettyOn: "On",
    prettyOff: "Off"
}

const HTMLStrings = {
    tableStart: `<table class="response-table">
            <tr><th>ID</th><th>Full Name</th><th>Date of Birth</th></tr>`,
    rowStart: `<tr><td>`,
    rowEnd: `</td></tr>`,
    rowMid: `</td><td>`,
    tableEnd: `</table>`,
    br: `<br/>`
};

const Config = {
    API_BASE: "https://www.mickmcb.com/COMP4537/labs/5",
    SQL_PATH: "/api/v1/sql"
};
  
const Defaults = {
    // Column names must match Server2 schema
    columnName: "full_name",
    columnDob: "date_of_birth",
    patients: [
        { name: "Sara Brown", dateOfBirth: "1901-01-01" },
        { name: "John Smith", dateOfBirth: "1941-01-01" },
        { name: "Jack Ma",    dateOfBirth: "1961-01-30" },
        { name: "Elon Musk",  dateOfBirth: "1999-01-01" }
    ]
};
  
export { Messages, Config, Defaults, HTMLStrings };
