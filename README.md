# Backend-developer-test-case-part-2
A loopback.js application coupled with a postgres database.
Before installation edit `server/datasources.json` to set the PostgreSQL config.
Install:
```
npm install
node bin/automigrate.js
```

Run:
```
node .
```

Example endpoint that given a machine, gives the current values of its attributes:
```
http://localhost:3000/api/Machines?filter=%7B%22where%22%3A%7B%22machine%22%3A88%7D%7D
```
