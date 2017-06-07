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

//connect to bdd
var config = "pg://yakasserole:F8Pf7tM@localhost:5432/app";

var smtpTransport = mailer.createTransport("SMTP",{
    service: "Gmail",
    auth: {
	user: "jean.francois.ngo@gmail.com",
	pass: "table@2015"
    }
});

function aleatoire(size) {
    var liste = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","0","1","2","3","4","5","6","7","8","9"];
    var result = '';
    for (i = 0; i < size; i++) {
	result += liste[Math.floor(Math.random() * liste.length)];
    }
    console.log(result);
    return result;
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

	pg.connect(config, function(err, client) {
	    db_password = client.query('SELECT * FROM utilisateur WHERE mail = $1;',
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
								    random = aleatoire(10);
								    console.log(random);
								    var mail = {
									from: "jean.francois.ngo@gmail.com",
									to: req.body.mail,
									subject: "CONFIRMATION D'INSCRIPTION",
									html: "<a>http://localhost:8080/activation.html?mail=" + req.body.mail + "&cle=" + random + "</a>"
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

					   };
				       });
	    
	});

    },

    activationtest: function activationtest(req, res) {
	pg.connect(config, function(err, client) {
	    var db_password = client.query('SELECT * FROM confirmation WHERE mail = $1;', [req.query.mail], function (err, result) {
		client.query('SELECT * FROM utilisateur WHERE mail = $1;', [req.query.mail], function (err, resultuser) {
		    if (err)
			return console.log('error happened during query', err);
		    if (resultuser.rows[0].confirm)
			sess.msgOK = "VOTRE COMPTE EST DEJA VALIDE";
		    else
		    {
			if (result.rows[0].cle == req.query.cle)
			    client.query('UPDATE utilisateur SET confirm = $1 WHERE mail = $2;', [true, req.query.mail], function (err, r) {
				if (err)
				    return console.log('error happened during query', err);
			    });
		    }
		});
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
		if (row.mot_de_passe != password)
		{
                    sess.msgKO = "UTILISATEUR INCORRECT/MAUVAIS MOT DE PASSE";
                    res.redirect('/connexion.html');
		}
		else
		{
                    sess.msgOK = "CONNEXION EFFECTUEE";
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
					       sess.msgKO = "UTILISATEUR INCONNU";
					       res.redirect('/pwd_recup.html');
					   }
					   else
					   {
					       //FIXME : send an email to change password
					       sess.msgOK = "MAIL ENVOYE";
					       res.redirect('/pwd_recup.html');
					   }
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
				res.render('profil.ejs', {resultrecette: resultrecette, reservationatelier: reservationatelier, resultatelier: resultatelier});
			    });
		    });
		});
	    });
	    db_password.on('end', () => {
		return done();
	    });
	});
	
    },
    
    
    
/*
  RECETTE
*/
    printrecettes:function printrecettes(req, res) {
	
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
   		client.query('INSERT INTO recette VALUES (DEFAULT, $1, $2, $3, $4, $5, $6, $7);',
			     [new Date(), row.id, req.body.titre, req.body.type, req.body.ingredients, req.body.description, req.body.difficulte], function (err, result) {
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
            var db_password = client.query('SELECT * FROM utilisateur WHERE nom = $1;',
					   [req.body.chef], function (err, result) {
					       if (err) console.error('error happened during query', err);
					   });

            db_password.on('row', function(row) {
		if (sess.msgKO)
		    res.redirect('/');
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
					       
					       if (req.body.theme)
						   db_password = client.query('UPDATE atelier SET type = $1 WHERE id = $2;', [req.body.theme, req.body.id], function (err, result) {
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
					       res.render('admin.ejs', {result: result});
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
			    res.render('atelier.ejs', {result: result, userchief: userchief, resultcommentaire: resultcommentaire, resultuser: resultuser});
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
		    client.query('INSERT INTO Reservation VALUES ($1, $2, $3, $4);', [result.rows[0].id, sess.user.id, 1, new Date()], function (err, result) {
			if (err) console.error('error happened during query', err);
			sess.msgOK = "RESERVATION EFFECTUEE";		
			res.redirect('/ateliers.html');
		    });
		});
	    });
	    db_password.on('end', () => {
		return done();
	    });
	});

    }

};
