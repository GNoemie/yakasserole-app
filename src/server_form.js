const https = require('https');
const fs = require('fs');
const express = require('express');
const formidable = require("formidable");
const sha256 = require('js-sha256');
const pem = require('pem');
const session = require('express-session');
const bodyParser = require('body-parser');
const pg = require("pg");
const mailer = require("nodemailer");
const excelbuilder = require('msexcel-builder');
const PDFDocument = require('pdfkit');

//connect to bdd
var config = "pg://yakasserole:F8Pf7tM@localhost:5432/app";

var smtpTransport = mailer.createTransport("SMTP",{
    service: "Gmail",
    auth: {
	user: "yakasserolehandle@gmail.com",
	pass: "yakasserole"
    }
});

var con = 0;

function aleatoire()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 10; i++)
	text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

module.exports = {
    
    inscriptionForm: function inscriptionForm(req, res) {

	sess = req.session;

	if (req.body.mdp.length < 6)
            sess.msgKO = "MOT DE PASSE INVALIDE";

	var password = sha256(req.body.mdp);
	var password2 = sha256(req.body.mdp2);

	if (password != password2)
            sess.msgKO = "MOTS DE PASSES NON IDENTIQUES";
	
	if (req.body.mail != req.body.mail2)
            sess.msgKO = "MAILS NON INDENTIQUES";

	pg.connect(config, function(err, client, done) {
	    var db_password = client.query('SELECT * FROM utilisateur WHERE mail = $1;',
					   [req.body.mail], function (err, result) {
					       if (err) console.error('error happened during query', err);
					       if (result.rowCount) sess.msgKO = "MAIL NON DISPONIBLE";
					       if (sess.msgKO)
						   res.redirect('inscription.html');
					       else
					       {
						   pg.connect(config, function(err, client) {
						       client.query('INSERT INTO utilisateur VALUES (DEFAULT, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);',
								    ['user', false, false, req.body.nom, req.body.prenom, req.body.adresse, req.body.cp, req.body.ville, req.body.mail, password, new Date()],
								    function (err, result) {
									if (err) console.error('error happened during query', err);
									sess.msgOK = "INSCRIPTION EFFECTUEE";
									client.query('SELECT * FROM confirmation WHERE mail = $1;', [req.body.mail], function (err, result) {
									    if (err)
										return console.error('error happened during query', err);
									    if (result.rowCount)
									    {
										client.query('DELETE FROM confirmation WHERE mail = $1;', [req.body.mail], function (err, result) {
										    if (err)
											return console.error('error happened during query', err);		
										});
									    }

									    random = aleatoire();
									    var mail = {
										from: "yakasserolehandle@gmail.com",
										to: req.body.mail,
										subject: "CONFIRMATION D'INSCRIPTION",
										html: "Bienvenue sur YaKasserole,</br></br>Pour confirmer votre inscription, veuillez cliquer sur " + "<a href=\"http://localhost:8080/activation.html?key=" + random + "&mail=" + req.body.mail + "\">Confirmer</a> afin de confirmer votre compte sur le site YaKasserole.</br></br></br>--------------------</br>Ceci est un mail automatique, veuillez ne pas y répondre."
									    }
									    smtpTransport.sendMail(mail, function(error, response){
										if (error) {
										    console.log("Erreur lors de l'envoie du mail!");
										    console.log(error);
										}
										else
										    console.log("Mail envoyé avec succès!")
										smtpTransport.close();
									    });
									    client.query('INSERT INTO confirmation VALUES ($1, $2);', [random, req.body.mail], function (err, result) {
										if (err)
										    return console.log('error happened during query', err);
									    });
									    res.redirect('/');
									});
								    });
						   });

					       };
					   });

	    db_password.on('end', () => {
		return done();

	    });
	});
    },

    searchForm: function searchForm(req, res) {
       sess = req.session;
       req.body.search = '%' + req.body.search + '%';
       pg.connect(config, function(err, client, done) {
           var db = client.query("SELECT * FROM recette WHERE titre LIKE $1;",        
                                 [req.body.search], function (err, search) {
                    client.query("SELECT * FROM atelier WHERE titre LIKE $1;",
                                 [req.body.search], function (err, ate) {
                                     if (err) console.error('error happened during query', err);

                                     if (search.rowCount == 0)
                                     {
                                        sess.msgKO = "Aucun document ne correpond aux termes de recherche spécifiés."
                                        console.log("Found Nothing");
                                        //console.log(req.body.search);
                                        res.redirect('/');
                                     }
                                     else
                                     {
                                        res.render('recherche.ejs', {search: search, ate: ate});
                                     }
                                 });
                                 });
        });
    },

    activationtest: function activationtest(req, res) {

	activer = "VOTRE COMPTE A BIEN ETE CONFIRME";
	already = "VOTRE COMPTE EST DEJA ACTIVE";
	pg.connect(config, function(err, client, done) {
	    var db_password = client.query('SELECT * FROM confirmation WHERE mail = $1;', [req.query.mail], function (err, result) {
		client.query('SELECT * FROM utilisateur WHERE mail = $1;', [req.query.mail], function (err, resultuser) {
		    if (err)
			return console.log('error happened during query', err);
		    if (resultuser.rows[0].confirm == false && result.rows[0].cle == req.query.key)
			client.query('UPDATE utilisateur SET confirm = $1 WHERE mail = $2;', [true, req.query.mail], function (err, r) {
			    if (err)
				return console.log('error happened during query', err);
			    res.render('activation.ejs', {m: activer});			     
			});
		    
		    else
			res.render('activation.ejs', {m: already});
		});
	    });
	    db_password.on('end', () => {
		return done();

	    });
	});
    },

     searchForm: function searchForm(req, res) {
       sess = req.session;
       req.body.search = '%' + req.body.search + '%';
       pg.connect(config, function(err, client, done) {
           var db = client.query("SELECT * FROM recette WHERE titre LIKE $1;",
                                 [req.body.search], function (err, search) {
                    client.query("SELECT * FROM atelier WHERE titre LIKE $1;",
                                 [req.body.search], function (err, ate) {
                                     if (err) console.error('error happened during query', err);

                                     if (search.rowCount == 0)
                                     {
                                        sess.msgKO = "Aucun document ne correpond aux termes de recherche spécifiés."
                                        console.log("Found Nothing");
                                        //console.log(req.body.search);
                                        res.redirect('/');
                                     }
                                     else
                                     {
                                        res.render('recherche.ejs', {search: search, ate: ate});
                                     }
                                 });
                                 });
        });
    },
    abopremium: function abopremium(req, res) {

	sess = req.session;
	pg.connect(config, function(err, client, done) {
	    var db_password = client.query('UPDATE utilisateur SET premium = $1 WHERE id = $2;', [true, sess.user.id], function (err, result) {
		if (err)
		    return console.log('error happened during query', err);
		var mail = {
		    from: "yakasserolehandle@gmail.com",
		    to: sess.user.mail,
		    subject: "CONFIRMATION D'ABONNEMENT PREMIUM",
		    html: "Bonjour " + sess.user.prenom + " " + sess.user.nom + ",</br>Voici un récapitulatif de votre commande :</br>Abonnement premium pour un mois au prix de 3,99€.</br></br></br>--------------------</br>Ceci est un mail automatique, veui\llez ne pas y répondre."
		}
		smtpTransport.sendMail(mail, function(error, response){
		    if (error) {
			console.log("Erreur lors de l'envoie du mail!");
			console.log(error);
		    }
		    else
			console.log("Mail envoyé avec succès!")
		    smtpTransport.close();
		});
		res.redirect('/connexion.html?premium=oui');
		sess.destroy();
	    });
	    db_password.on('end', () => {
		return done();
	    });
	});
    },

    annulerpremium: function annulerpremium(req, res) {

	sess = req.session;
	pg.connect(config, function(err, client, done) {
	    var db_password = client.query('UPDATE utilisateur SET premium = $1 WHERE id = $2;', [false, sess.user.id], function (err, result) {
		if (err)
		    return console.log('error happened during query', err);
		res.redirect('/connexion.html?premium=non');
		sess.destroy();
	    });
	    db_password.on('end', () => {
		return done();
	    });
	});
    },
    
    connexionForm: function connexionForm(req, res) {

	var password = sha256(req.body.pw);
	sess = req.session;

	pg.connect(config, function(err, client, done) {
            var db_password = client.query('SELECT * FROM utilisateur WHERE mail = $1;',
					   [req.body.email], function (err, result) {
					       if (err) console.error('error happened during query', err);
					       if (result.rowCount == 0)
					       {
						   sess.msgKO = "UTILISATEUR INCONNU";
						   console.log("user does not exist");
						   res.redirect('/connexion.html');
					       }
					   });

            db_password.on('row', function(row) {
		if (!row.confirm)
		{
                    sess.msgKO = "COMPTE NON ACTIVE";
                    res.redirect('/connexion.html');
		}
		else if (row.mot_de_passe != password)
		{
                    sess.msgKO = "UTILISATEUR INCORRECT/MAUVAIS MOT DE PASSE";
                    res.redirect('/connexion.html');
		}
		else
		{
                    sess.msgOK = "CONNEXION EFFECTUEE";
                    sess.user = row;
		    con = con + 1;
                    res.redirect('/');
		}
            });
	    db_password.on('end', () => {
		return done();
	    });
	});
    },

    recupForm: function recupForm(req, res) {
	
	sess = req.session;

	pg.connect(config, function(err, client, done) {
            var db_password = client.query('SELECT * FROM utilisateur WHERE mail = $1;',
				       [req.body.email], function (err, result) {
					   if (err) console.error('error happened during query', err);
					   if (!result.rowCount)
					   {
					       sess.msgKO = "UTILISATEUR INCONNU";
					       res.redirect('/pwd_recup.html');
					   }
					   else if (result.rows[0].confirm == false)
					   {
					       sess.msgKO = "INSCRIPTION PAS ENCORE VALIDEE";
					       res.redirect('/');
					   }
					   else
					   {
					       random = aleatoire();
					       client.query('SELECT * FROM mdprecup WHERE mail = $1;', [req.body.email], function (err, result) {
						   if (err)
						       return console.error('error happened during query', err);
						   for (var i = 0; i < result.rowCount; i++)
						   {
						       client.query('DELETE FROM mdprecup WHERE mail = $1;', [req.body.email], function (err, result) {
							   if (err)
							       return console.error('error happened during query', err);		
						       });
						   }
					       });
					       client.query('SELECT * FROM utilisateur WHERE mail = $1;', [req.body.email], function(err, result) {
						   var mail = {
						       from: "yakasserolehandle@gmail.com",
						       to: req.body.email,
						       subject: "MOT DE PASSE OUBLIE",
						       html: "Bonjour " + result.rows[0].prenom + " " + result.rows[0].nom + ",</br>Suite au signalement de l'oubli de votre mot de passe, nous vous proposons de rédéfinir un nouveau mot de passe en cliquant sur <a href=\"http://localhost:8080/changemdp.html?key=" + random + "&mail=" + req.body.email + "\">Définir son mot de passe</a></br></br></br>--------------------</br>Ceci est un mail automatique, veuillez ne pas y répondre."
						   }
						   smtpTransport.sendMail(mail, function(error, response){
						       if (error) {
							   console.log("Erreur lors de l'envoie du mail!");
							   console.log(error);
						       }
						       else
							   console.log("Mail envoyé avec succès!")
						       smtpTransport.close();
						       client.query('INSERT INTO mdprecup VALUES ($1, $2);', [random, req.body.email], function (err, result) {
							   if (err)
							       return console.log('error happened during query', err);
						       });
						   });
						   sess.msgOK = "MAIL ENVOYE";
						   res.redirect('/pwd_recup.html');
					       });
					   }
				       });
	    db_password.on('end', () => {
		return done();
	    });
	});
    },

    mdpchange: function mdpchange(req, res, r) {

	m = "";
	if (req.body.mdp.length < 6)
	    m = "MOT DE PASSE INVALIDE";

	var password = sha256(req.body.mdp);
	var password2 = sha256(req.body.mdp1);

	if (password != password2)
	    m = "MOTS DE PASSES NON IDENTIQUES";	
	if (m != "")
	    res.render('changemdp.ejs', {m: m});
	pg.connect(config, function(err, client, done) {
	    var db_password = client.query('SELECT * FROM mdprecup WHERE mail = $1;', [r.mail], function (err, result) {
		if (result.rows[0].cle == r.key)
		    client.query('UPDATE utilisateur SET mot_de_passe = $1 WHERE mail = $2;', [password, r.mail], function (err, r) {
			if (err)
			    return console.log('error happened during query', err);
			res.redirect('\connexion.html');
		    });
	    });
	    db_password.on('end', () => {
		return done();
	    });
	});
    },

    
/*
  UTILISATEURS
*/

    
    printusers:function printusers(req, res) {
	
	sess = req.session;
	
	pg.connect(config, function(err, client, done) {
            var db_password = client.query('SELECT * FROM utilisateur;',
				       function (err, result) {
					   if (err)
					       console.error('error happened during query', err);
					   res.render('changeuser.ejs', {result: result});
				       });
	    db_password.on('end', () => {
		return done();
	    });

	});
    },

    changeUser: function changeUser(req, res) {

	sess = req.session;

	pg.connect(config, function(err, client, done) {
	    db_password = client.query('SELECT * FROM utilisateur WHERE id = $1;',
				       [req.body.id], function (err, result) {
					   if (err) console.error('error happened during query', err);
					   if (!result.rowCount)
					   {
					       sess.msgKO = "UTILISATEUR INCONNU";
					       res.redirect('/admin.html');
					   }
					   else
					   {
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
									      if (req.body.id == sess.user.id)
									      {
										  req.session.destroy();
										  res.redirect('/');
									      }
									      else
										  res.render('admin.ejs', {result: result});
									  });
					   }
				       });
	    db_password.on('end', () => {
		return done();
	    });
	});

    },

    deleteUser:function deleteUser(req, res) {
	
	sess = req.session;
	pg.connect(config, function(err, client, done) {
	    var db_password = client.query('SELECT * FROM utilisateur WHERE id = $1;',
				       [req.body.id], function (err, result) {
					   if (err) console.error('error happened during query', err);
					   if (!result.rowCount)
					   {
					       sess.msgKO = "UTILISATEUR INCONNU";
					       res.redirect('/admin.html');
					   }
					   else
					   {
					       pg.connect(config, function(err, client) {
						   var db_password = client.query('SELECT * FROM atelier WHERE chef = $1;',
										  [req.body.id], function (err, result) {
										      if (err) console.error('error happened during query', err);
										      if (result.rowCount)
										      {
											  sess.msgKO = "L'UTILISATEUR EST RESPONSABLE D'UN ATELIER";
											  res.redirect('/admin.html');
										      }
										      else
										      {
											  client.query('SELECT * FROM recette WHERE auteur = $1;', [req.body.id], function (err, result) {
											      if (result.rowCount)
											      {
												  sess.msgKO = "L'UTILISATEUR EST L'AUTEUR DE RECETTE(S)";
												  res.redirect('/admin.html');
											      }
											      else {
												  db_password = client.query('DELETE FROM utilisateur WHERE id = $1;', [req.body.id],
															     function (err, result) {
																 if (err) console.error('error happened during query', err);
																 res.render('admin.ejs', {result: result});
															     });
											      }
											  });
										      }
										  });
					       });
					   }
				       });
	    db_password.on('end', () => {
		return done();
	    });
	});
    },


    
