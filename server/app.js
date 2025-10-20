const http = require('http');
const mysql = require('mysql');
const { URL } = require('url');
const userMessages = require('./lang/en/en.js');
const PORT = process.env.PORT || 8443;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const API_ENDPOINT = process.env.API_ENDPOINT || "COMP4537/labs/5/api/v1/sql";

const db = mysql.createConnection({
    host: 'localhost',
    user: 'mickmcbc_admin',
    password: 'Stroganoff2025',
    database: 'mickmcbc_comp4537_lab5'
});

const createTableQuery = `
CREATE TABLE IF NOT EXISTS patient (
    patientid INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL
) ENGINE=InnoDB;
`;

/** Wraps responses (JSON + CORS) to keep handler readable. */
class Responder {
    constructor(res, allowedOrigin) {
        this.res = res;
        this.allowedOrigin = allowedOrigin;
    }
    cors(extra = {}) {
        return {
            'Access-Control-Allow-Origin': this.allowedOrigin,
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            ...extra,
        };
    }
    json(status, payload) {
        this.res.writeHead(status, {
            'Content-Type': 'application/json; charset=utf-8',
            ...this.cors()
        });
        this.res.end(JSON.stringify(payload));
    }
    noContent() {
        this.res.writeHead(204, this.cors({ 'Access-Control-Max-Age': '600' }));
        this.res.end();
    }
}

class Validator {
    static isSelectQuery(query) {
        return /^select\s+/i.test(query.trim());
    }
    static isInsertQuery(query) {
        return /^insert\s+/i.test(query.trim());
    }
}

class Server {
    constructor() {
        this.API = API_ENDPOINT;
        this.server = http.createServer(this.handleRequest.bind(this));
        db.connect((err) => {
            if (err) throw err;
            // Log successful connection
            console.log(userMessages.MyMessages.connectionSuccessful);
            console.log(userMessages.MyMessages.nodeJS + process.versions.node);
        });

        db.query(createTableQuery, (err) => {
            if (err) {
                throw err;
            } else {
                console.log(userMessages.MyMessages.tableReady);
            }
        });
        this.server.listen(PORT, () => {
            console.log(`Server listening on port ${PORT}`);
            console.log('CORS allowed origin: ' + ALLOWED_ORIGIN);
        });
    }

    async readBody(req) {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', (chunk) => {
                body += chunk.toString();
            });
            req.on('end', () => {
                resolve(body);
            });
            req.on('error', (err) => {
                reject(err);
            });
        });
    }

    async handleRequest(req, res) {
        const responder = new Responder(res, ALLOWED_ORIGIN);
        const validator = new Validator();

        if (req.method === 'OPTIONS') {
            responder.noContent();
            return;
        }
        const url = new URL(req.url, `http://${req.headers.host}`);

        if (req.method === 'POST' && url.pathname === `/${this.API}`) {
            this.readBody(req).then((body) => {
                const query = body;
                if (!query || !Validator.isInsertQuery(query)) {
                    responder.json(400, { ok: false, error: userMessages.MyMessages.onlyInsertAllowed });
                    return;
                }
                db.query(query, (err, result) => {
                    if (err) {
                        responder.json(500, { ok: false, error: userMessages.MyMessages.insertError });
                    } else {
                        responder.json(201, {
                            ok: true,
                            affectedRows: result.affectedRows,
                            insertId: result.insertId
                        });
                    }
                });
            }).catch((err) => {
                responder.json(400, { ok: false, error: userMessages.MyMessages.invalidJson });
            });
        } else if (req.method === 'GET' && url.pathname.startsWith(`/${this.API}/`)) {
            let query = url.pathname.slice((`/${this.API}/`).length);
            console.log("Extracted query from URL path:", query);
            if (!query) {
                const body = await this.readBody(req);
                if (!body) {
                    responder.json(400, { ok: false, error: userMessages.MyMessages.noQueryProvided });
                    return;
                }
                query = body.trim();
            }
            let sql = decodeURIComponent(query);
            if (sql.startsWith('"') && sql.endsWith('"')) {
                sql = sql.slice(1, -1);
            }
            if (!Validator.isSelectQuery(sql)) {
                responder.json(400, { ok: false, error: userMessages.MyMessages.onlySelectAllowed });
                return;
            }
            db.query(sql, (err, results) => {
                if (err) {
                    responder.json(500, { ok: false, error: userMessages.MyMessages.selectError });
                } else {
                    responder.json(200, { ok: true, rows: results });
                }
            });
        } else {
            responder.json(404, { ok: false, error: userMessages.MyMessages.NotFound });
        }
    }
}


const server = new Server();