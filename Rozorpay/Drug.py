import tkinter as tk
from tkinter import ttk, messagebox, simpledialog
import pandas as pd
import webbrowser
import requests
import json

class MedicineStore:
    def __init__(self, root):
        self.root = root
        self.root.title("Medicine Store")
        self.root.geometry("800x600")

        # Load medicine data from CSV file
        self.medicine_data = pd.read_csv("meddata.csv")

        # Create a stylish theme for the UI using ttk widgets
        style = ttk.Style(self.root)
        style.theme_use("clam")

        # Header label
        self.header_label = ttk.Label(self.root, text="Welcome to the Medicine Store", font=("Arial", 20, "bold"))
        self.header_label.pack(pady=20)

        # Create search frame
        self.search_frame = ttk.Frame(self.root, padding="10 10 10 10")
        self.search_frame.pack(fill="x", padx=10)

        # Create search entry field
        self.search_entry = ttk.Entry(self.search_frame, width=40, font=("Arial", 12))
        self.search_entry.pack(side="left", padx=10)
        self.search_entry.bind("<KeyRelease>", self.suggest_medicines)

        # Create search results listbox
        self.result_frame = ttk.Frame(self.root)
        self.result_frame.pack(fill="both", expand=True, padx=10, pady=10)

        self.scrollbar = ttk.Scrollbar(self.result_frame, orient="vertical")
        self.search_results = tk.Listbox(self.result_frame, width=40, height=10, yscrollcommand=self.scrollbar.set, font=("Arial", 12))
        self.scrollbar.config(command=self.search_results.yview)
        self.search_results.pack(side="left", fill="both", expand=True)
        self.scrollbar.pack(side="right", fill="y")

        # Create cart frame
        self.cart_frame = ttk.Frame(self.root, padding="10 10 10 10")
        self.cart_frame.pack(fill="x")

        # Create cart listbox with scroll bar
        self.cart_scrollbar = ttk.Scrollbar(self.cart_frame, orient="vertical")
        self.cart_listbox = tk.Listbox(self.cart_frame, width=40, height=5, yscrollcommand=self.cart_scrollbar.set, font=("Arial", 12))
        self.cart_scrollbar.config(command=self.cart_listbox.yview)
        self.cart_listbox.pack(side="left", fill="both", expand=True)
        self.cart_scrollbar.pack(side="right", fill="y")

        # Create add to cart button
        self.add_to_cart_button = ttk.Button(self.cart_frame, text="Add to Cart", command=self.add_to_cart)
        self.add_to_cart_button.pack(side="left", padx=10)

        # Create checkout button
        self.checkout_button = ttk.Button(self.cart_frame, text="Checkout", command=self.checkout)
        self.checkout_button.pack(side="left", padx=10)

        # Create cart total label
        self.cart_total_label = ttk.Label(self.cart_frame, text="Cart Total: ₹0.00", font=("Arial", 14))
        self.cart_total_label.pack(side="left", padx=10)

        # Initialize cart total
        self.cart_total = 0.0

    def suggest_medicines(self, event):
        # Clear current suggestions
        self.search_results.delete(0, tk.END)

        # Get the text entered by the user
        query = self.search_entry.get().strip().lower()

        # Filter the medicine data based on the input
        if query:
            results = self.medicine_data[self.medicine_data["name"].str.contains(query, case=False)]

            # Display suggestions in the listbox
            for index, row in results.iterrows():
                self.search_results.insert(tk.END, f"{row['name']} - ₹{row['price']}")
        else:
            # If the query is empty, clear the listbox
            self.search_results.delete(0, tk.END)

    def add_to_cart(self):
        # Get selected medicine from search results listbox
        selected_medicine_index = self.search_results.curselection()
        if selected_medicine_index:
            selected_medicine = self.search_results.get(selected_medicine_index)

            # Extract medicine name and price from selected medicine string
            medicine_name, medicine_price = selected_medicine.split(" - ")
            medicine_price = float(medicine_price[1:])  # Remove ₹ symbol

            # Ask user for quantity
            quantity = simpledialog.askinteger("Quantity", "Enter quantity of " + medicine_name + " (in tablets)", parent=self.root, minvalue=1)

            if quantity is not None:
                # Calculate total price for the selected quantity
                total_price = medicine_price * quantity

                # Add medicine to cart listbox
                self.cart_listbox.insert(tk.END, f"{medicine_name} - {quantity} x ₹{medicine_price:.2f} = ₹{total_price:.2f}")

                # Update cart total
                self.cart_total += total_price
                self.cart_total_label.config(text=f"Cart Total: ₹{self.cart_total:.2f}")
        else:
            messagebox.showerror("Error", "Please select a medicine from the search results.")

    def checkout(self):  # The method now belongs to the MedicineStore class
        # Confirm before proceeding to payment
        response = messagebox.askyesno("Checkout", "Do you want to proceed to payment?")
        if response:
            try:
                # Prepare order data
                order_data = {
                    "amount": self.cart_total,  # Razorpay expects amount in smallest unit (paise)
                    "name": "Medicine Purchase",
                    "description": "Medicines bought from the store"
                }

                # Make a POST request to the Node.js backend to create an order
                response = requests.post("http://localhost:3000/create-order", json=order_data)
                order = response.json()

                if order.get('success'):
                    # Construct Razorpay payment URL with order details
                    payment_url = f"https://checkout.razorpay.com/v1/checkout.js?order_id={order['order_id']}&amount={order['amount']}&key_id={order['key_id']}&name={order['name']}&description={order['description']}&contact={order['contact']}&email={order['email']}"
                    
                    # Open the payment page in the browser
                    chrome_path = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe %s'
                    webbrowser.get(chrome_path).open(payment_url)

                    # Clear the cart and reset cart total after initiating payment
                    self.cart_listbox.delete(0, tk.END)
                    self.cart_total = 0.0
                    self.cart_total_label.config(text="Cart Total: ₹0.00")
                else:
                    messagebox.showerror("Error", "Failed to create Razorpay order.")
            except Exception as e:
                messagebox.showerror("Error", f"Failed to proceed to payment: {str(e)}")
        else:
            messagebox.showinfo("Checkout", "Checkout cancelled!")


if __name__ == "__main__":
    root = tk.Tk()
    app = MedicineStore(root)
    root.mainloop()
