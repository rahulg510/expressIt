const functions = require('firebase-functions');
const admin = require('firebase-admin');
const app = require('express')();

var serviceAccount = require("../key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://expressit-4d450.firebaseio.com"
});

var config = {
    apiKey: "AIzaSyC5jzbdgWAcFPrK_ogIqhL71EMPlRVy_Fs",
    authDomain: "expressit-4d450.firebaseapp.com",
    databaseURL: "https://expressit-4d450.firebaseio.com",
    projectId: "expressit-4d450",
    storageBucket: "expressit-4d450.appspot.com",
    messagingSenderId: "809532873161",
    appId: "1:809532873161:web:98799436cac45e7fc3f018"
};

const firebase = require('firebase')
firebase.initializeApp(config);

const db = admin.firestore();

app.get('/shares', (req,res)=>{
    db
    .collection('shares')
    .get()
    .then((data) =>{
        let shares = [];
        data.forEach((doc) =>{
            shares.push(doc.data());
        });
        return res.send(shares);
    })
    .catch((err)=>{
        res.send("error" + err);
    });
})


app.post('/share', (req,res)=>{
    const newShare = {
        body: req.body.body,
        username: req.body.username,
        createdAt: admin.firestore.Timestamp.fromDate(new Date())
    }

    db
    .collection('shares')
    .add(newShare)
    .then((doc) =>{
        res.json({message: `document ${doc.id} created successfully`});
    })
    .catch((err)=>{
        res.status(500).json({error: 'something went wrong'});
        console.error(err);
    });
});

const isEmpty = (str)=>{
    if(str.trim() === "") return true;
    else return false;
}

const validEmail = (str)=> {
    const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if(str.match(emailRegEx)){
        return true;
    }
    else{
        return false;
    }
}

app.post('/signup', (req,res)=>{
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        username: req.body.username
    }
//validate user input
let errors = {};
if(isEmpty(newUser.email)) { errors.email = "Must not be empty";}
else if(!validEmail(newUser.email)) {errors.email = "Must be valid email address";}
if(isEmpty(newUser.password)) errors.password = "Must not be empty";
else if(newUser.password !== newUser.confirmPassword) errors.password = "must match";
if(isEmpty(newUser.username)) errors.username = "Must not be empty";

if(Object.keys(errors).length > 0){
    res.status(400).json(errors);
    return;
}
    //checks for this new user instance in firebase db
    db.doc(`/users/${newUser.username}`).get()
    .then(doc =>{
        if(doc.exists){
            return res.status(400).json({username: "this username is already taken"})
        }
        else{
            return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password);
        }
    })
    .then(data => {
        const userCredentails = {
            username: newUser.username,
            email: newUser.email,
            createdAt: new Date().toISOString(),
            userId: data.user.uid
        }
        db.doc(`/users/${newUser.username}`).set(userCredentails);
        return res.status(201).json(userCredentails);
    })
    .catch(err =>{
        console.error(err);
        if(err.code === 'auth/email-already-in-use')
            return res.status(400).json({email: 'Email is already in use'});
        if(err.code === "auth/weak-password")
            return res.status(400).json({email: 'Password is weak'});
        else return res.status(500).json({error: err.code});
    })
})

exports.api = functions.https.onRequest(app);
