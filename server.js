const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const path = require('path');
const nodemailer = require('nodemailer');
const axios = require('axios');

const app = express();
require('dotenv').config();
//const otpRoutes = require('./otpController'); // Import your router file

// Use body-parser to parse POST request data
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/customerDB', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

// Define a Schema and Model for Customer
const customerSchema = new mongoose.Schema({
    fullname: String,
    sex: String,
    dob: Date,
    mobile: String,
    password: String
});

const Customer = mongoose.model('Customer', customerSchema);

// Serve static files (HTML, CSS)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/stylelogpage.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'stylelogpage.css'));
});

app.get('/success.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

app.get('/accessdenied.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'accessdenied.html'));
});

// Handle form submission and insert into MongoDB
app.post('/register', async (req, res) => {
    const { fullname, sex, dob, mobile, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newCustomer = new Customer({
        fullname: fullname,
        sex: sex,
        dob: dob,
        mobile: mobile,
        password: hashedPassword
    });

    try {
        await newCustomer.save();
        res.redirect('/success.html');
    } catch (err) {
        res.status(500).send('Error saving customer: ' + err.message);
    }
});

// Login route
app.post('/login', async (req, res) => {
    const { fullname, password, 'g-recaptcha-response': recaptchaResponse } = req.body;
    const secretKey = '6LeX8j0qAAAAAEalQQfMSgA8WAhj5iR4ur25uxnd'; // Replace with your actual secret key

    // Verify CAPTCHA
    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify`;

    try {
        // Send CAPTCHA verification request
        const captchaVerification = await axios.post(verificationUrl, null, {
            params: {
                secret: secretKey,
                response: recaptchaResponse,
            },
        });

        // Check if CAPTCHA is not successful
        if (!captchaVerification.data.success) {
            return res.status(400).redirect('/accessdenied.html');
        }

        // Find the user in the database
        const foundUser = await Customer.findOne({ fullname: fullname });

        // If user is not found, redirect to access denied
        if (!foundUser) {
            return res.status(404).redirect('/accessdenied.html');
        }

        // Check if the password matches
        const isMatch = await bcrypt.compare(password, foundUser.password);

        // If password is correct, redirect to index page
        if (isMatch) {
            return res.status(200).redirect('/index.html');
        } else {
            // If password doesn't match, redirect to access denied
            return res.status(401).redirect('/accessdenied.html');
        }
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).send('An error occurred during login');
    }
});
// Use OTP routes
//app.use('/api', otpRoutes); // Make sure the path matches the routes in otpRoutes.js

// Start the server
const Razorpay = require('razorpay');
const crypto = require('crypto');
const fs = require('fs');

app.use(bodyParser.json());

// Setup Razorpay
const razorpay = new Razorpay({
    key_id: "rzp_test_s4VCEeosHiS3ZO",
    key_secret: "jX2DZDjwpONTwpcAOU77cMJw"
});

// Serve static files (if needed)
app.use(express.static(path.join(__dirname, 'public')));

// Create order endpoint
app.post('/create-order', async (req, res) => {
    try {
        const { amount, name, description } = req.body;

        const options = {
            amount: amount * 100, // amount in paise
            currency: 'INR',
            receipt: crypto.randomBytes(16).toString('hex'),
            notes: {
                name,
                description
            }
        };

        const order = await razorpay.orders.create(options);
        res.json({
            success: true,
            order_id: order.id,
            amount: options.amount,
            key_id: razorpay.key_id,
            name,
            description
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Example endpoint to read a CSV file (if needed)
app.get('/meddata', (req, res) => {
    const filePath = path.join(__dirname, 'data', 'meddata.csv');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).json({ error: 'Error reading file' });
            return;
        }
        res.send(data);
    });
});
app.post('/submit-prescription', (req, res) => {
    const { patient, doctor, diagnosis, medicines } = req.body;

    const prescription = new Prescription({
        patient,
        doctor,
        diagnosis,
        medicines, // Add medicine details as an array
        date: new Date()
    });

    prescription.save()
        .then(result => {
            res.status(200).json({ message: 'Prescription saved successfully' });
        })
        .catch(err => {
            res.status(500).json({ message: 'Error saving prescription', error: err });
        });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

