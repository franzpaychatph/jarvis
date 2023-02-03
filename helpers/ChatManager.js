'use strict';

const helpers = require('../helpers/Helpers');
const apiSrvManager = require('../helpers/APIManager');
const Client = require('../models/Client');
const ChatMessage = require('../models/ChatMessage');
const Driver = require('../models/Driver');
const AuthObject = require('../models/AuthObject');
const config = require('../config/config');
const moment = require('moment');
const schedule = require('node-schedule');
const process = require('process');


class ChatManager {

    constructor(conn_mgr) {
        this.socketio_connection = conn_mgr;
        this.ack_history = [];
        this.jobs = [];
        this.listen();
    }

    listen() {
        var _ = this;

        _.socketio_connection.on('connect', async (socket) => {
            //FRANZ
            var authTimeOut = setTimeout(() => {
                // socket.disconnect();
                // console.log('Client auth timeout, disconnected');
            }, 15000);

            socket.on('auth', (data) => this.authenticate(socket, data, authTimeOut, (authResponse, authTimeOut1)=> {
                clearTimeout(authTimeOut1);
                console.log("Auth Response :" + authResponse.code + " on " + authResponse.ua_number);
                if(authResponse.code != 200) {
                    socket.disconnect();
                }
            }));

            socket.on('authorize', (data) => this.authenticate(socket, data, authTimeOut, (authResponse, authTimeOut1)=> {
                clearTimeout(authTimeOut1);
                console.log("Auth Response :" + authResponse.code + " on " + authResponse.ua_number);
                if(authResponse.code != 200) {
                    socket.disconnect();
                }
            }));

            const get_all_sockets = await _.socketio_connection.fetchSockets();
            console.log("Total connected socket(s): " + get_all_sockets.length);

        });

        //FRANZ
        // setInterval(() => {
        //     console.log(' === Connected users ===');
        //     global.clientManager.client_list.forEach((client) => {
        //         console.log(client.ua_number);

        //         if(moment().diff(moment(client.last_ping), 'minutes') >= 1) {
        //             console.log(client.ua_number + ' timed out, disengaged!');
        //             global.clientManager.removeBySocket(client.socket.id);
        //             client.socket.disconnect();
        //         }
        //     });
        //     _.socketio_connection.clients.length;
        //     console.log(' === End of list ===');

        //     _.ack_history = _.ack_history.filter(x => { return moment().diff(moment(x.ack_date), 'minutes') < 5; });
        //     console.log('ack count: ', _.ack_history.length);

        // }, 10000);

        if (config.jobs.delayed_message) {
            _.jobs = [];
            var ruleMinutes = [0,1];//[0, 15, 30, 45];

            ruleMinutes.forEach(minute => {
                var rule = new schedule.RecurrenceRule();
                rule.minute = minute;
                var job = schedule.scheduleJob(rule, function(){
                    _.sendDelayedMessages();
                });
                _.jobs.push({
                    rule: rule,
                    job: job
                });
            });
            console.log('Delayed schedule set!');
        }
    }

