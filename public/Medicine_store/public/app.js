let medicines = [];
let cart = [];
let cartTotal = 0;

async function fetchMedicines() {
    try {
        const response = await fetch('meddata.csv');
        const data = await response.text();
        return new Promise((resolve, reject) => {
            Papa.parse(data, {
                header: true,
                complete: function(results) {
                    resolve(results.data);
                },
                error: function(error) {
                    reject(error);
                }
            });
        });
    } catch (error) {
        console.error("Error fetching CSV file:", error);
    }
}

function suggestMedicines(query) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';

    if (query.length === 0) return;

    const filteredMedicines = medicines.filter(medicine => {
        return medicine.name && medicine.name.toLowerCase().includes(query.toLowerCase());
    });

    if (filteredMedicines.length > 0) {
        filteredMedicines.forEach(medicine => {
            const div = document.createElement('div');
            div.classList.add('result-item');
            div.textContent = `${medicine.name} - ₹${medicine.price}`;
            div.addEventListener('click', () => {
                addToCart(medicine);
            });
            resultsContainer.appendChild(div);
        });
    } else {
        const div = document.createElement('div');
        div.classList.add('result-item');
        div.textContent = 'No suggestions found';
        resultsContainer.appendChild(div);
    }
}

function addToCart(medicine) {
    const cartContainer = document.getElementById('cart');
    const existingItem = cart.find(item => item.name === medicine.name);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...medicine, quantity: 1 });
    }

    updateCartUI();
}

function updateCartUI() {
    const cartContainer = document.getElementById('cart');
    cartContainer.innerHTML = '';

    cartTotal = 0;
    let totalItems = 0;

    cart.forEach(item => {
        const div = document.createElement('div');
        div.classList.add('cart-item');
        div.textContent = `${item.name} - ${item.quantity} x ₹${item.price} = ₹${(item.quantity * item.price).toFixed(2)}`;
        cartContainer.appendChild(div);
        cartTotal += item.quantity * item.price;
        totalItems += item.quantity;
    });

    document.getElementById('cart-total').textContent = `Cart Total: ₹${cartTotal.toFixed(2)} | Items: ${totalItems}`;
}

async function checkout() {
    if (cart.length === 0) {
        alert('Your cart is empty.');
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/create-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: cartTotal,
                name: 'Medicine Purchase',
                description: 'Medicines bought from the store'
            })
        });

        const order = await response.json();

        if (order.success) {
            const options = {
                key: order.key_id,
                amount: order.amount,
                currency: "INR",
                name: order.name,
                description: order.description,
                order_id: order.order_id,
                handler: function (response) {
                    alert('Payment successful!');
                    cart = [];
                    updateCartUI();
                },
                theme: {
                    color: "#3399cc"
                }
            };

            const rzp1 = new Razorpay(options);
            rzp1.open();
        } else {
            alert('Failed to create Razorpay order.');
        }
    } catch (error) {
        console.error('Error during checkout:', error);
    }
}

async function init() {
    medicines = await fetchMedicines();

    const searchInput = document.getElementById('search');
    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        suggestMedicines(query);
    });

    document.getElementById('checkout').addEventListener('click', checkout);
}

init();
