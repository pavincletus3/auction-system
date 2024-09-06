const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Item = require('../models/Item');
const Bid = require('../models/Bid');
const User = require('../models/user');

// @route   POST api/items
// @desc    Create a new item
// @access  Private
router.post('/', auth, async (req, res) => {
  const { name, description, startingPrice, endTime } = req.body;

  try {
    const newItem = new Item({
      name,
      description,
      startingPrice,
      currentPrice: startingPrice,
      seller: req.user.id,
      endTime: new Date(endTime)
    });

    const item = await newItem.save();
    res.json(item);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/items
// @desc    Get all items
// @access  Public
router.get('/', async (req, res) => {
  try {
    const items = await Item.find().sort({ date: -1 });
    res.json(items);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/items/:id
// @desc    Get item by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ msg: 'Item not found' });
    }
    res.json(item);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Item not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST api/items/:id/bid
// @desc    Place a bid on an item
// @access  Private
router.post('/:id/bid', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ msg: 'Item not found' });
    }

    if (new Date() > item.endTime) {
      return res.status(400).json({ msg: 'Auction has ended' });
    }

    const { amount } = req.body;
    if (amount <= item.currentPrice) {
      return res.status(400).json({ msg: 'Bid must be higher than current price' });
    }

    const user = await User.findById(req.user.id);
    if (user.balance < amount) {
      return res.status(400).json({ msg: 'Insufficient balance' });
    }

    const newBid = new Bid({
      item: item._id,
      bidder: req.user.id,
      amount
    });

    await newBid.save();

    item.currentPrice = amount;
    item.highestBidder = req.user.id;
    await item.save();

    res.json(newBid);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/items/:id/bids
// @desc    Get bids for an item
// @access  Public
router.get('/:id/bids', async (req, res) => {
  try {
    const bids = await Bid.find({ item: req.params.id }).sort({ date: -1 });
    res.json(bids);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;