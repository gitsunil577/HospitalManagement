const express = require('express');
const bodyParser = require('body-parser');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const app = express();
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

