module.exports.adminProductStatus = function(status) {
    if (
        status === 2 ||
        status === 5 ||
        status === 6 ||
        status === 7 ||
        status === 8 ||
        status === 9 ||
        status === 10 ||
        status === 11
    ) {
        return status;
    } else if(status === 3) {
        return 34
    }else {
            return 2;
        }
};

module.exports.adminRequestStatus = function(status) {
    if (
        status === 1 ||
        status === 2 ||
        status === 3 ||
        status === 13 ||
        status === 9 ||
        status === 11
    ) {
        return status
    }else {
        return 1;
    }
};

module.exports.userRequestStatus = function(status) {
    if (
        status === 1 ||
        status === 2 ||
        status === 5 ||
        status === 6 ||
        status === 7 ||
        status === 8 ||
        status === 13
    ) {
        return status
    }else if(status === 3) {
        return 34
    }else if(status === 9) {
        return 91415
    }else if(status === 10) {
        return 1011
    }else {
        return 1;
    }
};



module.exports.userWinOrderList = function(status) {
    if (
        status === 4 ||
        status === 567 ||
        status === 8 ||
        status === 11
    ) {
        return status
    }else if(status === 9) {
        return 91415
    }else {
        return 4;
    }
};
 module.exports.sortObject = function (obj) {
    let sorted = {};
    let str = [];
    let key;
    for (key in obj){
        if (obj.hasOwnProperty(key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}