    authenticate(socket, data, authTimeOut, callback) {
        var _ = this;

        switch(data.client_type) {
        case 1:
        case 2:

            var authObject = new AuthObject(data);
            if (authObject.client_type < 1 || authObject.client_type > 4 || authObject.ua_number == null || authObject.access_token == null) {
                helpers.log(data);
                callback({ code:500, message: 'Invalid Data', ua_number: authObject.ua_number || 'None', authObject: authObject }, authTimeOut);
                return;
            }

            global.authenticationManager.authorize(authObject, (authData) => {
                authData.ua_number = authObject.ua_number
                if(authData.code == 200) {
                    var result = authData.results.data;
                    var newClient = new Client({
                        client_id: result.client_id,
                        ua_number: result.ua_number,
                        pcb_ua_number: result.client_type == 2 ? result.pcb_ua_number : '',
                        instance_id: config.instance_name,
                        access_token: result.access_token,
                        last_online: new Date(),
                        socket: socket,
                        expires_in: result.expires_in,
                        client_type: result.client_type,
                        pcb_id: result.pcb_id
                    });

                    if (authObject.ua_number.indexOf('@') > -1){
                      global.databaseManager.users.setLastLogin(authObject.ua_number);
                    }
                    else{
                      global.databaseManager.users.setLastLogin(result.client_type == 2 ? result.ua_number : authObject.ua_number);
                    }

                    global.clientManager.add(newClient);
                    _.startClient(newClient);
                    socket.emit('auth', helpers.res(200, 'Success', 'Connection Success'));
                    callback(authData, authTimeOut);


                    // send delivered to receiptient source
                    _.sendDelivered(result.ua_number)
                    if(result.pcb_id > 1) // PCB TO PCB DELIVERED
                      global.databaseManager.conversations.setDelivered(result.ua_number);

                } else {

                    socket.emit('auth', authData);
                    authData.authObject = authObject;
                    callback(authData, authTimeOut);

                }

            });
        break;
        case 5: // DRIVER

              var authObject = new AuthObject(data);
              if (authObject.client_type != 5 || authObject.ua_number == null || authObject.access_token == null) {
                  callback({ code:500, message: 'Invalid Data', ua_number: authObject.ua_number || 'None', authObject: authObject }, authTimeOut);
                  return;
              }
              global.authenticationManager.authorize(authObject, (authData) => {

                  authData.ua_number = authObject.ua_number
                  if(authData.code == 200) {
                      var result = authData.results.data;
                      var newClient = new Client({
                          client_id: result.client_id,
                          ua_number: result.ua_number,
                          // pcb_ua_number: result.client_type == 2 ? result.pcb_ua_number : '',
                          instance_id: config.instance_name,
                          access_token: result.access_token,
                          last_online: new Date(),
                          socket: socket,
                          expires_in: result.expires_in,
                          client_type: result.client_type,
                          // pcb_id: result.pcb_id
                      });

                      global.databaseManager.users.setLastLogin(result.client_type == 2 ? result.pcb_ua_number : authObject.ua_number);
                      global.clientManager.add(newClient);
                      _.startClient(newClient);
                      socket.emit('auth', helpers.res(200, 'Success', 'Connection Success'));
                      callback(authData, authTimeOut);

                  } else {
                      socket.emit('auth', authData);
                      authData.authObject = authObject;
                      callback(authData, authTimeOut);
                  }
              });

        break;
        case 6: // WEB BROWSER, FOR REAL TIME NAVIGATION RIDE NOW

            var newClient = new Client({
                client_id: data.client_id,
                transaction_ref_no : data.transaction_ref_no,
                // pcb_ua_number: result.client_type == 2 ? result.pcb_ua_number : '',
                instance_id: config.instance_name,
                // access_token: result.access_token,
                last_online: new Date(),
                socket: socket,
                // expires_in: result.expires_in,
                // client_type: result.client_type,
                // pcb_id: result.pcb_id
            });

            global.clientManager.add(newClient);
            console.log('Ride Share Client Id -', data.client_id + " Connected");
            _.startClient(newClient);

            global.apiManager.transaction.getTransaction(data, (res) => {

              if(res.code == 200){

                if(res.results.data != "")
                {

                  if(res != undefined){

                    global.clientManager.getByTransactionRefNo(res.results.data.transaction_ref_no).forEach((targetClient) => {
                      global.apiSrvManager.sendDriverLocation(res.results.data , targetClient);
                    });

                    // CREATE, CLOSE SOCKET IMMEDIATELLY IF HAS TRANSACTION COMPLATED TRIP DONE = 1
                  }

                }
                else
                {
                  console.log('Ride Share Client - Invalid Request');
                }

              }
              else
              {
                console.log('Ride Share Client - Invalid Request');
              }

            });





        break;
        default:

            var authObject = new AuthObject(data);
            if (authObject.client_type != 4 || authObject.ua_number == null || authObject.access_token == null || authObject.pcb_ua_number == null) {
                helpers.log(data);
                callback({ code:500, message: 'Invalid Data', authObject: authObject }, authTimeOut);
                return;
            }


            if(data.pcb_ua_number > 0) {
                global.authenticationManager.authorizeAnon(authObject, (authData) => {
                    if(authData.code == 200) {
                        var result = authData.results.data;
                        var newClient = new Client({
                            client_id: result.client_id,
                            ua_number: "anon-" + result.pcb_ua_number + "-" + result.identity,
                            pcb_ua_number: result.pcb_ua_number,
                            instance_id: config.instance_name,
                            access_token: result.access_token,
                            last_online: new Date(),
                            socket: socket,
                            expires_in: result.expires_in,
                            client_type: 4,
                            pcb_id: result.pcb_id
                        });
                        global.clientManager.add(newClient);
                        _.startClient(newClient);
                        socket.emit('authorize', helpers.res(200, 'Success', 'Connection Success'));
                        callback(authData, authTimeOut);
                    } else {
                        socket.emit('authorize', authData);
                        callback({code:500, message: 'Invalid Data', ua_number: authObject.ua_number || 'None', authObject: authObject }, authTimeOut);
                    }
                });
            } else {
                callback({code:500, message: 'Invalid Data', ua_number: authObject.ua_number || 'None', authObject: authObject }, authTimeOut);
            }
            break;
        }
    }

