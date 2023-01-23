'use strict';

var dgram = require('dgram');

class ClusterManager {
    constructor(cluster_io, instance_id) {
        this.server = [];
        this.instance_id = instance_id;
        this.cluster_io_connection = cluster_io;
        this.listen();
    }

    listen() {
        var _ = this;

        // UDP Broadcaster / Listener --------------------
        var server = dgram.createSocket('udp4');
        server.on('message', (msg, rinfo) => {
            console.log(msg);
        });
        server.on('listening', () => {
            console.log('Cluster manager listening');
        });
        server.bind(9091);

        //FRANZ
        // setInterval(() => {
        //     server.setBroadcast(true);
        //     var msg = new Buffer('PCNODELOOKUP_' + _.instance_id);
        //     server.send(msg, 0, msg.length, 9091, '10.0.2.255');
        // }, 3000);


        //FRANZ
        // _.cluster_io_connection.on('connect', (socket) => {
            // var authTimeOut = setTimeout(() => {
            //     socket.disconnect();
            //     console.log('Client auth timeout, disconnected');
            // }, 15000);

            // socket.on('auth', (data) => this.authenticateChatNode(socket, data, ()=> { 
            //     clearTimeout(authTimeOut);
            // }));
        // });

    }

    //FRANZ
    // authenticateChatNode(socket, data, callback) {
    //     callback();

    // }


}

module.exports = ClusterManager;