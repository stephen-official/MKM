import React, { useEffect, useState } from 'react';
import { fetchGodowns, registerUser } from '../api/auth';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [godowns, setGodowns] = useState([]);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'user', godownId: '' });
  const navigate = useNavigate();

  useEffect(() => {
    fetchGodowns().then(res => setGodowns(res.data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await registerUser(formData);
      alert("Registration Successful!");
      navigate('/login');
    } catch (err) {
      alert(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-6">Create Account</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Full Name" className="w-full p-3 border rounded-lg" 
            onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          
          <input type="email" placeholder="Email Address" className="w-full p-3 border rounded-lg" 
            onChange={(e) => setFormData({...formData, email: e.target.value})} required />
          
          <input type="password" placeholder="Password" className="w-full p-3 border rounded-lg" 
            onChange={(e) => setFormData({...formData, password: e.target.value})} required />

          <select className="w-full p-3 border rounded-lg" 
            onChange={(e) => setFormData({...formData, godownId: e.target.value})} required={formData.role === 'user'}>
            <option value="">Select Your Godown</option>
            {godowns.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
          </select>

          <button className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold active:scale-95 transition">
            Register
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;





