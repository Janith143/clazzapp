import React, { useState, useCallback, useEffect } from 'react';
import Modal from './Modal.tsx';
import FormInput from './FormInput.tsx';
import { MailIcon, CheckCircleIcon } from './Icons.tsx';
import { useUI } from '../contexts/UIContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';

const ForgotPasswordModal: React.FC = () => {
  const { setModalState } = useUI();
  const { handlePasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [error, setError] = useState('');

  const handleClose = useCallback(() => {
    setModalState({ name: 'none' });
  }, [setModalState]);

  useEffect(() => {
      let timer: number | undefined;
      if (messageSent) {
          timer = window.setTimeout(() => {
              handleClose();
          }, 4000); // Close modal after 4 seconds
      }
      return () => clearTimeout(timer);
  }, [messageSent, handleClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await handlePasswordReset(email);
      setMessageSent(true);
    } catch (err: any) {
      // For security, we don't reveal if an email doesn't exist.
      // We show the success message regardless, but log the error for debugging.
      console.error("Password reset error:", err);
      setMessageSent(true); // Proceed to success screen to prevent email enumeration
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={handleClose} title="Reset your password">
        {messageSent ? (
            <div className="text-center p-4 animate-fadeIn">
                <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold">Check your email</h3>
                <p className="text-light-subtle dark:text-dark-subtle mt-2">
                    If an account with that email exists, we've sent a link to reset your password.
                </p>
                 <p className="text-xs text-light-subtle dark:text-dark-subtle mt-4">
                    This window will close automatically.
                </p>
            </div>
        ) : (
             <div className="space-y-6">
                <p className="text-center text-sm text-light-subtle dark:text-dark-subtle -mt-2">
                    Enter your email address and we'll send you a link to reset your password.
                </p>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <FormInput 
                        label="Email Address"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                    />
                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                    <div className="pt-2">
                        <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light transition-colors disabled:opacity-50">
                            <MailIcon className="w-5 h-5 mr-2" />
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </div>
                </form>
                <p className="mt-6 text-center text-sm text-light-subtle dark:text-dark-subtle">
                    Remember your password?{' '}
                    <button onClick={() => setModalState({ name: 'login' })} className="font-medium text-primary hover:text-primary-dark focus:outline-none">
                        Back to Login
                    </button>
                </p>
            </div>
        )}
    </Modal>
  );
};

export default ForgotPasswordModal;
