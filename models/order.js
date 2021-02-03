const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  items:{ type: Array,required: true},
  name:{ type: String, required: true},
  phone: {type: String, required: true},
  address: {type: String, required: true},
  email: {type: String, required: true},
  paymentType:{type: String, default: 'Cash on Delivery'},
  paymentStatus:{type: String, default: 'Unpaid'},
  deliveryStatus:{type: String, default: 'Order_placed'}
},{timestamps: true})

const Order = module.exports = mongoose.model("Order", orderSchema)