    startClient(x) {
        var _ = this;

        var c = new Client(x);

        /*
            PC_USER -> PCB_USER - OK
            PC_USER -> PC_GROUP - OK
            PCB_USER -> PC_USER - OK
            PC_GUEST -> PCB_USER - OK
        */
        c.socket.conn.on('heartbeat', function() {
            c.doBeat();
        });

        c.socket.on('disconnect', function() {
            console.log('Disconnected: ', c.ua_number);
            global.clientManager.removeBySocket(c.socket.id);
            return;
        });

        c.socket.conn.on('disconnect', function() {
            global.clientManager.removeBySocket(c.socket.id);
            return;
        });

        console.log('Client registered ');

        c.socket.on('update_driver', (data) => {

            var driver = new Driver(data);
            driver.date_created = new Date();
            driver.setDriverUaNumber(data.ua_number);

            if(driver.client_type == 5){

              global.apiManager.pc_user.updateDriver(driver, (res) => {

                if(res.code == 200){
                  driver.setDriverLat(res.results.data.d_lat);
                  driver.setDriverLongt(res.results.data.d_longt);
                  driver.driverStatus(res.results.data.driver_status);
                  driver.drivingStatus(res.results.data.driving_status);
                  c.socket.emit('driver_details', helpers.res(200, 'Sent', driver.getDriverDetails()));
                  console.log('Driver Location Updated');
                }
                else{
                  console.trace("Error on Driver");
                }

              });
            }
            else{
              console.log("Invalid Account.");
            }

            return;

        });

        c.socket.on('ride_action', (data) => {

            var driver = new Driver(data);
            var chat_message = new ChatMessage(data);
            var ride_status = Number(driver.extras.ride_status || 0);
            var transaction_ref_no = Number(driver.extras.transaction_ref_no);
            var ride_status_desc = null;
            driver.ride_status = ride_status;

            // 1 = IDLE
            // 2 = RIDER REQUEST
            // 3 = DRIVER IS ON THE WAY
            // 4 = DRIVER HAS ARRIVE
            // 5 = DRIVER STARTED THE TRIP
            // 6 = DRIVER DONE THE TRIP

            switch (ride_status) {

              case 3:
                ride_status_desc = "Your ride is on the way";
              break;
              case 4:
                ride_status_desc = "Your ride has arrived";
              break;
              case 5:
                ride_status_desc = "In transit";
              break;
              case 6:
                ride_status_desc = "Trip Completed";
              break;

              default:
                return;
              break;

            }

            global.apiManager.transaction.updateTransaction(driver, (res) => {

              if(res.code == 200){

                global.clientManager.getByUaNumber(chat_message.destination).forEach((targetClient) => {
                  targetClient.socket.emit('ride_status', helpers.res(200, 'OK', {
                    'ride_status'             : ride_status,
                    'ride_status_desc'        : ride_status_desc,
                    'transaction_ref_no'      : driver.extras.transaction_ref_no || null,
                    'transaction_type_id'     : res.results.data.transaction_type_id || null,
                    'transaction_type_desc'   : res.results.data.transaction_type_desc || null
                  }));
                });

                if(chat_message.isPushRequired()) {
                  global.notificationManager.sendPush(chat_message);
                }

              }

            });


        });

        c.socket.on('ride_searching', (data) => {

          if(data.p_origin_lat != '' && data.p_origin_longt != ''){
            c.p_origin_lat    = data.p_origin_lat || null;
            c.p_origin_longt  = data.p_origin_longt || null;
            c.ride_search     = 1;
          }else{
            c.p_origin_lat    = null;
            c.p_origin_longt  = null;
            c.ride_search = 0;
          }

          global.clientManager.setRideSearching(c);

        });

        c.socket.on('message', function(data) {

            var chat_message = new ChatMessage(data);

            if((!chat_message.message && chat_message.chat_type == 0) ||
                !chat_message.source ||
                !chat_message.destination ||
                !chat_message.client_type)
            {
                console.log('Chat ignored!');
                helpers.log(data);
                c.socket.emit('message_ack', helpers.res(500, 'Sent', {
                    message_id: chat_message.message_id,
                    message_date: chat_message.date_created,
                    source: c.ua_number,
                    message: 'Invalid Message format!',
                }));
                return;
            }

            chat_message.date_created = new Date();
            chat_message.setPCBID(0);

            if(c.client_type == 2) {
                chat_message.setPCBID(c.pcb_id);
            }


            let orig_source = data.source;
            if(chat_message.is_pcb == 0) {
                chat_message.setSource(c.ua_number);
            } else {
                chat_message.setSource(c.pcb_ua_number);
            }

            switch(chat_message.client_type) { //destination client_type

            case 1: //to PC_USER or Backoffice

                chat_message.is_incoming = 0;
                //do not accept if message came from guest
                if(c.client_type == 4)
                    return;

                if (chat_message.isDRRequired()) { // SEEN
                    c.socket.emit('message', helpers.res(200, 'Sent', chat_message.getMessageSent()));
                }

                chat_message.is_incoming = 1;
                if (chat_message.chat_type == 11) { // SEEN
                    global.databaseManager.messages.setSeen(chat_message.destination, chat_message.source, chat_message.date_created);
                }


                switch (chat_message.extra_type) {
                case ChatMessage.EXTRA_TYPE.DELAYED:
                    _.processDelayedChat(chat_message);
                    break;
                default:

                    _.sendMessageToUser(c, chat_message.destination, chat_message, !chat_message.isDRRequired() ? null : helpers.res(200, 'Delivered', chat_message.getMessageDelivered()));

                    if(c.client_type == 2) {
                        chat_message.is_incoming = 0;
                        global.databaseManager.messages.add(chat_message, c, () => {});
                        // _.sendMessageToPCB(null, c.pcb_ua_number, chat_message.getMessageSentPCB());

                        // _.sendMessageToPCBUser(c, chat_message.destination, chat_message, orig_source);
                        c.socket.emit('message', helpers.res(200, 'Sent', chat_message.getMessageSent()));
                    }


                    if(chat_message.isPushRequired()) {

                        if(c.client_type == 2)
                          chat_message.source = c.pcb_ua_number ;

                        global.notificationManager.sendPush(chat_message);
                    }

                    break;

                }

            break;

            case 2: //TO PCB_USER

                if (c.client_type == 4) {
                    chat_message.extras.tag = 15;
                }

                if(chat_message.is_pcb == 1) {
                    chat_message.setSource(data.source);
                }

                if(chat_message.chat_type == 11){ // SEEN
                    // chat_message.setSource(orig_source);
                    // chat_message.message = "Seen";
                    // console.log(helpers.res(200, 'Sent', chat_message.getMessageSent()))
                    // console.log("helpers.res(200, 'Sent', chat_message.getMessageSent())")
                    global.databaseManager.conversations.setSeenPcb(chat_message.destination);
                    global.clientManager.getByUaNumber(chat_message.destination).forEach((targetClient) => {
                      // targetClient.socket.emit('message', chat_message);
                      targetClient.socket.emit('message', helpers.res(200, 'Sent', chat_message));
                    });
                    return true;
                }

                // NORMAL
                _.sendMessageToPCBUser(c, chat_message.destination, chat_message);
                c.socket.emit('message', helpers.res(200, 'Sent', chat_message.getMessageSent()));

            break;

            case 3: //TO PC_GROUP
                //do not accept if message came from guest
                if(c.client_type != 1)
                    return;


                chat_message.extras.source = c.ua_number;
                chat_message.setSource(chat_message.destination);
                // chat_message.setSource(orig_source);


                // global.databaseManager.chat_groups.getMembers(orig_source, (members) => {
                global.databaseManager.chat_groups.getMembers(chat_message.destination, (members) => {

                    if(members.code == 200) {

                        if(members.results.data.filter((x) => { return x.ua_number == c.ua_number; }).length == 0) {
                            c.socket.emit('message', helpers.res(500, 'Error', {
                                message_id: chat_message.message_id,
                                source: chat_message.source,
                                message: 'You are not a member of this group',
                                destination: chat_message.destination,
                                date_created: chat_message.date_created,
                                extras: chat_message.extras,
                                client_type: 3,
                                chat_type: 9
                            }));
                            return;
                        }


                        members.results.data.forEach((member) => {

                            if (chat_message.chat_type == 11) {
                                global.databaseManager.messages.setSeen(chat_message.destination, chat_message.source, chat_message.date_created);
                            }

                            chat_message.setDestination(member.ua_number);
                            if(chat_message.destination == chat_message.extras.source)
                                return;

                            switch(chat_message.extra_type) {
                            case ChatMessage.EXTRA_TYPE.NONE:


                                _.sendMessageToUser(c, member.ua_number, chat_message, helpers.res(200, 'Delivered', chat_message.getMessageDelivered()));

                                if(chat_message.isPushRequired()){
                                  global.notificationManager.sendPush(chat_message);
                                }
                                break;
                            case ChatMessage.EXTRA_TYPE.DELAYED:
                                _.processDelayedChat(chat_message);
                                break;
                            }

                        });
                    } else {
                        console.log('Members not found');
                    }

                    c.socket.emit('message', helpers.res(200, 'Sent', chat_message.getMessageSent()));



                });

                break;
            case 4: //to ANONYMOUS USER

                chat_message.is_incoming = 0;
                // //do not accept if message doesnt ome from PCB
                // if(c.client_type != 1)
                //     return;

                //Allow certain chat types only
                var allowedChatTypes = [0, 9, 10, 11, 14];
                if (allowedChatTypes.indexOf(chat_message.chat_type) === -1) {
                    return;
                }

                if (chat_message.isDRRequired()) {
                    c.socket.emit('message', helpers.res(200, 'Sent', chat_message.getMessageSent()));
                }

                chat_message.is_incoming = 1;

                if (chat_message.chat_type == 11) {
                    global.databaseManager.messages.setSeen(chat_message.destination, chat_message.source, chat_message.date_created);
                }

                _.sendMessageToUser(c, chat_message.destination, chat_message, !chat_message.isDRRequired() ? null : helpers.res(200, 'Delivered', chat_message.getMessageDelivered()));
                chat_message.is_incoming = 0;
                global.databaseManager.messages.add(chat_message, c, () => {});

                // if(chat_message.isPushRequired()) {
                //     global.notificationManager.sendPush(chat_message);
                // }

                break;






                break;
            default:

                break;
            }


        });

        if(c.client_type == 1 || c.client_type == 4) {

            c.socket.on('offline_message', (omdata) => {

                switch(omdata.action) {
                case 1 :

                    global.databaseManager.messages.getOffline(c.ua_number, (messages) => {
                        if(messages.code == 200) {
                            var newData = [];
                            if(messages.results.data != null) {
                                messages.results.data.forEach((msg) => {
                                    msg.extras = JSON.parse(msg.extras);
                                    newData.push(msg);
                                });
                            }

                            c.socket.emit('offline_message', helpers.res(200, c.ua_number, newData));
                        }
                        else
                            c.socket.emit('offline_message', helpers.res(500, 'Error', null));
                    });
                    break;
                case 2:

                    // Send delivery receipts to senders of offline message
                    global.databaseManager.messages.getOffline(c.ua_number, (messages) => {

                        if(messages.code == 200) {
                            var toDr = [];
                            if(messages.results.data != null) {
                                messages.results.data.forEach((msg) => {
                                    var message = new ChatMessage(msg);
                                    if (message.isDRRequired()) {
                                        toDr.push(message);
                                    }
                                });
                            }

                            toDr.forEach((msg) => {
                                var dr_object = msg.getMessageDelivered();
                                if ((msg.client_type == 1 || msg.client_type == 4) && msg.is_pcb == 1) {
                                    _.sendMessageToPCB(null, msg.source, dr_object);
                                } else {
                                    _.sendMessageToUser(null, msg.source, dr_object, null);
                                }
                            });
                        }
                    });
                    global.databaseManager.messages.removeOffline(c.ua_number, moment(omdata.last_chat_date).add(-30, 'minute').toDate());
                    break;
                }
            });

        }

        c.socket.on('message_seen', (message_id) => {
            var _ = this;
            _.ack_history.push({
                message_id: message_id,
                ua_number: c.ua_number,
                ack_date: new Date()
            });
        });

        c.socket.on('message_query', (qdata) => {

          if(c.client_type == 2) {
              global.databaseManager.conversations.setRead(c.pcb_id, qdata.source);
          }

          if(qdata.client_type == 5) // BACKOFFICE CHAT
          {

            if (qdata.source.indexOf('@') > -1){ // BACKOFFICE TO BACKOFFICE CHAT

              global.databaseManager.messages.get_backoffice_chat(qdata, (messages) => {

                  if(messages.code == 200) {
                    c.socket.emit('message_query', helpers.res(200, '1', {
                      items: messages.results.data
                    }));
                  }
                  else
                      c.socket.emit('message_query', helpers.res(500, 'Error', null));
              });

            }

          }
          else
          {


            global.databaseManager.messages.getPcbToPcb(c, qdata.source, (messages) => {
              if(messages.code == 200) {
                c.socket.emit('message_query', helpers.res(200, '1', {
                  items: messages.results.data
                }));
              }
              else
              c.socket.emit('message_query', helpers.res(500, 'Error', null));
            });

          }

        });


        if(c.client_type == 2) {

          if (c.ua_number.indexOf('@') > -1){ // BACKOFFICE TO BACKOFFICE CHAT

            global.databaseManager.conversations.get_backoffice_users(c.ua_number , (messages) => {
              c.socket.emit('conv_list', helpers.res(200, '', {
                items: messages.results.data
              }));
            });

          }else{
            // Where this use for ?
            c.socket.on('conv_list', (cdata) => {
              global.databaseManager.conversations.get(c.pcb_id, cdata.status, (messages) => {
                console.log(messages)
                c.socket.emit('conv_list', helpers.res(200, '', {
                  items: messages.results.data
                }));
              });
            });

          }





        }

        c.socket.on('pc_ping', (pingdata) => {
            if(pingdata.is_pcb == null)
                pingdata.is_pcb = 0;

            var latest_ping = null;
            if(pingdata.is_pcb == 0) {
                global.clientManager.getByUaNumber(pingdata.ua_number).forEach((targetClient) => {
                    // if(latest_ping == null || targetClient.last_ping.getTime() > latest_ping.getTime()) {
                    //     latest_ping = targetClient.last_ping;
                    // }
                    latest_ping = new Date();
                });

            } else {
                global.clientManager.getByUaNumberForPCB(pingdata.ua_number).forEach((targetClient) => {
                    // if(latest_ping == null || targetClient.last_ping.getTime() > latest_ping.getTime()) {
                    //     latest_ping = targetClient.last_ping;
                    // }
                    latest_ping = new Date();
                });
            }

            if (latest_ping != null) {
                _.sendPing(c.socket, pingdata, latest_ping);
                return;
            }

            global.databaseManager.users.getLastLogin(pingdata.ua_number, (result) => {
                if(result.code == 200) {
                    if(result.results.data.length > 0) {
                        var lastPing = result.results.data[0].timestamp;
                        if(latest_ping == null || lastPing.getTime() > latest_ping.getTime()) {
                            latest_ping = lastPing;
                        }
                    }
                }
                _.sendPing(c.socket, pingdata, latest_ping);
            });
        });

        c.socket.on('pc_ping_group', (pingdata) => {

            global.databaseManager.chat_groups.getMembers(pingdata.ua_number, (members) => {
                if(members.code == 200) {
                    var latest_ping = null;
                    if(members.results.data.filter((x) => { return x.ua_number == c.ua_number; }).length == 0) {
                        c.socket.emit('pc_ping_group', helpers.res(200, 'Success', {
                            latest_ping: '-',
                            ua_number: pingdata.ua_number
                        }));
                        return;
                    }

                    members.results.data.forEach((member) => {
                        if (member.ua_number == c.ua_number) return;
                        var statusFound = false;
                        global.clientManager.getByUaNumber(member.ua_number).forEach((targetClient) => {
                            statusFound = true;
                            // if(latest_ping == null || targetClient.last_ping.getTime() > latest_ping.getTime())
                            //     latest_ping = targetClient.last_ping;
                            latest_ping = new Date();
                        });

                        if(!statusFound) {
                            global.databaseManager.users.getLastLogin(member.ua_number, (result) => {
                                if(result.code == 200) {
                                    if(result.results.data.length > 0) {
                                        if(latest_ping == null || result.results.data[0].timestamp.getTime() > latest_ping.getTime()) {
                                            latest_ping = result.results.data[0].timestamp;
                                        }
                                    }
                                }
                            });
                        }
                    });

                    _.sendPingGroup(c.socket, pingdata, latest_ping);

                } else {
                    console.log('Members not found');
                    c.socket.emit('pc_ping_group', helpers.res(200, 'Success', {
                        latest_ping: 'Room empty',
                        ua_number: pingdata.ua_number
                    }));
                }


            });




        });
    }

