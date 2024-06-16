const {el} = require("@faker-js/faker");
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

module.exports.canBidByPoint = (userPoints, productPrice) => {
    if (userPoints <= 200) {
        return productPrice <= 500000;
    } else if (userPoints <= 350) {
        return productPrice <= 3000000;
    } else {
        return productPrice > 0;
    }
}

module.exports.checkByAuctionDeposit = (deposit, productPrice) => {
    if (deposit === 50) {
        return productPrice <= 2000000;
    } else if (deposit === 100) {
        return productPrice <= 5000000;
    } else if (deposit === 200) {
        return productPrice <= 15000000;
    } else if (deposit === 300) {
        return productPrice > 0
    }else return false
}

module.exports.getMinimumPoints = (productPrice) =>  {
    if (productPrice < 500000) {
        return 0;
    } else if (productPrice < 3000000) {
        return 201;
    } else {
        return 351;
    }
}

module.exports.checkPackageRegis = (level , deposit) =>  {
    switch (level){
        case 1 :
            return deposit === 50;
        case 2 :
            return deposit === 100;
        case 3:
            return deposit === 200;
        case 4:
            return deposit === 300;
        default :
            return  false
    }
}

module.exports.isValidCardName = (cardName) => {
    return /^[a-zA-Z\s]+$/.test(cardName) && cardName.length >= 2;
}

module.exports.isValidCVC = (cvc) =>  {
    return /^\d{3}$/.test(cvc);
}

module.exports.isValidExpiration = (expiration) =>  {
    if (!/^\d{2}\/\d{2}$/.test(expiration)) {
        return false;
    }

    const [month, year] = expiration.split('/').map(num => parseInt(num, 10));
    if (month < 1 || month > 12) {
        return false;
    }

    const currentYear = new Date().getFullYear() % 100; // Lấy 2 chữ số cuối của năm hiện tại
    const currentMonth = new Date().getMonth() + 1; // Tháng hiện tại (0-11)

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
        return false;
    }

    return true;
}
module.exports.isValidCardNumber = (cardNumber) => {
    return /^\d{16}$/.test(cardNumber);
}

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

module.exports.calculatePoints = (price) => {
    let points = 0;

    if (price < 1000000) {
        points = ( price / 1000 ) * 0.05;
    } else if (price >= 1000000 && price < 10000000) {
        points = ( price / 1000 ) * 0.07;
    } else if (price >= 10000000) {
        points = ( price / 1000 ) * 0.08;
    }
    if (points % 1 !== 0) {
        points = Math.ceil(points);
    }
    return points;
}
module.exports.reqConvertType = (type) => {
    if (type === "increase") {
        return [1]
    } else if (type === "decrease") {
        return [-1]
    } else return [-1, 1]
}

module.exports.getNgayThangNam = () => {
    var today = new Date();
    var ngay = String(today.getDate()).padStart(2, '0');
    var thang = String(today.getMonth() + 1).padStart(2, '0'); // Tháng bắt đầu từ 0
    var nam = today.getFullYear().toString().slice(-2); // Lấy 2 chữ số cuối cùng của năm
    return  nam + thang + ngay  ;
}
module.exports.parseTime = (dateString) =>{
    const dateParts = dateString.split('T');
    const date = dateParts[0].split('-');
    const time = dateParts[1].split(':');

    const year = parseInt(date[0], 10);
    const month = parseInt(date[1], 10) - 1; // Tháng bắt đầu từ 0
    const day = parseInt(date[2], 10);
    const hours = parseInt(time[0], 10);
    const minutes = parseInt(time[1], 10);
    const seconds = parseInt(time[2], 10);

    return {year , month,day,hours,minutes,seconds}
}
