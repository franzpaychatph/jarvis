'use strict';

const request = require('request');
const helpers = require('../helpers/Helpers');
const config = require('../config/config');
const moment = require('moment');
const multer = require('multer');

const Client = require('../models/Client');
const Driver = require('../models/Driver');
var upload = multer();

class APISrvManager {

    constructor(app , conn_mgr) {
        var _ = this;
        _.app_srv = app;
        this.socketio_connection = conn_mgr;

        _.app_srv.post('/pc_ride/driver_location', upload.none(), (req, res) => {
            helpers.log('/pc_ride/driver_location');

            let transaction = JSON.parse(req.body.transaction || []);

            if(transaction != undefined){

              global.clientManager.getByUaNumber(Number(transaction.passenger_ua_number)).forEach((targetClient) => {
                _.sendDriverLocation(transaction , targetClient);
              });

              global.clientManager.getByTransactionRefNo(transaction.transaction_ref_no).forEach((targetClient) => {
                _.sendDriverLocation(transaction , targetClient);
              });

            }

            res.send(helpers.res(200, 'success', {}));

        });

        _.app_srv.post('/pc_ride/vehicles', upload.none(), (req, res) => {
            helpers.log('/pc_ride/vehicles');

            let driver = new Driver(req.body);
            let code = 404;
            let code_desc = 'ERROR';
            global.clientManager.getByUaNumber(Number(driver.driver_ua_number)).forEach((targetClient) => {

              if(targetClient != null){
                  code = 200;
                  code_desc = "OK";
                  targetClient.socket.emit('ride_request', helpers.res(code, code_desc, driver.getDriverDetails()));
              }

            });

            res.send(helpers.res(code, code_desc, {}));

        });

        _.app_srv.post('/pc_ride/vehicles_location', upload.none(), (req, res) => {
              helpers.log('/pc_ride/vehicles_location');

              let list = [];
              global.clientManager.getRideSearching().forEach((targetClient) => {

                var number_decimal_only = /^[0-9]+\.?[0-9]*$/;
                if
                (
                	number_decimal_only.test(targetClient.ua_number) === true &&
                	number_decimal_only.test(targetClient.p_origin_lat) === true &&
                	number_decimal_only.test(targetClient.p_origin_longt) === true
                )
                {
                  list.push({
                    "ua_number" : targetClient.ua_number,
                    "p_origin_lat" : targetClient.p_origin_lat,
                    "p_origin_longt" : targetClient.p_origin_longt
                  })
                }

              });

              if(list.length > 0)
              {
                  global.apiManager.pc_ride.vehicleLocationList(list, (res) => {

                    if(res.code == 200 && res.results.data != null){

                      var user_requesting_length = res.results.data.length || 0;
                      var user_requesting = res.results.data;
                      for (var i = 0; i < user_requesting_length; i++) {
                        global.clientManager.getByUaNumber(user_requesting[i].ua_number).forEach((targetClient) => {
                          targetClient.socket.emit('vehicle_list', helpers.res(200, 'OK',  user_requesting[i].nearest_drivers || []));
                        });
                      }

                    }

                  });
              }

              res.send(helpers.res(200, 'OK', {}));

        });

        _.app_srv.post('/chat/post_message', upload.none(), (req, res) => {
              helpers.log('/chat/post_message');
              helpers.log(req.body);
              res.send(helpers.res(200, 'OK', {}));
        });

        _.app_srv.post('/chat/notify_new_contact', upload.none(), (req, res) => {
            _.validate([
                { name: 'source', rules: ['req'] },
                { name: 'ua_number', rules: ['req'] }
            ], req, res, (data) => { if (data.code != 200) { return; } });


            var items = req.body.ua_number.split(',');
            if (items.length == 0) {
                res.send(helpers.res(500, 'Error', {}));
                return;
            }
            global.apiManager.pc_user.getByUaNumber(req.body.source, (res1) => {
                if(res1.code == 200 && res1.results.data != null) {
                    items.forEach(ua_number => {
                        global.apiManager.pc_user.getByUaNumber(ua_number, (res) => {
                            if(res.code == 200 && res.results.data != null) {
                                var msg = {
                                    source: req.body.source,
                                    destination: ua_number,
                                    message: res1.results.data.fname,
                                    message_id: helpers.rand(5),
                                    client_type: 1,
                                    is_pcb: 0,
                                    chat_type: 41,
                                    date_created: new Date(),
                                    extras: {}
                                };
                                global.notificationManager.sendPush(msg);
                                global.chatMgr.sendMessageToUser(null, ua_number, msg, null);
                            }
                        });
                    });
                }
            });
            res.send(helpers.res(200, 'OK', {}));
        });

        _.app_srv.post('/chat/pcb_notify_contact', upload.none(), (req, res) => {
            _.validate([
                { name: 'source', rules: ['req'] },
                { name: 'pcb_id', rules: ['req'] },
                { name: 'ua_number', rules: ['req'] },
                { name: 'message', rules: ['req'] },
                { name: 'chat_type', rules: ['req'] },
                { name: 'extras', rules: [] },
                { name: 'message_id', rules: [] }
            ], req, res, (data) => { if (data.code != 200) { return; } });


            var items = req.body.ua_number.split(',');
            if (items.length == 0) {
                res.send(helpers.res(500, 'Error', {}));
                return;
            }

            global.apiManager.partner.getByUaNumber(req.body.source, (res1) => {
                console.log("get partner - " + res1.code);
                // helpers.res(500, 'Error', res1.results.data)
                if(res1.code == 200 && res1.results.data != null) {
                    items.forEach(ua_number => {
                        global.apiManager.pc_user.getByUaNumber(ua_number, (res) => {
                            if(res.code == 200 && res.results.data != null) {
                                var msg = {
                                    source: req.body.source,
                                    destination: ua_number,
                                    message: req.body.message,
                                    message_id: helpers.rand(6),
                                    client_type: 1,
                                    is_pcb: 1,
                                    pcb_id: req.body.pcb_id,
                                    chat_type: parseInt(req.body.chat_type),
                                    date_created: new Date(),
                                    extras: {}
                                };

                                if ('extras' in req.body) {
                                    try {
                                        msg.extras = JSON.parse(req.body.extras);
                                    } catch (e) {

                                    }
                                }


                                if ('message_id' in req.body) {
                                    msg.message_id = req.body.message_id;
                                }

                                global.notificationManager.sendPush(msg);
                                console.log(ua_number);
                                global.chatMgr.sendMessageToUser(null, ua_number, msg, null);
                                global.databaseManager.messages.addOffline(msg);
                            }
                        });
                    });

                }
            });

            res.send(helpers.res(200, 'OK', {}));
        });

        _.app_srv.post('/chat/send_call_notification_twilio', upload.none(), (req, res) => {
            _.validate([
                { name: 'source_ua_number', rules: ['req'] },
                { name: 'destination_ua_number', rules: ['req'] },
                { name: 'c_type', rules: ['req'] },
                { name: 'is_pcb', rules: ['req'] },
                { name: 'pcb_access_token', rules: [] },
                { name: 'pcb_id', rules: [] },
                { name: 'room_name', rules: ['req'] }
            ], req, res, (data) => { if (data.code != 200) { return; } });



            var destCall = function(source, is_pcb, destination_ua_number, room_name) {
                global.apiManager.pc_user.getByUaNumber(destination_ua_number, (res1) => {
                    if(res1.code == 200 && res1.results.data != null) {
                        var caller_name = is_pcb == 0 ? (source.fname + ' ' + source.lname) : source.partner_name;
                        var msg = {
                            source: source.ua_number,
                            destination: destination_ua_number,
                            message: caller_name + " is on Video Call",
                            message_id: helpers.rand(5),
                            client_type: 1,
                            is_pcb: is_pcb,
                            pcb_id: is_pcb > 0 ? source.pcb_id : 0,
                            chat_type: 45,
                            date_created: new Date(),
                            extras: {
                                room: room_name,
                                action: 1,
                                caller_name: caller_name,
                                ua_number: is_pcb == 0 ? source.ua_number : req.body.pcb_ua_number,
                                c_type: req.body.c_type,
                                uuid: ('uuid' in req.body) ? req.body.uuid : ''
                            }
                        };

                        global.notificationManager.sendPush(msg);
                        global.chatMgr.sendMessageToUser(null, destination_ua_number, msg, null);
                        res.send(helpers.res(200, 'OK', {}));
                    } else {
                        res.send(helpers.res(404, 'Destination user not found', {}));
                    }
                });

            };

            if(req.body.is_pcb == 0) {
                global.apiManager.pc_user.getByUaNumber(req.body.source_ua_number, (res1) => {
                    if(res1.code == 200 && res1.results.data != null) {
                        destCall(res1.results.data, 0, req.body.destination_ua_number, req.body.room_name)
                    } else {
                        res.send(helpers.res(404, 'Source user not found', {}));
                    }
                });
            } else {
                _.validate([
                    { name: 'pcb_ua_number', rules: ['req'] }
                ], req, res, (data) => { if (data.code != 200) { return; } });

                global.apiManager.partner.getByUaNumber(req.body.source_ua_number, (res1) => {
                    if(res1.code == 200 && res1.results.data != null) {
                        destCall(res1.results.data, 1, req.body.destination_ua_number, req.body.room_name)
                    } else {
                        res.send(helpers.res(404, 'Partner not found', {}));
                    }
                });
            }


        });

        _.app_srv.post('/chat/push_notification', upload.none(), (req, res) => {

          helpers.log('/chat/push_notification');
          helpers.log(req.body);

          var code = req.body.code || null;

          if(code == 200){

            var msg = {
              source: req.body.source,
              destination: req.body.ua_number,
              message: req.body.message ,
              message_id: helpers.rand(5),
              client_type: 1,
              is_pcb: 1,
              pcb_id: 1,
              chat_type: req.body.chat_type,
              date_created: new Date(),
              extras: {}
            };

            global.notificationManager.sendPush(msg);
            global.chatMgr.sendMessageToUser(null, req.body.ua_number, msg, null);
            res.send(helpers.res(200, 'OK', {}));

          }

          res.send(helpers.res(404, 'ERROR', {}));


        });

        _.app_srv.post('/chat/pc_user_message', upload.none(), (req, res) => {

          helpers.log('/chat/pc_user_message');
          helpers.log(req.body);

          var client_type = req.body.client_type || 1;
          var pcb_id = req.body.pcb_id || 0;
          var is_pcb = req.body.is_pcb > 0 ?  1 : 0;

          var msg = {
            source: req.body.source,
            destination: req.body.ua_number,
            message: req.body.message ,
            message_id: helpers.rand(5),
            client_type: Number(client_type),
            is_pcb: is_pcb,
            pcb_id: pcb_id,
            chat_type: parseInt(req.body.chat_type),
            date_created: new Date(),
            extras: JSON.parse(req.body.extras),
            client_type_recipient: parseInt(req.body.client_type_recipient || "0")
          };

          if(req.body.client_type_recipient != undefined && req.body.client_type_recipient == 2){

            global.clientManager.getByUaNumber(Number(req.body.ua_number)).forEach((targetClient) => {
              global.chatMgr.sendMessageToPCBUser(msg, req.body.ua_number, msg);
            });

            res.send(helpers.res(200, 'OK', {}));
          }
          else{
            global.notificationManager.sendPush(msg);
            global.chatMgr.sendMessageToUser(null, req.body.ua_number, msg, null);
            res.send(helpers.res(200, 'OK', {}));

            //add
            helpers.log('/chat/send_messge');
            helpers.log(req.body);
  
            var client_type = req.body.client_type || 1;
            var pcb_id = req.body.pcb_id || 0;
            var is_pcb = req.body.is_pcb > 0 ?  1 : 0;
  
            var msg = {
              source: req.body.source,
              destination: req.body.ua_number,
              message: req.body.message ,
              message_id: helpers.rand(5),
              client_type: Number(client_type),
              is_pcb: is_pcb,
              pcb_id: pcb_id,
              chat_type: req.body.chat_type,
              date_created: new Date(),
              extras: JSON.parse(req.body.extras)
            };
  
            global.chatMgr.sendChatMessage(req.body.source, req.body.ua_number, msg);
            res.send(helpers.res(200, 'OK', {}));
            
          }

        });

        _.app_srv.post('/chat/send_messge', upload.none(), (req, res) => {

          helpers.log('/chat/send_messge');
          helpers.log(req.body);

          var client_type = req.body.client_type || 1;
          var pcb_id = req.body.pcb_id || 0;
          var is_pcb = req.body.is_pcb > 0 ?  1 : 0;

          var msg = {
            source: req.body.source,
            destination: req.body.ua_number,
            message: req.body.message ,
            message_id: helpers.rand(5),
            client_type: Number(client_type),
            is_pcb: is_pcb,
            pcb_id: pcb_id,
            chat_type: req.body.chat_type,
            date_created: new Date(),
            extras: JSON.parse(req.body.extras)
          };

          global.chatMgr.sendChatMessage(req.body.source, req.body.ua_number, msg);
          res.send(helpers.res(200, 'OK', {}));


        });

        _.app_srv.get('/testpage', (req, res) => {
          res.status(200).send('Test Page')
        });

        _.app_srv.listen(config.port_api, () => {
            console.log(`API Server Started ${config.port_api}`);
        });

    }

