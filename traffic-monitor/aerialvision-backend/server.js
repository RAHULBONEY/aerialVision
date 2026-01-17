require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/auth');
const adminOperatorsRoutes = require("./src/routes/admin.operators");
const app = express();


app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ success: true, status: 'OK' });
});


app.use('/api/auth', authRoutes);
app.use("/api/admin", adminOperatorsRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`API running on ${PORT}`);
});