    processDelayedChat(message) {
        var chat_message = new ChatMessage(message);
        var _ = this;


        switch(chat_message.extras.action) {
        case '0': // Delayed Message
            try {
                chat_message.date_created = moment(chat_message.extras.time).toDate();
                global.databaseManager.messages.addOffline(chat_message);
            } catch (e) {
                _.sendMessageToUser(null, chat_message.destination, chat_message, !chat_message.isDRRequired() ? null : helpers.res(200, 'Delivered', chat_message.getMessageDelivered()));
            }
            break;
        case '1': // Send Now
            global.databaseManager.messages.sendDelayedMsg(chat_message.message_id, chat_message.destination, (res) => {
                if (res.code == 200) {
                  var message = new ChatMessage(res.results.data);
                    message.extra_type = 0;
                    message.date_created = moment().toDate();
                    delete message.extras.time;
                    delete message.extras.action;
                    _.sendMessageToUser(null, message.destination, message, message.isDRRequired() ? null : helpers.res(200, 'Delivered', message.getMessageDelivered()));
                    if(chat_message.isPushRequired()) {
                        global.notificationManager.sendPush(chat_message);
                    }
                }
            });
            break;
        case '2': // Reschedule
            try {
                global.databaseManager.messages.deleteMessage(chat_message.message_id, chat_message.destination, (res) => {
                    if (res.code == 200) {
                        chat_message.date_created = moment(chat_message.extras.time).toDate();
                        global.databaseManager.messages.addOffline(chat_message);
                    }
                });

            } catch (e) {
                _.sendMessageToUser(null, chat_message.destination, chat_message, !chat_message.isDRRequired() ? null : helpers.res(200, 'Delivered', chat_message.getMessageDelivered()));
            }
            break;
        case '3': // Cancel
            global.databaseManager.messages.deleteMessage(chat_message.message_id, chat_message.destination, null);
            break;
        }

    }

