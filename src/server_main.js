const https = require('https');
const fs = require('fs');
const express = require('express');
const formidable = require("formidable");
const sha256 = require('js-sha256');
const pem = require('pem');
const session = require('express-session');
const bodyParser = require('body-parser');
const pg = require("pg");

//include server_form
var form = require("./server_form");

//use express to handle several pages
var app = express();

//initializing the session
app.use(session({
	secret: 'ssshhhhh',
	resave: false,
	saveUninitialized: false
}));   //those options are for cookies i think, but we don't use them anyway

//handle form data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//export session variables in all files
app.use(function(req, res, next) {
    res.locals.user = req.session.user;
    res.locals.msgKO = req.session.msgKO;
    req.session.msgKO = null;
    res.locals.msgOK = req.session.msgOK;
    req.session.msgOK = null;
    next();
});


//handling pages
var path = require("path");

app.get('/', function(req, res) {
    res.render('index.ejs');
});

app.get('/inscription.html', function(req, res) {
    sess = req.session.user;
    if (!sess) res.render('inscription.ejs');
    else res.redirect('/');
});

app.post('/inscription.html', function(req, res) {
    form.inscriptionForm(req, res);
});

app.post('/connexion.html', function(req, res) {
    form.connexionForm(req, res);
});
    
app.get('/connexion.html', function(req, res) {
    sess = req.session.user;
    if (!sess) res.render('connexion.ejs');
    else res.redirect('/');
});

app.get('/pwd_recup.html', function(req, res) {
    sess = req.session.user;
    if (!sess) res.render('pwd_recup.ejs');
    else res.redirect('/');
});

app.post('/pwd_recup.html', function(req, res) {
    form.recupForm(req, res);
});

app.get('/logout.html', function(req, res) {
    req.session.destroy();
    res.redirect('/');
});

app.get('/profil.html', function(req, res) {
    sess = req.session.user;
    if (sess) res.render('profil.ejs');
    else res.redirect('/');
});

app.get('/admin.html', function(req, res) {
    sess = req.session.user;
    if (sess)
	res.render('admin.ejs');
    else res.redirect('/');
});

app.get('/recettes.html', function(req, res) {
    sess = req.session.user;
    if (sess) form.printrecettes(req, res);
    else res.redirect('/');
});

app.get('/addrecette.html', function(req, res) {
    sess = req.session.user;
    if (sess) res.render('addrecette.ejs');
    else res.redirect('/');
});

app.post('/recettes.html', function(req, res) {
    form.recetteForm(req, res);
});

app.post('/addrecette.html', function(req, res) {
    form.recetteForm(req, res);
});

app.post('/admin.html', function(req, res) {
    form.changeUser(req, res);
});

app.post('/changeuser.html', function(req, res) {
    form.printusers(req, res);
});

app.post('/changeatelier.html', function(req, res) {
    form.printateliers(req, res);
});

app.post('/changerecette.html', function(req, res) {
    form.printrecettes(req, res);
})


app.listen(8080);
console.log("server listening on 8080");
