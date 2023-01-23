'use strict';

class Client {

    constructor(c) {
        this.client_id      = c.client_id;
        this.ua_number      = c.ua_number;
        this.instance_id    = c.instance_id;
        this.last_online    = c.last_online;
        this.expires_in     = c.expires_in;
        this.socket         = c.socket;
        this.client_type    = c.client_type;
        this.pcb_id         = c.pcb_id;
        this.is_pcb         = c.pcb_id > 0 ? 1 : 0;
        this.access_token   = c.access_token;
        this.pcb_ua_number  = c.pcb_ua_number || '';
        this.last_ping      = new Date();
        this.client_name    = c.client_name || '';
        this.client_mobile  = c.client_mobile || '';
        this.p_origin_longt = c.p_origin_longt || '';
        this.p_origin_lat   = c.p_origin_lat || '';
        this.ride_search    = c.ride_search || '';
        this.transaction_ref_no = c.transaction_ref_no || null; // USE IN CLIENT 6

        this.doBeat = () => {
            this.last_ping = new Date();
        }
    }

}

module.exports = Client;
