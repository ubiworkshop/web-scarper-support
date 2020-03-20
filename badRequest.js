const request = require('request-promise');
let url = process.argv[2];

if (url !== undefined) {
    const res = request(url, (error, response, html) => {
        if (!error) {
            console.log(response.statusCode);
        }
    }).catch(e => {
        console.log(e);
    });
} else {
    console.log("error: pass URL in arguments.");
}
