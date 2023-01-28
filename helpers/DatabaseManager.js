'use strict';


const helpers = require('../helpers/Helpers');
const mysql = require('mysql2');
const config = require('../config/config');
const ChatMessage = require('../models/ChatMessage');
const Client = require('../models/Client');
const Conversation = require('../models/Conversation');
const moment = require('moment');

class DatabaseManager {
    constructor() {
        var _ = this;
        this.connString = config.database;
        this.conns = {
            main: mysql.createPool(_.connString.main),
            odin: mysql.createPool(_.connString.odin),
            hulk: mysql.createPool(_.connString.hulk),
            heimdall: mysql.createPool(_.connString.heimdall)
        };
        this.users = {


        };

        this.tokens = {
            get: (db, client_token, user_id, callback) => {
                var connStr = null;
                switch(db) {
                case 'PC':
                    connStr = _.conns.odin;
                    break;
                case 'PCBO':
                    connStr = _.conns.heimdall;
                    break;
                case 'PCB':
                    connStr = _.conns.hulk;
                    break;
                }
                var q = {
                    q: 'SELECT * FROM access_tokens WHERE access_token = ? and user_id = ? and is_valid = 1',
                    p: [ client_token, user_id ]
                };

                _.query(
                    connStr,
                    q,
                    callback);
            },
            getClients: (user_id, callback) => {
                _.query(
                    _.conns.odin,
                    {
                        q: 'SELECT client_id from access_tokens WHERE user_id = ? GROUP BY client_id',
                        p: [ user_id ]
                    },
                    callback
                );
            }
        };

        this.users = {
            get: (pcb_id, ua_number, callback) => {
                var connStr = null;
                if(pcb_id == 1) {
                    connStr = _.conns.heimdall;
                } else {
                    connStr = _.conns.main;
                }

                _.query(
                    connStr,
                    {
                        q: 'SELECT * FROM backoffice_user WHERE email = ? is_active = 1',
                        p: [ ua_number ]
                    },
                    callback);
            },
            getLastLogin: (ua_number, callback) => {
                _.query(
                    _.conns.main,
                    {
                        q: 'SELECT * FROM user_last_login where ua_number = ?',
                        p: [ ua_number ]
                    }, callback);
            },
            setLastLogin: (ua_number) => {
                _.users.getLastLogin(ua_number, (result) => {
                    if(result.code == 200) {
                        if(result.results.data.length == 0) {
                            _.query(
                                _.conns.main,
                                {
                                    q: 'INSERT INTO user_last_login(ua_number, timestamp) VALUES(?, ?)',
                                    p: [ ua_number, new Date() ]
                                }, null);
                        } else {
                            _.query(
                                _.conns.main,
                                {
                                    q: 'UPDATE user_last_login SET timestamp = ? WHERE ua_number = ?',
                                    p: [ new Date(), ua_number ]
                                }, null);
                        }
                    }
                });
            }
        };

        this.chat_groups = {
            getMembers: (jid, callback) => {
                _.query(
                    _.conns.main,
                    {
                        q: 'SELECT B.* FROM chat_groups A JOIN chat_users B ON A.id = B.group_id WHERE A.group_id = ? AND B.is_active = 1',
                        p: [ jid ]
                    },
                    callback
                );
            },
            getByJid: (jid, callback) => {
                _.query(
                    _.conns.main,
                    {
                        q: 'SELECT * FROM chat_groups WHERE group_id = ?',
                        p: [ jid ]
                    },
                    callback
                );
            }
        };

        this.messages = {
            getOffline: (ua_number, callback) => {
                _.query(
                    _.conns.main,
                    {
                        q: `SELECT *, CASE WHEN pcb_id > 0 THEN 1 ELSE 0 END AS is_pcb
                            FROM chat_messages_offline
                            WHERE
                                extra_type <> 1 AND
                                ((destination = ? AND chat_type <> 10) OR
                                (source = ? and chat_type = 10))
                            ORDER BY date_created`,
                        p: [ ua_number, ua_number ]
                    },
                    callback
                );
            },
            get: (client, source, callback) => {
                var c = new Client(client);

                _.query(
                    _.conns.main,
                    {
                        q: 'SELECT * FROM chat_messages WHERE (source = ? OR destination = ?) AND pcb_id = ? ORDER BY date_created ASC',
                        p: [ source, source, c.pcb_id ]
                    },
                    callback
                );
            },
            getPcbToPcb: (client, source, callback) => {
                var c = new Client(client);

                _.query(
                    _.conns.main,
                    {
                        q: 'SELECT * FROM chat_messages WHERE (source = ? OR destination = ?) AND (chat_type = 0 OR chat_type = 58 OR chat_type = 62) AND pcb_id = ? ORDER BY date_created ASC',
                        p: [ source, source, c.pcb_id ]
                    },
                    callback
                );
            },
            get_backoffice_chat: (data , callback) => {
                // var c = new Client(client);

                _.query(
                    _.conns.main,
                    {
                        q: 'SELECT * FROM chat_messages WHERE ((source = ? AND destination = ?) OR (destination = ? AND source = ?)) AND client_type = ? ORDER BY date_created ASC',
                        p: [ data.source, data.destination, data.source, data.destination , 5]
                    },
                    callback
                );
            },
            add: (message, client, callback) => {
                var chat = new ChatMessage(message);
                _.conversations.add(chat, client, (res) => {
                    if(res.code == 500) {
                        console.log('Error adding conversation!');
                        return;
                    }
                    _.query(
                        _.conns.main,
                        {
                            q: `INSERT INTO chat_messages(message_id, source, destination, message, date_created, chat_type, client_type, extras, pcb_id, is_pcb, is_incoming, extra_type)
                            VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
                            p: [ chat.message_id, chat.source, chat.destination, chat.message, chat.date_created, chat.chat_type, chat.client_type, JSON.stringify(chat.extras), chat.pcb_id, chat.is_pcb || 0,  chat.is_incoming, chat.extra_type ]
                        },
                        callback
                    );
                });
            },
            addOffline: (message) => {
                var chat = new ChatMessage(message);
                if(chat.source == null) return;

                if ('retry' in message) {
                    if (message.retry > 5) {
                        console.log('Offline message insert has too many retries');
                        return;
                    }
                }

                _.query(
                    _.conns.main,
                    {
                        q: 'INSERT INTO chat_messages_offline(message_id, source, destination, message, date_created, chat_type, client_type, extras, pcb_id, extra_type)  VALUES(?,?,?,?,?,?,?,?,?,?)',
                        p: [ chat.message_id, chat.source, chat.destination, chat.message, chat.date_created, chat.chat_type, chat.client_type, JSON.stringify(chat.extras), chat.pcb_id, chat.extra_type ]
                    },
                    null
                );
            },
            removeOffline: (ua_number, last_chat_date) => {
                _.query(
                    _.conns.main,
                    {
                        q: `DELETE FROM chat_messages_offline
                            WHERE date_created <= ? AND
                            (destination = ? AND chat_type != 10) OR
                            (source = ? and chat_type = 10)`,
                        p: [ last_chat_date, ua_number, ua_number ]
                    },
                    null
                );
            },
            sendDelayedMsg: (message_id, destination, callback) => {
                _.query(
                    _.conns.main,
                    {
                        q: 'SELECT *, CASE WHEN pcb_id > 0 THEN 1 ELSE 0 END AS is_pcb FROM chat_messages_offline WHERE extra_type = 1 AND message_id = ? AND destination = ?',
                        p: [ message_id, destination ]
                    },
                    (res) => {
                        if (res.code == 200) {
                            var chat_message = res.results.data[0];

                            if (chat_message) {
                                _.messages.deleteMessage(message_id, destination, (res) => {
                                    callback(helpers.res(200, '', chat_message));
                                    console.log('Sending now...' + message_id);
                                });
                                return;
                            }
                        }

                        helpers.res(404,'',null);
                    }
                );
            },

            deleteMessage: (message_id, destination, callback) => {
                _.query(_.conns.main, {
                    q: 'DELETE FROM chat_messages_offline WHERE message_id = ? AND destination = ?',
                    p: [ message_id, destination ]
                }, callback);
            },
            getDelayedMessages: (callback) => {
                _.query(_.conns.main, {
                    q: 'SELECT *, CASE WHEN pcb_id > 0 THEN 1 ELSE 0 END AS is_pcb  FROM chat_messages_offline WHERE extra_type = 1 AND date_created  BETWEEN ? - INTERVAL 10 MINUTE AND ? + INTERVAL 10 MINUTE',
                    p: [ moment().toDate(), moment().toDate() ]
                }, (res) => {
                    _.query(_.conns.main, {
                        q: 'DELETE FROM chat_messages_offline WHERE extra_type = 1 AND date_created  BETWEEN ? - INTERVAL 10 MINUTE AND ? + INTERVAL 10 MINUTE',
                        p: [ moment().toDate(), moment().toDate() ]
                    }, null);
                    callback(res);
                });



            },
            setSeen: (source, destination, date_created) => {
                _.query(_.conns.main, {
                    q: 'UPDATE chat_messages_offline SET is_seen = 1 WHERE source = ? AND destination = ? AND date_created < ?',
                    p: [ source, destination, date_created ]
                }, null);
            },
            getUnseenCount: (destination, callback) => {
                _.query(_.conns.main, {
                    q: 'SELECT COUNT(1) as total FROM chat_messages_offline WHERE destination = ? AND extra_type <> 1 AND (chat_type NOT IN (9,10,11)) AND is_seen IS NULL AND date_created < ?',
                    p: [ destination, new Date() ]
                }, callback);
            }
        };

        this.conversations = {
            get: (pcb_id, status, callback) => {
                switch(status) {
                case 1:
                    status = 'status IN (1,2)';
                    break;
                case 2:
                    status = 'status IN (1,2,3)';
                    break;
                }
                _.query(
                    _.conns.main,
                    {
                        q: 'SELECT * FROM pcb_chat_conversations WHERE pcb_id = ? AND ' + status + ' ORDER BY last_message DESC',
                        p: [ pcb_id ]
                    },
                    callback
                );
            },
            get_backoffice_users: (ua_number, callback) => {
                _.query(
                    _.conns.main,
                    {
                        q: 'SELECT * FROM chat_messages WHERE (client_type = ? AND destination = ?) AND ( message_status = ? OR message_status = ?  ) AND chat_type = ? ORDER BY date_created DESC',
                        p: [ 5 ,  ua_number , 1 , 2 , 0]
                    },
                    callback
                );
            },
            add: (message, client, callback) => {
                var msg_client = new Client(client);
                var source = message.client_type === 2 ? message.source : message.destination;
                var query = {
                    q: 'SELECT * FROM pcb_chat_conversations WHERE pcb_id = ? AND source = ? ORDER BY last_message DESC',
                    p: [ message.pcb_id, source ]
                };

                //add new message to a conversation, create a conversation if there is none
                _.query(
                    _.conns.main,
                    query,
                    (result) => {
                        if(result.code == 200) {
                            if(result.results.data.length == 0) {
                                _.query(_.conns.main,
                                    {
                                        q: 'INSERT INTO pcb_chat_conversations(pcb_id, source, is_pc_user, status, pcb_user_id, last_message) VALUES(?,?,?,?,?,?)',
                                        p: [message.pcb_id, source, msg_client.client_type ? 1 : 0, 1, 0, message.date_created ]
                                    }, callback);

                            } else {
                                var conv = result.results.data[0];
                                _.query(_.conns.main,
                                    {
                                        q: 'UPDATE pcb_chat_conversations SET last_message = ? WHERE id = ?',
                                        p: [message.date_created, conv.id ]
                                    }, callback);
                            }


                        }
                    }
                );

            },
            setRead: (pcb_id, source) => {
                _.query(
                    _.conns.main,
                    {
                        q: 'UPDATE pcb_chat_conversations SET last_read = NOW() WHERE pcb_id = ? AND source = ?',
                        p: [ pcb_id, source]
                    },
                    null
                );
            },
            setSeen: (messages_ids) => {
                _.query(
                    _.conns.main,
                    {
                        q: 'UPDATE chat_messages SET message_status = 3 WHERE message_id IN ' + messages_ids ,
                        p: [ messages_ids ]
                    },
                    null
                );
            },
            setSeenPcb: (destination) => {
                _.query(
                    _.conns.main,
                    {
                        q: 'UPDATE chat_messages SET message_status = 3 WHERE (message_status = 2 || message_status = 1) AND source = ?',
                        p: [ destination ]
                    },
                    null
                );
            },
            setDelivered: (ua_number) => {
                _.query(
                    _.conns.main,
                    {
                        q: 'UPDATE chat_messages SET message_status = 2 WHERE destination = ? AND  message_status = 1',
                        p: [ ua_number ]
                    },
                    null
                );
            },
            getSent: (ua_number, callback) => {
                _.query(
                    _.conns.main,
                    {
                        q: 'SELECT * FROM chat_messages WHERE destination = ? AND message_status = 1',
                        p: [ ua_number ]
                    },
                    callback
                );
            },
            setMessageIdToDelivered: (message_id) => {
                _.query(
                    _.conns.main,
                    {
                        q: 'UPDATE chat_messages SET message_status = 2 WHERE message_id = ?' ,
                        p: [ message_id ]
                    },
                    null
                );
            }
        };
    }

    query(pool, query, callback) {

        pool.query(query.q, query.p, (err, rows, fields) => {
            if (err) {
                console.log(err);
                if(callback)
                    callback(helpers.res(500, '', null));
            } else {
                // helpers.log(query);
                // helpers.log(rows);
                if(callback)
                    callback(helpers.res(200, '', rows));
            }
        });

    }


}

module.exports = DatabaseManager;
