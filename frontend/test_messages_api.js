const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/conversations/messages/list',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(data);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(JSON.stringify({ userId: '1', conversationId: '1', page: 1, limit: 5 }));
req.end();
