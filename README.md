# Hospital Management System

A comprehensive hospital management system built with Node.js, Express, MongoDB, and React. This system allows patients to book appointments with doctors, manage their medical records, and provides doctors with tools to manage their schedules and patient information.

## 🏥 Features

### Core Functionality
- **User Authentication**: Secure JWT-based authentication with role-based access control
- **Role Management**: Three distinct roles (Patient, Doctor, Admin) with specific permissions
- **Doctor Management**: Complete CRUD operations for doctors with profiles and availability
- **Appointment Booking**: Smart booking system with double-booking prevention
- **Premium Priority**: Premium patients get priority in appointment scheduling
- **Time Slot Management**: 30-minute appointment slots with doctor availability
- **Rating System**: Patients can rate doctors with automatic average calculation

### Advanced Features
- **Real-time Validation**: Prevents double bookings and conflicts
- **Secure Payments**: Ready for payment gateway integration
- **Prescription Management**: Digital prescription system
- **Admin Dashboard**: Comprehensive analytics and user management
- **Responsive Design**: Modern UI built with Tailwind CSS

## 🛠 Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database with Mongoose ODM
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **CORS & Helmet** - Security middleware

### Frontend
- **React** - UI framework with TypeScript
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Heroicons** - Icon library
- **Axios** - HTTP client

## 📁 Project Structure

```
hospital-management-system/
├── backend/
│   ├── models/          # Database models (User, Doctor, Appointment, Payment)
│   ├── routes/          # API routes
│   ├── middleware/      # Authentication and authorization middleware
│   ├── .env            # Environment variables
│   ├── server.js       # Main server file
│   └── package.json    # Dependencies
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── contexts/    # React contexts (Auth)
│   │   ├── services/    # API services
│   │   └── App.tsx      # Main app component
│   └── package.json    # Dependencies
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- MongoDB (local or MongoDB Atlas)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hospital-management-system
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```

3. **Configure Environment Variables**
   - Copy `.env` file and update with your configuration:
   ```env
   PORT=5000
   MONGODB_URI=mongodb+srv://demo:demo123@cluster0.mongodb.net/hospital-management
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   NODE_ENV=development
   ```

4. **Start Backend Server**
   ```bash
   npm run dev
   ```
   Backend will run on `http://localhost:5000`

5. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

6. **Start Frontend Development Server**
   ```bash
   npm start
   ```
   Frontend will run on `http://localhost:3000`

## 📊 Database Schema

### Users Collection
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: ['admin', 'doctor', 'patient'],
  isPremium: Boolean (default: false),
  createdAt: Date
}
```

### Doctors Collection
```javascript
{
  doctorId: ObjectId (ref: User),
  specialization: String,
  experience: Number,
  hospital: String,
  availabilitySlots: [{
    day: String,
    startTime: String,
    endTime: String
  }],
  rating: Number (default: 0),
  consultationFee: Number,
  totalRatings: Number,
  ratingSum: Number
}
```

### Appointments Collection
```javascript
{
  appointmentId: String (unique),
  patientId: ObjectId (ref: User),
  doctorId: ObjectId (ref: Doctor),
  date: Date,
  timeSlot: String,
  status: ['pending', 'confirmed', 'cancelled', 'completed'],
  priority: Number (0: normal, 1: premium),
  paymentStatus: ['pending', 'paid', 'refunded'],
  prescription: {
    medicines: [Object],
    notes: String,
    prescribedAt: Date
  }
}
```

### Payments Collection
```javascript
{
  paymentId: String (unique),
  userId: ObjectId (ref: User),
  amount: Number,
  paymentGatewayId: String,
  status: ['pending', 'completed', 'failed', 'refunded'],
  paymentType: ['premium_upgrade', 'consultation_fee'],
  appointmentId: ObjectId (ref: Appointment),
  createdAt: Date,
  completedAt: Date
}
```

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Doctors
- `GET /api/doctors` - Get all doctors (with search/filter)
- `GET /api/doctors/:id` - Get doctor details
- `POST /api/doctors` - Add new doctor (admin only)
- `PUT /api/doctors/:id` - Update doctor profile
- `DELETE /api/doctors/:id` - Delete doctor (admin only)
- `POST /api/doctors/:id/rate` - Rate doctor (patients only)
- `GET /api/doctors/:id/available-slots` - Get available time slots

### Appointments
- `POST /api/appointments` - Book appointment (patients only)
- `GET /api/appointments/my` - Get user's appointments
- `PATCH /api/appointments/:id/status` - Update appointment status (doctors only)
- `PATCH /api/appointments/:id/cancel` - Cancel appointment
- `POST /api/appointments/:id/prescription` - Add prescription (doctors only)
- `GET /api/appointments` - Get all appointments (admin only)

### Payments
- `POST /api/payments/premium` - Upgrade to premium

### Admin
- `GET /api/admin/dashboard` - Admin dashboard data

## 🎯 User Workflows

### Patient Registration & Login
1. User registers with email/password
2. Backend validates and hashes password
3. JWT token generated and stored
4. User can access patient features

### Doctor Appointment Booking
1. Patient searches for doctors
2. Views doctor profile and availability
3. Selects date and time slot
4. System checks for double booking
5. Appointment created with priority based on premium status

### Premium Patient Priority
- Premium patients get priority = 1
- Normal patients get priority = 0
- Doctor dashboard sorts by priority (premium first)

### Double Booking Prevention
- Database unique index on (doctorId, date, timeSlot)
- Application-level validation
- Proper error handling for conflicts

## 🔧 Development

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Building for Production
```bash
# Backend
cd backend
npm start

# Frontend
cd frontend
npm run build
```

## 🌟 Key Features Implemented

✅ **Complete Authentication System**
- JWT-based secure authentication
- Role-based access control
- Protected routes and middleware

✅ **Doctor Management**
- Full CRUD operations
- Availability scheduling
- Rating system with averages

✅ **Smart Appointment System**
- Double booking prevention
- Premium patient priority
- Time slot management
- Status tracking

✅ **Modern Frontend**
- Responsive design with Tailwind CSS
- TypeScript for type safety
- Context-based state management
- Protected routing

✅ **Security Features**
- Password hashing with bcrypt
- JWT token authentication
- CORS and security headers
- Input validation and sanitization

## 📈 Future Enhancements

- [ ] Payment gateway integration (Stripe/Razorpay)
- [ ] Real-time notifications (Socket.io)
- [ ] Video consultation integration
- [ ] Advanced analytics dashboard
- [ ] Mobile app development
- [ ] Email/SMS notifications
- [ ] File upload for medical records
- [ ] Multi-language support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions, please contact [your-email@example.com]

---

**Built with ❤️ for better healthcare management**
