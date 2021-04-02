const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  products:{ type: Array,required: true},
  buyerName:{ type: String, required: true},
  buyerPhone: {type: String, required: true},
  buyerAddress: {type: String, required: true},
  buyerEmail: {type: String, required: true},
  paymentType:{type: String, default: 'Cash on Delivery'},
  paymentStatus:{type: String, default: 'Unpaid'},
  deliveryStatus:{type: String, default: 'Order_placed'}
},{timestamps: true})

const Order = module.exports = mongoose.model("Order", orderSchema)
