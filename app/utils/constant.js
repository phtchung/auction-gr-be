module.exports.adminProductStatus = function(status) {
    if (
        status === 'N' ||
        status === '-N' ||
        status === 'B' ||
        status === 'S' ||
        status === 'C' ||
        status === 'D' ||
        status === 'E' ||
        status === 'R' ||
        status === 'G' ||
        status === 'F'
    ) {
        return status;
    } else {
        return 'N';
    }
};
