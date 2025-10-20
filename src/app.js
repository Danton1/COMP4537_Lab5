import { Messages, Config, Defaults } from "../lang/en.js";

/**
 * Utility class for configuration constants and static methods
 */
class CONFIG {
    // Removes trailing slashes from a string
    static stripTrailingSlashes = (s) => s.replace(/\/+$/, "");
    // Removes SQL comments from a string
    static stripComments = (s) =>
        s.replace(/--.*$/mg, "").replace(/\/\*[\s\S]*?\*\//g, "");
    // Gets the first token of a SQL string
    static firstToken = (sql) => {
        const clean = CONFIG.stripComments(sql).trim();
        return clean.split(/\s+/)[0]?.toUpperCase() || "";
    };

    // Configuration constants
    static API_BASE = CONFIG.stripTrailingSlashes(Config.API_BASE);
    static SQL_PATH = Config.SQL_PATH;
    static COL_NAME = Defaults.columnName;
    static COL_DOB  = Defaults.columnDob;
    static PATIENTS = Defaults.patients;
}

/**
 * UI class for managing user interface elements and interactions.
 */
class UI {
    constructor() {
        this.textArea = document.getElementById("textArea");
        this.postButton = document.getElementById("postButton");
        this.defaultButton = document.getElementById("defaultButton");
        this.title = document.getElementById("title");
        this.responseField = document.getElementById("responseArea");
        this.responseParagraph = document.getElementById("response");
        this.setInnerText();
    }
    setInnerText(){
        this.postButton.innerText = Messages.post;
        this.defaultButton.innerText = Messages.default;
        this.title.innerText = Messages.title;
    }

    getSQL(){
        return this.textArea.value;
    }

    clearInput(){
        this.textArea.value = "";
    }

    showMessage(msg) {
        this.responseField.style.display = 'block';
        this.responseParagraph.innerText = (typeof msg === 'string')
        ? msg
        : JSON.stringify(msg, null, 2);
    }
}

/**
 * API Caller class for making HTTP requests to the backend server.
 */
class APICaller {
    // GET for SELECT: SQL in the path (encoded, with quotes)
    static async select(sql) {
        const url = SqlEncoder.encodePath(sql);
        const res = await fetch(url, { method: "GET" });
        return res.json();
    }

    // POST for INSERT: send raw SQL as text/plain
    static async insert(sql) {
        const url = `${CONFIG.stripTrailingSlashes(CONFIG.API_BASE)}${CONFIG.SQL_PATH}`;
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "text/plain; charset=utf-8" },
            body: sql
        });
        return res.json();
    }

    // Insert default patients
    static async insertDefaults() {
        const sql = SqlEncoder.buildBulkInsert();
        return APICaller.insert(sql);
    }
}

/**
 * Validator class for validating SQL queries.
 */
class Validator {
    static classify(sql) {
        const ft = CONFIG.firstToken(sql);
        if (ft === 'SELECT') return 'GET';
        if (ft === 'INSERT') return 'POST';
        return 'INVALID';
    }

}

/**
 * SQL Encoder class for encoding SQL queries into URL paths.
 */
class SqlEncoder {
    // Build the path like: /api/v1/sql/"select * from patient"
    static encodePath(sql) {
      // wrap with quotes, then URL-encode the whole thing
      const quoted = `"${sql}"`;
      return `${CONFIG.API_BASE}${CONFIG.SQL_PATH}/${encodeURIComponent(quoted)}`;
    }
  
    // Bulk INSERT for default patients, using current column names
    static buildBulkInsert() {
        const values = CONFIG.PATIENTS
            .map(p => {
            // escape single quotes by doubling them
            const safeName = p.name.replace(/'/g, "''");
            return `('${safeName}', '${p.dateOfBirth}')`;
            })
            .join(", ");
        return `INSERT INTO patient (${CONFIG.COL_NAME}, ${CONFIG.COL_DOB}) VALUES ${values};`;
    }
}

/**
 * Listener class for handling user interactions and events, managing the flow between UI and API calls.
 */
class Listener {
    constructor() {
        this.ui = new UI();
        this.apiCaller = new APICaller();
        this.addEventListeners();
    }
    addEventListeners(){
        this.ui.defaultButton.addEventListener("click", async () => {
            try {
                this.ui.showMessage(await APICaller.insertDefaults());
            } catch (e) {
                this.ui.showMessage(`${Messages.clientError} ${e?.message || e}`);
            }
        });
        this.ui.postButton.addEventListener("click", async () => {
            const sql = this.ui.getSQL();
            if (!sql.trim()) {
                this.ui.showMessage(Messages.empty); return;
            }
            const m = Validator.classify(sql);
            try {
                if (m === "GET")  this.ui.showMessage(await APICaller.select(sql));
                else if (m === "POST") this.ui.showMessage(await APICaller.insert(sql));
                else this.ui.showMessage(Messages.onlyTwo);
            } catch (e) {
                this.ui.showMessage(`Client error: ${e?.message || e}`);
            }
        });
    }
}

const listener = new Listener();