    validate(fields, req, res, callback) {
        for(var i = 0; i < fields.length; i++) {
            var field = fields[i];

            if(field.rules.indexOf('req') != -1) {
                if(!(field.name in req.body)) {
                    res.send(helpers.res(500, field.name + ' is required', {}));
                    callback(helpers.res(500, 'Error', {}));
                    return;
                }
            }

        }
        callback(helpers.res(200, 'Success', {}));
    }


    sendDriverLocation(transaction, targetClient) {

      let driver = new Driver(transaction);
      let json = JSON.parse(transaction.json);
      // console.log(transaction)
      // console.log(json)
      driver.p_origin_lat             = json.data.dispatch.p_origin_lat || null
      driver.p_origin_longt           = json.data.dispatch.p_origin_longt || null

      driver.p_destination_lat        = json.data.dispatch.p_destination_lat || null
      driver.p_destination_longt      = json.data.dispatch.p_destination_longt || null
      driver.p_destination_address    = json.data.dispatch.p_destination_address || null
      driver.p_origin_address         = json.data.dispatch.p_origin_address || null
      driver.p_destination_distance   = json.data.dispatch.p_destination_distance || null
      driver.p_destination_eta        = json.data.dispatch.p_destination_eta || null
      driver.ride_status              = json.data.dispatch.ride_status || null
      driver.plate_number             = json.data.dispatch.plate_number || null
      driver.trip_done                = json.data.dispatch.trip_done || 0
      driver.ride_status_desc         = transaction.ride_status_desc || null
      driver.driver_fullname          = transaction.driver_fullname || null
      driver.passenger_fullname       = transaction.passenger_fullname || null
      driver.passenger_ua_number      = transaction.passenger_ua_number || null
      driver.plate_number             = transaction.plate_number || null
      driver.bearing                  = transaction.bearing || null


      let send = 0;
      if(driver.ride_status == 3) // DRIVER IS ON THE WAY
      {

        driver.setCurrentLat(driver.d_lat)
        driver.setCurrentLongt(driver.d_longt)
        driver.setDestinationLat(driver.p_origin_lat)
        driver.setDestinationLongt(driver.p_origin_longt)
        send = 1
      }
      else if(driver.ride_status == 4) // DRIVER HAS ARRIVED
      {

        driver.setCurrentLat(driver.d_lat)
        driver.setDestinationLat(driver.p_origin_lat)
        driver.setCurrentLongt(driver.d_longt)
        driver.setDestinationLongt(driver.p_origin_longt)
        send = 1
      }
      else if(driver.ride_status == 5) // DRIVER HAS ARRIVED
      {

        driver.setCurrentLat(driver.d_lat)
        driver.setCurrentLongt(driver.d_longt)
        driver.setDestinationLat(driver.p_destination_lat)
        driver.setDestinationLongt(driver.p_destination_longt)
        send = 1
      }
      else if(driver.ride_status == 6) // DRIVER END TRIP
      {
        driver.setCurrentLat(driver.d_lat)
        driver.setCurrentLongt(driver.d_longt)
        driver.setDestinationLat(driver.p_destination_lat)
        driver.setDestinationLongt(driver.p_destination_longt)

        send = 1
      }

      driver.setBearing(driver.bearing);
      if(send == 1 && targetClient != null)
        targetClient.socket.emit('driver_location', helpers.res(200, 'OK',  driver));


    }
}

module.exports = APISrvManager;
