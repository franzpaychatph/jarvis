require('dotenv').config();

var config = {
    instance_name: 'pc_sockets',
    port: process.env.PORT || 8443,
    port_api: 8080,
    jobs: {
        delayed_message: true
    },
    certs: {
        cert: '/home/ec2-user/paychatph.crt',
        key: '/home/ec2-user/paychatph.key',
        root: '/home/ec2-user/cf_root_j.pem'
    },
    database: {
        main: {
            host     : 'localhost',
            user     : 'root',
            password : 'ZBbnjLLVdYCvJLPB',
            database : 'paychat-jarvis',
            charset : 'utf8mb4'
        },
        odin: {
            host     : 'localhost',
            user     : 'root',
            password : 'ZBbnjLLVdYCvJLPB',
            database : 'paychat-api-debbie'
        },
        heimdall: {
            host     : 'localhost',
            user     : 'root',
            password : 'ZBbnjLLVdYCvJLPB',
            database : 'heimdall'
        },
        hulk: {
            host     : 'localhost',
            user     : 'root',
            password : 'ZBbnjLLVdYCvJLPB',
            database : 'hulk'
        }
    },
    endpoints: {
        hydra: 'http://192.168.2.107/webroot/hydra',
        heimdall: 'http://192.168.2.107/webroot/heimdall',
        hulk: '',
        odin: ''
    },
    keys: {
        hydra: '7Asj2uGAUFhuMHSG7itkzldHXPAfRd8u',
        heimdall: '9ccb9cd8-820d-46ab-936c-c2b03d290312',
        hulk: '',
        odin: '9ccb9cd8-820d-46ab-936c-c2b03d290312'
    },
    third_party: {
        pushwoosh: {
            cliend_id: '',
            client_secret: ''
        }
    }
};

module.exports = config;

