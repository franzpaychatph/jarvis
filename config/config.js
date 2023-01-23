var config = {
    instance_name: 'PCNODEWEBO1',
    port: 8001,
    port_api: 1900,
    jobs: {
        delayed_message: true
    },
    certs: {
        cert: './ssl/paychatph.crt',
        key: './ssl/paychatph.key',
        root: './ssl/cf_root.pem'
    },
    database: {
        main: {
            host     : 'localhost',
            user     : 'root',
            password : '',
            database : 'paychat-jarvis',
            charset  : 'utf8mb4'
        },
        odin: {
            host     : '192.168.2.108',
            user     : 'root',
            password : 'Pa$$w0rd1paydb',
            database : 'paychat-api'
        },
        heimdall: {
            host     : '192.168.2.108',
            user     : 'root',
            password : 'Pa$$w0rd1paydb',
            database : 'heimdall'
        },
        hulk: {
            host     : '192.168.2.108',
            user     : 'root',
            password : 'Pa$$w0rd1paydb',
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

