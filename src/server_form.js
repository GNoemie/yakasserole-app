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
					   if (sess.msgKO) {
					       res.redirect('inscription.html');
					       res.end();
					   }
					   else
					   {
					       pg.connect(config, function(err, client) {
						   client.query('INSERT INTO utilisateur VALUES (DEFAULT, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10);',
								['user', false, req.body.nom, req.body.prenom, req.body.adresse, req.body.cp, req.body.ville, req.body.mail, password, new Date()],
								function (err, result) {
								    if (err) console.error('error happened during query', err);
								    sess.msgOK = "INSCRIPTION EFFECTUEE";
								    res.redirect('/');
								    res.end();
								});
					       });

					   };
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
						   res.end();
					       }
					   });

            db_password.on('row', function(row) {
		if (row.mot_de_passe != password)
		{
                    sess.msgKO = "MAUVAIS MOT DE PASSE";
                    res.redirect('/connexion.html');
		    res.end();
		}
		else
		{
                    sess.msgOK = "CONNEXION EFFECTUEE";
                    sess.user = row;
                    res.redirect('/');
		    res.end();
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
					       res.end();
					   }
					   else
					   {
					       //FIXME : send an email to change password
					       sess.msgOK = "MAIL ENVOYE";
					       res.redirect('/pwd_recup.html');
					       res.end();
					   }
				       });
	});
    },

    
/*
  UTILISATEURS
*/

    
    printusers:function printusers(req, res) {
	
	sess = req.session;
	
	pg.connect(config, function(err, client) {
            db_password = client.query('SELECT * FROM utilisateur;',
				       function (err, result) {
					   if (err) console.error('error happened during query', err);
					   res.render('changeuser.ejs', {result: result});
					   res.end();
				       });

	});
    },

    changeUser: function changeUser(req, res) {
	sess = req.session;


	pg.connect(config, function(err, client) {
	    db_password = client.query('SELECT * FROM utilisateur WHERE id = $1;',
				       [req.body.id], function (err, result) {
					   if (err) console.error('error happened during query', err);
					   if (!result.rowCount)
					   {
					       sess.msgKO = "UTILISATEUR INCONNU";
					       res.redirect('/admin.html');
					       res.end();
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
										  res.end();
									      }
									      else {
										  res.render('admin.ejs', {result: result});
										  res.end();
									      }
									  });
					   }
				       });
	});

    },

    deleteUser:function deleteUser(req, res) {
	
	sess = req.session;
	pg.connect(config, function(err, client) {
	    db_password = client.query('SELECT * FROM utilisateur WHERE id = $1;',
				       [req.body.id], function (err, result) {
					   if (err) console.error('error happened during query', err);
					   if (!result.rowCount)
					   {
					       sess.msgKO = "UTILISATEUR INCONNU";
					       res.redirect('/admin.html');
					       res.end();
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
											  res.end();
										      }
										      else
										      {
											  client.query('SELECT * FROM recette WHERE auteur = $1;', [req.body.id], function (err, result) {
											      if (result.rowCount)
											      {
												  sess.msgKO = "L'UTILISATEUR EST L'AUTEUR DE RECETTE(S)";
												  res.redirect('/admin.html');
												  res.end();
											      }
											      else {
												  db_password = client.query('DELETE FROM utilisateur WHERE id = $1;', [req.body.id],
															     function (err, result) {
																 if (err) console.error('error happened during query', err);
																 res.render('admin.ejs', {result: result});
																 res.end();
															     });
											      }
											  });
										      }
										  });
					       });
					   }
				       });
	});
    },


    
/*
  PROFIL
*/
    printProfil: function printProfil(req, res) {

	sess = req.session;
	
	pg.connect(config, function(err, client) {
	    db_password = client.query('SELECT * FROM utilisateur WHERE mail = $1;',
				       [sess.user.mail], function (err, result) {
					   if (err) console.error('error happened during query', err);
				       });
	    db_password.on('row', function(row) {
		if (sess.msgKO) {
		    res.redirect('/');
		    res.end();
		}
		client.query('SELECT * FROM recette WHERE auteur = $1;', [row.id], function (err, resultrecette) {
		    if (err) console.error('error happened during query', err);
		    client.query('SELECT * FROM reservation WHERE utilisateur = $1;', [sess.user.id], function (err, reservationatelier) {
			    client.query('SELECT * FROM atelier', function (err, resultatelier) {
				if (err) console.error('error happened during query', err);
				res.render('profil.ejs', {resultrecette: resultrecette, reservationatelier: reservationatelier, resultatelier: resultatelier});
				res.end();
			    });
		    });
		});
	    });
	});
	
    },
    
    
    
