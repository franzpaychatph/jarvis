'use strict';

const helpers = require('../helpers/Helpers');
const moment = require('moment');

class PartnerManager {
    constructor() {
        this.items = [];
        this.lastChatHistory = [];
    }

    getByUaNumber(ua_number, callback) {
        var _ = this;
        global.apiManager.partner.getByUaNumber(ua_number, (res) => {
            if(res.code == 200) {
                var pcb = _.items.filter((x)=> { return x.ua_number == ua_number; });
                if(pcb.length == 0) {
                    _.items.push(res.results.data);
                }

                callback(helpers.res(200, '', res.results.data));
            } else {
                callback(helpers.res(404, 'Not found', null));
            }
        });
    }

    checkTicket(chat_message, access_token) {
        var _ = this;

        var last_chat = _.lastChatHistory.filter((x) => { return x.source == chat_message.source && x.dest == chat_message.dest && moment().diff(moment(x.add_date), 'minutes') < 5; });
        if(last_chat.length == 0) {
            last_chat.push({
                source: chat_message.source,
                dest: chat_message.dest,
                add_date: new Date()
            });
            global.apiManager.partner.createTicket(chat_message, access_token);
        } else {
            return;
        }
    }
    
}

module.exports = PartnerManager;