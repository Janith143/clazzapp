
import React from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import { useData } from '../../contexts/DataContext';
import { AdminView } from '../../types';

interface CalculationGuideProps {
    setActiveView: (view: AdminView) => void;
    onNavigateToContent?: (sectionKey: string) => void;
}

const FlowBox: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`p-4 border border-light-border dark:border-dark-border rounded-lg bg-light-background dark:bg-dark-background shadow-sm ${className}`}>
        {children}
    </div>
);

const Arrow: React.FC<{ label?: string }> = ({ label }) => (
    <div className="flex flex-col items-center my-2 text-light-subtle dark:text-dark-subtle">
        <div className="text-2xl">↓</div>
        {label && <div className="text-xs -mt-1 font-semibold">{label}</div>}
    </div>
);

const Variable: React.FC<{ name: string; value: string; onLinkClick?: () => void }> = ({ name, value, onLinkClick }) => (
    <div className="flex justify-between items-center text-sm py-1 border-b border-light-border/50 dark:border-dark-border/50">
        <code className="text-light-text dark:text-dark-text">{name}</code>
        <div className="flex items-center gap-2">
            <span className="font-bold text-primary">{value}</span>
            {onLinkClick && (
                <button onClick={onLinkClick} className="text-xs font-semibold text-blue-500 hover:underline">[Edit]</button>
            )}
        </div>
    </div>
);

