'use strict';

const helpers = require('../helpers/Helpers');
const AuthObject = require('../models/AuthObject');
const moment = require('moment');

class AuthenticationManager {

    authorize(client, callback) {
        var _ = this;
        var c = new AuthObject(client);
        switch(c.client_type) {
        case 1:
            global.apiManager.pc_user.getByUaNumber(c.ua_number, (user_result) => {
                if(user_result.code == 200 && user_result.results.data) {
                    global.databaseManager.tokens.get(
                        'PC',
                        c.access_token,
                        user_result.results.data.user_id,
                        (res2) => {
                            _.setTokenResult(res2, c, user_result.results.data, callback); }
                    );

                } else {
                    console.trace("Error on user " + c.ua_number);
                    callback(helpers.res(404, 'No User found', null));
                }
            });
        break;
        case 2:

            if(c.pcb_id == 1)
            {
              global.apiManager.pcb_user.getByUaNumber(c.pcb_id, c.ua_number, c.access_token, (user_result) => {
                  if(user_result.code == 200 && user_result.results.data) {
                      global.databaseManager.tokens.get(
                          c.pcb_id == 1 ? 'PCBO' : 'PCB',
                          c.access_token,
                          user_result.results.data.user_id,
                          (res2) => { _.setTokenResult(res2, c, user_result.results.data, callback); }
                      );
                  } else {
                      callback(helpers.res(500, 'Error', null));
                  }
              });
            }
            else
            {
              global.apiManager.pcb_user.getByUaNumberPcbUser(c.pcb_id, c.ua_number, c.access_token, (user_result) => {
                  if(user_result.code == 200 && user_result.results.data) {
                      global.databaseManager.tokens.get(
                          'PCB',
                          c.access_token,
                          user_result.results.data.user_id,
                          (res2) => { _.setTokenResult(res2, c, user_result.results.data, callback); }
                      );

                  } else {
                      callback(helpers.res(500, 'Error', null));
                  }
              });
            }

        break;
        case 5:


            // MUST KYC VERIFIED AND IN USER SUBSCRIPTION FOR RIDE/TNVS
            global.apiManager.pc_user.getByUaNumberDriver(c.ua_number, (user_result) => {
                if(user_result.code == 200 && user_result.results.data) {

                    global.databaseManager.tokens.get(
                        'PC',
                        c.access_token,
                        user_result.results.data.user_id,
                        (res2) => {
                            _.setTokenResult(res2, c, user_result.results.data, callback); }
                    );

                } else {
                    callback(helpers.res(404, 'No User found', null));
                }
            });

        break;

        }
    }

    authorizeAnon(client, callback) {
        var _ = this;
        global.apiManager.anonymousChat.getToken(client, (result) => {
            callback(result, callback);
        });
    }

    setTokenResult(token_result, client, user, callback) {
        if(token_result.code == 200 && token_result.results.data) {
            if(token_result.results.data.length > 0) {
                var token = token_result.results.data[0];
                //TODO: Return 403 if token is expired!

                if(moment().diff(moment(token.expires), 'days') > 1) {
                    callback(helpers.res(403, 'Token Expired', {
                        message: 'Access token is expired'
                    }));
                } else {
                    callback(helpers.res(200, 'Success', {
                        client_id: token.user_id,
                        expires_in: token.expires,
                        pcb_id: client.pcb_id,
                        client_type: client.client_type,
                        access_token: client.access_token,
                        ua_number: client.ua_number,
                        pcb_ua_number: user.pcb_ua_number
                    }));
                }
                return;
            } else {
                callback(helpers.res(403, 'No token Found', {
                    message: 'No token Found'
                }));
                return;
            }
        }
        callback(helpers.res(500, 'Error', null));
    }
}

module.exports = AuthenticationManager;