/*
  RECETTE
*/
    printrecettes:function printrecettes(req, res) {
	
	sess = req.session;
	
	pg.connect(config, function(err, client) {
            db_password = client.query('SELECT * FROM utilisateur WHERE mail = $1;',
				       [sess.user.mail], function (err, result) {
					   if (err) console.error('error happened during query', err);
				       });

	    db_password.on('row', function(row) {
		if (sess.msgKO) {
		    res.redirect('/');
		    res.end();
		}
   		client.query('SELECT * FROM recette;', function (err, result) {
		    if (err) console.error('error happened during query', err);
		    client.query('SELECT * FROM utilisateur;', function (err, resultuser) {
			res.render('recettes.ejs', {result: result, userid: row, resultuser: resultuser});
			res.end();
		    });
		});
	    });


	});
    },
    
    recetteForm: function recetteForm(req, res) {
	sess = req.session;
		
	pg.connect(config, function(err, client) {
            var db_password = client.query('SELECT * FROM utilisateur WHERE mail = $1;',
					   [sess.user.mail], function (err, result) {
					       if (err) console.error('error happened during query', err);
					   });

            db_password.on('row', function(row) {
		if (sess.msgKO) {
		    res.redirect('/');
		    res.end();
		}
   		client.query('INSERT INTO recette VALUES (DEFAULT, $1, $2, $3, $4, $5, $6, $7);',
			     [new Date(), row.id, req.body.titre, req.body.type, req.body.ingredients, req.body.description, req.body.difficulte], function (err, result) {
				 if (err) console.error('error happened during query', err);
				 sess.msgOK = "RECETTE CREEE AVEC SUCCES";
				 res.redirect('/recettes.html');
				 res.end();
			     });
	    });
	});
    },

    changeRecette: function changeRecette(req, res) {
	sess = req.session;


	pg.connect(config, function(err, client) {
	    db_password = client.query('SELECT * FROM recette WHERE id = $1;',
				       [req.body.id], function (err, result) {
					   if (err) console.error('error happened during query', err);
					   if (!result.rowCount)
					   {
					       sess.msgKO = "RECETTE INCONNUE";
					       res.redirect('/admin.html');
					       res.end();
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
					       res.end();
					   }
				       });
	});

    },

    
    deleteRecette:function deleteRecette(req, res) {
	
	sess = req.session;

	pg.connect(config, function(err, client) {
	    db_password = client.query('SELECT * FROM recette WHERE id = $1;',
				       [req.body.id], function (err, result) {
					   if (err) console.error('error happened during query', err);
					   if (!result.rowCount)
					   {
					       sess.msgKO = "RECETTE INCONNUE";
					       res.redirect('/admin.html');
					       res.end();
					   }
					   else
					   {
					       db_password = client.query('DELETE FROM recette WHERE id = $1;', [req.body.id],
									  function (err, result) {
									      if (err) console.error('error happened during query', err);
									      res.render('admin.ejs', {result: result});
									      res.end();
									  });
					   }
				       });
	});
    },

    recettealone:function recettealone(req, res) {
	sess = req.session;

	pg.connect(config, function(err, client) {
	    var db_password = client.query('SELECT * FROM recette WHERE titre = $1', [req.query.titre], function (err, result) {
		if (err) console.error('error happened during query', err);
		client.query('SELECT * FROM utilisateur WHERE id = $1;', [result.rows[0].auteur], function (err, resultauteur) {
		    client.query('SELECT * FROM commentaire_recette WHERE recette = $1;', [result.rows[0].id], function (err, resultcommentaire) {
			res.render('recette.ejs', {result: result, resultauteur: resultauteur, resultcommentaire: resultcommentaire});
			res.end();
		    });
		});
	    });
	});
	
    },

    addcommentairerecette: function addcommentairerecette(req, res) {
	sess = req.session;

	pg.connect(config, function(err, client) {
	    var db_password = client.query('INSERT INTO commentaire_recette VALUES (DEFAULT, $1, $2, $3, $4);', [sess.user.id, req.query.id, new Date(), req.body.commentaire], function (err, result) {
		sess.msgOK = "COMMENTAIRE AJOUTE";
		res.redirect('/recettes.html');
		res.end();
	    });
	});
    },


