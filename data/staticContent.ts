import React from 'react';
import { StaticPageKey } from '../types.ts';

interface StaticContent {
    title: string;
    content: string;
}

const faqContent = `
    <style>
        details {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            margin-bottom: 1rem;
            transition: background-color 0.2s ease;
        }
        .dark details {
            border-color: #334155;
        }
        summary {
            font-weight: 600;
            padding: 1rem;
            cursor: pointer;
            outline: none;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        details[open] {
            background-color: #f8fafc;
        }
        .dark details[open] {
            background-color: #1e293b;
        }
        details[open] summary {
            border-bottom: 1px solid #e2e8f0;
        }
        .dark details[open] summary {
            border-bottom-color: #334155;
        }
        .faq-content {
            padding: 1rem;
            line-height: 1.6;
        }
        summary::after {
            content: '+';
            font-size: 1.5rem;
            transition: transform 0.2s ease;
        }
        details[open] summary::after {
            transform: rotate(45deg);
        }
    </style>
    
    <h2 class="text-2xl font-bold mb-6">For Students</h2>
    <details>
        <summary>How do I create an account?</summary>
        <div class="faq-content">You can sign up using your email and a password, your Google account, or your mobile number via OTP verification. Make sure to select the 'Student' role during registration.</div>
    </details>
    <details>
        <summary>How do I find a class, course, or teacher?</summary>
        <div class="faq-content">Use the main search bar on the home page to search by name, subject, or keywords. You can also browse all available content by clicking on "Teachers," "Courses," "Classes," or "Quizzes" in the main navigation.</div>
    </details>
    <details>
        <summary>How do I enroll in a paid item?</summary>
        <div class="faq-content">Click the "Enroll Now" button on the item's detail page. The system will first use any available funds in your Account Balance. If there's a remaining amount, you will be securely redirected to our payment gateway to complete the purchase.</div>
    </details>
    <details>
        <summary>Where can I find my purchased courses and classes?</summary>
        <div class="faq-content">After logging in, click on your name in the header to go to your <strong>Student Dashboard</strong>. All your enrolled content is organized under the "My Courses," "My Classes," and "My Quizzes" tabs.</div>
    </details>
    <details>
        <summary>How do I add money to my Account Balance?</summary>
        <div class="faq-content">In your Student Dashboard, you can find a "Top Up" button. You can add funds instantly via the online payment gateway, by redeeming a gift voucher, or by submitting a bank deposit slip for admin verification.</div>
    </details>
    <details>
        <summary>How does the Bank Slip top-up work?</summary>
        <div class="faq-content">You need to deposit cash into the provided bank account, then upload a clear photo of the deposit slip through the Top Up modal in your dashboard. An administrator will review your submission and credit your account, usually within 24 hours.</div>
    </details>

    <h2 class="text-2xl font-bold mt-12 mb-6">For Teachers</h2>
    <details>
        <summary>How do I register as a teacher?</summary>
        <div class="faq-content">During the standard signup process, make sure to select the 'Teacher' role. After completing the initial registration, your account will be in a 'Pending' state until an administrator reviews and approves your profile.</div>
    </details>
    <details>
        <summary>How do I create a new class, course, or quiz?</summary>
        <div class="faq-content">Once your teacher profile is approved, navigate to your Teacher Profile page. This is your main dashboard. You will find tabs for "Classes," "Courses," and "Quizzes," each with a button to add new content.</div>
    </details>
    <details>
        <summary>Why can't I publish my new course?</summary>
        <div class="faq-content">All new courses must first be submitted for admin review to ensure quality and completeness. In the course editor, save your course, then on your dashboard, use the "Request Publish" button on the course card. Once approved, you can publish and unpublish it freely.</div>
    </details>
    <details>
        <summary>How do I get paid and withdraw my earnings?</summary>
        <div class="faq-content">Your earnings from sales accumulate throughout the month. On the 15th of the following month, these earnings are processed and moved to your "Available for Withdrawal" balance. You can then request a withdrawal from your <strong>Earnings Dashboard</strong>.</div>
    </details>
    <details>
        <summary>Why is the "Request Withdrawal" button disabled?</summary>
        <div class="faq-content">To enable withdrawals, you must complete two steps in your Earnings Dashboard: 1) Upload and get your ID and Bank documents verified. 2) Have a minimum available balance (e.g., LKR 10,000) in your account.</div>
    </details>
    <details>
        <summary>How do I send a notification to my students?</summary>
        <div class="faq-content">Go to your Teacher Profile page and click on the "Notifications" tab. From there, you can compose a message and send it to all your followers or to students enrolled in a specific class.</div>
    </details>
`;

