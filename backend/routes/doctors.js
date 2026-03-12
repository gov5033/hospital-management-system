const express = require('express');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get all doctors (public route)
router.get('/', async (req, res) => {
  try {
    const { specialization, search } = req.query;
    let query = {};
    
    if (specialization) {
      query.specialization = specialization;
    }
    
    let doctors = await Doctor.find(query)
      .populate('doctorId', 'name email')
      .sort({ rating: -1 });
    
    // If search parameter is provided, filter by doctor name
    if (search) {
      doctors = doctors.filter(doctor => 
        doctor.doctorId.name.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    res.json({
      message: 'Doctors retrieved successfully',
      doctors: doctors.map(doctor => ({
        id: doctor._id,
        doctorId: doctor.doctorId._id,
        name: doctor.doctorId.name,
        email: doctor.doctorId.email,
        specialization: doctor.specialization,
        experience: doctor.experience,
        hospital: doctor.hospital,
        rating: doctor.rating,
        consultationFee: doctor.consultationFee,
        availabilitySlots: doctor.availabilitySlots
      }))
    });
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single doctor details
router.get('/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('doctorId', 'name email');
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    res.json({
      message: 'Doctor retrieved successfully',
      doctor: {
        id: doctor._id,
        doctorId: doctor.doctorId._id,
        name: doctor.doctorId.name,
        email: doctor.doctorId.email,
        specialization: doctor.specialization,
        experience: doctor.experience,
        hospital: doctor.hospital,
        rating: doctor.rating,
        consultationFee: doctor.consultationFee,
        availabilitySlots: doctor.availabilitySlots,
        totalRatings: doctor.totalRatings
      }
    });
  } catch (error) {
    console.error('Get doctor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add new doctor (admin only)
router.post('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, email, password, specialization, experience, hospital, consultationFee, availabilitySlots } = req.body;
    
    // Validate required fields
    if (!name || !email || !password || !specialization || !experience || !hospital || !consultationFee) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Create user with doctor role
    const user = new User({
      name,
      email,
      password,
      role: 'doctor'
    });
    
    await user.save();
    
    // Create doctor profile
    const doctor = new Doctor({
      doctorId: user._id,
      specialization,
      experience,
      hospital,
      consultationFee,
      availabilitySlots: availabilitySlots || []
    });
    
    await doctor.save();
    
    res.status(201).json({
      message: 'Doctor added successfully',
      doctor: {
        id: doctor._id,
        name: user.name,
        email: user.email,
        specialization: doctor.specialization,
        experience: doctor.experience,
        hospital: doctor.hospital,
        consultationFee: doctor.consultationFee
      }
    });
  } catch (error) {
    console.error('Add doctor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update doctor profile (doctor can update their own profile)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Check if user is the doctor themselves or an admin
    if (req.user.role !== 'admin' && doctor.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { specialization, experience, hospital, consultationFee, availabilitySlots } = req.body;
    
    // Update fields
    if (specialization) doctor.specialization = specialization;
    if (experience) doctor.experience = experience;
    if (hospital) doctor.hospital = hospital;
    if (consultationFee) doctor.consultationFee = consultationFee;
    if (availabilitySlots) doctor.availabilitySlots = availabilitySlots;
    
    await doctor.save();
    
    res.json({
      message: 'Doctor profile updated successfully',
      doctor: {
        id: doctor._id,
        specialization: doctor.specialization,
        experience: doctor.experience,
        hospital: doctor.hospital,
        consultationFee: doctor.consultationFee,
        availabilitySlots: doctor.availabilitySlots
      }
    });
  } catch (error) {
    console.error('Update doctor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete doctor (admin only)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Delete the associated user
    await User.findByIdAndDelete(doctor.doctorId);
    
    // Delete the doctor profile
    await Doctor.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Doctor deleted successfully' });
  } catch (error) {
    console.error('Delete doctor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Rate a doctor (patients only)
router.post('/:id/rate', authenticateToken, authorizeRoles('patient'), async (req, res) => {
  try {
    const { rating } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    
    const doctor = await Doctor.findById(req.params.id);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    await doctor.addRating(rating);
    
    res.json({
      message: 'Doctor rated successfully',
      newRating: doctor.rating,
      totalRatings: doctor.totalRatings
    });
  } catch (error) {
    console.error('Rate doctor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get available time slots for a doctor on a specific date
router.get('/:id/available-slots', async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }
    
    const doctor = await Doctor.findById(req.params.id);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    const requestedDate = new Date(date);
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][requestedDate.getDay()];
    
    // Find availability for the day
    const dayAvailability = doctor.availabilitySlots.find(slot => slot.day === dayOfWeek);
    
    if (!dayAvailability) {
      return res.json({ availableSlots: [] });
    }
    
    // Generate 30-minute slots
    const slots = [];
    const [startHour, startMinute] = dayAvailability.startTime.split(':').map(Number);
    const [endHour, endMinute] = dayAvailability.endTime.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMinute = startMinute;
    
    while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
      const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      slots.push(timeString);
      
      // Add 30 minutes
      currentMinute += 30;
      if (currentMinute >= 60) {
        currentMinute -= 60;
        currentHour++;
      }
    }
    
    res.json({
      availableSlots: slots,
      day: dayOfWeek,
      date: date
    });
  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
