
import React, { useState, useRef } from 'react';
import { EyeIcon, EyeSlashIcon, ClockIcon, CalendarIcon } from './Icons';

interface FormInputProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  maxLength?: number;
  inputMode?: React.HTMLProps<HTMLInputElement>['inputMode'];
  error?: string;
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  min,
  max,
  step,
  maxLength,
  inputMode,
  error,
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isPasswordInput = type === 'password';
  const isTimeInput = type === 'time';
  const isDateInput = type === 'date';
  const currentInputType = isPasswordInput ? (isPasswordVisible ? 'text' : 'password') : type;
  const hasError = !!error;

  const toggleVisibility = () => {
    setIsPasswordVisible(prev => !prev);
  };

  const handlePickerClick = () => {
    if (inputRef.current && !disabled) {
      if ('showPicker' in inputRef.current) {
        try {
          // @ts-ignore
          inputRef.current.showPicker();
        } catch (error) {
          console.warn("showPicker failed", error);
        }
      }
    }
  };

  const hasIcon = isPasswordInput || isTimeInput || isDateInput;

  return (
    <div className={hasError ? 'animate-shake' : ''}>
      <label htmlFor={name} className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type={currentInputType}
          name={name}
          id={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          maxLength={maxLength}
          inputMode={inputMode}
          className={`w-full px-3 py-2 border placeholder-light-subtle dark:placeholder-dark-subtle text-light-text dark:text-dark-text bg-light-background dark:bg-dark-background rounded-md focus:outline-none sm:text-sm disabled:bg-light-border dark:disabled:bg-dark-border disabled:opacity-70 disabled:cursor-not-allowed ${hasIcon ? 'pr-10' : ''} ${(isTimeInput || isDateInput) ? 'cursor-pointer' : ''} ${hasError ? 'border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-light-border dark:border-dark-border focus:ring-primary focus:border-primary'}`}
          onClick={(isTimeInput || isDateInput) ? handlePickerClick : undefined}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${name}-error` : undefined}
        />
        {isPasswordInput && (
          <button
            type="button"
            onClick={toggleVisibility}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 dark:text-gray-400 hover:text-light-text dark:hover:text-dark-text"
            aria-label={isPasswordVisible ? "Hide password" : "Show password"}
          >
            {isPasswordVisible ? (
              <EyeSlashIcon className="h-5 w-5" />
            ) : (
              <EyeIcon className="h-5 w-5" />
            )}
          </button>
        )}
        {(isTimeInput || isDateInput) && (
            <div
                className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-700 dark:text-gray-300"
            >
                {isTimeInput ? (
                <ClockIcon className="h-5 w-5" />
                ) : (
                <CalendarIcon className="h-5 w-5" />
                )}
            </div>
        )}
      </div>
      {hasError && (
        <p id={`${name}-error`} className="mt-1 text-xs text-red-600 dark:text-red-400">
            {error}
        </p>
      )}
    </div>
  );
};

export default FormInput;
