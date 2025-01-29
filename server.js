const Prometheus = require('prom-client')
const express = require('express');
const oracledb = require('oracledb');
const http = require('http');

Prometheus.collectDefaultMetrics();

const requestHistogram = new Prometheus.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['code', 'handler', 'method'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
})

const requestTimer = (req, res, next) => {
  const path = new URL(req.url, `http://${req.hostname}`).pathname
  const stop = requestHistogram.startTimer({
    method: req.method,
    handler: path
  })
  res.on('finish', () => {
    stop({
      code: res.statusCode
    })
  })
  next()
}

const app = express();
const server = http.createServer(app)

// See: http://expressjs.com/en/4x/api.html#app.settings.table
const PRODUCTION = app.get('env') === 'production';

// Administrative routes are not timed or logged, but for non-admin routes, pino
// overhead is included in timing.
app.get('/ready', (req, res) => res.status(200).json({status:"ok"}));
app.get('/live', (req, res) => res.status(200).json({status:"ok"}));
app.get('/metrics', async (req, res, next) => {
  const metrics = await Prometheus.register.metrics();
  res.set('Content-Type', Prometheus.register.contentType)
  res.end(metrics);
})

// Time routes after here.
app.use(requestTimer);

// Log routes after here.
const pino = require('pino')({
  level: PRODUCTION ? 'info' : 'debug',
});
app.use(require('pino-http')({logger: pino}));

app.get('/', (req, res) => {
  // Use req.log (a `pino` instance) to log JSON:
  req.log.info({message: 'Hello from Node.js Starter Application!'});
  res.send('Hello from Node.js Starter Application!');
});


const TEST_SECRET = ""+process.env.username
const x = Buffer.from(TEST_SECRET, 'base64');
app.get('/test', (req, res) => {
  req.log.info({message: `Test back ${x}!`});
  res.send(`Test back ${x}!`);
});

// my code
client_secret = ""+Buffer.from(""+process.env.client_secret, 'base64')
username      = ""+Buffer.from(""+process.env.username     , 'base64')
password      = ""+Buffer.from(""+process.env.password     , 'base64')

app.get('/accessToken', (req, res) => {
  getAccessToken(res);
});

app.get('/tcodes', (req, res) => {  
  getDb(req.query.accessRight, res);
});

async function getDb(accessRight, res){

    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

    const connection = await oracledb.getConnection ({
       user          : username,
       password      : password,
       connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=si0exarac02.de.bosch.com)(PORT=38000)))(CONNECT_DATA=(SERVER=DEDICATED)(SERVICE_NAME=RLDD01_OPS_2.BOSCH.COM)))"
    });
    const result = await connection.execute(
        `SELECT LOW
         FROM V_CUSN_AGR_1251
         WHERE ARG_NAME = :accRight`,
         [accessRight],
    );

   //const mypw = "oraclepwd"
   //const connection = await oracledb.getConnection ({
   //    user          : "C##RAW_E3",
   //    password      : mypw,
   //    connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=localhost)(PORT=1521)))(CONNECT_DATA=(SERVER=DEDICATED)(SERVICE_NAME=FREE)))"
   //});
   //const result = await connection.execute(
   //    `SELECT LOW
   //     FROM V_CUSN_AGR_1251
   //     WHERE ARG_NAME = :accRight`,
   //     [accessRight],
   //);


    console.log(accessRight);
    console.log(result.rows);
    await connection.close();
    res.send(result.rows.map(e1=>e1.LOW))
    return result.rows;
}

async function getAccessToken(res) {
    const url = 'https://login.microsoftonline.com/0ae51e19-07c8-4e4b-bb6d-648ee58410f4/oauth2/v2.0/token';
    
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

    // Steffens
    var urlencoded = new URLSearchParams();
    urlencoded.append("client_id", "4d8f6526-df32-4870-8afb-9937ba66d739");
    urlencoded.append("scope", "api://dia-brain/.default");
    urlencoded.append("client_secret", client_secret);
    urlencoded.append("grant_type", "client_credentials");

    var requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: urlencoded,
      redirect: 'follow'
    };
      

    try {
        const response = await fetch(url, requestOptions);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Assuming the JWT token is returned in the 'token' field
        const token = data.access_token;
        res.send(data)

        // Optionally, you can store the token in localStorage or sessionStorage
        //localStorage.setItem('jwtToken', token);

        return token;
    } catch (error) {
        console.error('Authentication failed:', error);
        throw error; // Rethrow the error for further handling
    }
}
// end my code

app.get('*', (req, res) => {
  res.status(404).send("Not Found");
});

// Listen and serve.
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`App started on PORT ${PORT}`);
});
