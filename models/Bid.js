const mongoose = require('mongoose');

const BidSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'item'
  },
  bidder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  },
  amount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('bid', BidSchema);
