'use strict';

const ChatMessage = require('../models/ChatMessage');
const moment = require('moment');
const helpers = require('../helpers/Helpers.js');

class NotificationManager {

    constructor() {
        this.user_cache = [];
        this.chat_group_cache = [];
    }

    sendPush(message) {
        var chat_message = new ChatMessage(message);
        var _ = this;
        if(chat_message.client_type != 3) {
            _.getUser(chat_message.source, chat_message.pcb_id > 0 ? 2 : chat_message.client_type, (res_source) => {
                if(res_source != null) {
                    _.getUser(chat_message.destination, chat_message.client_type, (res_dest) => {
                        if(res_dest != null) {

                          if(chat_message.backoffice_chat != undefined)
                          {
                            chat_message.source = chat_message.source.email ;
                            chat_message.destination = chat_message.destination.email;
                            // _.sendPushtoUser(chat_message); // to be implemented soon
                            // return;
                          }
                          else
                          {
                            chat_message.source = res_source;
                            chat_message.destination = res_dest;
                            _.sendPushtoUser(chat_message);
                            return;
                          }

                        }
                    });
                }
            });
        } else {
            _.getUser(chat_message.source, 3, (res_group) => {
                if(res_group != null) {
                    _.getUser(chat_message.extras.source, 1, (res_source) => {
                        if(res_source != null) {
                            _.getUser(chat_message.destination, 1, (res_dest) => {
                                if(res_dest != null) {
                                    if(res_source.ua_number == res_dest.ua_number)
                                        return;

                                    chat_message.group_id = chat_message.source;
                                    chat_message.source = res_source;
                                    chat_message.group_name = res_group.group;
                                    _.sendPushtoUser(chat_message);
                                    return;
                                }
                            });
                        }
                    });
                }

            });
        }

    }

    sendPushtoUser(chat_message) {

        var _ = this;
        var msg = _.getMessage(chat_message);
        var chmsg = new ChatMessage(chat_message);
        if (chat_message.backoffice_chat =! undefined && chat_message.backoffice_chat == 1) // BACKOFFICE TO BACKOFFICE CHAT
          return // FOR NOW WALA PA NOTIF


        chmsg.source = chmsg.source.ua_number || chmsg.source;
        chmsg.destination = chmsg.destination.ua_number || chmsg.destination;
        global.databaseManager.messages.getUnseenCount(chmsg.destination, (res) => {

            if (chmsg.client_type == 3) {
                chmsg.source = chat_message.group_id;
            }

            var payload = {
                platforms           : '',
                ua_number           : chmsg.destination,
                title               : msg[0],
                message             : msg[1],
                notification_type   : 'CHAT',
                object_ref          : JSON.stringify(chmsg.toPojo()),
                object_id           : chmsg.message_id
            };


            payload.badge_count = 0;
            if (res.code == 200) {
                if(res.results.data.length > 0) {
                    payload.badge_count = res.results.data[0].total;
                }
            }

            if(chmsg.chat_type == 45) {
                payload.ttl = 20;
            }

            payload.badge_count += 1;
            global.apiManager.notifications.send(payload, (res2) => {

                if(res2.code != 200) {
                  console.log('Notification not sent to: ' + chmsg.destination);
                }else{
                  console.log('Notification sent to: ' + chmsg.destination);
                }

            });

        });

    }

