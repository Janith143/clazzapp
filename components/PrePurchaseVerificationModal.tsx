
import React, { useState, useEffect, useCallback } from 'react';
import Modal from './Modal.tsx';
import { MailIcon, PhoneIcon, CheckCircleIcon } from './Icons.tsx';
import { useUI } from '../contexts/UIContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { auth } from '../firebase.ts';

const PrePurchaseVerificationModal: React.FC = () => {
  const { prePurchaseVerificationModal, setPrePurchaseVerificationModal, setModalState } = useUI();
  const { currentUser, handleResendVerificationEmail } = useAuth();
  
  const { isOpen, missing, onSkip } = prePurchaseVerificationModal;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleClose = useCallback(() => {
    setPrePurchaseVerificationModal({ isOpen: false });
  }, [setPrePurchaseVerificationModal]);

  useEffect(() => {
    if (isOpen) {
        setError('');
        setLoading(false);
        setSuccessMessage('');
    }
  }, [isOpen]);

  const handleSendEmailVerification = async () => {
      if (!auth.currentUser) {
          setError("Session error. Please log out and log back in.");
          return;
      }
      setLoading(true);
      setError('');
      try {
          await handleResendVerificationEmail(auth.currentUser);
          setSuccessMessage(`A verification link has been sent to ${auth.currentUser.email}. Please check your inbox (and spam folder), click the link, and then you can close this window and try your purchase again.`);
      } catch (e: any) {
          setError(e.message || "Failed to send verification email.");
      } finally {
          setLoading(false);
      }
  };
  
  const handleGoToProfile = () => {
      handleClose();
      setModalState({ name: 'edit_student_profile' });
  };

  const handleSkip = () => {
      if (onSkip) {
          onSkip();
          handleClose();
      }
  };


  const renderContent = () => {
    if (successMessage) {
        return (
             <div className="text-center p-4 animate-fadeIn">
                <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold">Success!</h3>
                <p className="text-light-subtle dark:text-dark-subtle mt-2">{successMessage}</p>
            </div>
        );
    }
      
    if (missing === 'email') {
        if (!currentUser?.email) {
            return (
                 <div className="space-y-4 text-center">
                    <p className="text-sm text-light-subtle dark:text-dark-subtle">
                        A verified email address is suggested for course updates.
                    </p>
                    <div className="pt-2 space-y-2">
                        <button onClick={handleGoToProfile} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark">
                            Go to Profile
                        </button>
                        <button onClick={handleSkip} className="w-full text-sm text-light-subtle dark:text-dark-subtle hover:text-primary hover:underline">
                            Skip for now
                        </button>
                    </div>
                </div>
            );
        }
        return (
            <div className="space-y-4">
                 <p className="text-sm text-center text-light-subtle dark:text-dark-subtle">
                    Your email address is not verified. Please click the button below to receive a verification link.
                </p>
                <div className="p-4 bg-light-background dark:bg-dark-background rounded-md border border-light-border dark:border-dark-border text-center">
                    <p className="font-semibold text-light-text dark:text-dark-text">{currentUser?.email}</p>
                </div>
                {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                <div className="pt-2 space-y-2">
                    <button onClick={handleSendEmailVerification} disabled={loading} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark disabled:opacity-50">
                        <MailIcon className="w-5 h-5 mr-2" />
                        {loading ? 'Sending...' : 'Send Verification Link'}
                    </button>
                     <button onClick={handleSkip} className="w-full text-center text-sm text-light-subtle dark:text-dark-subtle hover:text-primary hover:underline">
                        Skip for now
                    </button>
                </div>
            </div>
        );
    }
    
    if (missing === 'mobile') {
        if (!currentUser?.contactNumber) {
             return (
                 <div className="space-y-4 text-center">
                    <p className="text-sm text-light-subtle dark:text-dark-subtle">
                        A verified mobile number is recommended for important alerts.
                    </p>
                    <div className="pt-2 space-y-2">
                        <button onClick={handleGoToProfile} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark">
                            Go to Profile
                        </button>
                        <button onClick={handleSkip} className="w-full text-sm text-light-subtle dark:text-dark-subtle hover:text-primary hover:underline">
                            Skip for now
                        </button>
                    </div>
                </div>
            );
        }
        // If number exists but is unverified, direct to profile where the OTP flow is now located.
        return (
             <div className="space-y-4 text-center">
                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                    Your mobile number <span className="font-semibold">{currentUser.contactNumber}</span> is not verified.
                </p>
                 <p className="text-sm text-light-subtle dark:text-dark-subtle">
                    Please go to your profile to complete the verification process.
                </p>
                <div className="pt-2 space-y-2">
                    <button onClick={handleGoToProfile} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark">
                        Go to Profile
                    </button>
                     <button onClick={handleSkip} className="w-full text-sm text-light-subtle dark:text-dark-subtle hover:text-primary hover:underline">
                        Skip for now
                    </button>
                </div>
            </div>
        );
    }

    return null;
  };
  
  const title = missing === 'email' ? "Verify Your Email" : "Verify Your Mobile Number";

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
        {renderContent()}
    </Modal>
  );
};

export default PrePurchaseVerificationModal;
