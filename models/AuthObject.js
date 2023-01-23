"use strict"

class AuthObject {
    constructor(obj) {
        //PCB_USER - heimdall / PCB, PC_USER - paychat user
        this.client_type = obj.client_type || null;

        //ua_number for paychat users, email for PCB users
        this.ua_number = obj.ua_number || null;

        //0 for paychat users, 1 for heimdall, > 1 for paychat for business
        this.pcb_id = obj.pcb_id || null;

        //Access token from API (odin/hydra/banner)
        this.access_token = obj.access_token || null;

        //ua number for anon chat
        this.pcb_ua_number = obj.pcb_ua_number || null;

    }
}
module.exports = AuthObject;