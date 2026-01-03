
import React, { useState, useCallback, useEffect } from 'react';
import { AdminView } from '../types';
import AdminSidebar from '../components/admin/AdminSidebar';
import AnalyticsDashboard from '../components/admin/AnalyticsDashboard';
import UserManagement from '../components/admin/UserManagement';
import ContentManagement from '../components/admin/ContentManagement';
import ProductManagement from '../components/admin/ProductManagement';
import RevenueManagement from '../components/admin/RevenueManagement';
import VoucherManagement from '../components/admin/VoucherManagement';
import ReferralManagement from '../components/admin/ReferralManagement';
import AllSalesManagement from '../components/admin/AllSalesManagement';
import SiteContentManagement from '../components/admin/SiteContentManagement';
import CalculationGuide from '../components/admin/CalculationGuide';
import PhotoOrderManagement from '../components/admin/PhotoOrderManagement';
import PhysicalOrderManagement from '../components/admin/PhysicalOrderManagement';
import ConfirmationModal from '../components/ConfirmationModal';
import { useData } from '../contexts/DataContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useUI } from '../contexts/UIContext';
import PaymentGatewayManagement from '../components/admin/PaymentGatewayManagement';
import StaffManagement from '../components/admin/StaffManagement';
import DeveloperSettings from '../components/admin/DeveloperSettings';
import { useAuth } from '../contexts/AuthContext';
import DataRepairTool from '../components/admin/DataRepairTool';
import RequestsManagement from '../components/admin/RequestsManagement';
import CommunicationsManagement from '../components/admin/CommunicationsManagement';
import InstituteManagement from '../components/admin/InstituteManagement';

const AdminDashboard: React.FC = () => {
    const {
        teachers, users, sales, defaultCoverImages, vouchers, topUpRequests, tuitionInstitutes,
        handleUpdateTeacher, handleUpdateWithdrawal, handleRemoveDefaultCoverImage, handleTopUpDecision,
        handleUpdateSaleStatus, handleRefundSale, handleCourseApproval, handleProductApproval, handleUpdateUser
    } = useData();
    const { currentUser } = useAuth();
    const { handleNavigate } = useNavigation();
    const { openImageUploadModal } = useUI();

    const [activeView, setActiveView] = useState<AdminView>('analytics');
    // New state to handle deep linking to specific content sections
    const [targetContentSection, setTargetContentSection] = useState<string | undefined>(undefined);
    const [imageToDelete, setImageToDelete] = useState<string | null>(null);

    // Initialize active view based on permissions
    useEffect(() => {
        if (currentUser && currentUser.permissions && !currentUser.permissions.includes('all') && !currentUser.permissions.includes(activeView)) {
            if (currentUser.permissions.length > 0) {
                setActiveView(currentUser.permissions[0] as AdminView);
            }
        }
    }, [currentUser]);

    const handleCloseDeleteConfirmation = useCallback(() => setImageToDelete(null), []);

    const onViewTeacher = (teacherId: string) => handleNavigate({ name: 'teacher_profile', teacherId });
    const onViewStudentDashboard = (userId: string) => handleNavigate({ name: 'admin_view_student_dashboard', userId });

    const onAddDefaultCoverImage = () => {
        openImageUploadModal('admin_default_cover');
    };

    const onRemoveDefaultCoverImage = (imageUrl: string) => {
        setImageToDelete(imageUrl);
    };

    const handleConfirmDelete = () => {
        if (imageToDelete) {
            handleRemoveDefaultCoverImage(imageToDelete);
            setImageToDelete(null);
        }
    };

    const handleSaveStaffPermissions = (userId: string, permissions: string[]) => {
        handleUpdateUser({ id: userId, permissions });
    };

    // Handler to switch view and target a specific section
    const handleNavigateToContent = (sectionKey: string) => {
        setTargetContentSection(sectionKey);
        setActiveView('site_content');
    };

    const renderView = () => {
        switch (activeView) {
            case 'analytics':
                return <AnalyticsDashboard teachers={teachers} users={users} sales={sales} />;
            case 'users':
                return <UserManagement
                    teachers={teachers}
                    users={users}
                    onUpdateTeacher={handleUpdateTeacher}
                    onViewTeacher={onViewTeacher}
                    onViewStudentDashboard={onViewStudentDashboard}
                    defaultCoverImages={defaultCoverImages}
                />;
            case 'staff':
                return <StaffManagement users={users} onUpdatePermissions={handleSaveStaffPermissions} />;
            case 'content':
                return <ContentManagement
                    teachers={teachers}
                    defaultCoverImages={defaultCoverImages}
                    onAddDefaultCoverImage={onAddDefaultCoverImage}
                    onRemoveDefaultCoverImage={onRemoveDefaultCoverImage}
                    onCourseApproval={handleCourseApproval}
                />;
            case 'products':
                return <ProductManagement
                    teachers={teachers}
                    onProductApproval={handleProductApproval}
                />;
            case 'allsales':
                return <AllSalesManagement
                    allSales={sales}
                    allUsers={users}
                    allTeachers={teachers}
                    onViewTeacher={onViewTeacher}
                    onUpdateSaleStatus={handleUpdateSaleStatus}
                    onRefundSale={handleRefundSale}
                />;
            case 'photo_orders':
                return <PhotoOrderManagement />;
            case 'physical_orders':
                return <PhysicalOrderManagement />;
            case 'revenue':
                return <RevenueManagement
                    teachers={teachers}
                    tuitionInstitutes={tuitionInstitutes}
                    allUsers={users}
                    topUpRequests={topUpRequests}
                    onUpdateWithdrawal={handleUpdateWithdrawal}
                    handleTopUpDecision={handleTopUpDecision}
                    onViewTeacher={onViewTeacher}
                />;
            case 'vouchers':
                return <VoucherManagement vouchers={vouchers} users={users} />;
            case 'referrals':
                return <ReferralManagement users={users} teachers={teachers} sales={sales} onViewTeacher={onViewTeacher} />;
            case 'payment_gateways':
                return <PaymentGatewayManagement />;
            case 'site_content':
                return <SiteContentManagement initialKey={targetContentSection} />;
            case 'calculation_guide':
                return <CalculationGuide setActiveView={setActiveView} onNavigateToContent={handleNavigateToContent} />;
            case 'developer':
                return <DeveloperSettings />;
            case 'requests':
                return <RequestsManagement />;
            case 'communications':
                return <CommunicationsManagement />;
            case 'institutes':
                return <InstituteManagement />;
            default:
                return <div>Select a view</div>;
        }
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slideInUp">
            <div className="flex flex-col md:flex-row gap-8">
                <AdminSidebar activeView={activeView} setActiveView={setActiveView} />
                <main className="flex-1">
                    <DataRepairTool />
                    {renderView()}
                </main>
            </div>
            {imageToDelete && (
                <ConfirmationModal
                    isOpen={true}
                    onClose={handleCloseDeleteConfirmation}
                    onConfirm={handleConfirmDelete}
                    title="Confirm Deletion"
                    message="Are you sure you want to remove this default cover image?"
                    confirmText="Yes, Remove"
                />
            )}
        </div>
    );
};

export default AdminDashboard;