    sendPing(socket, pingdata, latest_ping) {

        if(latest_ping != null) {
            var mins = moment(latest_ping).fromNow();
            if(mins.indexOf('seconds ago') > -1)
                mins = 'now';

            latest_ping = 'Active ' + mins;
        } else {
            latest_ping = 'Offline';
        }

        socket.emit('pc_ping', helpers.res(200, '',
            {
                latest_ping: latest_ping,
                ua_number: pingdata.ua_number,
                is_pcb: pingdata.is_pcb
            })
        );
    }

    sendPingGroup(socket, pingdata, latest_ping) {
        if(latest_ping != null) {
            var mins = moment(latest_ping).fromNow();
            if(mins.indexOf('seconds ago') > -1)
                mins = 'now';

            latest_ping = 'Active ' + mins;
        } else {
            latest_ping = 'Offline';
        }

        socket.emit('pc_ping_group', helpers.res(200, '',
            {
                latest_ping: latest_ping,
                ua_number: pingdata.ua_number
            })
        );
    }

    sendMessageToUser(souce_client, ua_number, message, dr_object) {

        if (message == null || ua_number == null) {
            console.trace("empty message or ua number");
        }
        var sentClients = [];
        var _ = this;
        var chat_message = new ChatMessage(message);


        global.clientManager.getByUaNumber(ua_number).forEach(targetClient => {

          switch (targetClient.client_type) {
            case 1:
            case 2:
            case 4:
                //



                if (souce_client != null) {
                    if(souce_client.socket.id == targetClient.socket.id)
                        return;

                    if(souce_client.client_type != undefined && souce_client.client_type == 2)
                      chat_message.client_type = 2
                }

                // if(chat_message.source.indexOf('@') > -1 && chat_message.destination.indexOf('@') > -1)
                //     targetClient.socket.emit('message', chat_message);
                // else
                //     targetClient.socket.emit('message', helpers.res(200, '', chat_message));

                // if(chat_message.source.indexOf('@') > -1 && chat_message.destination.indexOf('@') > -1)
                //     targetClient.socket.emit('message', chat_message);
                // else



                targetClient.socket.emit('message', helpers.res(200, '', chat_message));

                sentClients.push(ua_number);

                //Store message to offline db if not acknowledged on time
                //TODO: ack cleanup
                if(chat_message.client_type != 2 ) {

                    // if(chat_message.source.indexOf('@') > -1)
                    //   return;



                    setTimeout(()=> {
                        var ackObject = _.ack_history.filter((z) => {
                            return z.message_id == chat_message.message_id && z.ua_number == ua_number;
                        });
                        if(dr_object) {
                            if ('results' in dr_object) {
                                if ('data' in dr_object.results) {
                                    dr_object = dr_object.results.data;
                                }
                            }
                        }

                        if(ackObject.length > 0) {
                            if (chat_message.chat_type != 10) console.log('Delivered: ' + ua_number + ' - ' + chat_message.message);

                            if(dr_object) {
                                if (dr_object.client_type == 1 && chat_message.is_pcb == 1) {
                                    _.sendMessageToPCB(null, dr_object.source, dr_object);
                                } else {
                                    _.sendMessageToUser(null, dr_object.source, dr_object, null);
                                }
                            }

                        } else {

                            if (chat_message.chat_type != 10 && chat_message.message != null) {
                                console.log('Undeliverable, Saved to Offline: ' + ua_number + ' - ' + chat_message.message);
                                chat_message.setDestination(ua_number);
                            }
                            if(chat_message.shouldSaveOffline())
                                global.databaseManager.messages.addOffline(chat_message);
                        }


                    }, 5000);
                }

              break;

              default:
              break;

            }

        });


        if(sentClients.length == 0) {

            global.apiManager.pc_user.getByUaNumber(ua_number, (res) => {

                if(res.code == 200 && res.results.data != null) {

                    if (chat_message.chat_type != 10 && chat_message.message != null) {

                        console.log('Client Offline, Saved to Offline: ' + ua_number + ' - ' + chat_message.message);
                        chat_message.setDestination(ua_number);
                    }

                    if(chat_message.shouldSaveOffline())
                        global.databaseManager.messages.addOffline(chat_message);

                } else {
                    console.trace("Error on user " + ua_number);
                    helpers.log(chat_message.toPojo())
                }
            });

        }

    }

