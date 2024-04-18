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

module.exports.createTitleWinner = function(status ) {
    if (
        status === 6
    ) {
        return `Xác nhận đơn hàng`
    }else if(status === 7) {
        return `Đơn hàng đang giao`
    }else if(status === 8) {
        return `Đơn hàng giao thành công`
    }else return ''
};
module.exports.createTitleSeller = function(status ) {
    if (
        status === 8
    ) {
        return `Hoàn thành đơn hàng`
    }else return ''
};


module.exports.createContentWinner = function(status , productId ) {
    if (
        status === 6
    ) {
        return `Đơn hàng #${productId} của bạn đã được xác nhận bởi người bán`
    }else if(status === 7) {
        return `Đơn hàng #${productId} của bạn đang được giao`
    }else if(status === 8) {
        return `Đơn hàng #${productId} của bạn đã giao thành công`
    }else return ''
};
module.exports.createContentSeller = function(status , productId ) {
    if (
        status === 8
    ) {
        return `Đơn hàng #${productId} của bạn đã hoàn thành`
    }else return ''
};

module.exports.getNotifyStatus = function(status) {
    if (status === 1) {
        return 1
    }else return 0
};

module.exports.formatDateTime = (inputDateString) => {
    const inputDate = new Date(inputDateString);
    const formatDateComponent = (component) => String(component).padStart(2, "0");
    const year = formatDateComponent(inputDate.getFullYear());
    const month = formatDateComponent(inputDate.getMonth() + 1);
    const day = formatDateComponent(inputDate.getDate());
    const hours = formatDateComponent(inputDate.getHours());
    const minutes = formatDateComponent(inputDate.getMinutes());
    const seconds = formatDateComponent(inputDate.getSeconds());

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

module.exports.splitString = (str) => {

    var dashIndex = str.indexOf('-');

    var firstPart = str.slice(0, dashIndex);
    var secondPart = str.slice(dashIndex + 1);
    if(secondPart === 'desc'){
        return [firstPart, -1];
    }else
        return [firstPart, 1];
}

module.exports.parseAdvance = (item,query) => {
    if (item === '3') {
        query.shipping_fee = 0;
    } else if (item === '4') {
        query.finish_time = { $lt: new Date(Date.now() + 24 * 60 * 60 * 1000) };
    } else if (item === '5') {
        query.start_time = { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) };
    }
}