    getUser(ua_number, client_type, callback) {


        switch(client_type) {
        case 1:
            global.apiManager.pc_user.getByUaNumber(ua_number, (res) => {
                if(res.code == 200 && res.results.data != null) {
                    callback(res.results.data);
                    return;
                } else {
                    console.trace("Error on user " + ua_number + " - client type:" + client_type);
                    callback(null);
                }
            });


            break;
        case 2:



            global.apiManager.partner.getByUaNumber(ua_number, (res) => {
              if(res.code == 200 && res.results.data != null) {
                callback(res.results.data);
                return;
              } else {
                console.trace("Error on user " + ua_number + " - client type:" + client_type);
                callback(null);
              }
            });


            // if (ua_number.indexOf('@') > -1){ // BACKOFFICE TO BACKOFFICE CHAT
            //   global.apiManager.pc_user.getByUaNumber(ua_number, (res) => {
            //
            //       if(res.code == 200 && res.results.data != null) {
            //           callback(res.results.data);
            //           return;
            //       } else {
            //           console.trace("Error on user " + ua_number + " - client type:" + client_type);
            //           callback(null);
            //       }
            //   });
            // }
            // else{
            //
            //   global.apiManager.partner.getByUaNumber(ua_number, (res) => {
            //     if(res.code == 200 && res.results.data != null) {
            //       callback(res.results.data);
            //       return;
            //     } else {
            //       console.trace("Error on user " + ua_number + " - client type:" + client_type);
            //       callback(null);
            //     }
            //   });
            //
            // }
            break;
        case 3:
            global.databaseManager.chat_groups.getByJid(ua_number, (res)=> {
                if(res.code == 200 && res.results.data != null) {
                    try {
                        var group = JSON.parse(JSON.stringify(res.results.data[0]));
                        callback({group: group.group_name});
                        return;
                    } catch (e) {
                        helpers.log(e);
                    }
                }
                callback({
                    group: 'Unknown Group'
                });
                return;
            });
            break;
        default:
            callback(null);
            break;
        }

    }

    getMessage(message) {
        var msgout = [];

        if(message.client_type != 3) {
            if(message.pcb_id == 0) {
                msgout[0] = message.source.fname;
            } else {
                msgout[0] = message.source.partner_alias;
            }
        } else {
            msgout[0] = message.source.fname + ' to ' + message.group_name + ':';
        }

        switch(message.chat_type) {
        case 1:
            if(message.client_type != 3) {
                if(message.pcb_id == 0) {
                    msgout[1] = message.source.fname + ' has sent you ' + message.message + '.';
                } else {
                    msgout[1] = message.source.partner_alias + ' has sent you ' + message.message + '.';
                }
            } else {
                msgout[1] = message.source.fname + ' has sent ' + message.message + ' to ' + message.extras.t_rcv + '.';
            }
            break;
        case 2:
            msgout[1] = 'Contact request received';
            break;
        case 3:
            msgout[1] = 'Contact request accepted';
            break;
        case 7:
            msgout[1] = 'Sticker received';
            break;
        case 8:
            msgout[1] = 'Image received';
            break;
        case 36:
            msgout[1] = 'Video received';
            break;
        case 58:
            msgout[1] = 'Attachment received';
            break;
        case 37:
            msgout[1] = 'URL received';
            break;
        case 41:
            msgout[1] = message.source.fname + ' joined PayChat!';
        break;
        case 51:

            let ride_status = Number(message.extras.ride_status);
            switch (ride_status) {

              case 3:
                msgout[1] = 'Your ride is on the way';
              break;

              case 4:
                msgout[1] = 'Your ride has arrived';
              break;

              case 5:
                msgout[1] = 'In transit';
              break;

              case 6:
                msgout[1] = 'Trip Completed';
              break;

              default:
                return;
              break;

            }
        break;

        case 52:
              msgout[1] = message.message;
        break;
        case 57:
              msgout[1] = message.message;
        break;
        case 45:

            if(message.extras.action == 4)
              msgout[1] = "You missed a call from " +  message.source.fname + " " + message.source.lname;
            else if(message.extras.action == 5)
              msgout[1] = message.source.fname + " " + message.source.lname + " didn't answer your call.";
            else if(message.extras.action == 6)
              msgout[1] = "You missed a call from " + message.source.fname + " " + message.source.lname + ". (Busy)";
            else
              msgout[1] = message.message;

        break;
        default:

            if(message.mentioned) // If being mentioned
            {
              const mentioned  = global.clientManager.getUaNumberBeingMention(JSON.parse(message.extras.mentions) , message.destination);
              if(mentioned)
                msgout[1] = message.source.fname + " mentioned you in a message.";
              else
                msgout[1] = message.message || "";;

            }
            else // Or just a normal message
            {
              var m = message.message || "";
              msgout[1] = m;
              if (m.toLowerCase().endsWith('.gif')) {
                msgout[1] = 'GIF received';
              }
            }

            break;
        }

        return msgout;
    }

    getPlatforms(clients) {
        var output = [];
        clients.forEach(element => {
            if(!isNaN(element.client_id.substring(0,1))) {
                output.push(parseInt(element.client_id.substring(0,1)));
            }
        });
        return output;
    }




}

module.exports = NotificationManager;