/*
  PROFIL
*/
    printProfil: function printProfil(req, res) {

	sess = req.session;
	pg.connect(config, function(err, client, done) {
	    if (req.query.id)
	    {
		var db_password = client.query('SELECT * FROM utilisateur WHERE id = $1;',
					       [req.query.id], function (err, result) {
						   if (err) console.error('error happened during query', err);
					       });
		db_password.on('row', function(row) {
		    if (sess.msgKO)
			res.redirect('/');
		    client.query('SELECT * FROM recette WHERE auteur = $1;', [row.id], function (err, resultrecette) {
			if (err) console.error('error happened during query', err);
			client.query('SELECT * FROM reservation WHERE utilisateur = $1;', [req.query.id], function (err, reservationatelier) {
			    client.query('SELECT * FROM atelier', function (err, resultatelier) {
				if (err) console.error('error happened during query', err);
				res.render('profil.ejs', {row: row, resultrecette: resultrecette, reservationatelier: reservationatelier, resultatelier: resultatelier});
			    });
			});
		    });
		});
		db_password.on('end', () => {
		    return done();
		});

	    }
	    else
	    {
		var db_password = client.query('SELECT * FROM utilisateur WHERE mail = $1;',
					       [sess.user.mail], function (err, result) {
						   if (err) console.error('error happened during query', err);
					       });
		
		db_password.on('row', function(row) {
		    if (sess.msgKO)
			res.redirect('/');
		    client.query('SELECT * FROM recette WHERE auteur = $1;', [row.id], function (err, resultrecette) {
			if (err) console.error('error happened during query', err);
			client.query('SELECT * FROM reservation WHERE utilisateur = $1;', [sess.user.id], function (err, reservationatelier) {
			    client.query('SELECT * FROM atelier', function (err, resultatelier) {
				if (err) console.error('error happened during query', err);
				res.render('profil.ejs', {row: row, resultrecette: resultrecette, reservationatelier: reservationatelier, resultatelier: resultatelier});
			    });
			});
		    });
		});
		db_password.on('end', () => {
		    return done();
		});
	    }
	});
	
    },

    printchefs: function printchefs (req, res) {

	sess = req.session;
	
	pg.connect(config, function(err, client, done) {
	    var db_password = client.query('SELECT * FROM utilisateur;', function (err, result) {
		if (err) console.log('error happened during query', err);
		res.render('chefs.ejs', {result: result});
	    });	    
	    db_password.on('end', () => {
		return done();
	    });
	});
    },
    
    
