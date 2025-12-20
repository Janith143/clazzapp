import React from 'react';
import { Sale } from '../../types';
import { CheckCircleIcon } from '../Icons';

interface OrderStatusTrackerProps {
    status: Sale['photoOrderStatus'];
}

const steps = [
    { name: 'Order Placed', status: 'pending' },
    { name: 'Processing', status: 'processing' },
    { name: 'Shipped', status: 'shipped' },
    { name: 'Delivered', status: 'delivered' },
];

const OrderStatusTracker: React.FC<OrderStatusTrackerProps> = ({ status }) => {
    const currentStepIndex = steps.findIndex(step => step.status === status);

    return (
        <div className="w-full">
            <nav aria-label="Progress">
                <ol role="list" className="flex items-center">
                    {steps.map((step, stepIdx) => (
                        <li key={step.name} className={`relative ${stepIdx !== steps.length - 1 ? 'flex-1' : ''}`}>
                            <div className="flex items-center text-sm font-medium">
                                {stepIdx <= currentStepIndex ? (
                                    <>
                                        {/* Completed Step */}
                                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary group-hover:bg-primary-dark">
                                            <CheckCircleIcon className="h-5 w-5 text-white" aria-hidden="true" />
                                        </span>
                                        <span className="ml-2 text-xs sm:text-sm font-semibold text-primary">{step.name}</span>
                                    </>
                                ) : (
                                    <>
                                        {/* Upcoming Step */}
                                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-light-border dark:border-dark-border">
                                            <span className="h-2 w-2 rounded-full bg-light-border dark:bg-dark-border" />
                                        </span>
                                        <span className="ml-2 text-xs sm:text-sm font-medium text-light-subtle dark:text-dark-subtle">{step.name}</span>
                                    </>
                                )}
                            </div>

                            {/* Connecting Line */}
                            {stepIdx !== steps.length - 1 ? (
                                <div className="absolute top-4 left-4 -ml-px h-0.5 w-full bg-light-border dark:bg-dark-border" aria-hidden="true" style={{marginLeft: '1rem', paddingRight: '1rem'}}>
                                    <div className={`h-full w-full transition-colors duration-500 ${stepIdx < currentStepIndex ? 'bg-primary' : 'bg-transparent'}`} />
                                </div>
                            ) : null}
                        </li>
                    ))}
                </ol>
            </nav>
        </div>
    );
};

export default OrderStatusTracker;
