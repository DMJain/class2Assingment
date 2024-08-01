const fs = require("fs");
const http = require("http");

// Log all requests
let isLogSuccess = true;
const logSuccess = (dateTime, ip, statusCode, path) => {
  const message = `${dateTime},${ip},${statusCode},${path}`;

  if (isLogSuccess) {
    const header = "dateTime,ip,statusCode,path\n";
    fs.writeFileSync("logs.csv", header);
    isLogSuccess = false;
  }

  fs.appendFileSync("logs.csv", `${message}\n`);
};

// Log Server error
let isLogError = true;
const logError = (dateTime, ip, statusCode, path) => {
  const message = `${dateTime},${ip},${statusCode},${path}`;

  if (isLogError) {
    const header = "dateTime,ip,statusCode,path\n";
    fs.writeFileSync("errorLog.csv", header);
    isLogError = false;
  }

  fs.appendFileSync("errorLog.csv", `${message}\n`);
};

//Rate Limiter per IP
const ips = new Map();

const rateLimiter = (ip) => {
  const start = Date.now();
  const limit = ips.get(ip);

  //check if the ip is not in the map
  if (!limit) {
    ips.set(ip, { reqCount: 1, firstReq: start });
    return false;
  }

  //check if the first request is older than 1 minute
  if (start - limit.firstReq > 60000) {
    ips.set(ip, { reqCount: 1, firstReq: start });
    return false;
  }

  //check if the limit is reached
  if (limit.reqCount < 20) {
    ips.set(ip, { reqCount: limit.reqCount + 1, firstReq: start });
    return false;
  }

  //if the limit is reached
  return true;
};

// Create a server
const server = http.createServer((req, res) => {
  let ip = req.socket.remoteAddress;
  let date = new Date();

  if (rateLimiter(ip)) {
    //log the error for rate limit
    logError(date, ip, 429, req.url);
    logSuccess(date, ip, 429, req.url);
    res.statusCode = 429;
    return res.end("<h1>429 Too Many Requests</h1>");
  }

  try {
    // Check the URL of the current request and respond accordingly
    if (req.url === "/") {
      logSuccess(date, ip, 200, req.url);
      return res.end(`<h1>Home Page</h1>`);
    } else if (req.url === "/about") {
      logSuccess(date, ip, 200, req.url);
      return res.end(`<h1>About</h1>`);
    } else if (req.url === "/search") {
      logSuccess(date, ip, 500, req.url);
      return res.endd(`<h1>Search</h1>`);
    } else if (req.url === "/logs") {
      //read logs
      logSuccess(date, ip, 200, req.url);
      const data = fs.readFileSync("logs.csv", "utf-8");
      return res.end(data);
    } else {
      logSuccess(date, ip, 200, req.url);
      return res.end("<h1>400 Not Found</h1>");
    }
  } catch (error) {
    // If server throws an error
    logError(date, ip, 500, req.url);
    res.statusCode = 500;
    return res.end("<h1>500 Internal Server Error</h1>");
  }
});

// Listen on port 8000
server.listen(8000, () => {
  console.log("Server is running on port 8000");
});
