
'use strict';
const helpers = require('../helpers/Helpers');

class ChatMessage {

    constructor(m) {
        //Client to generate message_id, the shorter the better (e.g. 6 characters min)
        this.message_id = m.message_id || null;

        //chat message content
        this.message = m.message || null;

        //can be left blank, server to acknowledge with synced timespan
        this.date_created = m.date_created || null;

        //sender (e.g. [ua_number], [pcb account])
        this.source = m.source || null;

        //receiver (e.g. [ua_number], [pcb account], [chat group id])
        this.destination = m.destination || null;

        //client_type_recipient determine which destination ua_number will be headed
        //this will serve outer app connection chat.
        //sample pc user to pcb, pc user to backoffice vice versa
        /* client type:
            1 PC_USER
            2 PCB_USER
            3 PC_GROUP
            4 PC_GUEST
        */
        this.client_type_recipient = m.client_type_recipient || 0;

        this.chat_type = m.chat_type || 0;

        /* client type:
            1 PC_USER - for mobile devices signed in,
            2 PCB_USER - PayChat for business user, includes PayChat back office user
            3 PC_GROUP
            4 PC_GUEST - for devices with no logged in account yet
        */
        this.client_type = m.client_type || null;

        this.mentioned = m.mentioned || false;

        // DRIVER
        this.lat = m.lat || null;

        this.longt = m.longt || null;

        this.driver_status = null;
        if(m.driver_status == 0 || m.driver_status == 1)
          this.driver_status = m.driver_status

        this.driving_status = null;
        if(m.driving_status == 1 || m.driving_status == 2 || m.driving_status == 3)
          this.driving_status = m.driving_status

        // Extra properties carried by the message (e.g. transaction_id)
        this.extras = m.extras || {};

        //FRANZ: added new key:value for transaction_ref_no > fix for loan/borrow money multiple chat bubble to 1 chat bubble only.
        //contributor: Franz/Fred
        this.transaction_ref_no = m.transaction_ref_no || {};

        if (typeof m.extras === 'string' || m.extras instanceof  String ) {
            this.extras = JSON.parse(m.extras);
        }

        this.pcb_id = m.pcb_id || 0;
        this.is_pcb = m.is_pcb > 0 ? 1 : 0;


        this.is_incoming = m.is_incoming == null || 1;

        this.extra_type = m.extra_type || ChatMessage.EXTRA_TYPE.NONE;
        if(this.chat_type == 45) {
            this.extra_type = 0;
        } else {
            var actInt = 0;
            if ('action' in this.extras) {
                try {
                    actInt = parseInt(this.extras.action);
                    if (actInt >= 0 && actInt <= 3) {
                        this.extra_type = ChatMessage.EXTRA_TYPE.DELAYED;
                    }
                } catch (e) {
                    console.log('Error casting action property!');
                }
            }
        }

        if ('mentions' in this.extras) {
          this.mentioned = true;
          //
          // if(this.extras.mentions == '')
          //   this.mentioned = false;

        }


        this.setIsPCB = (bool) => {
            this.is_pcb = bool;
        };

        this.setPCBID = (id) => {
            this.pcb_id = id;
            this.is_pcb = this.pcb_id > 0 ? 1 : 0;
        };


        // DRIVER
        this.setLat = (data) => {
            this.lat = data
        };

        this.setLongt = (data) => {
            this.longt = data
        };

        this.driverStatus = (data) => {
            this.driver_status = data
        };

        this.drivingStatus = (data) => {
            this.driving_status = data
        };


        this.getMessageSent = () => {
            return Object.freeze({
                message_id: this.message_id,
                source: this.source,
                message: '',
                destination: this.destination,
                date_created: this.date_created,
                chat_type: 9,
                client_type: this.client_type,
                extras: this.extras,
                is_pcb: this.is_pcb,
                extra_type: this.extra_type
            });
        };

        this.getDriverDetails = () => {
            return Object.freeze({
                date_created: this.date_created,
                client_type: this.client_type,
                lat: this.lat,
                longt: this.longt,
                driving_status: this.driving_status,
                driver_status: this.driver_status
            });
        };

        this.getMessageSentPCB = () => {
            return Object.freeze({
                message_id: this.message_id,
                source: this.source,
                message: this.message,
                destination: this.destination,
                date_created: this.date_created,
                chat_type: 9,
                client_type: this.client_type,
                extras: this.extras,
                is_pcb: this.is_pcb,
                extra_type: this.extra_type
            });
        };

        this.getMessageDelivered = () => {
            if (this.chat_type == 10) return null;

            var _ = this;
            return this.client_type != 3 ? Object.freeze({
                message_id: this.message_id,
                source: this.source,
                message: '',
                destination: this.destination,
                date_created: this.date_created,
                chat_type: 10,
                client_type: this.client_type,
                extras: this.extras,
                is_pcb: this.is_pcb,
                pcb_id: this.pcb_id,
                extra_type: this.extra_type
            }) : Object.freeze({
                message_id: this.message_id,
                source: this.extras.source,
                message: '',
                destination: this.source,
                date_created: this.date_created,
                chat_type: 10,
                client_type: this.client_type,
                extras: { source: this.destination },
                is_pcb: this.is_pcb,
                pcb_id: this.pcb_id,
                extra_type: this.extra_type
            });
        };

        this.setDestination = (dest) => {
            this.destination = dest;
        };
        this.setSource = (src) => {
            this.source = src;
        };

        this.isPushRequired = () => {
            switch(this.chat_type) {
            case 0:
            case 1:
            case 2:
            case 3:
            case 7:
            case 8:
            case 6:
            case 15:
            case 45:
            case 40:
            case 36:
            case 51: // PASSENGER PUSH
            case 39: // MEDIA FILE ATTACHEMENT
            case 58: // ATTACHMENT IMAGE AND VIDEO TOGETHER
                return true;
            }
            return false;
        };

        this.isDRRequired = () => {
            switch (this.chat_type) {
            case 9:
            case 10:
            case 11:
            case 14:
            case 45:
                return false;
            }

            return true;
        };

        this.toPojo = () => {
            return {
                source      : this.source,
                destination : this.destination,
                message_id  : this.message_id,
                message     : this.message,
                date_created: this.date_created,
                chat_type   : this.chat_type,
                client_type : this.client_type,
                extras      : this.extras,
                is_pcb      : this.is_pcb
            };
        };

        this.shouldSaveOffline = () => {
            switch(this.chat_type) {
            case 45:
            case 14:
                return false;
            }
            return true;

        }

    }

    static get CHAT_TYPES() {
        return Object.freeze({
            MESSAGE: 0,
            FUNDS_TRANSFER: 1,
            REQUEST_CONTACT: 2,
            ACCEPT_CONTACT: 3,
            BILLS_PAY: 4,
            READ_RECEIPT: 5,
            CHAT_STATE_TYPING: 6,
            STICKER: 7,
            IMAGE: 8
        });
    }

    static get EXTRA_TYPE() {
        return Object.freeze({
            NONE: 0,
            DELAYED: 1
        });
    }



    static getDR(chatType, chat_message) {
        return Object.freeze({
            message_id: chat_message.message_id,
            source: chat_message.source,
            message: '',
            destination: chat_message.destination,
            date_created: chat_message.date_created,
            chat_type: chatType,
            client_type: chat_message.client_type,
            extras: chat_message.extras,
            is_pcb: chat_message.is_pcb
        });
    }
}

module.exports = ChatMessage;
