"use strict"

class Conversation {
    constructor(c) {
        
        this.id = c.id || null;
        this.pcb_id = c.pcb_id || null;
        this.source = c.source || null;
        this.is_pc_user = c.is_pc_user || null;
        this.status = c.status || null;
        this.pcb_user_id = c.pcb_user_id || null;
        this.last_message = c.last_message || null;

    }
}

module.exports = Conversation;