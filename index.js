// const config = require('./config/config');
// const express = require('express')
// const app = express()
// const port = config.port || 3000;
// const mysql = require('mysql');

// app.get('/', (req, res) => {
//   res.send('PC node server.')
// })

// app.listen(port, () => {
//   console.log(`Example app listening on port ${port}`)
// })



const express = require('express');
const ChatManager = require('./helpers/ChatManager');
const AuthenticationManager = require('./helpers/AuthenticationManager');
const ClientManager = require('./helpers/ClientManager');
const DatabaseManager = require('./helpers/DatabaseManager');
// const ClusterManager = require('./helpers/ClusterManager');
const ApiManager = require('./helpers/APIManager');
const NotificationManager = require('./helpers/NotificationManager');
const PartnerManager = require('./helpers/PartnerManager');
const APISrvManager = require('./helpers/APISrvManager');
//FRANZ
// const https = require('https');
const socket = require('socket.io');
const config = require('./config/config');
const { instrument } = require('@socket.io/admin-ui');
var fs = require( 'fs' );
//FRANZ
// var sslRootCAs = require('ssl-root-cas');

var chat_srv_app = express();

//FRANZ
// sslRootCAs.inject();
var io = null;

// // Configure Chat Server Instance ------------------
// if(config.port == 443 || config.port == 2053) {
//     sslRootCAs.inject().addFile(config.certs.root);
//     var chat_server = https.createServer({
//         key: fs.readFileSync(config.certs.key),
//         cert: fs.readFileSync(config.certs.cert),
//         requestCert: false,
//         rejectUnauthorized: false
//     }, chat_srv_app);
//     chat_server.listen(config.port);
//     io = socket.listen(chat_server);
//     console.log('Listening...');
// } else {
    var chat_server_unsecured = chat_srv_app.listen(config.port, () => {
    });      
    io = socket(chat_server_unsecured, {
        allowEIO3: true,
        cors: {
          origin: ['https://admin.socket.io', 'http://localhost', 'http://localhost:3000', 'https://chatserver.paychat.ph'],
          credentials: true
        }
    });
    console.log('Listening (unsecured)...');
// }

//FRANZ
// // Configure Cluster Server instance --------------
// var cluster_srv_app = express();
// var cluster_server = cluster_srv_app.listen(1400, () => {
//     console.log('Cluster Listener started...');
// });
// var cluster_io = socket(cluster_server, {
//     allowEIO3: true,
//     cors: {
//       origin: ['https://admin.socket.io', 'http://localhost', 'http://localhost:3000', 'https://chatserver.paychat.ph'],
//       credentials: true
//     }
// });

// Configure API Server Instance
var api_srv_app = express();





// Instantiate classes ----------------
//FRANZ
// global.clusterManager = new ClusterManager(cluster_io, config.instance_name);
global.authenticationManager = new AuthenticationManager();
global.clientManager = new ClientManager();
global.databaseManager = new DatabaseManager();
global.apiManager = new ApiManager();
global.notificationManager = new NotificationManager();
global.partnerManager = new PartnerManager();
global.chatMgr = new ChatManager(io);
global.apiSrvManager = new APISrvManager(api_srv_app);


//socket.io admin ui
instrument(io, {
    auth: { 
        type: "basic",
        username: "admin",
        password: "$2a$12$KbnptH8FvukPFrVUb1FjZOH7boLLicf/trhKwNdti1DGGaA/f8wr2" // "$$Paychat123!" encrypted with bcrypt
    },
});

