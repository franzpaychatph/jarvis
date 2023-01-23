"use strict"


class Response {
    constructor(c) {
        this.code = c.code || null;
        this.status = c.status || null;
        this.results = {
            message: c.results || null

        }
    }
}