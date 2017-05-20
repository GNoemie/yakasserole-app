const https = require('https');
const fs = require('fs');
const express = require('express');
const formidable = require("formidable");
const sha256 = require('js-sha256');
const pem = require('pem');
const session = require('express-session');
const bodyParser = require('body-parser');
const pg = require("pg");

//connect to bdd
var config = "pg://yakasserole:F8Pf7tM@localhost:5432/app";


module.exports = {

inscriptionForm: function inscriptionForm(req, res) {
    sess = req.session;

    if (!req.body.adresse || !req.body.ville || !req.body.cp)
        sess.msgKO = "INVALID ADDRESS";

    if (!req.body.prenom || !req.body.nom)
        sess.msgKO = "INCOMPLETE NAME";

    if (req.body.mdp.length < 6)
        sess.msgKO = "INVALID PASSWORD";

    var password = sha256(req.body.mdp);
    var password2 = sha256(req.body.mdp2);

    if (password != password2)
        sess.msgKO = "NOT MATCHING PWDs";
    
    if (!req.body.accepte)
        sess.msgKO = "CONDITIONS NOT ACCEPTED";

    if (req.body.mail != req.body.mail2)
        sess.msgKO = "NOT MATCHING EMAILs";


     pg.connect(config, function(err, client) {
        db_password = client.query('SELECT * FROM utilisateur WHERE mail = $1;',
            [req.body.mail], function (err, result) {
                if (err) console.error('error happened during query', err);
                if (result.rowCount) sess.msgKO = "EMAIL NOT AVAILABLE";
                if (sess.msgKO)
                    res.redirect('inscription.html');
                else
                {
                    pg.connect(config, function(err, client) {
                        client.query('INSERT INTO utilisateur VALUES (DEFAULT, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10);', ['user', false, req.body.nom, req.body.prenom, req.body.adresse, req.body.cp, req.body.ville, req.body.mail, password, new Date()], function (err, result) {
                                if (err) console.error('error happened during query', err);
                                sess.msgOK = "SUCCESSFUL INSCRIPTION";
                                res.redirect('/');
                            });
                    });
                }
            });
    });

},


connexionForm: function connexionForm(req, res) {

    var password = sha256(req.body.pw);
    sess = req.session;

    pg.connect(config, function(err, client) {
        var db_password = client.query('SELECT * FROM utilisateur WHERE mail = $1;',
            [req.body.email], function (err, result) {
                if (err) console.error('error happened during query', err);
                if (result.rowCount == 0)
                {
                    sess.msgKO = "UNKNOWN USER";
                    console.log("user does not exist");
                    res.redirect('/connexion.html');
                }
        });

        db_password.on('row', function(row) {
            if (row.mot_de_passe != password)
            {
                sess.msgKO = "BAD PASSWORD";
                console.log("Incorrect password");
                res.redirect('/connexion.html');
            }
            else
            {
                sess.msgOK = "SUCCESSFUL CONNEXION";
                sess.user = row;
                res.redirect('/');
            }
        });
    });
},

recupForm: function recupForm(req, res) {
    
    sess = req.session;
    
    pg.connect(config, function(err, client) {
        db_password = client.query('SELECT * FROM utilisateur WHERE mail = $1;',
            [req.body.email], function (err, result) {
                if (err) console.error('error happened during query', err);
                if (!result.rowCount)
                {
                    sess.msgKO = "USER DOES NOT EXIST";
                    res.redirect('/pwd_recup.html');
                }
                else
                {
                    //FIXME : send an email to change password
                    sess.msgOK = "EMAIL WAS SENT";
                    res.redirect('/pwd_recup.html');
                }
            });
    });
},

    
printusers:function printusers(req, res) {
    
    sess = req.session;
    
    pg.connect(config, function(err, client) {
        db_password = client.query('SELECT * FROM utilisateur;',
				   function (err, result) {
				       if (err) console.error('error happened during query', err);
				       res.render('changeuser.ejs', {result: result});
				   });

    });
},

recetteForm: function recetteForm(req, res) {
    sess = req.session;
    
    if (!req.body.titre)
	sess.msgKO = "INCOMPLETE TITLE";

    if (!req.body.type)
	sess.msgKO = "INCOMPLETE TYPE";

    if (!req.body.description)
	sess.msgKO = "INCOMPLETE DESCRIPTION";

    if (!req.body.difficulte)
	sess.msgKO = "INCOMPLETE DIFFICULTY";

    
    pg.connect(config, function(err, client) {
        var db_password = client.query('SELECT * FROM utilisateur WHERE mail = $1;',
				       [sess.user.mail], function (err, result) {
					   if (err) console.error('error happened during query', err);
				       });

        db_password.on('row', function(row) {
	    if (sess.msgKO)
		return res.redirect('/');
   	    client.query('INSERT INTO recette VALUES (DEFAULT, $1, $2, $3, $4, $5, $6);', [new Date(), row.id, req.body.titre, req.body.type, req.body.description, req.body.difficulte], function (err, result) {
		if (err) console.error('error happened during query', err);
		sess.msgOK = "SUCCESSFUL ADD OF RECETTE";
		res.redirect('/recettes.html');
	    });
	});
    });
},
    
printrecettes:function printrecettes(req, res) {
    
    sess = req.session;
    
    pg.connect(config, function(err, client) {
        db_password = client.query('SELECT * FROM recette;',
				   function (err, result) {
				       if (err) console.error('error happened during query', err);
				       res.render('recettes.ejs', {result: result});
				   });

    });
},

printateliers:function printateliers(req, res) {
    
    sess = req.session;
    
    pg.connect(config, function(err, client) {
        db_password = client.query('SELECT * FROM atelier;',
				   function (err, result) {
				       if (err) console.error('error happened during query', err);
				       res.render('changeatelier.ejs', {result: result});
				   });

    });
},

changeUser: function changeUser(req, res) {
    sess = req.session;

    pg.connect(config, function(err, client) {
	if (req.body.role)
	    db_password = client.query('UPDATE utilisateur SET role = $1 WHERE id = $2;', [req.body.role, req.body.id], function (err, result) {
		if (err) console.log('error happened during query', err);
	    });
	
	if (req.body.mail)
	    db_password = client.query('UPDATE utilisateur SET mail = $1 WHERE id = $2;', [req.body.mail, req.body.id], function (err, result) {
		if (err) console.log('error happened during query', err);
	    });
	
	if (req.body.prenom)
	    db_password = client.query('UPDATE utilisateur SET prenom = $1 WHERE id = $2;', [req.body.prenom, req.body.id], function (err, result) {
		if (err) console.log('error happened during query', err);
	    });

	if (req.body.nom)
	    db_password = client.query('UPDATE utilisateur SET nom = $1 WHERE id = $2;', [req.body.nom, req.body.id], function (err, result) {
		if (err) console.log('error happened during query', err);
	    });

	if (req.body.adresse)
	    db_password = client.query('UPDATE utilisateur SET adresse_postale = $1 WHERE id = $2;', [req.body.adresse, req.body.id], function (err, result) {
		if (err) console.log('error happened during query', err);
	    });

	if (req.body.ville)
	    db_password = client.query('UPDATE utilisateur SET ville = $1 WHERE id = $2;', [req.body.ville, req.body.id], function (err, result) {
		if (err) console.log('error happened during query', err);
	    });

	if (req.body.cp)
	    db_password = client.query('UPDATE utilisateur SET code_postal = $1 WHERE id = $2;', [req.body.code_postal, req.body.id], function (err, result) {
		if (err) console.log('error happened during query', err);
	    });
	db_password = client.query('SELECT * FROM utilisateur;',
				   function (err, result) {
				       if (err) console.error('error happened during query', err);
				       if (req.body.role != 'admin' && req.body.id == sess.user.id)
				       {
					   req.session.destroy();
					   res.redirect('/');
				       }
				       else
					   res.render('admin.ejs', {result: result});
				   });
    });
}


};
