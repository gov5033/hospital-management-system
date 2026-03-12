const express = require('express');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Book new appointment (patients only)
router.post('/', authenticateToken, authorizeRoles('patient'), async (req, res) => {
  try {
    const { doctorId, date, timeSlot } = req.body;
    
    // Validate required fields
    if (!doctorId || !date || !timeSlot) {
      return res.status(400).json({ message: 'Doctor ID, date, and time slot are required' });
    }
    
    // Check if doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Check if the requested time slot is available
    const requestedDate = new Date(date);
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][requestedDate.getDay()];
    
    // Find doctor's availability for that day
    const dayAvailability = doctor.availabilitySlots.find(slot => slot.day === dayOfWeek);
    if (!dayAvailability) {
      return res.status(400).json({ message: `Doctor is not available on ${dayOfWeek}` });
    }
    
    // Check if time slot is within doctor's working hours
    const [slotHour, slotMinute] = timeSlot.split(':').map(Number);
    const [startHour, startMinute] = dayAvailability.startTime.split(':').map(Number);
    const [endHour, endMinute] = dayAvailability.endTime.split(':').map(Number);
    
    const slotTime = slotHour * 60 + slotMinute;
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    
    if (slotTime < startTime || slotTime >= endTime) {
      return res.status(400).json({ message: 'Time slot is outside doctor\'s working hours' });
    }
    
    // Check for double booking
    const existingAppointment = await Appointment.findOne({
      doctorId: doctorId,
      date: new Date(date),
      timeSlot: timeSlot,
      status: { $in: ['pending', 'confirmed'] }
    });
    
    if (existingAppointment) {
      return res.status(409).json({ message: 'This time slot is already booked' });
    }
    
    // Check if patient already has an appointment at the same time
    const patientConflict = await Appointment.findOne({
      patientId: req.user._id,
      date: new Date(date),
      timeSlot: timeSlot,
      status: { $in: ['pending', 'confirmed'] }
    });
    
    if (patientConflict) {
      return res.status(409).json({ message: 'You already have an appointment at this time' });
    }
    
    // Create new appointment
    const appointment = new Appointment({
      patientId: req.user._id,
      doctorId: doctorId,
      date: new Date(date),
      timeSlot: timeSlot
    });
    
    await appointment.save();
    
    // Populate appointment details for response
    await appointment.populate([
      { path: 'patientId', select: 'name email' },
      { path: 'doctorId', populate: { path: 'doctorId', select: 'name email' } }
    ]);
    
    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment: {
        id: appointment._id,
        appointmentId: appointment.appointmentId,
        patient: appointment.patientId.name,
        doctor: appointment.doctorId.doctorId.name,
        date: appointment.date,
        timeSlot: appointment.timeSlot,
        status: appointment.status,
        priority: appointment.priority,
        paymentStatus: appointment.paymentStatus
      }
    });
  } catch (error) {
    console.error('Book appointment error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'This time slot is already booked' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user's appointments (patients and doctors)
router.get('/my', authenticateToken, async (req, res) => {
  try {
    let appointments;
    
    if (req.user.role === 'patient') {
      // Patients see their own appointments
      appointments = await Appointment.find({ patientId: req.user._id })
        .populate({
          path: 'doctorId',
          populate: { path: 'doctorId', select: 'name email specialization' }
        })
        .sort({ date: 1, timeSlot: 1 });
    } else if (req.user.role === 'doctor') {
      // Doctors need to find their doctor profile first
      const doctorProfile = await Doctor.findOne({ doctorId: req.user._id });
      if (!doctorProfile) {
        return res.status(404).json({ message: 'Doctor profile not found' });
      }
      
      // Doctors see their appointments, sorted by priority (premium first) then date
      appointments = await Appointment.find({ doctorId: doctorProfile._id })
        .populate({ path: 'patientId', select: 'name email isPremium' })
        .sort({ priority: -1, date: 1, timeSlot: 1 });
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json({
      message: 'Appointments retrieved successfully',
      appointments: appointments.map(appointment => {
        if (req.user.role === 'patient') {
          return {
            id: appointment._id,
            appointmentId: appointment.appointmentId,
            doctor: appointment.doctorId.doctorId.name,
            doctorSpecialization: appointment.doctorId.doctorId.specialization,
            date: appointment.date,
            timeSlot: appointment.timeSlot,
            status: appointment.status,
            priority: appointment.priority,
            paymentStatus: appointment.paymentStatus,
            prescription: appointment.prescription
          };
        } else {
          return {
            id: appointment._id,
            appointmentId: appointment.appointmentId,
            patient: appointment.patientId.name,
            patientEmail: appointment.patientId.email,
            isPremium: appointment.patientId.isPremium,
            date: appointment.date,
            timeSlot: appointment.timeSlot,
            status: appointment.status,
            priority: appointment.priority,
            paymentStatus: appointment.paymentStatus,
            prescription: appointment.prescription
          };
        }
      })
    });
  } catch (error) {
    console.error('Get my appointments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update appointment status (doctors only)
router.patch('/:id/status', authenticateToken, authorizeRoles('doctor'), async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    // Find doctor profile
    const doctorProfile = await Doctor.findOne({ doctorId: req.user._id });
    if (!doctorProfile) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }
    
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      doctorId: doctorProfile._id
    });
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    appointment.status = status;
    await appointment.save();
    
    res.json({
      message: `Appointment ${status} successfully`,
      appointment: {
        id: appointment._id,
        appointmentId: appointment.appointmentId,
        status: appointment.status
      }
    });
  } catch (error) {
    console.error('Update appointment status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel appointment (patients can cancel their own, doctors can cancel their appointments)
router.patch('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    // Check permissions
    if (req.user.role === 'patient') {
      if (appointment.patientId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (req.user.role === 'doctor') {
      const doctorProfile = await Doctor.findOne({ doctorId: req.user._id });
      if (!doctorProfile || appointment.doctorId.toString() !== doctorProfile._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Only allow cancellation of pending or confirmed appointments
    if (!['pending', 'confirmed'].includes(appointment.status)) {
      return res.status(400).json({ message: 'Cannot cancel completed appointment' });
    }
    
    appointment.status = 'cancelled';
    await appointment.save();
    
    res.json({
      message: 'Appointment cancelled successfully',
      appointment: {
        id: appointment._id,
        appointmentId: appointment.appointmentId,
        status: appointment.status
      }
    });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add prescription to completed appointment (doctors only)
router.post('/:id/prescription', authenticateToken, authorizeRoles('doctor'), async (req, res) => {
  try {
    const { medicines, notes } = req.body;
    
    if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({ message: 'Medicines are required' });
    }
    
    // Find doctor profile
    const doctorProfile = await Doctor.findOne({ doctorId: req.user._id });
    if (!doctorProfile) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }
    
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      doctorId: doctorProfile._id
    });
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    if (appointment.status !== 'completed') {
      return res.status(400).json({ message: 'Prescription can only be added to completed appointments' });
    }
    
    appointment.prescription = {
      medicines,
      notes,
      prescribedAt: new Date()
    };
    
    await appointment.save();
    
    res.json({
      message: 'Prescription added successfully',
      prescription: appointment.prescription
    });
  } catch (error) {
    console.error('Add prescription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all appointments (admin only)
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate([
        { path: 'patientId', select: 'name email isPremium' },
        { path: 'doctorId', populate: { path: 'doctorId', select: 'name email specialization' } }
      ])
      .sort({ date: -1, timeSlot: -1 });
    
    res.json({
      message: 'All appointments retrieved successfully',
      appointments: appointments.map(appointment => ({
        id: appointment._id,
        appointmentId: appointment.appointmentId,
        patient: appointment.patientId.name,
        patientEmail: appointment.patientId.email,
        isPremium: appointment.patientId.isPremium,
        doctor: appointment.doctorId.doctorId.name,
        doctorSpecialization: appointment.doctorId.doctorId.specialization,
        date: appointment.date,
        timeSlot: appointment.timeSlot,
        status: appointment.status,
        priority: appointment.priority,
        paymentStatus: appointment.paymentStatus
      }))
    });
  } catch (error) {
    console.error('Get all appointments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