const CalculationGuide: React.FC<CalculationGuideProps> = ({ setActiveView, onNavigateToContent }) => {
    const { financialSettings } = useNavigation();
    const { teachers, tuitionInstitutes } = useData();
    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 });

    const exampleTeacher = teachers.find(t => t.registrationStatus === 'approved') || teachers[0];
    const exampleInstitute = tuitionInstitutes.find(ti => ti.registrationStatus === 'approved') || tuitionInstitutes[0];

    const navigateToFinancialSettings = () => {
        if (onNavigateToContent) {
            onNavigateToContent('financial_settings');
        } else {
            setActiveView('site_content');
        }
    };
    
    const navigateToUsers = () => setActiveView('users');

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Calculation Guide</h1>
            <p className="text-light-subtle dark:text-dark-subtle -mt-4">
                This guide explains how various financial calculations are performed on the platform.
            </p>

            {/* Referral Earnings */}
            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">1. Referral Partner Earnings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="font-semibold mb-2">Calculation Flow</h3>
                        <FlowBox>Sale by Referred Teacher</FlowBox>
                        <Arrow label="Calculate Net Platform Income (NPI)" />
                        <FlowBox>
                            <p>NPI = (Sale Value * Teacher Commission %) - Gateway Fee - Platform Costs</p>
                        </FlowBox>
                        <Arrow label="Apply Monthly Tiered Commission" />
                        <FlowBox>
                            <p>Referral Earning = NPI * Your Tier Rate</p>
                            <p className="text-xs mt-1 text-light-subtle dark:text-dark-subtle">(Capped per referred teacher)</p>
                        </FlowBox>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Variables</h3>
                        <div className="space-y-2">
                            <Variable name="Gateway Fee Rate" value={`${financialSettings.referralGatewayFeeRate * 100}%`} onLinkClick={navigateToFinancialSettings} />
                            <Variable name="Platform Costs Rate" value={`${financialSettings.referralPlatformCostRate * 100}%`} onLinkClick={navigateToFinancialSettings} />
                            <Variable name="Max Earning per Teacher" value={currencyFormatter.format(financialSettings.referralMaxEarning)} onLinkClick={navigateToFinancialSettings} />
                            <Variable name="Base Rate (Tier 1)" value={`${financialSettings.referralBaseRate * 100}%`} onLinkClick={navigateToFinancialSettings} />
                            <Variable name="Tier 2 Rate (>{currencyFormatter.format(financialSettings.referralTier1Threshold)})" value={`${financialSettings.referralTier1Rate * 100}%`} onLinkClick={navigateToFinancialSettings} />
                            <Variable name="Tier 3 Rate (>{currencyFormatter.format(financialSettings.referralTier2Threshold)})" value={`${financialSettings.referralTier2Rate * 100}%`} onLinkClick={navigateToFinancialSettings} />
                            <Variable name="Tier 4 Rate (>{currencyFormatter.format(financialSettings.referralTier3Threshold)})" value={`${financialSettings.referralTier3Rate * 100}%`} onLinkClick={navigateToFinancialSettings} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Teacher Direct Sale */}
            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">2. Teacher-Direct Platform Sale</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="font-semibold mb-2">Calculation Flow</h3>
                        <FlowBox>Student Pays Class/Course Fee</FlowBox>
                        <Arrow />
                        <FlowBox>
                            <p>Teacher Earning = Sale Value * (100 - Platform Commission) %</p>
                            <p>Platform Earning = Sale Value * Platform Commission %</p>
                        </FlowBox>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Variables</h3>
                        <div className="space-y-2">
                            <Variable name="Platform Commission Rate" value={`${exampleTeacher?.commissionRate || 25}% (example)`} onLinkClick={navigateToUsers} />
                            <p className="text-xs text-light-subtle dark:text-dark-subtle mt-1">This is set per teacher in User Management.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Institute Manual Sale */}
            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">3. Institute Manual (Pay at Venue) Sale</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="font-semibold mb-2">Calculation Flow</h3>
                        <FlowBox>Student Pays Class Fee at Venue</FlowBox>
                        <Arrow label="Institute records payment via Scanner" />
                        <FlowBox>
                            <p>Institute Gross Earning = Sale Value * Institute Commission %</p>
                            <p className="font-bold text-green-600">Institute Net Earning = Institute Gross Earning - Platform Fee</p>
                            <p className="font-bold text-blue-600">Teacher's Share = Sale Value - Institute Gross Earning</p>
                        </FlowBox>
                         <p className="text-xs mt-2 text-center text-light-subtle dark:text-dark-subtle">(Teacher's share is settled by the institute directly)</p>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Variables</h3>
                        <div className="space-y-2">
                            <Variable name="Platform Fee (per transaction)" value={currencyFormatter.format(financialSettings.manualPaymentPlatformFee)} onLinkClick={navigateToFinancialSettings} />
                            <Variable name="Institute Commission Rate" value={`${exampleInstitute?.commissionRate || 25}% (example)`} onLinkClick={navigateToUsers} />
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Institute Platform Sale */}
            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">4. Institute Platform Sale</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="font-semibold mb-2">Calculation Flow</h3>
                        <FlowBox>Student Pays Class Fee on Platform</FlowBox>
                        <Arrow />
                        <FlowBox>
                            <p className="font-bold text-blue-600">Teacher's Earning = Sale Value * (100 - Institute Commission) %</p>
                            <p className="mt-2">Institute Gross Earning = Sale Value * Institute Commission %</p>
                        </FlowBox>
                        <Arrow label="Platform takes its cut from Institute's share" />
                        <FlowBox>
                            <p className="font-bold text-green-600">Institute Net Earning = Institute Gross Earning - (Sale Value * Platform Markup %)</p>
                            <p className="font-bold text-purple-600">Platform Earning = Sale Value * Platform Markup %</p>
                        </FlowBox>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Variables</h3>
                        <div className="space-y-2">
                            <Variable name="Institute Commission Rate" value={`${exampleInstitute?.commissionRate || 25}% (example)`} onLinkClick={navigateToUsers} />
                            <Variable name="Platform Markup Rate" value={`${exampleInstitute?.platformMarkupRate || 15}% (example)`} onLinkClick={navigateToUsers} />
                             <p className="text-xs text-light-subtle dark:text-dark-subtle mt-1">Both rates are set per institute in User Management.</p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default CalculationGuide;