/*
  RECETTE
*/
    printrecettes: function printrecettes(req, res) {
	
	sess = req.session;
	
	pg.connect(config, function(err, client, done) {
            db_password = client.query('SELECT * FROM utilisateur WHERE mail = $1;',
				       [sess.user.mail], function (err, result) {
					   if (err) console.error('error happened during query', err);
				       });

	    db_password.on('row', function(row) {
		if (sess.msgKO)
		    res.redirect('/');
   		client.query('SELECT * FROM recette;', function (err, result) {
		    if (err) console.error('error happened during query', err);
		    client.query('SELECT * FROM utilisateur;', function (err, resultuser) {
			res.render('recettes.ejs', {result: result, userid: row, resultuser: resultuser});
		    });
		});
	    });
	    db_password.on('end', () => {
		return done();
	    });
	});
    },

    /* select first recettes and ateliers to print them on main page */
    printIndex: function printIndex(req, res) {
        sess = req.session;

        pg.connect(config, function(err, client, done) {
            var db_password = client.query('SELECT * FROM recette ORDER BY date_post DESC LIMIT 3;', function (err, recettes) {
                if (err) console.error('error happened during query', err);
                client.query('SELECT * FROM atelier ORDER BY date_debut DESC LIMIT 3;', function (err, ateliers) {
                    if (err) console.error('error happened during query', err);
                    res.render('index.ejs', {recettes: recettes, ateliers: ateliers});
                });
            });
            db_password.on('end', () => {
                return done();
            });
        });
    },
    
    recetteForm: function recetteForm(req, res) {
	sess = req.session;
		
	pg.connect(config, function(err, client, done) {
            var db_password = client.query('SELECT * FROM utilisateur WHERE mail = $1;',
					   [sess.user.mail], function (err, result) {
					       if (err) console.error('error happened during query', err);
					   });

            db_password.on('row', function(row) {
		if (sess.msgKO)
		    res.redirect('/');
   		client.query('INSERT INTO recette VALUES (DEFAULT, $1, $2, $3, $4, $5, $6, $7, $8);',
			     [new Date(), row.id, req.body.titre, req.body.type, req.body.ingredients, req.body.description, req.body.difficulte, req.body.image], function (err, result) {
				 if (err) console.error('error happened during query', err);
				 sess.msgOK = "RECETTE CREEE AVEC SUCCES";
				 res.redirect('/recettes.html');
			     });
	    });
	    db_password.on('end', () => {
		return done();
	    });
	});
    },

    changeRecette: function changeRecette(req, res) {
	sess = req.session;


	pg.connect(config, function(err, client, done) {
	    var db_password = client.query('SELECT * FROM recette WHERE id = $1;',
				       [req.body.id], function (err, result) {
					   if (err) console.error('error happened during query', err);
					   if (!result.rowCount)
					   {
					       sess.msgKO = "RECETTE INCONNUE";
					       res.redirect('/admin.html');
					   }
					   else
					   {
    					       if (req.body.titre)
						   db_password = client.query('UPDATE recette SET titre = $1 WHERE id = $2;', [req.body.titre, req.body.id], function (err, result) {
						       if (err) console.log('error happened during query', err);
						   });

                           if (req.body.image)
                           db_password = client.query('UPDATE recette SET image = $1 WHERE id = $2;', [req.body.image, req.body.id], function (err, result) {
                                if (err) console.log('error happened during query', err);
                           });
					       
					       if (req.body.type)
						   db_password = client.query('UPDATE recette SET type = $1 WHERE id = $2;', [req.body.type, req.body.id], function (err, result) {
						       if (err) console.log('error happened during query', err);
						   });

					       if (req.body.ingredients)
						   db_password = client.query('UPDATE recette SET ingredients = $1 WHERE id = $2;', [req.body.ingredients, req.body.id], function (err, result) {
						       if (err) console.log('error happened during query', err);
						   });
					       
					       if (req.body.description)
						   db_password = client.query('UPDATE recette SET description = $1 WHERE id = $2;', [req.body.description, req.body.id], function (err, result) {
						       if (err) console.log('error happened during query', err);
						   });

					       if (req.body.difficulte)
						   db_password = client.query('UPDATE recette SET difficulte = $1 WHERE id = $2;', [req.body.difficulte, req.body.id], function (err, result) {
						       if (err) console.log('error happened during query', err);
						   });
					       res.render('admin.ejs', {result: result});
					   }
				       });
	    db_password.on('end', () => {
		return done();
	    });
	});

    },

    
    deleteRecette:function deleteRecette(req, res) {
	
	sess = req.session;

	pg.connect(config, function(err, client, done) {
	    var db_password = client.query('SELECT * FROM recette WHERE id = $1;',
				       [req.body.id], function (err, result) {
					   if (err) console.error('error happened during query', err);
					   if (!result.rowCount)
					   {
					       sess.msgKO = "RECETTE INCONNUE";
					       res.redirect('/admin.html');
					   }
					   else
					   {
					       
					       db_password = client.query('SELECT * FROM commentaire_recette WHERE recette = $1;', [req.body.id], function (err, resultcommentaire) {
						   if (resultcommentaire.rowCount)
						       client.query('DELETE FROM commentaire_recette WHERE recette = $1;', [req.body.id], function (err, resultsupp) {
							   if (err)
							       return console.error('error happened during query', err);
						       });
						   client.query('DELETE FROM recette WHERE id = $1;', [req.body.id],
								function (err, result) {
								    if (err)
									return console.error('error happened during query', err);
								    res.render('admin.ejs', {result: result});
								});						   
					       });
					   }
				       });
	    db_password.on('end', () => {
		return done();
	    });
	});
1    },

    recettealone:function recettealone(req, res) {
	sess = req.session;

	pg.connect(config, function(err, client, done) {
	    var db_password = client.query('SELECT * FROM recette WHERE titre = $1', [req.query.titre], function (err, result) {
		if (err) console.error('error happened during query', err);
		client.query('SELECT * FROM utilisateur WHERE id = $1;', [result.rows[0].auteur], function (err, resultauteur) {
		    client.query('SELECT * FROM commentaire_recette WHERE recette = $1;', [result.rows[0].id], function (err, resultcommentaire) {
			client.query('SELECT * FROM utilisateur;', function (err, resultuser) {
			    res.render('recette.ejs', {result: result, resultauteur: resultauteur, resultcommentaire: resultcommentaire, resultuser: resultuser});
			});
		    });
		});
	    });
	    db_password.on('end', () => {
		return done();
	    });
	});
	
    },

    addcommentairerecette: function addcommentairerecette(req, res) {
	sess = req.session;

	pg.connect(config, function(err, client, done) {
	    var db_password = client.query('INSERT INTO commentaire_recette VALUES (DEFAULT, $1, $2, $3, $4);', [sess.user.id, req.query.id, new Date(), req.body.commentaire], function (err, result) {
		sess.msgOK = "COMMENTAIRE AJOUTE";
		res.redirect('/recettes.html');
	    });
	    db_password.on('end', () => {
		return done();
	    });
	});
    },


