import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { TuitionInstitute } from '../../types';
import { PencilIcon, BuildingOffice2Icon } from '../Icons';
import Modal from '../Modal';
import FormInput from '../FormInput';
import { useUI } from '../../contexts/UIContext';

const InstituteManagement: React.FC = () => {
    const { tuitionInstitutes, updateTuitionInstitute } = useData();
    const { addToast } = useUI();

    const [editingInstitute, setEditingInstitute] = useState<TuitionInstitute | null>(null);
    const [formData, setFormData] = useState({
        commissionRate: '',          // Institute's Gross Share
        platformMarkupRate: '',      // Platform's Cut from Gross
        manualAttendanceFee: '',     // Fixed Fee for Manual
        photoCommissionRate: ''      // Photo Commission
    });

    const handleEdit = (institute: TuitionInstitute) => {
        setEditingInstitute(institute);
        setFormData({
            commissionRate: institute.commissionRate.toString(),
            platformMarkupRate: institute.platformMarkupRate.toString(),
            manualAttendanceFee: (institute.manualAttendanceFee ?? 50).toString(),
            photoCommissionRate: (institute.photoCommissionRate ?? 60).toString()
        });
    };

    const handleSave = async () => {
        if (!editingInstitute) return;

        const commission = parseFloat(formData.commissionRate);
        const markup = parseFloat(formData.platformMarkupRate);
        const fee = parseFloat(formData.manualAttendanceFee);
        const photoComm = parseFloat(formData.photoCommissionRate);

        if (isNaN(commission) || commission < 0 || commission > 100) { addToast("Invalid Institute Commission Rate", "error"); return; }
        if (isNaN(markup) || markup < 0 || markup > 100) { addToast("Invalid Platform Markup Rate", "error"); return; }
        if (isNaN(fee) || fee < 0) { addToast("Invalid Manual Attendance Fee", "error"); return; }
        if (isNaN(photoComm) || photoComm < 0 || photoComm > 100) { addToast("Invalid Photo Commission Rate", "error"); return; }

        try {
            await updateTuitionInstitute(editingInstitute.id, {
                commissionRate: commission,
                platformMarkupRate: markup,
                manualAttendanceFee: fee,
                photoCommissionRate: photoComm
            });
            addToast("Institute settings updated successfully.", "success");
            setEditingInstitute(null);
        } catch (error) {
            console.error(error);
            addToast("Failed to update institute.", "error");
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center">
                <BuildingOffice2Icon className="w-6 h-6 mr-2" />
                Institute Management
            </h2>

            <div className="bg-white dark:bg-dark-surface rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Institute Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Institute Comm. (%)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Platform Markup (%)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Manual Fee (LKR)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Photo Comm. (%)</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-dark-surface divide-y divide-gray-200 dark:divide-gray-700">
                        {tuitionInstitutes.map((institute) => (
                            <tr key={institute.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="font-medium text-gray-900 dark:text-white">{institute.name}</div>
                                    <div className="text-sm text-gray-500">{institute.id}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    <div>{institute.contact.email}</div>
                                    <div>{institute.contact.phone}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                    {institute.commissionRate}%
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                    {institute.platformMarkupRate}%
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                    LKR {institute.manualAttendanceFee ?? 50}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                    {institute.photoCommissionRate ?? 60}%
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => handleEdit(institute)}
                                        className="text-primary hover:text-primary-dark"
                                    >
                                        <PencilIcon className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {editingInstitute && (
                <Modal
                    isOpen={!!editingInstitute}
                    onClose={() => setEditingInstitute(null)}
                    title={`Edit Settings: ${editingInstitute.name}`}
                >
                    <div className="space-y-4">
                        <FormInput
                            label="Institute Commission Rate (%)"
                            name="commissionRate"
                            type="number"
                            value={formData.commissionRate}
                            onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                            placeholder="e.g. 10"
                        />
                        <p className="text-xs text-gray-500 -mt-3">
                            The percentage of the transaction value that the Institute claims as Revenue.
                        </p>

                        <FormInput
                            label="Platform Markup Rate (%)"
                            name="platformMarkupRate"
                            type="number"
                            value={formData.platformMarkupRate}
                            onChange={(e) => setFormData({ ...formData, platformMarkupRate: e.target.value })}
                            placeholder="e.g. 5"
                        />
                        <p className="text-xs text-gray-500 -mt-3">
                            The percentage of the Revenue that the Platform claims from the Institute (Calculated from Gross).
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <FormInput
                                    label="Manual Fee (LKR)"
                                    name="manualAttendanceFee"
                                    type="number"
                                    value={formData.manualAttendanceFee}
                                    onChange={(e) => setFormData({ ...formData, manualAttendanceFee: e.target.value })}
                                />
                                <p className="text-xs text-gray-500 mt-1">Fixed fee per manual attendance.</p>
                            </div>
                            <div>
                                <FormInput
                                    label="Photo Comm. (%)"
                                    name="photoCommissionRate"
                                    type="number"
                                    value={formData.photoCommissionRate}
                                    onChange={(e) => setFormData({ ...formData, photoCommissionRate: e.target.value })}
                                />
                                <p className="text-xs text-gray-500 mt-1">Commission on photo sales.</p>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default InstituteManagement;
