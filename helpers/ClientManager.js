'use strict';

class ClientManager {

    constructor() {
        this.client_list = [];
    }

    add(client) {
        this.client_list.push(client);
    }

    remove(client_id) {
        this.client_list = this.client_list.filter(function(item) { return item.client_id != client_id; });
    }

    removeBySocket(socket_id) {
        this.client_list = this.client_list.filter(function(item) { return item.socket.id != socket_id; });
    }

    getById(client_id) {
        return this.client_list.filter(function(item) { return item.client_id == client_id; });
    }

    getByUaNumber(ua_number) {
        return this.client_list.filter(function(item) { return item.ua_number == ua_number; });
    }

    getByTransactionRefNo(transaction_ref_no) {
        return this.client_list.filter(function(item) { return item.transaction_ref_no == transaction_ref_no; });
    }


    getByUaNumberForPCB(ua_number) {
        return this.client_list.filter(function(item) { return item.pcb_ua_number == ua_number; });
    }

    getBySocket(socket_id) {
        return this.client_list.filter(function(item) { return item.socket.id == socket_id; });
    }

    getByPartnerId(pcb_id) {
        return this.client_list.filter(function(item) { return item.pcb_id == pcb_id; });
    }

    getByPartnerUaNumber(ua_number) {
        return this.client_list.filter(function(item) { return item.ua_number == ua_number && item.client_type == 2; });
    }

    getUaNumberBeingMention(mentions , uaNumber) {
      // Mention array of objects [{ua_number : "", "full_name : "" },{ ua_number : "", full_name : "" }]

      const mentionObjects = mentions;
      const checkUaNumber = obj => {
        if(obj.ua_number === uaNumber)
          return obj;

      };
      return mentionObjects.some(checkUaNumber);
    }

    setRideSearching(client) {
        return this.client_list.filter(function(item) {

          if(item.ua_number == client.ua_number){
              item.ride_seach     = client.ride_search;
              item.p_origin_lat   = client.p_origin_lat;
              item.p_origin_longt = client.p_origin_longt;
          }

        });
    }

    getRideSearching() {
        return this.client_list.filter(function(item) {

          if(item.ride_seach ==  1)
            return item;

        });
    }

}



module.exports = ClientManager;