    sendMessageToPCB(source_client, destination, message) {
        var chat_message = new ChatMessage(message);

        var sentClients = [];
        global.apiManager.partner.getByUaNumber(destination, (res) => {
            if(res.code == 200) {
                chat_message.pcb_id = res.results.data.pcb_id;
                chat_message.is_pcb = 1;
                global.clientManager.getByPartnerId(chat_message.pcb_id).forEach(targetClient => {
                    if(targetClient.client_type == 2) {
                        targetClient.socket.emit('message', chat_message);
                        sentClients.push(targetClient.client_id);
                    }
                });
                chat_message.is_pcb = 1;
                chat_message.is_incoming = 1;

                if (source_client != null) {
                    global.databaseManager.messages.add(chat_message, source_client, () => {});

                    if (chat_message.isDRRequired()) {
                        source_client.socket.emit('message', helpers.res(200, 'Sent', chat_message.getMessageDelivered()));
                    }

                    if(res.results.data.pcb_id == 1 && chat_message.isPushRequired())
                        global.partnerManager.checkTicket(chat_message, source_client.access_token);
                }



            } else {
                if (source_client != null) {
                    source_client.socket.emit('message', helpers.res(500, 'Error', {
                        message_id: chat_message.message_id,
                        message_date: chat_message.date_created,
                        message: 'Partner does not exist',
                    }));
                }
                return;
            }

        });



    }

