const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const path = require('path');
const axios = require('axios');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Use body-parser to parse POST request data
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());


mongoose.connect('mongodb://localhost:27017/customberDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('MongoDB Connected to localhost'))
    .catch(err => console.log('MongoDB Connection Error:', err));


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
        fullname,
        sex,
        dob,
        mobile,
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
    const secretKey = process.env.RECAPTCHA_SECRET;

    // Verify CAPTCHA
    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify`;

    try {
        const captchaVerification = await axios.post(verificationUrl, null, {
            params: {
                secret: secretKey,
                response: recaptchaResponse,
            },
        });

        if (!captchaVerification.data.success) {
            return res.status(400).redirect('/accessdenied.html');
        }

        const foundUser = await Customer.findOne({ fullname });

        if (!foundUser) {
            return res.status(404).redirect('/accessdenied.html');
        }

        const isMatch = await bcrypt.compare(password, foundUser.password);

        if (isMatch) {
            return res.status(200).redirect('/index.html');
        } else {
            return res.status(401).redirect('/accessdenied.html');
        }
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).send('An error occurred during login');
    }
});

// Setup Razorpay
const razorpay = new Razorpay({
    key_id: "rzp_test_s4VCEeosHiS3ZO",
    key_secret: "jX2DZDjwpONTwpcAOU77cMJw"
});

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

// Read CSV file
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

// Define Schema for Prescription if not done already
const prescriptionSchema = new mongoose.Schema({
    patient: String,
    doctor: String,
    diagnosis: String,
    medicines: Array,
    date: { type: Date, default: Date.now }
});
const Prescription = mongoose.model('Prescription', prescriptionSchema);

// Save prescription
app.post('/submit-prescription', (req, res) => {
    const { patient, doctor, diagnosis, medicines } = req.body;

    const prescription = new Prescription({
        patient,
        doctor,
        diagnosis,
        medicines,
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

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