/*
  ATELIERS
*/

    printateliers:function printateliers(req, res) {
	
	sess = req.session;
	
	pg.connect(config, function(err, client) {
            db_password = client.query('SELECT * FROM atelier;',
				       function (err, result) {
					   if (err) console.error('error happened during query', err);
					   client.query('SELECT * FROM utilisateur;', function (err, resultuser) {
					       res.render('ateliers.ejs', {result: result, resultuser: resultuser});
					       res.end();
					   });
				       });

	});
    },
    
    atelierForm: function atelierForm(req, res) {
	sess = req.session;

	pg.connect(config, function(err, client) {
            var db_password = client.query('SELECT * FROM utilisateur WHERE nom = $1;',
					   [req.body.chef], function (err, result) {
					       if (err) console.error('error happened during query', err);
					   });

            db_password.on('row', function(row) {
		if (sess.msgKO) {
		    res.redirect('/');
		    res.end();
		}
   		client.query('INSERT INTO atelier VALUES (DEFAULT, $1, $2, $3, $4, $5, $6, $7, $8);',
			     [row.id, req.body.titre, req.body.theme, req.body.description, req.body.localisation, req.body.prix, req.body.date_debut, req.body.date_fin], function (err, result) {
				 if (err) console.error('error happened during query', err);
				 sess.msgOK = "ATELIER CREEE AVEC SUCCES";
				 res.redirect('/ateliers.html');
				 res.end();
			     });
	    });
	});
    },

    changeAtelier: function changeAtelier(req, res) {
	sess = req.session;


	pg.connect(config, function(err, client) {
	    db_password = client.query('SELECT * FROM atelier WHERE id = $1;',
				       [req.body.id], function (err, result) {
					   if (err) console.error('error happened during query', err);
					   if (!result.rowCount)
					   {
					       sess.msgKO = "ATELIER INCONNU";
					       res.redirect('/admin.html');
					       res.end();
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
					       res.end();
					   }
				       });
	});

    },

    deleteAtelier:function deleteAtelier(req, res) {
	
	sess = req.session;

	pg.connect(config, function(err, client) {
	    db_password = client.query('SELECT * FROM atelier WHERE id = $1;',
				       [req.body.id], function (err, result) {
					   if (err) console.error('error happened during query', err);
					   if (!result.rowCount)
					   {
					       sess.msgKO = "ATELIER INCONNU";
					       res.redirect('/admin.html');
					       res.end();
					   }
					   else
					   {
					       db_password = client.query('DELETE FROM atelier WHERE id = $1;', [req.body.id],
									  function (err, result) {
									      if (err) console.error('error happened during query', err);
									      res.render('admin.ejs', {result: result});
									      res.end();
									  });
					   }
				       });
	});
    },

    atelieralone:function atelieralone(req, res) {
	sess = req.session;

	pg.connect(config, function(err, client) {
	    var db_password = client.query('SELECT * FROM atelier WHERE titre = $1', [req.query.titre], function (err, result) {
		if (err) console.error('error happened during query', err);
		client.query('SELECT * FROM utilisateur WHERE id = $1', [result.rows[0].chef], function (err, userchief) {
		    if (err) console.error('error happened during query', err);
		    client.query('SELECT * FROM commentaire_atelier WHERE atelier = $1;', [result.rows[0].id], function (err, resultcommentaire) {
			client.query('SELECT * FROM utilisateur;', function (err, resultuser) {
			    res.render('atelier.ejs', {result: result, userchief: userchief, resultcommentaire: resultcommentaire, resultuser: resultuser});
			    res.end();
			});
		    });
		});
	    });
	});
	
    },

    addcommentaireatelier: function addcommentaireatelier(req, res) {
	sess = req.session;

	pg.connect(config, function(err, client) {
	    var db_password = client.query('INSERT INTO commentaire_atelier VALUES (DEFAULT, $1, $2, $3, $4);', [sess.user.id, req.query.id, new Date(), req.body.commentaire], function (err, result) {
		sess.msgOK = "COMMENTAIRE AJOUTE";
		res.redirect('/ateliers.html');
		res.end();
	    });
	});
    },

 
    reservation: function reservation(req, res) {
	sess = req.session;

	pg.connect(config, function(err, client) {
	    var db_password = client.query('SELECT * FROM atelier WHERE titre = $1;', [req.query.titre], function (err, result) {
		if (err) console.error('error happened during query', err);
		client.query('SELECT * FROM reservation WHERE utilisateur = $1 AND atelier = $2;', [sess.user.id, result.rows[0].id], function (err, resultr) {
		    if (resultr.rowCount) {
			sess.msgKO = "VOUS AVEZ DEJA RESERVE POUR CET ATELIER";
			res.redirect('/ateliers.html');
			res.end();
		    }
		    client.query('INSERT INTO Reservation VALUES ($1, $2, $3, $4);', [result.rows[0].id, sess.user.id, 1, new Date()], function (err, result) {
			if (err) console.error('error happened during query', err);
			sess.msgOK = "RESERVATION EFFECTUEE";		
			res.redirect('/ateliers.html');
			res.end();
		    });
		});
	    });
	});

    }

};