    sendMessageToPCBUser(source_client, destination, message, orig_source) {
        var chat_message = new ChatMessage(message);
        var sentClients = [];

        chat_message.is_pcb = message.is_pcb || 0;
        chat_message.pcb_id = message.pcb_id || 0;
        chat_message.is_incoming = 1;
        chat_message.source = chat_message.source || source_client.ua_number ;


        if(chat_message.is_pcb == 1){


          global.databaseManager.messages.add(chat_message, source_client, () => {

            global.clientManager.getByUaNumber(destination).forEach(targetClient => {

              if(chat_message.is_pcb == 1) {
                chat_message.setSource(orig_source);
              }

              if(targetClient.client_type == 2) { // ONLINE

                global.databaseManager.conversations.setMessageIdToDelivered(chat_message.message_id);

                var destination = chat_message.destination
                var source = chat_message.source

                // SEND THE DELIVERED
                chat_message.source = source_client.ua_number
                chat_message.source = destination
                source_client.socket.emit('message', helpers.res(200, 'Sent', chat_message.getMessageDelivered()));

                // SEND MESSAGE
                chat_message.source = source_client.ua_number
                targetClient.socket.emit('message', chat_message);

              }


            });


          });

        }
        else{ // PC USER TO PCB USER

          // ADD ASSIGN TO FUNCTIONALITY LATER

          global.apiManager.partner.getByUaNumber(chat_message.destination, (res) => {

            var pcbUsers              = res.results.data.pcb_users || [];
            chat_message.pcb_id       = pcbUsers[0].partner_id
            chat_message.client_type  = 2;

            global.databaseManager.messages.add(chat_message, source_client, () => {

                for (var i = 0; i < pcbUsers.length; i++) {

                  global.clientManager.getByUaNumber(pcbUsers[i].ua_number).forEach(targetClient => {

                    chat_message.destination = pcbUsers[i].ua_number;
                    chat_message.source = chat_message.source;
                    chat_message.client_type = 2;

                    targetClient.socket.emit('message', chat_message);


                  });

                }


              });

            });




        }





    }


