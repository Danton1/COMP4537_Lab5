const http = require('http');
const mysql = require('mysql');
const { URL } = require('url');
const userMessages = require('./lang/en/en.js');
const PORT = process.env.PORT || 8443;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const API_ENDPOINT = process.env.API_ENDPOINT || "api/v1/sql";

const db = mysql.createConnection({
    host: 'localhost',
    user: 'mickmcbc_client',
    password: 'Jambalaya2025',
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
        this.server = http.createServer(this.requestHandler.bind(this));
        db.connect((err) => {
            if (err) {
                throw err;
            }
            var message = userMessages.MyMessages.connectionSuccessful,
                version = userMessages.MyMessages.nodeJS + process.versions.node + "\n",
                response = [message, version].join('\n');
            res.end(response);
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

    handleRequest(req, res) {
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
                if (!validator.isInsertQuery(query)) {
                    responder.json(400, { error: userMessages.MyMessages.onlyInsertAllowed });
                    return;
                }
                db.query(query, (err, result) => {
                    if (err) {
                        responder.json(500, { error: userMessages.MyMessages.insertError });
                    } else {
                        responder.json(201, { id: result.insertId });
                    }
                });
            }).catch((err) => {
                responder.json(400, { error: 'Invalid JSON' });
            });
        } else if (req.method === 'GET' && url.pathname === `/${this.API}`) {
            const query = decodeURIComponent(url.pathname.replace(`/${this.API}/select/`, '')).trim();
            if (!query) {
                this.readBody(req).then((body) => {
                    if (!body) {
                        responder.json(400, { error: userMessages.MyMessages.noQueryProvided });
                        return;
                    }
                    query = body;
                });
                if (!validator.isSelectQuery(query)) {
                    responder.json(400, { error: userMessages.MyMessages.onlySelectAllowed });
                    return;
                }
                db.query(query, (err, results) => {
                    if (err) {
                        responder.json(500, { error: userMessages.MyMessages.selectError });
                    } else {
                        responder.json(200, results);
                    }
                });
            } else {
                responder.json(404, { error: userMessages.MyMessages.NotFound });
            }
        }
    }
}