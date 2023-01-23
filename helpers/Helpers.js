module.exports.res = (code, message, data) => {
    return {
        code: code, 
        results: {
            message: message,
            data: data
        }
    };
};
const util = require('util');
const crypto = require('crypto');

module.exports.log = (obj) => {
    console.log(util.inspect(obj, false, null, true));
};

module.exports.rand = (len) => {
    return crypto.randomBytes(Math.ceil(len/2))
        .toString('hex') // convert to hexadecimal format
        .slice(0,len).toUpperCase();
};

module.exports.extend = (target, source) => {
    target = target || {};
    for (var prop in source) {
        if (typeof source[prop] === 'object') {
            target[prop] = module.exports.extend(target[prop], source[prop]);
        } else {
            target[prop] = source[prop];
        }
    }
    return target;
};