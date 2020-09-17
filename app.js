var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var neo4j = require('neo4j-driver');

var app = express();
// View Engine
app.set('views', path.join(__dirname,'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname,'public')));

var driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('neo4j','neo4j_teghub'));

var session = driver.session();

app.get('/', function(req,res){
	session
	    .run('MATCH n RETURN n)
	    .then(function(result){
		    result.records.forEach(function(record)
	    })
	    .catch();
	res.send('it works');
});

app.listen(7474);
console.log('server statrted on port 3000');
