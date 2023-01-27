require('dotenv').config();

var config = {
    instance_name: process.env.instance_name,
    port: process.env.PORT || 8443,
    port_api: 8889,
    jobs: {
        delayed_message: true
    },
    certs: {
        cert: '/home/ec2-user/paychatph.crt',
        key: '/home/ec2-user/paychatph.key',
        root: '/home/ec2-user/cf_root.pem'
    },
    database: {
        main: {
            // host     : process.env.mysql_host,
            // user     : process.env.mysql_user,
            // password : '',
            // database : process.env.mysql_database,
            // charset  : 'utf8mb4'
            port : 3306, 
            // connectTimeout: 30000,
            host : '192.168.2.108',
            user : 'ec2-user',
            password : 'ZBbnjLLVdYCvJLPB',
            database : 'paychat-jarvis',
            charset: 'utf8mb4'
        },
        odin: {
            port : 3306, 
            // connectTimeout: 30000,
            host : '192.168.2.108',
            user : 'ec2-user',
            password : 'ZBbnjLLVdYCvJLPB',
            database : 'paychat-api'
        },
        heimdall: {
            port : 3306, 
            // connectTimeout: 30000,
            host : '192.168.2.108',
            user : 'ec2-user',
            password : 'ZBbnjLLVdYCvJLPB',
            database : 'heimdall'
        },
        hulk: {
            port : 3306, 
            // connectTimeout: 30000,
            host : '192.168.2.108',
            user : 'ec2-user',
            password : 'ZBbnjLLVdYCvJLPB',
            database : 'heimdall'
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