    sendChatMessage(source_ua, destination_ua, message) {
        var chat_message = new ChatMessage(message);
        var sentClients = [];

        // chat_message.is_pcb = message.is_pcb || 0;
        // chat_message.is_incoming = 1;
        // chat_message.source = source_client.ua_number || chat_message.source;




        global.databaseManager.messages.add(chat_message, source_ua, () => {



          /*-------------------------------------------------------------------------
          | IF ACTIVE CLIENT
          |-------------------------------------------------------------------------*/

          global.clientManager.getByUaNumber(destination).forEach(targetClient => {

              switch (targetClient.client_type)
              {
                case 1:

                    targetClient.socket.emit('message', helpers.res(200, '', chat_message));
                break;

                case 2:

                    console.log(targetClient)
                    console.log("targetClient")
                    global.databaseManager.conversations.setMessageIdToDelivered(chat_message.message_id);
                    if (source_client != null) {

                      if(chat_message.chat_type == 10)
                      {
                        var destination = chat_message.destination
                        var source = chat_message.source
                        chat_message.destination = source
                        chat_message.source = destination
                      }

                      source_client.socket.emit('message', helpers.res(200, 'Sent', chat_message.getMessageDelivered()));

                    }

                    targetClient.socket.emit('message', chat_message);

                break;
                default:

              }

          });


        });

    }

    sendDelayedMessages() {
        console.log('Sending Delayed messages! ' + moment().toString());
        var _ = this;
        global.databaseManager.messages.getDelayedMessages((res) => {

          console.log(res);

          // process.exit();

          if (res.code == 200) {
              res.results.data.forEach((msg) => {
                  var message = new ChatMessage(msg);
                  message.extra_type = 0;
                  message.date_created = moment().toDate();
                  delete message.extras.time;
                  delete message.extras.action;


                  _.sendMessageToUser(null, message.source, message.getMessageSent(), null);
                  _.sendMessageToUser(null, message.destination, message, message.isDRRequired() ? null : helpers.res(200, 'Delivered', message.getMessageDelivered()));
                  global.notificationManager.sendPush(message);
              });
          }
        });
    }

    // PCB FOR NOW
    sendDelivered(ua_number) {

      global.databaseManager.conversations.getSent(ua_number, (result) => {

        var deliveredMessages = result.results.data
        var n = deliveredMessages.filter((v,i,a)=>a.findIndex(t=>(t.source === v.source))===i)
        var items = [];

        for (var i = 0; i < n.length; i++) {

          items = []
          for (var j = 0; j < deliveredMessages.length; j++) {

            if(n[i].source == deliveredMessages[j].source){
              items.push({
                "id" : deliveredMessages[j].id,
                "message_id" : deliveredMessages[j].message_id,
                "source" : deliveredMessages[j].source,
                "destination" : deliveredMessages[j].destination,
                "message" : deliveredMessages[j].message,
                "date_created" : deliveredMessages[j].date_created,
                "chat_type" : 10, // delivered
                "client_type" : deliveredMessages[j].client_type,
                "extras" : deliveredMessages[j].extras,
                "pcb_id" : deliveredMessages[j].pcb_id,
                "is_incoming" : deliveredMessages[j].is_incoming,
                "is_pcb" : deliveredMessages[j].is_pcb,
                "message_status" : deliveredMessages[j].message_status
              });
            }

            continue;

          }

          n[i].toDelivery = items

        }

        for (var i = 0; i < n.length; i++) {
          // just send if online
          global.clientManager.getByUaNumber(n[i].source).forEach((targetClient) => {
            for (var j = 0; j < n[i].toDelivery.length; j++) {
              targetClient.socket.emit('message', n[i].toDelivery[j]);
            }
          });
        }


      });

    }
}


module.exports = ChatManager;
