var mysql = require('mysql2');
var connectionOptions = {
host: "localhost",
 user: "root",
 password: "root",
 database: "PIS-Labs"
};
var connection = mysql.createConnection(connectionOptions);
connection.connect();
connection.query("SELECT id, nome FROM produto", (err, rows, fields) => {
 if (err)
 console.log(err);
 else
 console.log(rows);
});
connection.end();
