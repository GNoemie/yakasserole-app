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

https.createServer({
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
}, app).listen(8080);

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
    return form.printIndex(req, res);
});

app.get('/index.html', function(req, res) {
    return form.printIndex(req, res);
});

app.post('/index.html',function(req,res){
    console.log('FIRST TEST: ' + JSON.stringify(req.files));
    console.log('second TEST: ' +req.files.theFile.name);
    fs.readFile(req.files.theFile.path, function (err, data) {
	var newPath = "/home/path/to/your/directory/"+req.files.theFile.name;
	fs.writeFile(newPath, data, function (err) {
	    res.send("hi");
	});
    });
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

app.post('/cb.html', function(req, res) {
    pg.connect(config, function(err, client, done) {
	var db_password = client.query('SELECT * FROM atelier WHERE titre = $1;', [req.query.titre], function (err, result) {
	    if (err) console.error('error happened during query', err);
	    price = 0;
	    if (result.rowCount)
		price = req.body.nb * result.rows[0].prix - ((req.body.nb * result.rows[0].prix * 10) / 100);
	    res.render('cb.ejs', {r: req.query.titre, req, price: price, nb: req.body.nb, result: result});;
	});
	db_password.on('end', () => {
	    return done();
	});
    });
});

/*
  RECHERCHE
*/

app.get('/recherche.html', function(req, res) {
    res.redirect('/');
});

app.post('/recherche.html', function(req, res) {
    return form.searchForm(req, res);
});

/*
  CONNEXION
*/

app.get('/connexion.html', function(req, res) {
    sess = req.session.user;
    if (!sess)
    {
	res.render('connexion.ejs');
    }
    else
    {
	if (req.query.premium == "oui")
	    return form.abopremium(req, res);
	if (req.query.premium == "non")
	    return form.annulerpremium(req, res);
	else
	    res.redirect('/');
    }
});

app.post('/connexion.html', function(req, res) {
    if (req.body.c)
    {
	sess = req.session.user;
	return form.connexionForm(req, res);
    }
    if (req.body.abp)
    {
	return form.abopremium(req, res);
	//return req.session.destroy();
    }
    if (req.body.anp)
    {
	return form.annulerpremium(req, res);
	//return req.session.destroy();
    }	
    else
    {
	sess = req.session.user;
	return form.mdpchange(req, res, req.query);
    }
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
    {
	req.session.msgKO = "Veuillez vous connecter afin de voir votre profil.";
	res.redirect('/');
    }
});

app.post('/profil.html', function(req, res) {
    sess = req.session.user;
    form.abopremium(req, res);
    return form.printProfil(req, res);
});


app.get('/premium.html', function(req, res) {
    sess = req.session.user;
    return res.render('premium.ejs');
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
    if (req.body.ex)
	return form.excelstats(req, res);
    if (req.body.pdf)
	return form.pdfstats(req, res);
    
});

app.get('/chefs.html', function(req, res) {
    sess = req.session.user;
    if (sess)
	return form.printchefs(req, res);
    else
    {
	    req.session.msgKO = "Veuillez vous connecter afin de voir la liste de nos chefs cuisiniers.";
	    res.redirect('/connexion.html');
    }
});


app.post('/statistiques.html', function(req, res) {
    return form.printstats(req, res);
});

/*
  RECETTE
*/

app.get('/recettes.html', function(req, res) {
    sess = req.session.user;
    if (sess)
	return form.printrecettes(req, res);
    else
    {
	    req.session.msgKO = "Veuillez vous connecter afin de voir la liste de nos recettes.";
	    res.redirect('/connexion.html');
    }
});

app.get('/addrecette.html', function(req, res) {
    sess = req.session.user;
    if (sess)
	res.render('addrecette.ejs');
    else 
	res.render('connexion.ejs');
});

app.post('/recettes.html', function(req, res) {
    if (req.body.pc)
	return form.addcommentairerecette(req, res);
    else
	return form.recetteForm(req, res);
});

app.get('/recette.html', function(req, res) {
    sess =  req.session.user;
    if (sess)
        return form.recettealone(req, res);
    else
    {
    	req.session.msgKO = "Veuillez vous connecter afin de voir le détail de la recette.";
        res.redirect('./connexion.html');
    }
});



/*
  ATELIER
*/

app.get('/ateliers.html', function(req, res) {
    sess = req.session.user;
    if (sess)
	return form.printateliers(req, res);
    else
    {
	    req.session.msgKO = "Veuillez vous connecter afin de voir la liste de nos ateliers.";
	    res.redirect('/connexion.html');
    }
});

app.get('/addatelier.html', function(req, res) {
    sess = req.session.user;
    if (sess)
    {
	pg.connect(config, function(err, client, done) {
	    var db_password = client.query("SELECT * FROM utilisateur WHERE role = 'chef_cuisinier';", function (err, result) {
					       if (err) console.error('error happened during query', err);
		res.render('addatelier.ejs', {result: result});
	    });
	    db_password.on('end', () => {
		return done();
	    });
	});
    }
    else
	res.render('connexion');
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
    sess = req.session.user;
    if (sess)
        return form.atelieralone(req, res);
    else
    {
	req.session.msgKO = "Veuillez vous connecter afin de voir le détail de l'atelier.";
        res.redirect('/connexion.html');
    }
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
