'use client';

import { useState } from 'react';
import { AuthUser } from '@/types/grocery';

interface AuthFormProps {
  onAuthSuccess: (user: AuthUser) => void;
}

interface AuthResponseData {
  error?: string;
  user: AuthUser;
}

export default function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [householdId, setHouseholdId] = useState(''); // Shared linking token (Registration only)
  const [role, setRole] = useState<'husband' | 'wife'>('husband');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Conditionally assemble payload based on user flow state
    const payload = {
      action: isRegistering ? 'register' : 'login',
      username: username.trim().toLowerCase(),
      password,
      ...(isRegistering && {
        householdId: householdId.trim().toLowerCase(),
        role
      })
    };

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data: AuthResponseData = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication aborted');
      
      localStorage.setItem('household_user', JSON.stringify(data.user));
      onAuthSuccess(data.user);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected system error occurred');
      }
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-6 font-sans bg-white rounded-2xl shadow-xl text-black border">
      <h2 className="text-xl font-black mb-1 text-center text-gray-900">🏡 Household Portal</h2>
      <p className="text-xs text-gray-400 text-center mb-6">
        {isRegistering ? 'Link a new couple profile partition' : 'Sign into your shared household'}
      </p>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && (
          <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100 text-center">
            {error}
          </p>
        )}
        
        <input 
          type="text" 
          placeholder="Your Username" 
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border p-2.5 rounded-lg bg-white text-sm focus:outline-blue-500 text-black"
          required
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2.5 rounded-lg bg-white text-sm focus:outline-blue-500 text-black"
          required
        />
        
        {/* REGISTRATION ONLY FIELDS */}
        {isRegistering && (
          <>
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">
                Shared Household Code (Match with Spouse)
              </label>
              <input 
                type="text" 
                placeholder="e.g. taha_afifah_home" 
                value={householdId}
                onChange={(e) => setHouseholdId(e.target.value)}
                className="border p-2.5 rounded-lg bg-white text-sm focus:outline-blue-500 text-black w-full"
                required={isRegistering}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">
                Account Household Role
              </label>
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value as 'husband' | 'wife')}
                className="border p-2.5 rounded-lg w-full bg-white text-sm text-black"
              >
                <option value="husband">👨 Husband Profile</option>
                <option value="wife">👩 Wife Profile</option>
              </select>
            </div>
          </>
        )}

        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-2.5 rounded-lg text-sm mt-2 shadow-sm">
          {isRegistering ? 'Register & Link Account' : 'Authenticate Credentials'}
        </button>
      </form>

      <button 
        onClick={() => {
          setIsRegistering(!isRegistering);
          setError('');
        }} 
        className="text-xs text-gray-500 hover:underline block text-center mt-4 mx-auto"
      >
        {isRegistering ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
      </button>
    </div>
  );
}