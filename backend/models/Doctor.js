const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  specialization: {
    type: String,
    required: [true, 'Specialization is required'],
    trim: true
  },
  experience: {
    type: Number,
    required: [true, 'Experience is required'],
    min: [0, 'Experience cannot be negative']
  },
  hospital: {
    type: String,
    required: [true, 'Hospital name is required'],
    trim: true
  },
  availabilitySlots: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true
    },
    startTime: {
      type: String,
      required: true,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time in HH:MM format']
    },
    endTime: {
      type: String,
      required: true,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time in HH:MM format']
    }
  }],
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot exceed 5']
  },
  consultationFee: {
    type: Number,
    required: [true, 'Consultation fee is required'],
    min: [0, 'Consultation fee cannot be negative']
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  ratingSum: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Method to calculate average rating
doctorSchema.methods.calculateAverageRating = function() {
  if (this.totalRatings === 0) {
    this.rating = 0;
  } else {
    this.rating = this.ratingSum / this.totalRatings;
  }
  return this.rating;
};

// Method to add rating
doctorSchema.methods.addRating = function(newRating) {
  this.totalRatings += 1;
  this.ratingSum += newRating;
  this.calculateAverageRating();
  return this.save();
};

module.exports = mongoose.model('Doctor', doctorSchema);
