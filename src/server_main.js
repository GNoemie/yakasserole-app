
const https = require('https');
const fs = require('fs');
const express = require('express');
const formidable = require("formidable");
const sha256 = require('js-sha256');
const pem = require('pem');
const session = require('express-session');
const bodyParser = require('body-parser');
const pg = require("pg");
//const popup = require('window-popup');

//include server_form
var form = require("./server_form");

//use express to handle several pages
var app = express();

var config = "pg://yakasserole:F8Pf7tM@localhost:5432/app";

//initializing the session
app.use(session({
	secret: 'ssshhhhh',
	resave: false,
	saveUninitialized: false
}));   //those options are for cookies i think, but we don't use them anyway

//handling pages
var path = require("path");

//handle form data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

//export session variables in all files
app.use(function(req, res, next) {
    res.locals.user = req.session.user;
    res.locals.msgKO = req.session.msgKO;
    req.session.msgKO = null;
    res.locals.msgOK = req.session.msgOK;
    req.session.msgOK = null;
    next();
});

app.get('/', function(req, res) {
    res.render('index.ejs');
    res.end();
});

/*
  INSCRIPTION
*/

app.get('/inscription.html', function(req, res) {
    sess = req.session.user;
    if (!sess)
	res.render('inscription.ejs');
    else
	res.redirect('/');
});

app.post('/inscription.html', function(req, res) {
    return form.inscriptionForm(req, res);
});

app.get('/activation.html', function(req, res) {
    return form.activationtest(req, res);
});
/*
  CARTE BLEUE
*/

app.post('/cb.html', function(req, res){
    res.render('cb.ejs', {r: req.query.titre});
    //popup(500, 500, 'Transaction Compléter');
});

/*
  CONNEXION
*/

app.get('/connexion.html', function(req, res) {
    sess = req.session.user;
    if (!sess)
	res.render('connexion.ejs');
    else 
	res.redirect('/');
});

app.post('/connexion.html', function(req, res) {
    if (req.body.c)
	return form.connexionForm(req, res);
    else
	return form.mdpchange(req, res, req.query);
});
    

app.get('/pwd_recup.html', function(req, res) {
    sess = req.session.user;
    if (!sess)
	res.render('pwd_recup.ejs');
    else
	res.redirect('/');
});

app.post('/pwd_recup.html', function(req, res) {
    return form.recupForm(req, res);
});

app.get('/changemdp.html', function(req, res) {
    m = "";
    return res.render('changemdp.ejs', {m: m, r: req.query});
});

app.get('/logout.html', function(req, res) {
    req.session.destroy();
    res.redirect('/');
});

app.get('/profil.html', function(req, res) {
    sess = req.session.user;
    if (sess)
	return form.printProfil(req, res);
    else
	res.redirect('/');
});


/*
  ADMIN
*/

app.get('/admin.html', function(req, res) {
    sess = req.session.user;
    if (sess)
	res.render('admin.ejs');
    else
	res.redirect('/');
});

app.post('/admin.html', function(req, res) {
    if (req.body.mu)
	return form.changeUser(req, res);
    if (req.body.su)
	return form.deleteUser(req, res);
    if (req.body.mr)
	return form.changeRecette(req, res);
    if (req.body.sr)
	return form.deleteRecette(req, res);
    if (req.body.ma)
	return form.changeAtelier(req, res);
    if (req.body.sa)
	return form.deleteAtelier(req, res);
});


/*
  RECETTE
*/

app.get('/recettes.html', function(req, res) {
    sess = req.session.user;
    if (sess)
	return form.printrecettes(req, res);
    else
	res.redirect('/');
});

app.get('/addrecette.html', function(req, res) {
    sess = req.session.user;
    if (sess)
	res.render('addrecette.ejs');
    else 
	res.redirect('/');
});

app.post('/recettes.html', function(req, res) {
    if (req.body.pc)
	return form.addcommentairerecette(req, res);
    else
	return form.recetteForm(req, res);
});

app.get('/recette.html', function(req, res) {
    return form.recettealone(req, res);
});



/*
  ATELIER
*/

app.get('/ateliers.html', function(req, res) {
    sess = req.session.user;
    if (sess)
	return form.printateliers(req, res);
    else
	res.redirect('/');
});

app.get('/addatelier.html', function(req, res) {
    sess = req.session.user;
    if (sess)
    {
	pg.connect(config, function(err, client) {
	    var db_password = client.query('SELECT * FROM utilisateur;', function (err, result) {
					       if (err) console.error('error happened during query', err);
		res.render('addatelier.ejs', {result: result});
	    });
	}); 
    }
    else
	res.redirect('/');
});

app.post('/ateliers.html', function(req, res) {
    if (req.body.vr)
	return form.reservation(req, res);
    if (req.body.pc)
	return form.addcommentaireatelier(req, res);
    else
	return form.atelierForm(req, res);
});

app.get('/atelier.html', function(req, res) {
    return form.atelieralone(req, res);
});

app.post('/profil.html', function(req, res) {
    return form.deletereservation(req, res);
});

/*
  PRINT
*/

app.post('/changeuser.html', function(req, res) {
    return form.printusers(req, res);
});

app.post('/changeatelier.html', function(req, res) {
    return form.printateliers(req, res);
});

app.post('/changerecette.html', function(req, res) {
    return form.printrecettes(req, res);
})


app.listen(8080);
console.log("server listening on 8080");