export const staticPageContent: Record<StaticPageKey, StaticContent> = {
    about_us: {
        title: "About Us",
        content: "<p>Welcome to clazz.lk, Sri Lanka's premier online learning platform. Our mission is to connect passionate educators with eager students across the island, making quality education accessible to everyone, everywhere.</p><p>We believe in the power of technology to transform learning. Our platform provides the tools for teachers to create engaging courses, conduct live classes, and assess student progress, while students get a flexible and interactive learning experience.</p>"
    },
    contact_support: {
        title: "Contact Support",
        content: "<h2>Get in Touch</h2><p>Have questions or need assistance? We're here to help!</p><ul><li><strong>Email:</strong> support@clazz.lk</li><li><strong>Phone:</strong> +94 11 234 5678</li><li><strong>Address:</strong> 123 Galle Road, Colombo 03, Sri Lanka</li></ul>"
    },
    faq: {
        title: "Frequently Asked Questions",
        content: faqContent,
    },
    teacher_terms: {
        title: "Teacher Terms & Conditions",
        content: "<p>By registering as a teacher on clazz.lk, you agree to provide accurate information, create high-quality educational content, and adhere to our community guidelines. You are responsible for the content you publish. Payouts are processed monthly based on your commission rate. Please refer to the full terms for details on content ownership, payment schedules, and conduct.</p>"
    },
    student_terms: {
        title: "Student Terms & Conditions",
        content: "<p>As a student on clazz.lk, you agree to use the platform for personal, non-commercial educational purposes. You will not share your account or distribute course materials. Payments for courses and classes are processed securely through our gateway. Please review our refund policy for information on cancellations and refunds.</p>"
    },
    privacy_policy: {
        title: "Privacy Policy",
        content: "<p>Your privacy is important to us. This policy explains what personal data we collect from you, how we use it, and your choices regarding your data. We collect information to provide and improve our services, for security, and for communication. We do not sell your personal data to third parties.</p>"
    },
    refund_policy: {
        title: "Refund & Cancellation Policy",
        content: "<h2>Class Cancellations</h2><p>If a teacher cancels a class, enrolled students will receive a full refund to their clazz.lk account balance.</p><h2>Course Refunds</h2><p>We do not offer refunds for change-of-mind on course purchases. Refunds may be considered in cases of technical issues or if the course content is significantly different from what was advertised, at the discretion of clazz.lk support.</p>"
    },
    disclaimer: {
        title: "Disclaimer",
        content: "<p>clazz.lk is a platform that connects teachers and students. We do not employ the teachers and are not responsible for the content of their courses or classes. The views and opinions expressed by educators on this platform are their own and do not necessarily reflect the views of clazz.lk.</p>"
    },
    cookie_policy: {
        title: "Cookie Policy",
        content: "<p>We use cookies and similar technologies to help provide, protect, and improve the clazz.lk platform. This policy explains how and why we use these technologies and the choices you have. Cookies help us personalize content, tailor and measure ads, and provide a safer experience.</p>"
    },
    community_guidelines: {
        title: "Community Guidelines",
        content: "<p>Our community is built on respect, professionalism, and a shared passion for learning. We expect all users—students and teachers—to interact in a courteous and respectful manner. Harassment, hate speech, and any form of abuse will not be tolerated and may result in account suspension.</p>"
    },
    code_of_conduct: {
        title: "Code of Conduct",
        content: "<p>All members of the clazz.lk community are expected to maintain academic integrity, respect intellectual property rights, and foster a positive and inclusive learning environment. Do not engage in cheating, plagiarism, or any activity that disrupts the educational experience for others.</p>"
    },
    copyright_policy: {
        title: "Copyright & IP Policy",
        content: "<p>Teachers must ensure they have the rights to all content they upload to the platform. Unauthorized use of copyrighted material is strictly prohibited. If you believe your copyright has been infringed upon, please contact our support team with the necessary details to file a report.</p>"
    }
};
