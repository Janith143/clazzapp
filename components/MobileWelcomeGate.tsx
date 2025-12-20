import React from 'react';
import { LogoIcon } from './Icons';

interface MobileWelcomeGateProps {
  onLogin: () => void;
  onBrowse: () => void;
}

const MobileWelcomeGate: React.FC<MobileWelcomeGateProps> = ({ onLogin, onBrowse }) => {
  return (
    <div className="fixed inset-0 bg-light-background dark:bg-dark-background z-50 flex flex-col items-center justify-center p-8 text-center animate-fadeIn md:hidden">
      <LogoIcon className="h-20 w-20 text-primary" />
      <h1 className="mt-6 text-3xl font-bold text-light-text dark:text-dark-text">Welcome to clazz.lk</h1>
      <p className="mt-2 text-md text-light-subtle dark:text-dark-subtle">
        Sri Lanka's Premier Online Learning Platform.
      </p>
      <div className="mt-12 w-full max-w-xs space-y-4">
        <button
          onClick={onLogin}
          className="w-full bg-primary text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-primary-dark transition-transform hover:scale-105"
        >
          Login / Sign Up
        </button>
        <button
          onClick={onBrowse}
          className="w-full text-primary font-semibold py-3 px-6 rounded-lg hover:bg-primary/10 transition-colors"
        >
          Browse as Guest
        </button>
      </div>
    </div>
  );
};

export default MobileWelcomeGate;
