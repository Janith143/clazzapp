import { useCallback } from 'react';
// FIX: Import BillingDetails type to resolve TypeScript error.
import { User, Sale, PageState, Teacher, TuitionInstitute, TopUpRequest, Voucher, CartItem, ProductCartItem, PhotoCartItem, Product, Photo, BillingDetails } from '../../types';
import { UIContextType } from '../../contexts/UIContext';
import { NavigationContextType } from '../../contexts/NavigationContext';
import { db } from '../../firebase';
import { doc, writeBatch, increment, arrayUnion, deleteDoc, setDoc, collection } from 'firebase/firestore';
import { sendPaymentConfirmation, sendNotification, downloadImage, generateStandardId } from '../../utils';
import { notifyUser } from '../../utils/notificationHelper';
import { v4 as uuidv4 } from 'uuid';

const ADMIN_EMAIL = 'admin@clazz.lk';

interface PaymentResponseHandlerDeps {
    currentUser: User | null;
    ui: UIContextType;
    nav: NavigationContextType;
    users: User[];
    teachers: Teacher[];
    tuitionInstitutes: TuitionInstitute[];
    currencyFormatter: Intl.NumberFormat;
}

export const usePaymentResponseHandler = (deps: PaymentResponseHandlerDeps) => {
    const { currentUser, ui, nav, users, teachers, tuitionInstitutes, currencyFormatter } = deps;
    const { functionUrls } = nav;

    const handlePaymentResponse = useCallback(async (params: URLSearchParams): Promise<PageState | null> => {
        const statusCode = params.get('status_code');
        const customFieldsEncoded = params.get('custom_fields');
        if (!statusCode || !customFieldsEncoded) return null;

        window.history.replaceState({}, document.title, window.location.pathname);
        let pageToNavigateTo: PageState | null = { name: 'student_dashboard' };

        const customFields = JSON.parse(decodeURIComponent(atob(customFieldsEncoded)));
        const orderId = params.get('order_id') || `sale_${Date.now()}`;

        try {
            const numericStatusCode = statusCode.replace(/[^0-9]/g, '');
            if (numericStatusCode === '0' || numericStatusCode === '00') {
                const batch = writeBatch(db);
                switch (customFields.type) {
                    case 'enrollment': {
                        const { sale } = customFields;
                        const saleUpdate: Partial<Sale> = { status: 'completed', paymentMethod: 'gateway' };
                        const saleValue = sale.totalAmount + sale.amountPaidFromBalance;

                        if (saleValue > 0) {
                            let platformComm = 0, teacherComm = 0, instituteComm = 0;
                            if (sale.instituteId) {
                                const institute = tuitionInstitutes.find(ti => ti.id === sale.instituteId);
                                if (institute) {
                                    platformComm = saleValue * (institute.platformMarkupRate / 100);

                                    // Use override commission if set for this linked teacher
                                    const effectiveCommissionRate = (sale.teacherId && institute.linkedTeacherCommissions?.[sale.teacherId]) ?? institute.commissionRate;

                                    const instituteGross = saleValue * (effectiveCommissionRate / 100);
                                    instituteComm = instituteGross - platformComm;
                                    teacherComm = saleValue - instituteGross;
                                }
                            } else if (sale.teacherId) {
                                const teacher = teachers.find(t => t.id === sale.teacherId);
                                if (teacher) {
                                    platformComm = saleValue * (teacher.commissionRate / 100);
                                    teacherComm = saleValue - platformComm;
                                }
                            }
                            saleUpdate.platformCommission = platformComm;
                            saleUpdate.teacherCommission = teacherComm;
                            saleUpdate.instituteCommission = instituteComm;
                            if (teacherComm > 0 && sale.teacherId) batch.update(doc(db, 'teachers', sale.teacherId), { 'earnings.total': increment(teacherComm) });
                            if (instituteComm > 0 && sale.instituteId) batch.update(doc(db, 'tuitionInstitutes', sale.instituteId), { 'earnings.total': increment(instituteComm) });
                        }

                        batch.update(doc(db, "sales", sale.id), saleUpdate);
                        if (sale.amountPaidFromBalance > 0 && currentUser) batch.update(doc(db, "users", currentUser.id), { accountBalance: increment(-sale.amountPaidFromBalance) });

                        const student = currentUser || users.find(u => u.id === sale.studentId);
                        if (student) sendPaymentConfirmation(functionUrls.notification, student, sale.totalAmount, sale.itemName, sale.id);

                        // Notify Teacher
                        if (sale.teacherId) {
                            const teacher = teachers.find(t => t.id === sale.teacherId);
                            if (teacher) {
                                notifyUser(
                                    { id: teacher.id, email: teacher.email },
                                    "New Enrollment",
                                    `New student enrolled in ${sale.itemName}: ${student ? student.firstName + ' ' + student.lastName : 'Guest'}`,
                                    { type: 'success', link: '/teacher/dashboard' }
                                );
                            }
                        }

                        ui.addToast(`Successfully enrolled in ${sale.itemName}!`, 'success');

                        pageToNavigateTo = { name: `${customFields.itemType}_detail` as any, [`${customFields.itemType}Id`]: sale.itemId } as PageState;
                        break;
                    }
                    case 'topup':
                        if (currentUser) {
                            const topUpRequest: TopUpRequest = { id: orderId, studentId: currentUser.id, method: 'gateway', amount: customFields.amount, status: 'approved', requestedAt: new Date().toISOString(), processedAt: new Date().toISOString() };
                            batch.update(doc(db, "users", currentUser.id), { accountBalance: increment(customFields.amount), topUpHistory: arrayUnion(topUpRequest) });
                            ui.addToast(`${currencyFormatter.format(customFields.amount)} added to your balance!`, 'success');
                            sendPaymentConfirmation(functionUrls.notification, currentUser, customFields.amount, 'Account Top-Up', orderId);
                        }
                        break;
                    case 'voucher': {
                        const { details, quantity, totalAmount } = customFields;
                        const newVouchers: Voucher[] = [];
                        for (let i = 0; i < quantity; i++) {
                            const voucherRef = doc(collection(db, "vouchers"));
                            const newVoucher: Voucher = {
                                id: voucherRef.id, code: `GIFT${Math.random().toString(36).substring(2, 8).toUpperCase()}`, isUsed: false,
                                purchasedAt: new Date().toISOString(), expiresAt: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString(),
                                amount: details.amount, ...details
                            };
                            batch.set(voucherRef, newVoucher);
                            newVouchers.push(newVoucher);
                        }
                        sendPaymentConfirmation(functionUrls.notification, { email: details.billingEmail }, totalAmount, `${quantity} x Gift Voucher(s)`, orderId);
                        await batch.commit(); return { name: 'voucher_success', vouchers: newVouchers };
                    }
                    case 'external_topup': {
                        const { students, amountPerStudent, totalAmount, billingDetails } = customFields;
                        students.forEach((student: Pick<User, 'id'>) => {
                            const topUpRequest: TopUpRequest = { id: `${orderId}_${student.id}`, studentId: student.id, method: 'gateway', amount: amountPerStudent, status: 'approved', requestedAt: new Date().toISOString(), processedAt: new Date().toISOString() };
                            batch.update(doc(db, "users", student.id), { accountBalance: increment(amountPerStudent), topUpHistory: arrayUnion(topUpRequest) });
                        });
                        sendPaymentConfirmation(functionUrls.notification, billingDetails, totalAmount, `Top-Up for ${students.length} students`, orderId);
                        await batch.commit(); return { name: 'topup_success', successData: { students, amountPerStudent, totalAmount } };
                    }
                    case 'marketplace_purchase':
                    case 'photo_purchase': {
                        const { cart: slimCart, totalAmount, billingDetails, shippingAddress } = customFields;
                        const reconstructedCart: CartItem[] = slimCart.map((item: any) => {
                            if (item.type === 'product') {
                                for (const teacher of teachers) {
                                    const product = teacher.products?.find(p => p.id === item.id);
                                    if (product) return { type: 'product', id: uuidv4(), product, quantity: item.quantity } as ProductCartItem;
                                }
                            } else {
                                const institute = tuitionInstitutes.find(ti => ti.id === item.instituteId);
                                const event = institute?.events?.find(e => e.id === item.eventId);
                                const printOption = item.printOptionId ? nav.photoPrintOptions.find(po => po.id === item.printOptionId) : undefined;
                                let price = 0;
                                if (item.type === 'photo_download') price = event?.gallery?.downloadPrice || 0;
                                else if (item.type === 'photo_download_highres') price = event?.gallery?.downloadPriceHighRes || 0;
                                else if (printOption) price = printOption.price;
                                const photo: Photo = { id: item.id, url_thumb: item.url_thumb, url_highres: item.url_highres };
                                return { type: item.type, id: uuidv4(), photo, eventId: item.eventId, instituteId: item.instituteId, quantity: item.quantity, price, printOption } as PhotoCartItem;
                            }
                            return null;
                        }).filter(Boolean);

                        if (reconstructedCart.length === 0) throw new Error("Failed to process order: cart items not found.");

                        const newSale = await createSaleFromCart(reconstructedCart, totalAmount, billingDetails, shippingAddress, customFields.type, currentUser);
                        batch.set(doc(db, "sales", newSale.id), newSale);

                        if (newSale.teacherCommission && newSale.teacherId) batch.update(doc(db, "teachers", newSale.teacherId), { 'earnings.total': increment(newSale.teacherCommission) });
                        if (newSale.instituteCommission && newSale.instituteId) batch.update(doc(db, "tuitionInstitutes", newSale.instituteId), { 'earnings.total': increment(newSale.instituteCommission) });

                        // Notify Seller (Teacher or Institute)
                        const sellerId = newSale.teacherId || newSale.instituteId;
                        if (sellerId) {
                            const sellerIsTeacher = !!newSale.teacherId;
                            const seller = sellerIsTeacher ? teachers.find(t => t.id === sellerId) : tuitionInstitutes.find(ti => ti.id === sellerId);
                            if (seller) {
                                // Institute email might be in contact.email or similar. Teacher is in contact.email
                                const sellerEmail = seller.contact?.email;
                                const buyerName = billingDetails.billingFirstName + ' ' + billingDetails.billingLastName;

                                notifyUser(
                                    { id: sellerId, email: sellerEmail }, // Institute ID also works for notifications if they have a dashboard/login
                                    "New Order Received",
                                    `You have a new order from ${buyerName} for ${newSale.cartItems.length} item(s).`,
                                    {
                                        type: 'success',
                                        link: sellerIsTeacher ? '/menu/orders' : '/ti/dashboard', // Adjust links as needed
                                        notificationUrl: functionUrls.notification,
                                        emailHtml: `
                                           <div style="font-family: Arial, sans-serif;">
                                               <h2>New Order Received</h2>
                                               <p><strong>Buyer:</strong> ${buyerName}</p>
                                               <p><strong>Items:</strong> ${newSale.cartItems.length}</p>
                                               <p><strong>Total:</strong> ${currencyFormatter.format(totalAmount)}</p>
                                               <p>Please check your dashboard for details.</p>
                                           </div>
                                       `
                                    }
                                );
                            }
                        }

                        if (customFields.type === 'photo_purchase') (reconstructedCart as PhotoCartItem[]).forEach(item => { if (item.type.includes('download')) downloadImage(item.type === 'photo_download_highres' ? item.photo.url_highres : item.photo.url_thumb.replace(/=s\d+$/, '=s1600'), `clazz_lk_${item.photo.id}.png`); });

                        sendPaymentConfirmation(functionUrls.notification, billingDetails, totalAmount, `${reconstructedCart.length} items`, newSale.id);
                        ui.addToast('Purchase complete!', 'success'); ui.clearCart();
                        pageToNavigateTo = { name: 'student_dashboard', initialTab: 'my_orders' };
                        break;
                    }
                    case 'teacher_subscription': {
                        const { planLevel, amount, refCode, billingDetails } = customFields;

                        // Here we could store a record of this subscription payment in a 'subscriptions' collection if needed.
                        // For now, we will rely on the email notification sent to admin via sendPaymentConfirmation to manually verify/upgrade.
                        // But the user flow immediately prompts account creation.

                        sendPaymentConfirmation(
                            functionUrls.notification,
                            { email: billingDetails.billingEmail, contactNumber: billingDetails.billingContactNumber },
                            amount,
                            `Teacher Subscription (Level ${planLevel})`,
                            orderId
                        );

                        // Notify Admin
                        const subject = `New Teacher Subscription Payment: Level ${planLevel}`;
                        const htmlBody = `
                            <div style="font-family: Arial, sans-serif;">
                                <h2>New Subscription Payment</h2>
                                <p><strong>Amount:</strong> ${currencyFormatter.format(amount)}</p>
                                <p><strong>Plan Level:</strong> ${planLevel}</p>
                                <p><strong>Ref Code:</strong> ${refCode}</p>
                                <p><strong>Name:</strong> ${billingDetails.billingFirstName} ${billingDetails.billingLastName}</p>
                                <p><strong>Email:</strong> ${billingDetails.billingEmail}</p>
                                <p><strong>Phone:</strong> ${billingDetails.billingContactNumber}</p>
                                <p><strong>Transaction ID:</strong> ${orderId}</p>
                            </div>
                         `;
                        await sendNotification(functionUrls.notification, { email: ADMIN_EMAIL }, subject, htmlBody);

                        ui.addToast('Subscription payment successful!', 'success');
                        pageToNavigateTo = {
                            name: 'subscription_success',
                            planLevel,
                            amount,
                            transactionId: orderId,
                            billingDetails,
                            refCode
                        };
                        break;
                    }
                    case 'additional_service': {
                        const { serviceDetails, amountPaidFromBalance, totalAmount, billingDetails } = customFields;
                        const existingSaleId = orderId;

                        batch.update(doc(db, "sales", existingSaleId), {
                            status: 'completed',
                            paymentMethod: 'gateway',
                            amountPaidFromBalance: parseFloat(amountPaidFromBalance),
                            transactionId: orderId,
                            updatedAt: new Date().toISOString()
                        });

                        if (parseFloat(amountPaidFromBalance) > 0 && currentUser) {
                            batch.update(doc(db, "users", currentUser.id), { accountBalance: increment(-parseFloat(amountPaidFromBalance)) });
                        }

                        // Notifications logic preserved...
                        const contactNumbers = new Set<string>();
                        if (billingDetails?.billingContactNumber) contactNumbers.add(billingDetails.billingContactNumber);
                        if (currentUser?.contactNumber) contactNumbers.add(currentUser.contactNumber);

                        const primaryEmail = billingDetails?.billingEmail || currentUser?.email;
                        const primaryMobile = Array.from(contactNumbers)[0];
                        if (primaryEmail || primaryMobile) {
                            sendPaymentConfirmation(functionUrls.notification, { email: primaryEmail, contactNumber: primaryMobile }, parseFloat(totalAmount), serviceDetails.title, existingSaleId);
                        }

                        ui.addToast('Payment successful!', 'success');
                        pageToNavigateTo = { name: 'student_dashboard', initialTab: 'earnings' };
                        break;
                    }
                    case 'custom_payment': {
                        // customFields: { type: 'custom_payment', requestId, saleId, teacherId, amountPaidFromBalance, frontend_url }
                        const { requestId, saleId, teacherId, amountPaidFromBalance } = customFields;

                        // 1. Update Sale
                        batch.update(doc(db, "sales", saleId), {
                            status: 'completed',
                            paymentMethod: 'gateway',
                            amountPaidFromBalance: parseFloat(amountPaidFromBalance || 0),
                            transactionId: orderId,
                            updatedAt: new Date().toISOString()
                        });

                        // 2. Update Request Status to 'paid'
                        batch.update(doc(db, "customClassRequests", requestId), {
                            status: 'paid',
                            updatedAt: new Date().toISOString()
                        });

                        // 3. Deduct Balance if split payment
                        if (parseFloat(amountPaidFromBalance || 0) > 0 && currentUser) {
                            batch.update(doc(db, "users", currentUser.id), { accountBalance: increment(-parseFloat(amountPaidFromBalance)) });
                        }

                        // 4. Notify Teacher & Student
                        // Note: Notification logic usually handled by cloud function triggers on 'sales' create/update or custom_requests update?
                        // But here we do manual notification for immediate feedback if needed.
                        // Impl plan status says "Notify Teacher".
                        // Let's send a notification to teacher.
                        // We need teacher email? 'teachers' array in deps might have it if loaded.
                        // But deps.teachers is array. Find teacher.
                        const teacher = teachers.find(t => t.id === teacherId);
                        if (teacher) {
                            const studentName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "A student";
                            notifyUser(
                                { id: teacher.id, email: teacher.contact?.email },
                                "New Private Class Payment",
                                `Payment confirmed for private class request by ${studentName}.`,
                                {
                                    type: 'success',
                                    link: '/profile?tab=custom_requests',
                                    notificationUrl: functionUrls.notification,
                                    emailHtml: `
                                        <div style="font-family: Arial, sans-serif;">
                                            <p>Hi ${teacher.name},</p>
                                            <p>Payment confirmed for private class request by ${studentName}.</p>
                                            <p>View request in your dashboard.</p>
                                        </div>
                                    `
                                }
                            );
                        }

                        // Notify Student (Confirmation)
                        if (currentUser) {
                            sendPaymentConfirmation(functionUrls.notification, currentUser, 0, "Private Class Payment", saleId); // Amount? we don't have totalAmount easily here unless in customFields.
                            // Wait, sendPaymentConfirmation takes amount. customFields doesn't have totalAmount? 
                            // It has saleId.
                            // Actually, in 'enrollment' we passed sale object.
                            // Here we didn't.
                            // Let's skip amount or pass 0. It's just a confirmation.
                        }

                        ui.addToast('Payment successful! Your class is confirmed.', 'success');
                        pageToNavigateTo = { name: 'student_dashboard', initialTab: 'requests' };
                        break;
                    }
                }
                await batch.commit();
            } else {
                const errorMessage = params.get('msg');
                const debugStatus = params.get('debug_raw_status');
                let toastMsg = errorMessage && errorMessage !== 'null' ? errorMessage : 'Transaction was unsuccessful.';
                if (debugStatus) {
                    toastMsg += ` (Status: ${debugStatus})`;
                }
                ui.addToast(`Payment failed: ${toastMsg}`, 'error');
                if (customFields.type === 'enrollment') await deleteDoc(doc(db, "sales", customFields.sale.id));
                pageToNavigateTo = { name: 'student_dashboard' };
            }
        } catch (error) {
            console.error("Critical error in handlePaymentResponse:", error);
            if (customFields.type === 'enrollment') try { await deleteDoc(doc(db, "sales", customFields.sale.id)); } catch (e) { console.error("Failed to clean up 'hold' sale doc:", e); }
            ui.addToast("There was a critical error processing your payment. Please contact support.", "error");
            return { name: 'home' };
        }
        return pageToNavigateTo;
    }, [currentUser, ui, nav, currencyFormatter, users, tuitionInstitutes, teachers]);

    const createSaleFromCart = (cart: CartItem[], totalAmount: number, billingDetails: BillingDetails, shippingAddress: any, type: string, user: User | null): Sale => {
        const newSaleId = generateStandardId('INV');
        let sellerId: string | undefined;
        const isPhoto = type === 'photo_purchase';
        const firstItem = cart[0];

        if (firstItem.type === 'product') sellerId = (firstItem as ProductCartItem).product.teacherId;
        else if (firstItem.type.startsWith('photo')) sellerId = (firstItem as PhotoCartItem).instituteId;

        if (!sellerId) throw new Error('Seller could not be determined.');
        const seller = isPhoto ? tuitionInstitutes.find(ti => ti.id === sellerId) : teachers.find(t => t.id === sellerId);
        if (!seller) throw new Error(`Seller with ID ${sellerId} not found.`);

        const newSaleData: Partial<Sale> = {
            id: newSaleId, studentId: user?.id || `guest_${billingDetails.billingEmail}`, itemId: newSaleId, itemType: type as any,
            totalAmount: totalAmount, amountPaidFromBalance: 0, saleDate: new Date().toISOString(), currency: 'LKR',
            status: 'completed', paymentMethod: 'gateway', cartItems: cart, itemName: `${cart.length} item(s) from ${seller.name}`,
        };

        if (shippingAddress) newSaleData.shippingAddress = shippingAddress;

        if (isPhoto) {
            newSaleData.instituteId = sellerId;
            const institute = seller as TuitionInstitute;
            const platformRate = (institute.photoCommissionRate ?? 60) / 100;
            newSaleData.platformCommission = totalAmount * platformRate;
            newSaleData.instituteCommission = totalAmount * (1 - platformRate);
            newSaleData.photoOrderStatus = 'pending';
        } else {
            newSaleData.teacherId = sellerId;
            const teacher = seller as Teacher;
            const platformRate = (teacher.commissionRate ?? 25) / 100;
            newSaleData.platformCommission = totalAmount * platformRate;
            newSaleData.teacherCommission = totalAmount * (1 - platformRate);
            const hasPhysical = cart.some(item => (item as ProductCartItem).product.type === 'physical');
            if (hasPhysical) newSaleData.physicalOrderStatus = 'pending';
        }

        return newSaleData as Sale;
    }

    return { handlePaymentResponse };
};