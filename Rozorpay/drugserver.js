const express = require('express');
const Razorpay = require('razorpay');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());  // To allow requests from your Python app

// Razorpay instance (Replace with your Razorpay Key ID and Key Secret)
const razorpay = new Razorpay({
    key_id: "rzp_test_s4VCEeosHiS3ZO",
    key_secret: "jX2DZDjwpONTwpcAOU77cMJw"
});

// Create order endpoint
app.post('/create-order', async (req, res) => {
    try {
        const { amount, name, description } = req.body;

        // Create a Razorpay order
        const options = {
            amount: amount * 100,  // Amount in paise (smallest unit)
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
            payment_capture: 1  // Automatically capture the payment after authorization
        };

        const order = await razorpay.orders.create(options);
        
        // Send back the order details to the frontend
        res.json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            key_id: 'YOUR_RAZORPAY_KEY_ID',  // Your Razorpay Key ID
            name: name,
            description: description,
            contact: '8457013810',  // Add contact details if needed
            email: 'YOUR_EMAIL'  // Add email details if needed
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ success: false, error: 'Failed to create order' });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
