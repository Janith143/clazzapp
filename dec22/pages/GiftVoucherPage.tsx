import React, { useState, useRef, useEffect } from 'react';
import { useNavigation } from '../contexts/NavigationContext.tsx';
import { useData } from '../contexts/DataContext.tsx';
import { useUI } from '../contexts/UIContext.tsx';
import { ChevronLeftIcon, LogoIcon, DownloadIcon, ShareIcon, MailIcon, CheckCircleIcon, PlusIcon, XIcon } from '../components/Icons.tsx';
import FormInput from '../components/FormInput.tsx';
import { Voucher, User } from '../types.ts';
import html2canvas from 'html2canvas';

type ActiveTab = 'voucher' | 'topup';

interface GiftVoucherPageProps {
  vouchers?: Voucher[];
  successData?: { students: User[]; amountPerStudent: number; totalAmount: number };
}

const GeneratedVoucherCard = React.forwardRef<HTMLDivElement, { voucher: Voucher }>(({ voucher }, ref) => {
    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 });
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(voucher.code)}&qzone=1`;

    return (
        <div ref={ref} className="my-8 rounded-lg shadow-2xl p-6 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-800 dark:to-slate-900 border border-light-border dark:border-dark-border relative overflow-hidden text-light-text dark:text-dark-text">
            <div className="absolute -top-10 -right-10 w-32 h-32 text-primary/10 dark:text-primary/5">
                <LogoIcon />
            </div>
            <div className="relative z-10">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-bold text-lg text-primary">GIFT VOUCHER</p>
                        <div className="flex items-center space-x-1 mt-1">
                            <LogoIcon className="h-5 w-5 text-light-subtle dark:text-dark-subtle" />
                            <span className="text-md font-bold">clazz.<span className="text-primary">lk</span></span>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-primary">{currencyFormatter.format(voucher.amount)}</p>
                </div>
                <div className="mt-4 text-left">
                    {voucher.recipientName && <p className="text-sm text-light-subtle dark:text-dark-subtle">To: {voucher.recipientName}</p>}
                    <p className="text-sm text-light-subtle dark:text-dark-subtle">From: {voucher.cardSenderName || 'A Kind Gifter'}</p>
                </div>
                {voucher.message && <blockquote className="text-left mt-3 p-3 border-l-4 border-primary/50 bg-primary/10 rounded-r-md italic text-sm">"{voucher.message}"</blockquote>}
                <div className="mt-6 text-center">
                    <p className="text-sm text-light-subtle dark:text-dark-subtle">Your voucher code is:</p>
                    <p className="mt-1 text-2xl font-bold tracking-widest text-white bg-primary p-3 rounded-md font-mono">{voucher.code}</p>
                    <p className="text-xs text-light-subtle dark:text-dark-subtle mt-2">Redeem at checkout or in student dashboard.</p>
                </div>
                <div className="mt-6 pt-4 border-t border-light-border dark:border-dark-border flex items-end justify-between">
                     <div className="text-left text-xs text-light-subtle dark:text-dark-subtle">
                        <p>Voucher ID: {voucher.id}</p>
                        <p>Valid Until: {new Date(voucher.expiresAt).toLocaleDateString()}</p>
                        <div className="flex items-center space-x-1 mt-2">
                            <MailIcon className="w-3 h-3"/>
                            <span>Support: info@clazz.lk</span>
                        </div>
                    </div>
                    <img src={qrCodeUrl} alt="QR Code" crossOrigin="anonymous" className="w-20 h-20 rounded-md shadow-sm bg-white p-1" />
                </div>
            </div>
        </div>
    );
});


const GiftVoucherPage: React.FC<GiftVoucherPageProps> = ({ vouchers: successVouchers, successData: successTopUpData }) => {
    const { handleNavigate } = useNavigation();
    const { users, handleVoucherPurchaseRequest, handleExternalTopUpRequest } = useData();
    const { addToast } = useUI();
    
    const [activeTab, setActiveTab] = useState<ActiveTab>(successTopUpData ? 'topup' : 'voucher');
    
    // Voucher states
    const [voucherFormData, setVoucherFormData] = useState({
        amount: '',
        quantity: '1',
        billingFirstName: '', billingLastName: '', billingEmail: '', billingContactNumber: '', billingAddressLineOne: '',
        cardSenderName: '', recipientName: '',
        message: 'A gift of learning lasts a lifetime – redeem this voucher on Clazz.lk and unlock new knowledge',
    });
    const voucherCardRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Top-up states
    const [topUpFormData, setTopUpFormData] = useState({
        amount: '', billingFirstName: '', billingLastName: '', billingEmail: '', billingContactNumber: '', billingAddressLineOne: '',
    });
    const [currentStudentIdInput, setCurrentStudentIdInput] = useState('');
    const [foundStudent, setFoundStudent] = useState<User | null>(null);
    const [topUpStudentList, setTopUpStudentList] = useState<User[]>([]);

    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 });
    
    const isVoucherSuccess = !!successVouchers;
    const isTopUpSuccess = !!successTopUpData;

    useEffect(() => {
        if (successVouchers) {
            voucherCardRefs.current = voucherCardRefs.current.slice(0, successVouchers.length);
        }
    }, [successVouchers]);

    useEffect(() => {
        if (activeTab === 'topup') {
            const studentId = currentStudentIdInput.trim().toUpperCase();
            if (studentId) {
                const student = users.find(u => u.id.toUpperCase() === studentId && u.role === 'student');
                setFoundStudent(student || null);
            } else {
                setFoundStudent(null);
            }
        }
    }, [currentStudentIdInput, users, activeTab]);

    const handleVoucherChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if(name === 'quantity' && parseInt(value, 10) < 1) return;
        setVoucherFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTopUpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTopUpFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    }

    const handleVoucherSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(voucherFormData.amount);
        const quantity = parseInt(voucherFormData.quantity, 10);
        if (isNaN(amount) || amount <= 0 || isNaN(quantity) || quantity <= 0) { addToast('Please enter valid amount and quantity.', 'error'); return; }
        if (amount < 100) { addToast(`Minimum voucher amount is ${currencyFormatter.format(100)}.`, 'error'); return; }
        if (amount % 100 !== 0) { addToast(`Voucher amount must be in multiples of ${currencyFormatter.format(100)}.`, 'error'); return; }

        const { amount: _amount, quantity: _quantity, ...details } = voucherFormData;
        handleVoucherPurchaseRequest({ amount, ...details }, quantity);
    };
    
    const handleAddStudent = () => {
        if (foundStudent && !topUpStudentList.some(s => s.id === foundStudent.id)) {
            setTopUpStudentList(prev => [...prev, foundStudent]);
            setCurrentStudentIdInput('');
            setFoundStudent(null);
        } else if (foundStudent) {
            addToast('This student is already in the list.', 'info');
        } else {
            addToast('Invalid Student ID.', 'error');
        }
    };

    const handleRemoveStudent = (studentId: string) => {
        setTopUpStudentList(prev => prev.filter(s => s.id !== studentId));
    };
    
    const handleTopUpSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(topUpFormData.amount);
        if (topUpStudentList.length === 0) { addToast('Please add at least one student.', 'error'); return; }
        if (isNaN(amount) || amount <= 0) { addToast('Please enter a valid amount per student.', 'error'); return; }
        if (amount < 100) { addToast(`Minimum top-up amount is ${currencyFormatter.format(100)}.`, 'error'); return; }
        if (amount % 100 !== 0) { addToast(`Top-up amount must be in multiples of ${currencyFormatter.format(100)}.`, 'error'); return; }

        handleExternalTopUpRequest(topUpStudentList, amount, topUpFormData);
    };


    const handleDownload = (index: number, code: string) => {
        const element = voucherCardRefs.current[index];
        if (!element) return;
        html2canvas(element, { scale: 2, useCORS: true }).then(canvas => {
            const link = document.createElement('a');
            link.download = `clazz-lk-gift-voucher-${code}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    };

    const handleShare = (code: string) => {
        navigator.clipboard.writeText(code)
            .then(() => addToast('Voucher code copied to clipboard!', 'success'))
            .catch(() => addToast('Could not copy code.', 'error'));
    };
    
    const VoucherPreviewCard: React.FC = () => {
        const sender = voucherFormData.cardSenderName || 'A Kind Gifter';
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=clazz.lk-preview&qzone=1`;

        return (
             <div className="my-8 rounded-lg shadow-xl p-6 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-800 dark:to-slate-900 border border-light-border dark:border-dark-border relative overflow-hidden text-light-text dark:text-dark-text">
                <div className="absolute -top-10 -right-10 w-32 h-32 text-primary/10 dark:text-primary/5"><LogoIcon /></div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-bold text-lg text-primary">GIFT VOUCHER</p>
                            <div className="flex items-center space-x-1 mt-1"><LogoIcon className="h-5 w-5 text-light-subtle dark:text-dark-subtle" /><span className="text-md font-bold">clazz.<span className="text-primary">lk</span></span></div>
                        </div>
                        <p className="text-3xl font-bold text-primary">{currencyFormatter.format(parseFloat(voucherFormData.amount) || 0)}</p>
                    </div>
                    <div className="mt-4 text-left">
                        {voucherFormData.recipientName && <p className="text-sm text-light-subtle dark:text-dark-subtle">To: {voucherFormData.recipientName}</p>}
                        <p className="text-sm text-light-subtle dark:text-dark-subtle">From: {sender}</p>
                    </div>
                    {voucherFormData.message && <blockquote className="text-left mt-3 p-3 border-l-4 border-primary/50 bg-primary/10 rounded-r-md italic text-sm">"{voucherFormData.message}"</blockquote>}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-light-subtle dark:text-dark-subtle">Your code will appear here after purchase</p>
                        <div className="mt-1 text-2xl font-bold tracking-widest text-white bg-gray-400/50 dark:bg-gray-700/50 p-3 rounded-md font-mono">CODE-HIDDEN</div>
                        <p className="text-xs text-light-subtle dark:text-dark-subtle mt-2">Redeem at checkout or in student dashboard.</p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-light-border dark:border-dark-border flex items-end justify-between">
                         <div className="text-left text-xs text-light-subtle dark:text-dark-subtle">
                            <p>Voucher ID: V-XXXXXXXX</p>
                            <p>Valid Until: 6 Months from Purchase</p>
                            <div className="flex items-center space-x-1 mt-2">
                                <MailIcon className="w-3 h-3"/>
                                <span>Support: info@clazz.lk</span>
                            </div>
                        </div>
                        <img src={qrCodeUrl} alt="QR Code Preview" crossOrigin="anonymous" className="w-20 h-20 rounded-md shadow-sm bg-white p-1" />
                    </div>
                </div>
            </div>
        )
    };

    const voucherAmount = parseFloat(voucherFormData.amount) || 0;
    const voucherQuantity = parseInt(voucherFormData.quantity, 10) || 1;
    const totalVoucherAmount = voucherAmount * voucherQuantity;
    const totalTopUpAmount = (parseFloat(topUpFormData.amount) || 0) * topUpStudentList.length;
    
    const tabs = [
        { id: 'voucher', label: "Buy a Gift Voucher" },
        { id: 'topup', label: "Top Up Account" }
    ];

    const TermsAndConditions = () => (
         <div className="mt-6 text-left text-xs text-light-subtle dark:text-dark-subtle bg-light-background dark:bg-dark-background p-4 rounded-lg border border-light-border dark:border-dark-border">
            <h4 className="font-bold text-sm text-light-text dark:text-dark-text mb-2">Terms & Conditions</h4>
            <ul className="list-disc list-inside space-y-1">
                <li>Non-refundable & non-exchangeable for cash.</li>
                <li>Can be used only on clazz.lk platform.</li>
                <li>No partial use; the full voucher amount is redeemed at once.</li>
                <li>One-time use per voucher.</li>
                <li>Clazz.lk is not responsible for lost, stolen, or unauthorized use of vouchers.</li>
                <li>Tampered or altered vouchers will be void.</li>
            </ul>
        </div>
    );

    const renderVoucherForm = () => (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
             <div className="bg-light-surface dark:bg-dark-surface p-8 rounded-lg shadow-md">
                <h1 className="text-3xl font-bold">Buy a Gift Voucher</h1>
                <p className="mt-2 text-light-subtle dark:text-dark-subtle">Give the gift of learning.</p>
                <form onSubmit={handleVoucherSubmit} className="mt-8 space-y-6">
                    <div>
                        <h3 className="font-semibold text-lg border-b border-light-border dark:border-dark-border pb-2 mb-4">Voucher Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <FormInput label="Voucher Amount (LKR)" name="amount" type="number" value={voucherFormData.amount} onChange={handleVoucherChange} required placeholder="e.g., 2500" min={100} step={100} />
                            <FormInput label="Number of Vouchers" name="quantity" type="number" value={voucherFormData.quantity} onChange={handleVoucherChange} required min={1} />
                        </div>
                        <p className="text-xs text-light-subtle dark:text-dark-subtle mt-1">Minimum value is {currencyFormatter.format(100)}. Amount must be in multiples of {currencyFormatter.format(100)}.</p>
                    </div>
                     <div>
                        <h3 className="font-semibold text-lg border-b border-light-border dark:border-dark-border pb-2 mb-4">Billing Details (for Payment)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormInput label="First Name" name="billingFirstName" value={voucherFormData.billingFirstName} onChange={handleVoucherChange} required maxLength={30} />
                            <FormInput label="Last Name" name="billingLastName" value={voucherFormData.billingLastName} onChange={handleVoucherChange} required maxLength={30} />
                        </div>
                        <div className="mt-4"><FormInput label="Email" name="billingEmail" type="email" value={voucherFormData.billingEmail} onChange={handleVoucherChange} required /></div>
                        <div className="mt-4"><FormInput label="Contact Number" name="billingContactNumber" type="tel" value={voucherFormData.billingContactNumber} onChange={handleVoucherChange} required placeholder="+94771234567" /></div>
                        <div className="mt-4"><FormInput label="Address Line 1" name="billingAddressLineOne" value={voucherFormData.billingAddressLineOne} onChange={handleVoucherChange} required /></div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg border-b border-light-border dark:border-dark-border pb-2 mb-4">Gift Card Customization (Optional)</h3>
                        <FormInput label="Your Name (to show on card)" name="cardSenderName" value={voucherFormData.cardSenderName} onChange={handleVoucherChange} />
                        <div className="mt-4"><FormInput label="Recipient's Name" name="recipientName" value={voucherFormData.recipientName} onChange={handleVoucherChange} /></div>
                        <div className="mt-4"><label className="block text-sm font-medium mb-1 text-light-text dark:text-dark-text">Personal Message</label><textarea name="message" value={voucherFormData.message} onChange={handleVoucherChange} rows={3} maxLength={150} className="w-full px-3 py-2 border rounded-md bg-light-background dark:bg-dark-background border-light-border dark:border-dark-border text-light-text dark:text-dark-text focus:outline-none focus:ring-primary focus:border-primary"/></div>
                    </div>
                     <div className="pt-4 space-y-2">
                        <div className="text-right">
                            <p className="text-light-subtle dark:text-dark-subtle">Total Amount</p>
                            <p className="text-2xl font-bold text-primary">{currencyFormatter.format(totalVoucherAmount)}</p>
                        </div>
                        <button type="submit" className="w-full bg-primary text-white font-bold py-3 rounded-md hover:bg-primary-dark transition-colors">Proceed to Purchase</button>
                    </div>
                </form>
             </div>
             <div className="sticky top-24">
                <h3 className="text-lg font-semibold text-center mb-2 text-light-text dark:text-dark-text">Live Preview</h3>
                <VoucherPreviewCard />
                <TermsAndConditions />
             </div>
         </div>
    );
    
    const renderTopUpForm = () => (
         <div className="bg-light-surface dark:bg-dark-surface p-8 rounded-lg shadow-md">
            <h1 className="text-3xl font-bold">Top Up a Student Account</h1>
            <p className="mt-2 text-light-subtle dark:text-dark-subtle">Directly add funds to one or more student accounts.</p>
            <form onSubmit={handleTopUpSubmit} className="mt-8 space-y-6">
                <div>
                    <h3 className="font-semibold text-lg border-b border-light-border dark:border-dark-border pb-2 mb-4">Top-Up Details</h3>
                    <FormInput label="Amount per Student (LKR)" name="amount" type="number" value={topUpFormData.amount} onChange={handleTopUpChange} required placeholder="e.g., 2500" min={100} step={100} />
                    <p className="text-xs text-light-subtle dark:text-dark-subtle mt-1">Minimum value is {currencyFormatter.format(100)}. Amount must be in multiples of {currencyFormatter.format(100)}.</p>

                    <div className="mt-4">
                        <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Student ID(s)</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={currentStudentIdInput}
                                onChange={(e) => setCurrentStudentIdInput(e.target.value)}
                                placeholder="e.g., STD0001AA"
                                className="w-full px-3 py-2 border border-light-border dark:border-dark-border placeholder-light-subtle dark:placeholder-dark-subtle text-light-text dark:text-dark-text bg-light-background dark:bg-dark-background rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            />
                            <button
                                type="button"
                                onClick={handleAddStudent}
                                disabled={!foundStudent || topUpStudentList.some(s => s.id === foundStudent.id)}
                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <PlusIcon className="w-5 h-5"/>
                            </button>
                        </div>
                        {currentStudentIdInput && (
                            foundStudent ? (
                                <p className="text-sm font-medium text-green-600 dark:text-green-400 mt-1">✓ {foundStudent.firstName} {foundStudent.lastName}</p>
                            ) : (
                                <p className="text-sm text-red-500 mt-1">Student not found</p>
                            )
                        )}
                        {topUpStudentList.length > 0 && (
                            <div className="mt-4 space-y-2 max-h-40 overflow-y-auto p-2 border rounded-md bg-light-background dark:bg-dark-background">
                                {topUpStudentList.map(student => (
                                    <div key={student.id} className="flex justify-between items-center p-2 bg-light-surface dark:bg-dark-surface rounded-md">
                                        <div>
                                            <p className="font-semibold text-sm">{student.firstName} {student.lastName}</p>
                                            <p className="text-xs text-light-subtle dark:text-dark-subtle">{student.id}</p>
                                        </div>
                                        <button onClick={() => handleRemoveStudent(student.id)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full">
                                            <XIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                 <div>
                    <h3 className="font-semibold text-lg border-b border-light-border dark:border-dark-border pb-2 mb-4">Billing Details (for Payment)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput label="First Name" name="billingFirstName" value={topUpFormData.billingFirstName} onChange={handleTopUpChange} required maxLength={30} />
                        <FormInput label="Last Name" name="billingLastName" value={topUpFormData.billingLastName} onChange={handleTopUpChange} required maxLength={30} />
                    </div>
                    <div className="mt-4"><FormInput label="Email" name="billingEmail" type="email" value={topUpFormData.billingEmail} onChange={handleTopUpChange} required /></div>
                    <div className="mt-4"><FormInput label="Contact Number" name="billingContactNumber" type="tel" value={topUpFormData.billingContactNumber} onChange={handleTopUpChange} required placeholder="+94771234567" /></div>
                    <div className="mt-4"><FormInput label="Address Line 1" name="billingAddressLineOne" value={topUpFormData.billingAddressLineOne} onChange={handleTopUpChange} required /></div>
                </div>
                 <div className="p-4 rounded-md bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400">
                    <p className="font-bold text-yellow-800 dark:text-yellow-200">Important Notice</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">These payments are non-refundable. Please ensure the Student ID(s) are correct before proceeding.</p>
                </div>
                 <div className="pt-4 space-y-2">
                     <div className="text-right">
                        <p className="text-light-subtle dark:text-dark-subtle">Total Amount</p>
                        <p className="text-2xl font-bold text-primary">{currencyFormatter.format(totalTopUpAmount)}</p>
                    </div>
                    <button type="submit" className="w-full bg-primary text-white font-bold py-3 rounded-md hover:bg-primary-dark transition-colors">
                        Proceed to Payment
                    </button>
                </div>
            </form>
         </div>
    );

    const resetTopUpForm = () => {
        handleNavigate({ name: 'gift_voucher' });
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slideInUp">
            <div className="mb-8"><button onClick={() => handleNavigate({name: 'home'})} className="flex items-center space-x-2 text-sm font-medium text-primary hover:text-primary-dark"><ChevronLeftIcon className="h-5 w-5" /><span>Back to Home</span></button></div>
            <div className="max-w-4xl mx-auto">
                {!isVoucherSuccess && !isTopUpSuccess && (
                    <div className="border-b border-light-border dark:border-dark-border mb-8">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                            {tabs.map(tab => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id as ActiveTab)} className={`${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-light-subtle dark:text-dark-subtle hover:text-light-text'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}>{tab.label}</button>
                            ))}
                        </nav>
                    </div>
                )}
                
                {activeTab === 'voucher' ? (
                    isVoucherSuccess ? (
                        <div className="text-center">
                            <h1 className="text-3xl font-bold">Purchase Successful!</h1>
                            <p className="mt-2 text-light-subtle dark:text-dark-subtle">Here {successVouchers!.length > 1 ? 'are your' : 'is your'} gift {successVouchers!.length > 1 ? 'vouchers' : 'voucher'}. Share them with the recipient!</p>
                            <div className="space-y-8 mt-8 max-w-lg mx-auto">
                                {successVouchers!.map((voucher, index) => (
                                    <div key={voucher.code}>
                                        <GeneratedVoucherCard ref={el => { voucherCardRefs.current[index] = el; }} voucher={voucher} />
                                        <div className="flex justify-center space-x-4 -mt-4"><button onClick={() => handleDownload(index, voucher.code)} className="flex items-center space-x-2 px-6 py-2 border border-primary text-primary rounded-md font-semibold hover:bg-primary/10"><DownloadIcon className="w-5 h-5"/><span>Download</span></button><button onClick={() => handleShare(voucher.code)} className="flex items-center space-x-2 px-6 py-2 border border-primary text-primary rounded-md font-semibold hover:bg-primary/10"><ShareIcon className="w-5 h-5"/><span>Copy Code</span></button></div>
                                    </div>
                                ))}
                            </div>
                            <TermsAndConditions />
                        </div>
                    ) : renderVoucherForm()
                ) : (
                    isTopUpSuccess ? (
                        <div className="text-center bg-light-surface dark:bg-dark-surface p-8 rounded-lg shadow-md">
                            <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                            <h1 className="text-3xl font-bold">Top-Up Successful!</h1>
                            <p className="mt-2 text-light-subtle dark:text-dark-subtle">The following student accounts have been updated.</p>
                            <div className="mt-6 text-lg space-y-2 text-left max-w-sm mx-auto p-4 bg-light-background dark:bg-dark-background rounded-md">
                                <p><span className="font-semibold">Amount per Student:</span> {currencyFormatter.format(successTopUpData?.amountPerStudent || 0)}</p>
                                <p><span className="font-semibold">Total Amount:</span> {currencyFormatter.format(successTopUpData?.totalAmount || 0)}</p>
                                <div className="pt-2 mt-2 border-t border-light-border dark:border-dark-border">
                                    <p className="font-semibold mb-2">Recipients:</p>
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                        {successTopUpData?.students.map(s => (
                                            <div key={s.id} className="p-2 bg-light-surface dark:bg-dark-surface rounded-md">
                                                <p className="font-semibold text-sm">{s.firstName} {s.lastName}</p>
                                                <p className="text-xs text-light-subtle dark:text-dark-subtle">{s.id}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                             <div className="mt-8 text-left max-w-sm mx-auto text-xs text-light-subtle dark:text-dark-subtle bg-light-background dark:bg-dark-background p-4 rounded-lg border border-light-border dark:border-dark-border">
                                <h4 className="font-bold text-sm text-light-text dark:text-dark-text mb-2">Terms & Conditions</h4>
                                <ul className="list-disc list-inside space-y-1"><li>All top-up payments are final and non-refundable.</li><li>It is the purchaser's responsibility to ensure the Student ID is entered correctly.</li><li>Funds can only be used for purchases on the clazz.lk platform.</li><li>Clazz.lk is not liable for funds sent to an incorrect Student ID due to user error.</li></ul>
                            </div>
                            <button onClick={resetTopUpForm} className="mt-8 px-6 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-dark">Top Up Another Account</button>
                        </div>
                    ) : renderTopUpForm()
                )}
            </div>
        </div>
    );
};

export default GiftVoucherPage;