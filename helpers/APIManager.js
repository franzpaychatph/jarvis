'use strict';

const request = require('request');
const helpers = require('../helpers/Helpers');
const config = require('../config/config');
const moment = require('moment');


class APIManager {
    constructor() {
        this.pc_users = [];
        this.pcb_users = [];
        this.partners = [];
        var _ = this;

        this.pc_user = {

            getByUaNumber: (ua_number, callback) => {
                var user = _.pc_users.filter((x) => { return x.ua_number == ua_number && moment().diff(moment(x.add_date), 'minutes') < 10; });
                let endpoint = '';
                if(user.length > 0) {
                    callback(helpers.res(200, 'Success', user[0]));
                    return;
                }

                endpoint = config.endpoints.hydra + '/v1/user/?ua_number=' + ua_number + '&action=1';
                if (ua_number.indexOf('@') > -1) // BACKOFFICE TO BACKOFFICE CHAT
                    endpoint = config.endpoints.hydra + '/v1/hm_user/?email=' + ua_number;

                request({
                    url: endpoint,
                    headers: {
                        'X-API-KEY' : config.keys.hydra,
                        'Content-Type' : 'multipart/form-data'
                    }
                }, (error, response, body) => {
                    if(!error) {
                        try {
                            var b = JSON.parse(body);
                            if(b.code == 200  && b.results.data != null) {
                                var user = b.results.data[0];
                                user.add_date = new Date();
                                _.pc_users.push(user);

                                if (ua_number.indexOf('@') > -1) // BACKOFFICE TO BACKOFFICE CHAT
                                  user.backoffice_chat = 1;

                                callback(helpers.res(200, 'Success', user));
                                return;
                            }

                            if(b.code == 200 || b.results.data == null) {
                                callback(helpers.res(404, 'Not found', user));
                                return
                            }
                        } catch(e) {
                            helpers.log(e);
                        }

                    }
                    //
                    callback(helpers.res(500, 'Error', null));
                    console.log('Hydra - Get User - Error - ', ua_number);
                    helpers.log(body);
                    helpers.log(error);
                });
            },

            getByUaNumberDriver: (ua_number, callback) => {

                console.log('getByUaNumberDriver');
                console.log('/v1/pc_ride_drivers/');

                var user = _.pc_users.filter((x) => { return x.ua_number == ua_number && moment().diff(moment(x.add_date), 'minutes') < 10; });
                if(user.length > 0) {
                    callback(helpers.res(200, 'Success', user[0]));
                    return;
                }

                request({
                    url: config.endpoints.hydra + '/v1/pc_ride_drivers/?ua_number=' + ua_number,
                    headers: {
                        'X-API-KEY' : config.keys.hydra,
                        'Content-Type' : 'multipart/form-data'
                    }
                }, (error, response, body) => {
                    // console.log(body);
                    if(!error) {
                        try {
                            var b = JSON.parse(body);
                            if(b.code == 200  && b.results.data != null) {
                                var user = b.results.data[0];
                                user.add_date = new Date();
                                _.pc_users.push(user);

                                callback(helpers.res(200, 'Success', user));
                                return;
                            }

                            if(b.code == 200 || b.results.data == null) {
                                callback(helpers.res(404, 'Not found', user));
                                return
                            }

                        } catch(e) {
                            helpers.log(e);
                        }

                    }

                    callback(helpers.res(500, 'Error', null));
                    console.log('Hydra - Get User - Error - ', ua_number);
                    helpers.log(body);
                    helpers.log(error);
                });
            },

            updateDriver: (data , callback) => {

                console.log('updateDriver');
                console.log('/v1/pc_ride_dispatch/');

                request.post({
                    url: config.endpoints.hydra + '/v1/pc_ride_dispatch',
                    headers: {
                        'X-API-KEY' : config.keys.hydra,
                        'Content-Type' : 'multipart/form-data'
                    },
                    form: {
                        'lat'             : data.d_lat,
                        'longt'           : data.d_longt,
                        'ua_number'       : data.driver_ua_number,
                        'driving_status'  : data.driving_status,
                        'driver_status'   : data.driver_status,
                        'bearing'         : data.bearing,
                        'extras'          : data.extras
                    }
                }, (error, response, body) => {
                    if(!error) {
                        try {
                            var b = JSON.parse(body);
                            if(b.code == 200) {
                              callback(helpers.res(200, 'Success' , b.results.data));
                              return;
                            }

                            if(b.code == 403 || b.code == 404) {
                              callback(helpers.res(404, 'Success'));
                              return;
                            }

                        } catch(e) {
                            helpers.log(body);
                        }
                    }

                    callback(helpers.res(500, 'Error', null));
                    console.log('Hydra - Error');
                    helpers.log(body);

                });
            }
        };

        this.pcb_user = {
            getByUaNumber: (pcb_id, ua_number, access_token, callback) => {
                var endpoint = '', api_key = '';

                var user = _.pcb_users.filter((x) => { return x.user_id == ua_number && moment().diff(moment(x.add_date), 'minutes') < 10; });

                if(user.length > 0) {
                    callback(helpers.res(200, 'Success', user[0]));
                    return;
                }


                if(pcb_id == 1) {
                    endpoint = config.endpoints.heimdall + '/v1/hm_user/get';
                    api_key = config.keys.heimdall;
                } else if (pcb_id > 1) {
                    endpoint = config.endpoints.hulk + '/v1/hk_users/get';
                    api_key = config.keys.hulk;
                } else {
                    endpoint = config.endpoints.hydra + '/v1/hm_user/get';
                    api_key = config.keys.hydra;
                }

                request.post({
                    url: endpoint,
                    headers: {
                        'X-API-KEY' : api_key,
                        'Content-Type' : 'multipart/form-data',
                        'Authorization' : 'Bearer ' + access_token
                    },
                    rejectUnauthorized: false,
                    form: {
                        'email': ua_number
                    }
                }, (error, response, body) => {

                    if(!error) {
                        try {
                            var b = JSON.parse(body);
                            if(b.code == 200  && b.results.data != null) {
                                var hm_user = null;
                                if ('items' in b.results.data) {
                                    hm_user = b.results.data.items.filter((x) => { return x.email == ua_number; });
                                    if (hm_user.length > 0) { hm_user = hm_user[0]; } else { hm_user = null; }
                                } else {
                                    hm_user = b.results.data.filter((x) => { return x.email == ua_number; })[0];
                                }

                                if(hm_user) {

                                    hm_user.add_date = new Date();
                                    _.pcb_users.push(hm_user);

                                    callback(helpers.res(200, 'Success', hm_user));
                                    return;
                                }
                            }

                            if (b.code == 403) {
                                callback(b);
                                return;
                            }
                        } catch(e) {

                            helpers.log(e);
                        }
                    }
                    callback(helpers.res(500, 'Error', null));
                    console.log('Hydra - Get PCB User - Error - ' + ua_number + ' - ' + endpoint);
                    helpers.log(body);
                    helpers.log(error);
                });
            },
            getByUaNumberPcbUser: (pcb_id, ua_number, access_token, callback) => {

                var endpoint = '', api_key = '';
                var user = _.pcb_users.filter((x) => { return x.user_id == ua_number && moment().diff(moment(x.add_date), 'minutes') < 10; });
                if(user.length > 0) {
                    callback(helpers.res(200, 'Success', user[0]));
                    return;
                }

                endpoint = config.endpoints.hulk + '/v1/hk_users/get';
                api_key = config.keys.hulk;


                request.post({
                    url: endpoint,
                    headers: {
                        'X-API-KEY' : api_key,
                        'Content-Type' : 'multipart/form-data',
                        'Authorization' : 'Bearer ' + access_token
                    },
                    rejectUnauthorized: false,
                    form: {
                        'ua_number': ua_number
                    }
                }, (error, response, body) => {

                    if(!error) {
                        try {
                            var b = JSON.parse(body);
                            if(b.code == 200  && b.results.data != null) {
                                var hk_user = null;
                                if ('items' in b.results.data) {
                                    hk_user = b.results.data.items.filter((x) => { return x.ua_number == ua_number; });
                                    if (hk_user.length > 0) { hk_user = hk_user[0]; } else { hk_user = null; }
                                } else {
                                    hk_user = b.results.data.filter((x) => { return x.ua_number == ua_number; })[0];
                                }

                                if(hk_user) {
                                    hk_user.add_date = new Date();
                                    _.pcb_users.push(hk_user);
                                    callback(helpers.res(200, 'Success', hk_user));
                                    return;
                                }
                            }

                            if (b.code == 403) {
                                callback(b);
                                return;
                            }
                        } catch(e) {

                            helpers.log(e);
                        }
                    }
                    callback(helpers.res(500, 'Error', null));
                    console.log('Hydra - Get PCB User - Error - ' + ua_number + ' - ' + endpoint);
                    helpers.log(body);
                    helpers.log(error);


                });
            }
        },

        this.pc_ride = {

            vehicleList: (data , callback) => {

              console.log('vehicleList');
              console.log('/v1/pc_ride_dispatch/');
              request({
                url: config.endpoints.hydra + '/v1/pc_ride_dispatch/?p_origin_lat=' + data.p_origin_lat + '&p_origin_longt=' + data.p_origin_longt + '&action=7',
                headers: {
                    'X-API-KEY' : config.keys.hydra,
                    'Content-Type' : 'multipart/form-data'
                }
              }, (error, response, body) => {
                  // console.log(body);
                  if(!error) {
                      try {
                          var b = JSON.parse(body);
                          if(b.code == 200) {
                            callback(helpers.res(200, 'Success' , b.results.data));
                            return;
                          }

                          if(b.code == 403 || b.code == 404) {
                            callback(helpers.res(404, 'Success'));
                            return;
                          }

                      } catch(e) {
                          helpers.log(body);
                      }
                  }

                  callback(helpers.res(500, 'Error', null));
                  console.log('Hydra - Error');
                  helpers.log(body);

              });


            },

            vehicleLocationList: (data , callback) => {

              console.log('vehicleLocationList');
              console.log('/v1/pc_ride_dispatch/');
              request({
                url: config.endpoints.hydra + '/v1/pc_ride_dispatch/?requesting_list=' + JSON.stringify(data) + '&action=8',
                headers: {
                    'X-API-KEY' : config.keys.hydra,
                    'Content-Type' : 'multipart/form-data'
                }
              }, (error, response, body) => {
                  // console.log(body);
                  if(!error) {
                      try {
                          var b = JSON.parse(body);
                          if(b.code == 200) {
                            callback(helpers.res(200, 'Success' , b.results.data));
                            return;
                          }

                          if(b.code == 403 || b.code == 404) {
                            callback(helpers.res(404, 'Success'));
                            return;
                          }

                      } catch(e) {
                          helpers.log(body);
                      }
                  }

                  callback(helpers.res(500, 'Error', null));
                  console.log('Hydra - Error');
                  helpers.log(body);

              });


            }

        },

        this.partner = {
            getByUaNumber: (ua_number, callback) => {
                var p = _.partners.filter((x) => { return x.ua_number == ua_number && moment().diff(moment(x.add_date), 'minutes') < 10; });

                if(p.length > 0) {
                    callback(helpers.res(200, 'Success', p[0]));
                    return;
                }

                request({
                    url: config.endpoints.hydra + '/v1/partner/?ua_number=' + ua_number + "&with_pcb_users=1",
                    headers: {
                        'X-API-KEY' : config.keys.hydra,
                        'Content-Type' : 'multipart/form-data'
                    }
                }, (error, response, body) => {
                    if(!error) {
                        try {
                            var b = JSON.parse(body);


                            if(b.code == 200  && b.results.data != null) {
                                var p =b.results.data[0].services[0];
                                p.add_date = new Date();
                                _.partners.push(p);
                                callback(helpers.res(200, 'Success', p));
                                return;
                            }
                        } catch(e) {
                            helpers.log(e);
                        }
                    }
                    callback(helpers.res(500, 'Error', null));
                    console.log('Hydra - Get Partner - Error');
                    helpers.log(body);
                    helpers.log(error);
                });


            },
            createTicket: (chat_message) => {
                var tag = chat_message.extras.tag == null ? 1 : chat_message.extras.tag;
                if (tag == 0) {
                    tag = 2;
                }
                request.post({
                    url: config.endpoints.hydra + '/v1/hm_ticketing',
                    headers: {
                        'X-API-KEY' : config.keys.hydra,
                        'Content-Type' : 'multipart/form-data'
                    },
                    form: {
                        'ua_number': chat_message.source,
                        'pcb_ua_number' : chat_message.destination,
                        'inquiry_type': tag
                    }
                }, (error, response, body) => {

                    if(!error) {
                        try {
                            var b = JSON.parse(body);
                            switch(b.code) {
                            case 200:
                                console.log('Ticket created');
                                return;
                            default:
                                helpers.log(b);
                            }

                        } catch(e) {

                            helpers.log(e);
                        }
                    }
                    console.log('Odin - Add ticket - Error');
                    helpers.log(body);
                    helpers.log(error);
                });
            }
        };

        this.transaction = {

            updateTransaction: (data , callback) => {

                  console.log('updateTransaction');
                  console.log('/v1/transaction/transaction_ref_no/');

                  request.put({
                      url: config.endpoints.hydra + '/v1/transaction/transaction_ref_no/' + data.extras.transaction_ref_no,
                      headers: {
                          'X-API-KEY' : config.keys.hydra,
                          'Content-Type' : 'application/x-www-form-urlencoded'
                      },
                      form: {
                          'ride_status' : data.ride_status
                      }
                  }, (error, response, body) => {
                      console.log(body);
                      if(!error) {
                          try {
                              var b = JSON.parse(body);
                              if(b.code == 200) {
                                callback(helpers.res(200, 'Success' , b.results.data));
                                return;
                              }

                              if(b.code == 403 || b.code == 404) {
                                callback(helpers.res(404, 'Success'));
                                return;
                              }

                          } catch(e) {
                              helpers.log(body);
                          }
                      }

                      callback(helpers.res(500, 'Error', null));
                      console.log('Hydra - Error');
                      helpers.log(body);

                  });
            },

            getTransaction: (data , callback) => {

              console.log('getTransaction');
              console.log('/v1/transaction/transaction_ref_no/');
              var types = [ 20 , 22 ]; // RIDE NOW , RIDE LATER
              request({
                  url: config.endpoints.hydra + '/v1/transaction/?get_transaction_history=3&transaction_ref_no='+ data.transaction_ref_no +'&include_transaction_type_id=' + types,
                  headers: {
                      'X-API-KEY' : config.keys.hydra,
                      'Content-Type' : 'multipart/form-data'
                  }
              }, (error, response, body) => {

                  if(!error) {
                      try {
                          var b = JSON.parse(body);

                          if(b.code == 200 && b.results.data != null) {
                              callback(helpers.res(200, 'Success' , b.results.data));
                              return
                          }
                          callback(helpers.res(404, 'Transaction Not found', null));
                      } catch(e) {
                          callback(helpers.res(404, 'Transaction Not found', null));
                      }

                  }

                  callback(helpers.res(500, 'Error', null));
                  // console.log('Hydra - Get User - Error - ', ua_number);
                  helpers.log(body);
                  helpers.log(error);
              });
            }
        };

        this.notifications = {
            send: (payload, callback) => {
                request.post({
                    url: config.endpoints.hydra + '/v1/send_notification',
                    headers: {
                        'X-API-KEY' : config.keys.hydra,
                        'Content-Type' : 'multipart/form-data'
                    },
                    form: payload
                }, (error, response, body) => {
                    if(!error) {
                        try {
                            var b = JSON.parse(body);
                            if(b.code == 200 || b.code == 404) {
                                callback(b);
                                return;
                            }

                        } catch(e) {
                            helpers.log(body);
                        }
                    }
                    callback(helpers.res(500, 'Error', null));
                    console.log('Hydra - Notify - Error');
                    helpers.log(body);
                });
            }
        };

        this.anonymousChat = {
            getToken: (client, callback) => {
                request.post({
                    url: config.endpoints.hydra + '/v1/client_auth',
                    headers: {
                        'X-API-KEY' : 'qzj81ZtFz327p818q2bJ4O379cR83xI270c9sZdz', //TODO: REMOVE KEY config.keys.hydra,
                        'Content-Type' : 'multipart/form-data',
                        'Authorization' : 'Basic ' + client.access_token
                    },
                    form: {
                        'ua_number' : client.pcb_ua_number,
                        'identity' : client.ua_number
                    }
                }, (error, response, body) => {
                    if(!error) {
                        try {
                            var b = JSON.parse(body);
                            if(b.code == 200) {
                                callback(b);
                                return;
                            }

                            if(b.code == 403) {
                                callback(b);
                                return;
                            }
                        } catch(e) {
                            helpers.log(body);
                        }
                    }
                    callback(helpers.res(500, 'Error', null));
                    console.log('Hydra - Anon Auth - Error');
                    helpers.log(body);
                });

            }
        }
    }



}

module.exports = APIManager;
