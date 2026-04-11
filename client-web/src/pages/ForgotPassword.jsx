const ForgotPassword = () => {
  const [email, setEmail] = useState('');

  const handleRequest = async (e) => {
    e.preventDefault();
    await forgotPassword(email);
    alert("If the email exists, a link has been sent.");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Reset Password</h2>
        <p className="text-sm text-gray-500 mb-4">Enter your email to receive a reset link.</p>
        <form onSubmit={handleRequest} className="space-y-4">
          <input type="email" placeholder="Email" className="w-full p-3 border rounded-lg" 
            onChange={(e) => setEmail(e.target.value)} required />
          <button className="w-full bg-gray-800 text-white p-3 rounded-lg">Send Link</button>
        </form>
      </div>
    </div>
  );
};