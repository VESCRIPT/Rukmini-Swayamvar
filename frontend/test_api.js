const https = require('https');

async function testApi(url, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname + urlObj.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (body) {
            options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
        }

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    data: data
                });
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function run() {
    console.log('Testing New API (vescript)...');
    try {
        const res = await testApi('https://vescript.vescript.com/api/auth/login', 'POST', {
            email: 'test@example.com',
            password: 'testpassword'
        });
        console.log('Status:', res.status);
        console.log('Response:', res.data);
    } catch (err) {
        console.error('Error:', err.message);
    }

    console.log('\nTesting Root URL (vescript)...');
    try {
        const res = await testApi('https://vescript.vescript.com/', 'GET');
        console.log('Status:', res.status);
        console.log('Response:', res.data);
    } catch (err) {
        console.error('Error:', err.message);
    }
}

run();
