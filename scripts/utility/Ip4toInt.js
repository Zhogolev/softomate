module.exports = function (ip) {

   ip = ip.split('.');
   if(ip.length === 4)
       return ((parseInt(ip[0], 10)<<24)>>>0) + ((parseInt(ip[1], 10)<<16)>>>0)
           + ((parseInt(ip[2], 10)<<8)>>>0) + (parseInt(ip[3], 10)>>>0)
};
