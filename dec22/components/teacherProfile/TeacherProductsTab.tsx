
import React, { useMemo, useState } from 'react';
import { Teacher, Product } from '../../types.ts';
import { useData } from '../../contexts/DataContext.tsx';
import { useNavigation } from '../../contexts/NavigationContext.tsx';
import ProductCard from '../ProductCard.tsx';
import { PlusIcon } from '../Icons.tsx';
import ProductEditorModal from '../ProductEditorModal.tsx';

interface TeacherProductsTabProps {
    teacher: Teacher;
    canEdit: boolean;
    onDelete: (productId: string) => void;
}

const TeacherProductsTab: React.FC<TeacherProductsTabProps> = ({ teacher, canEdit, onDelete }) => {
    // FIX: Destructure handleSaveProduct from useData
    const { sales, handleTogglePublishState, handleSaveProduct } = useData();
    const { handleNavigate } = useNavigation();
    
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);

    const enrollmentCounts = useMemo(() => {
        // This is a placeholder for future sales tracking of products.
        // For now, we'll just return an empty object.
        return {};
    }, [sales, teacher.id]);
    
    const productsToShow = useMemo(() => {
        return canEdit 
            ? (teacher.products || []).filter(p => !p.isDeleted) 
            : (teacher.products || []).filter(p => p.isPublished && !p.isDeleted);
    }, [canEdit, teacher.products]);

    const handleCreateProduct = () => {
        setProductToEdit(null);
        setIsEditorOpen(true);
    };
    
    const handleEditProduct = (product: Product) => {
        setProductToEdit(product);
        setIsEditorOpen(true);
    };

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {canEdit && (
                <button onClick={handleCreateProduct} className="min-h-[200px] flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-light-border dark:border-dark-border hover:border-primary dark:hover:border-primary-light transition-colors text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light">
                    <PlusIcon className="w-10 h-10" />
                    <span className="mt-2 font-semibold">Create New Product</span>
                </button>
                )}
                {productsToShow.map(product => (
                <ProductCard 
                    key={product.id} 
                    product={product} 
                    teacher={teacher} 
                    viewMode={canEdit ? "teacher" : "public"} 
                    onViewDetails={(p) => handleNavigate({ name: 'product_detail', productId: p.id })}
                    onEdit={handleEditProduct} 
                    onDelete={onDelete} 
                    onTogglePublish={(id, action) => handleTogglePublishState(teacher.id, id, 'product' as any, action)} 
                />
                ))}
            </div>

            <ProductEditorModal
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                onSave={handleSaveProduct}
                initialData={productToEdit}
                teacherId={teacher.id}
            />
        </div>
    );
};

export default TeacherProductsTab;