/*
  ATELIERS
*/

    printateliers:function printateliers(req, res) {
	
	sess = req.session;
	
	pg.connect(config, function(err, client, done) {
            var db_password = client.query('SELECT * FROM atelier;',
				       function (err, result) {
					   if (err) console.error('error happened during query', err);
					   client.query('SELECT * FROM utilisateur;', function (err, resultuser) {
					       res.render('ateliers.ejs', {result: result, resultuser: resultuser});
					   });
				       });
	    db_password.on('end', () => {
		return done();
	    });

	});
    },
    
    atelierForm: function atelierForm(req, res) {
	sess = req.session;

	pg.connect(config, function(err, client, done) {
            var db_password = client.query('SELECT * FROM utilisateur WHERE id = $1;',
					   [req.body.chef], function (err, result) {
					       if (err) console.error('error happened during query', err);
					   });

            db_password.on('row', function(row) {
		if (sess.msgKO)
		    res.redirect('/');
		if (req.body.date_debut > new Date())
		    console.log(req.body.date_fin);
   		client.query('INSERT INTO atelier VALUES (DEFAULT, $1, $2, $3, $4, $5, $6, $7, $8);',
			     [row.id, req.body.titre, req.body.theme, req.body.description, req.body.localisation, req.body.prix, req.body.date_debut, req.body.date_fin], function (err, result) {
				 if (err) console.error('error happened during query', err);
				 sess.msgOK = "ATELIER CREEE AVEC SUCCES";
				 res.redirect('/ateliers.html');
			     });
	    });
	    db_password.on('end', () => {
		return done();
	    });
	});
    },

    changeAtelier: function changeAtelier(req, res) {
	sess = req.session;


	pg.connect(config, function(err, client, done) {
	    var db_password = client.query('SELECT * FROM atelier WHERE id = $1;',
				       [req.body.id], function (err, result) {
					   if (err) console.error('error happened during query', err);
					   if (!result.rowCount)
					   {
					       sess.msgKO = "ATELIER INCONNU";
					       res.redirect('/admin.html');
					   }
					   else
					   {
    					       if (req.body.titre)
						   db_password = client.query('UPDATE atelier SET titre = $1 WHERE id = $2;', [req.body.titre, req.body.id], function (err, result) {
						       if (err) console.log('error happened during query', err);
						   });

                           if (req.body.image)
                           db_password = client.query('UPDATE atelier SET image = $1 WHERE id = $2;', [req.body.image, req.body.id], function (err, result) {
                                if (err) console.log('error happened during query', err);
                           });
					       
					       if (req.body.theme)
						   db_password = client.query('UPDATE atelier SET theme = $1 WHERE id = $2;', [req.body.theme, req.body.id], function (err, result) {
						       if (err) console.log('error happened during query', err);
						   });
					       
					       if (req.body.description)
						   db_password = client.query('UPDATE atelier SET description = $1 WHERE id = $2;', [req.body.description, req.body.id], function (err, result) {
						       if (err) console.log('error happened during query', err);
						   });

					       if (req.body.localisation)
						   db_password = client.query('UPDATE atelier SET localisation = $1 WHERE id = $2;', [req.body.localisation, req.body.id], function (err, result) {
						       if (err) console.log('error happened during query', err);
						   });

					       if (req.body.prix)
						   db_password = client.query('UPDATE atelier SET prix = $1 WHERE id = $2;', [req.body.prix, req.body.id], function (err, result) {
						       if (err) console.log('error happened during query', err);
						   });

					       if (req.body.date_debut)
						   db_password = client.query('UPDATE atelier SET date_debut = $1 WHERE id = $2;', [req.body.date_debut, req.body.id], function (err, result) {
						       if (err) console.log('error happened during query', err);
						   });

					       if (req.body.date_fin)
						   db_password = client.query('UPDATE atelier SET date_fin = $1 WHERE id = $2;', [req.body.date_fin, req.body.id], function (err, result) {
						       if (err) console.log('error happened during query', err);
						   });
					       client.query('SELECT * FROM reservation WHERE atelier = $1;', [req.body.id], function (err, resultreservation) {
						   if (resultreservation.rowCount)
						   {
						       client.query('SELECT * FROM atelier WHERE id = $1;', [req.body.id], function (err, resultatelier) {
							   for (var i = 0; i < resultreservation.rowCount; i++)
							   {
							       client.query('SELECT * FROM utilisateur WHERE id = $1;', [resultreservation.rows[i].utilisateur], function (err, resultuser) {
								   if (err) console.log('error happened during query', err);
								   var mail = {
								       from: "yakasserolehandle@gmail.com",
								       to: resultuser.rows[0].mail,
								       subject: "CHANGEMENT D'INFORMATIONS ATELIER",
								       html: "Bonjour " + resultuser.rows[i].prenom + " " + resultuser.rows[i].nom + ",</br>Certaines informations concernant l'atelier " + result.rows[0].titre + " ont été modifié.</br>" + "Voici un récapulatif de l'atelier en question :</br>" + "Titre : " + resultatelier.rows[0].titre + "</br>Thème : " + resultatelier.rows[0].theme + "</br>Description : " + resultatelier.rows[0].description + "</br>Localisation : " + resultatelier.rows[0].localisation + "</br>Prix : " + resultatelier.rows[0].prix + "</br>Date de début : " + resultatelier.rows[0].date_debut + "</br>Date de fin : " + resultatelier.rows[0].date_fin + "</br></br></br>--------------------</br>Ceci est un mail automatique, veuillez ne pas y répondre."
								   }
								   smtpTransport.sendMail(mail, function(error, response){
								       if (error) {
									   console.log("Erreur lors de l'envoie du mail!");
									   console.log(error);
								       }
								       else
									   console.log("Mail envoyé avec succès!")
								       smtpTransport.close();
								   });
							       });
							   }
						       });
						   }
						   res.render('admin.ejs', {result: result});
					       });
					   }
				       });
	    db_password.on('end', () => {
		return done();
	    });
	});

    },

    deleteAtelier:function deleteAtelier(req, res) {
	
	sess = req.session;

	pg.connect(config, function(err, client, done) {
	    var db_password = client.query('SELECT * FROM atelier WHERE id = $1;',
				       [req.body.id], function (err, result) {
					   if (err) console.error('error happened during query', err);
					   if (!result.rowCount)
					   {
					       sess.msgKO = "ATELIER INCONNU";
					       res.redirect('/admin.html');
					   }
					   else
					   {
					       db_password = client.query('SELECT * FROM commentaire_atelier WHERE atelier = $1;', [req.body.id], function (err, resultcommentaire) {
						   if (err)
						       return console.error('error happened during query', err);
						   if (resultcommentaire.rowCount)
						       client.query('DELETE FROM commentaire_atelier WHERE atelier = $1;', [req.body.id], function (err, resultsupp) {
							   if (err)
							       return console.error('error happened during query', err);
						       });
						   client.query('SELECT * FROM reservation WHERE atelier = $1;', [req.body.id], function (err, resultreservation) {
						       if (err)
							   return console.error('error happened during query', err);
						       if (resultreservation.rowCount)
							   client.query('DELETE FROM reservation WHERE atelier = $1;', [req.body.id], function (err, resultsupp) {
							       if (err)
								   return console.error('error happened during query', err);
							   });
						       client.query('DELETE FROM atelier WHERE id = $1;', [req.body.id],
								    function (err, result) {
									if (err)
									    return console.error('error happened during query', err);
									res.render('admin.ejs', {result: result});
								    });
						   });
					       });
					   }
				       });
	    db_password.on('end', () => {
		return done();
	    });
	});
    },

    atelieralone:function atelieralone(req, res) {
	sess = req.session;

	pg.connect(config, function(err, client, done) {
	    var db_password = client.query('SELECT * FROM atelier WHERE titre = $1', [req.query.titre], function (err, result) {
		if (err) console.error('error happened during query', err);
		client.query('SELECT * FROM utilisateur WHERE id = $1', [result.rows[0].chef], function (err, userchief) {
		    if (err) console.error('error happened during query', err);
		    client.query('SELECT * FROM commentaire_atelier WHERE atelier = $1;', [result.rows[0].id], function (err, resultcommentaire) {
			client.query('SELECT * FROM utilisateur;', function (err, resultuser) {
			    client.query('SELECT * FROM reservation WHERE atelier = $1 AND utilisateur = $2;', [result.rows[0].id, sess.user.id], function (err, resultreservation) {
				res.render('atelier.ejs', {result: result, userchief: userchief, resultcommentaire: resultcommentaire, resultuser: resultuser, resultreservation: resultreservation});
			    });
			});
		    });
		});
	    });
	    db_password.on('end', () => {
		return done();
	    });
	});	
    },

    addcommentaireatelier: function addcommentaireatelier(req, res) {
	sess = req.session;

	pg.connect(config, function(err, client, done) {
	    var db_password = client.query('INSERT INTO commentaire_atelier VALUES (DEFAULT, $1, $2, $3, $4);', [sess.user.id, req.query.id, new Date(), req.body.commentaire], function (err, result) {
		sess.msgOK = "COMMENTAIRE AJOUTE";
		res.redirect('/ateliers.html');
	    });
	    db_password.on('end', () => {
		return done();
	    });
	});
    },

 
    reservation: function reservation(req, res) {
	sess = req.session;

	pg.connect(config, function(err, client, done) {
	    var db_password = client.query('SELECT * FROM atelier WHERE titre = $1;', [req.query.titre], function (err, result) {
		if (err) console.error('error happened during query', err);
		client.query('SELECT * FROM reservation WHERE utilisateur = $1 AND atelier = $2;', [sess.user.id, result.rows[0].id], function (err, resultr) {
		    if (resultr.rowCount) {
			sess.msgKO = "VOUS AVEZ DEJA RESERVE POUR CET ATELIER";
			res.redirect('/ateliers.html');
		    }
		    else
		    {
			var mail = {
			    from: "yakasserolehandle@gmail.com",
			    to: sess.user.mail,
			    subject: "CONFIRMATION DE PARTICIPATION A ATELIER",
			    html: "Bonjour " + sess.user.prenom + " " + sess.user.nom + ",</br>Suite à votre paiement, nous vous confirmons votre réservation pour l'atelier " + result.rows[0].titre + ".</br></br>Voici un récapulatif de l'atelier en question :</br>" + "Titre : " + result.rows[0].titre + "</br>Thème : " + result.rows[0].theme + "</br>Description : " + result.rows[0].description + "</br>Localisation : " + result.rows[0].localisation + "</br>Prix : " + result.rows[0].prix + "</br>Date de début : " + result.rows[0].date_debut + "</br>Date de fin : " + result.rows[0].date_fin + "</br></br></br>--------------------</br>Ceci est un mail automatique, veuillez ne pas y répondre."
			}
			smtpTransport.sendMail(mail, function(error, response){
			    if (error) {
				console.log("Erreur lors de l'envoie du mail!");
				console.log(error);
			    }
			    else
				console.log("Mail envoyé avec succès!")
			    smtpTransport.close();
			});
			client.query('INSERT INTO Reservation VALUES ($1, $2, $3, $4);', [result.rows[0].id, sess.user.id, 1, new Date()], function (err, result) {
			    if (err) console.error('error happened during query', err);
			    sess.msgOK = "RESERVATION EFFECTUEE";		
			    res.redirect('/ateliers.html');
			    
			});
		    }
		});
	    });
	    db_password.on('end', () => {
		return done();
	    });
	});
    },

    deletereservation: function deletereservation(req, res) {

	sess = req.session;
	pg.connect(config, function(err, client, done) {
	    var db_password = client.query('SELECT * FROM atelier WHERE titre = $1;', [req.query.titre], function (err, result) {
		if (err) console.error('error happened during query', err);
		client.query('DELETE FROM reservation WHERE utilisateur = $1 AND atelier = $2;', [sess.user.id, result.rows[0].id], function (err, resultr) {
		    if (err) console.error('error happened during query', err);
		    res.redirect('/profil.html');
		});
	    });
	    db_password.on('end', () => {
		return done();
	    });
	});
    },



    printstats: function printstats(req, res) {

	sess = req.session;
	pg.connect(config, function(err, client, done) {
	    var db_password = client.query('SELECT * FROM utilisateur;', function (err, resultuser) {
		if (err) console.error('error happened during query', err);
		client.query('SELECT * FROM recette;', function (err, resultrecette) {
		    if (err) console.error('error happened during query', err);
		    client.query('SELECT * FROM atelier;', function (err, resultatelier) {
			if (err) console.error('error happened during query', err);
			client.query('SELECT * FROM reservation;', function (err, resultreservation) {
			    if (err) console.error('error happened during query', err);
			    res.render('statistiques.ejs', {resultuser: resultuser, resultrecette: resultrecette, resultatelier: resultatelier, resultreservation: resultreservation, con: con});
			});
		    });
		});
	    });
	    db_password.on('end', () => {
		return done();
	    });
	});
    },

    excelstats: function excelstats(req, res) {

	// Create a new workbook file in current working-path
	var workbook = excelbuilder.createWorkbook('./', 'stats.xlsx')

	// Create a new worksheet with 10 columns and 12 rows
	var sheet1 = workbook.createSheet('sheet1', 10, 12);

	// Fill some data
	pg.connect(config, function(err, client, done) {
	    var db_password = client.query('SELECT * FROM utilisateur;', function (err, resultuser) {
		if (err) console.error('error happened during query', err);
		client.query('SELECT * FROM recette;', function (err, resultrecette) {
		    if (err) console.error('error happened during query', err);
		    client.query('SELECT * FROM atelier;', function (err, resultatelier) {
			if (err) console.error('error happened during query', err);
			client.query('SELECT * FROM reservation;', function (err, resultreservation) {
			    if (err) console.error('error happened during query', err);
			    sheet1.set(1, 1, 'Nombre d\'inscrit');
			    sheet1.set(1, 2, resultuser.rowCount);
			    sheet1.set(2, 1, 'Nombre de connexions');
			    sheet1.set(2, 2, con);
			    sheet1.set(3, 1, 'Nombre de recettes');
			    sheet1.set(3, 2, resultrecette.rowCount);
			    sheet1.set(4, 1, 'Nombre d\'ateliers');
			    sheet1.set(4, 2, resultatelier.rowCount);
			    sheet1.set(5, 1, 'Nombre de réservations pour les ateliers');
			    sheet1.set(5, 2, resultreservation.rowCount);

			    // Save it
			    workbook.save(function(ok){
				if (!ok)
				    workbook.cancel();
				else
				    console.log('congratulations, your workbook created');
			    });
			    res.render('admin.ejs');
			});
		    });
		});
	    });
	    db_password.on('end', () => {
		return done();
	    });
	});
    },

    pdfstats: function pdfstats(req, res) {

	pg.connect(config, function(err, client, done) {
	    var db_password = client.query('SELECT * FROM utilisateur;', function (err, resultuser) {
		if (err) console.error('error happened during query', err);
		client.query('SELECT * FROM recette;', function (err, resultrecette) {
		    if (err) console.error('error happened during query', err);
		    client.query('SELECT * FROM atelier;', function (err, resultatelier) {
			if (err) console.error('error happened during query', err);
			client.query('SELECT * FROM reservation;', function (err, resultreservation) {
			    if (err) console.error('error happened during query', err);

			    doc = new PDFDocument;

			    doc.pipe(fs.createWriteStream('stats.pdf'));

			    doc.font('Times-Roman')
				.fontSize(25)
				.text('Statistiques du site YaKasserole :\n\nNombre d\'inscrit : ' + resultuser.rowCount + '\nNombre de connexions : ' + con + '\nNombre de recettes : ' + resultrecette.rowCount + '\nNombre d\'ateliers : ' + resultatelier.rowCount + '\nNombre de réservations pour les ateliers : ' + resultreservation.rowCount, 100, 100)

			    doc.end();
			    res.render('admin.ejs');
			});
		    });
		});
	    });
	    db_password.on('end', () => {
		return done();
	    });
	});
    }

};
